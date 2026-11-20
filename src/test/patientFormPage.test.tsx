import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import PatientFormPage from '../pages/PatientFormPage';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: Object.assign(
    vi.fn().mockImplementation((config: any) => {
      if (typeof config === 'object' && config.method === 'POST') {
        return Promise.resolve({
          data: {
            id: 'pat-new-1',
            name: 'New Page Patient',
            hospital_id: 'hosp-1',
            status: 'ACTIVE',
          },
        });
      }
      return Promise.resolve({ data: [] });
    }),
    {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  ),
}));

vi.mock('../features/medical_history/services/medicalHistoryApi', () => ({
  medicalHistoryApi: {
    getLatestHistory: vi.fn().mockResolvedValue(null),
    createHistory: vi.fn().mockResolvedValue({ id: 'hist-1' }),
    updateHistory: vi.fn().mockResolvedValue({ id: 'hist-1' }),
    getDocuments: vi.fn().mockResolvedValue([]),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

vi.mock('../features/prescriptions/api/prescriptionsApi', () => ({
  prescriptionsApi: {
    getPrescriptions: vi.fn().mockResolvedValue([]),
    createPrescription: vi.fn(),
  },
}));

describe('PatientFormPage - Dedicated Full Page Registration & Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === 'hospitals') {
        return Promise.resolve({ data: [{ id: 'hosp-1', name: 'City Hospital' }] });
      }
      if (url === 'branches') {
        return Promise.resolve({ data: [{ id: 'branch-1', name: 'Main Branch', hospital_id: 'hosp-1' }] });
      }
      if (url === 'user-accounts') {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('patients/pat-existing-123')) {
        return Promise.resolve({
          data: {
            id: 'pat-existing-123',
            name: 'Jane Doe',
            hospital_id: 'hosp-1',
            branch_id: 'branch-1',
            gender: 'Female',
            phone: '9876543210',
            email: 'jane@example.com',
            date_of_birth: '1990-05-15',
            status: 'ACTIVE',
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders dedicated page header and 7-step wizard for new patient creation (/patients/new)', async () => {
    render(
      <MemoryRouter initialEntries={['/patients/new']}>
        <Routes>
          <Route path="/patients/new" element={<PatientFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Back to Patients')).toBeInTheDocument();
    });

    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    expect(
      screen.getByText('Enter personal details, hospital assignment, health vitals, and emergency contact info.'),
    ).toBeInTheDocument();

    // Verify step buttons
    expect(screen.getByTestId('drawer-step-personal')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-history')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-plan')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-prescription')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-appointment')).toBeInTheDocument();

    // Form inputs are visible
    expect(screen.getByPlaceholderText('e.g. John Doe')).toBeInTheDocument();
    expect(screen.getByText('Save & Next')).toBeInTheDocument();
  });

  it('loads existing patient and renders edit page (/patients/:patientId/edit)', async () => {
    render(
      <MemoryRouter initialEntries={['/patients/pat-existing-123/edit']}>
        <Routes>
          <Route path="/patients/:patientId/edit" element={<PatientFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Edit Patient · Jane Doe/i)).toBeInTheDocument();
      const nameInput = screen.getByPlaceholderText('e.g. John Doe') as HTMLInputElement;
      expect(nameInput.value).toBe('Jane Doe');
    });

    expect(screen.getByText('Back to Patients')).toBeInTheDocument();
  });
});
