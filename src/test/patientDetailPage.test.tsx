import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientDetailPage from '../pages/PatientDetailPage';
import api from '../utils/api';

vi.mock('../context/PermissionContext', () => ({
  usePermission: () => ({
    canView: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    hasRole: () => true,
    refreshPermissions: async () => {},
  }),
}));

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../features/prescriptions/api/prescriptionsApi', () => ({
  prescriptionsApi: {
    getByPatient: vi.fn().mockResolvedValue([
      {
        id: 'rx-1',
        diagnosis: 'Hypertension Stage 1',
        prescription_date: '2026-05-10',
        status: 'active',
        doctor: { name: 'Dr. Narendran' },
        medicines: [{ name: 'Amlodipine 5mg' }],
      },
    ]),
    downloadPdf: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockPatient = {
  id: 'pat-100',
  name: 'Kavitha Ramachandran',
  phone: '+91 98401 23456',
  email: 'kavitha.r@example.com',
  date_of_birth: '1988-04-12',
  gender: 'FEMALE',
  blood_group: 'B+',
  marital_status: 'MARRIED',
  height_cm: 162,
  weight_kg: 58,
  status: 'ACTIVE',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Speciality Hospital',
  branch_id: 'br-1',
  branch_name: 'Greams Road Branch',
  address_line_1: '14 Gandhi Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600028',
  emergency_contacts: [
    {
      name: 'Ramachandran',
      phone: '+91 98401 99999',
      relation: 'Spouse',
    },
  ],
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-04-15T10:00:00Z',
};

describe('PatientDetailPage View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('patients/pat-100')) {
        return Promise.resolve({ data: mockPatient });
      }
      if (url === 'appointments') {
        return Promise.resolve({
          data: [
            {
              id: 'appt-1',
              scheduled_start: '2026-06-01T10:00:00Z',
              doctor_name: 'Dr. Narendran',
              status: 'COMPLETED',
              purpose: 'Routine Follow-up',
            },
          ],
        });
      }
      if (url === 'medical-records') {
        return Promise.resolve({
          data: [
            {
              id: 'rec-1',
              title: 'Lipid Profile Report',
              record_type: 'LAB_REPORT',
              created_at: '2026-05-12T11:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  const renderComponent = (patientId = 'pat-100') => {
    return render(
      <MemoryRouter initialEntries={[`/patients/${patientId}`]}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders left side patient profile card with clinical vitals and credentials', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Kavitha Ramachandran' })).toBeInTheDocument();
    });

    // Verified Patient Badge & status
    expect(screen.getByText('Verified Patient Record')).toBeInTheDocument();
    expect(screen.getByText('Active Patient')).toBeInTheDocument();
    expect(screen.getAllByText('B+').length).toBeGreaterThanOrEqual(1);

    // Clinical Profile & Vitals section
    expect(screen.getByText('Clinical Profile & Vitals')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('162 cm · 58 kg')).toBeInTheDocument();

    // Support & Call Me direct contacts on left card
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('kavitha.r@example.com')).toBeInTheDocument();
    expect(screen.getByText('Call Me')).toBeInTheDocument();
    expect(screen.getByText('+91 98401 23456')).toBeInTheDocument();

    // Action buttons
    expect(screen.getAllByRole('button', { name: /edit patient/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /new prescription/i }).length).toBeGreaterThan(0);
  });

  it('renders right side tabs and switches between them', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Kavitha Ramachandran' })).toBeInTheDocument();
    });

    // Overview Tab KPI cards
    expect(screen.getByText('Physical Stature')).toBeInTheDocument();
    expect(screen.getByText('162 cm')).toBeInTheDocument();
    expect(screen.getByText('Body Weight')).toBeInTheDocument();
    expect(screen.getByText('58 kg')).toBeInTheDocument();
    expect(screen.getByText('Hospital & Facility Assignment')).toBeInTheDocument();
    expect(screen.getByText('Apollo Speciality Hospital')).toBeInTheDocument();

    // Switch to Prescriptions Tab
    fireEvent.click(screen.getByRole('button', { name: /prescriptions/i }));
    await waitFor(() => {
      expect(screen.getByText('Hypertension Stage 1')).toBeInTheDocument();
    });

    // Switch to Appointments Tab
    fireEvent.click(screen.getByRole('button', { name: /appointments/i }));
    await waitFor(() => {
      expect(screen.getByText('Routine Follow-up')).toBeInTheDocument();
    });

    // Switch to Medical Documents Tab
    fireEvent.click(screen.getByRole('button', { name: /medical documents/i }));
    await waitFor(() => {
      expect(screen.getByText('Lipid Profile Report')).toBeInTheDocument();
    });

    // Switch to Timeline History Tab
    fireEvent.click(screen.getByRole('button', { name: /timeline history/i }));
    await waitFor(() => {
      expect(screen.getByText('Clinical Timeline & History')).toBeInTheDocument();
      expect(screen.getByText('Patient Profile Registered')).toBeInTheDocument();
    });
  });
});
