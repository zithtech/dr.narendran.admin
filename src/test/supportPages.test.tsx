import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminSupportApi } from '../features/support/api/adminSupportApi';
import { SupportCenterPage } from '../features/support/pages/SupportCenterPage';
import type { SupportMetrics, SupportTicket } from '../features/support/types/support';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../features/support/api/adminSupportApi', () => ({
  adminSupportApi: {
    getMetrics: vi.fn(),
    getAgents: vi.fn(),
    getTickets: vi.fn(),
    getTicketDetails: vi.fn(),
    assignTicket: vi.fn(),
    updateTicket: vi.fn(),
    replyToTicket: vi.fn(),
    addInternalNote: vi.fn(),
    generateAiSummary: vi.fn(),
    getArticles: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
  },
}));

const mockMetrics: SupportMetrics = {
  totalTickets: 24,
  totalOpenTickets: 8,
  openTickets: 8,
  inProgressTickets: 5,
  unassignedTickets: 3,
  awaitingPatientResponse: 4,
  awaitingDoctorResponse: 2,
  resolvedToday: 6,
};

const mockTickets: SupportTicket[] = [
  {
    id: 'tkt-001',
    ticket_number: 'DOC-1001',
    user_id: 'usr-doc-1',
    user_type: 'DOCTOR',
    user_name: 'Dr. Bharathi S',
    doctor_name: 'Dr. Bharathi S',
    doctor_specialization: 'Oncology',
    doctor_hospital_name: 'Annaamalai Cancer Center',
    doctor_phone: '+91 98765 43210',
    subject: 'Schedule blocked date not reflecting in app',
    category: 'SCHEDULE_AVAILABILITY',
    priority: 'HIGH',
    status: 'OPEN',
    assigned_to: 'agent-1',
    assigned_agent_name: 'Support Agent A',
    created_at: '2026-11-10T09:00:00Z',
    updated_at: '2026-11-11T10:00:00Z',
    last_message: 'Please check the slot timing',
  },
  {
    id: 'tkt-002',
    ticket_number: 'PAT-2002',
    user_id: 'usr-pat-2',
    user_type: 'PATIENT',
    user_name: 'Ramesh Kumar',
    patient_name: 'Ramesh Kumar',
    patient_phone: '+91 91234 56789',
    patient_email: 'ramesh@example.com',
    subject: 'Cannot download prescription PDF',
    category: 'PRESCRIPTIONS',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    assigned_to: null,
    created_at: '2026-11-12T08:30:00Z',
    updated_at: '2026-11-12T08:45:00Z',
    last_message: 'Download button shows error',
  },
];

describe('Doctor & Patient Support Unified UI Pages', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminRole', 'ADMIN');
    localStorage.setItem('userRole', 'ADMIN');
    vi.clearAllMocks();
    vi.mocked(adminSupportApi.getMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(adminSupportApi.getAgents).mockResolvedValue([
      { id: 'agent-1', name: 'Agent Priya', username: 'priya', role: 'SUPPORT', status: 'ACTIVE' },
    ]);
    vi.mocked(adminSupportApi.getTickets).mockResolvedValue({
      tickets: mockTickets,
      total: 2,
    });
    vi.mocked(adminSupportApi.getArticles).mockResolvedValue([]);
  });

  it('renders Patient Support page with common table, header, KPI cards, and filter bar', async () => {
    renderWithProviders(<SupportCenterPage defaultUserType="PATIENT" />);

    // Header matching Doctor page layout (clean title, no overline, live sync label)
    expect(screen.getByRole('heading', { level: 1, name: 'Patient Support' })).toBeInTheDocument();
    expect(screen.getByText(/Patient triage, consultation assistance/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Support Queue/i)).toBeInTheDocument();

    // KPI Metrics Cards matching Dashboard style
    expect(screen.getByText(/Open Tickets/i)).toBeInTheDocument();
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Resolved Today/i)).toBeInTheDocument();

    // Filter Bar & Table
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search ticket #, patient name, doctor, subject/i)).toBeInTheDocument();
      expect(screen.getByText('#DOC-1001')).toBeInTheDocument();
      expect(screen.getByText('#PAT-2002')).toBeInTheDocument();
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
      expect(screen.getByText('Schedule blocked date not reflecting in app')).toBeInTheDocument();
    });
  });

  it('renders Doctor Support page with doctor subtitle and filters', async () => {
    renderWithProviders(<SupportCenterPage defaultUserType="DOCTOR" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Doctor Support' })).toBeInTheDocument();
    expect(screen.getByText(/Doctor queries, schedule changes, clinical escalations/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Doctor/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search ticket #, doctor name, subject/i)).toBeInTheDocument();
    });
  });

  it('allows switching views between Doctor Support, Patient Support, and All Tickets', async () => {
    renderWithProviders(<SupportCenterPage defaultUserType="DOCTOR" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Doctor Support' })).toBeInTheDocument();

    // Click Patient Support toggle button in the header switcher
    const toggleButtons = screen.getAllByRole('button');
    const patBtn = toggleButtons.find((b) => b.textContent?.includes('Patient Support') && b.tagName === 'BUTTON');
    expect(patBtn).toBeDefined();
    fireEvent.click(patBtn!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Patient Support' })).toBeInTheDocument();
      expect(screen.getByText(/Patient triage, consultation assistance/i)).toBeInTheDocument();
    });

    const allBtn = toggleButtons.find((b) => b.textContent?.includes('All Tickets') && b.tagName === 'BUTTON');
    expect(allBtn).toBeDefined();
    fireEvent.click(allBtn!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Support Center' })).toBeInTheDocument();
      expect(screen.getByText(/Unified support workspace for clinic doctors/i)).toBeInTheDocument();
    });
  });

  it('switches to Knowledge Base tab and displays knowledge base content with drawer opening', async () => {
    renderWithProviders(<SupportCenterPage defaultUserType="PATIENT" />);

    const kbTabBtn = screen.getByRole('button', { name: /Knowledge Base & FAQs/i });
    fireEvent.click(kbTabBtn);

    await waitFor(() => {
      expect(adminSupportApi.getArticles).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /New Patient Article/i })).toBeInTheDocument();
    });

    // Click New Patient Article button to verify Common Drawer opens
    const newArticleBtn = screen.getByRole('button', { name: /New Patient Article/i });
    fireEvent.click(newArticleBtn);

    await waitFor(() => {
      // Common Drawer should be open with title and fields
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/PATIENT SUPPORT KNOWLEDGE/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /New Patient Knowledge Article/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Article Title/i)).toBeInTheDocument();
    });
  });
});
