import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Patient } from '../components/PatientModal';
import PatientJourneyDrawer from '../features/patient_journey/components/PatientJourneyDrawer';
import { renderWithProviders } from './renderWithProviders';

// Mock contexts and apis
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
    get: vi.fn().mockImplementation((url: string) => {
      if (url === 'hospitals') {
        return Promise.resolve({ data: [{ id: 'hosp-1', name: 'Apollo Main' }] });
      }
      if (url.startsWith('branches')) {
        return Promise.resolve({ data: [{ id: 'br-1', name: 'Greams Road Branch' }] });
      }
      if (url.startsWith('doctors')) {
        return Promise.resolve({ data: [{ id: 'doc-1', name: 'Dr. Narendran' }] });
      }
      if (url.startsWith('patients/pat-100')) {
        return Promise.resolve({ data: mockPatient });
      }
      return Promise.resolve({ data: [] });
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'new-pat-1', name: 'Test Patient' } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../features/medical_history/services/medicalHistoryApi', () => ({
  medicalHistoryApi: {
    getByPatientId: vi.fn().mockResolvedValue({ data: null }),
    getLatestHistory: vi.fn().mockResolvedValue(null),
    getDocuments: vi.fn().mockResolvedValue([]),
    createHistory: vi.fn().mockResolvedValue({ id: 'pmh-1', patient_id: 'pat-100' }),
    updateHistory: vi.fn().mockResolvedValue({ id: 'pmh-1', patient_id: 'pat-100' }),
  },
}));

vi.mock('../features/prescriptions/api/prescriptionsApi', () => ({
  prescriptionsApi: {
    getByPatient: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'rx-1' }),
  },
}));

const mockPatient: Patient = {
  id: 'pat-100',
  user_account_id: null,
  name: 'Kavitha Ramachandran',
  phone: '+91 98401 23456',
  email: 'kavitha.r@example.com',
  date_of_birth: '1988-04-12',
  gender: 'FEMALE',
  blood_group: 'B+',
  marital_status: 'MARRIED',
  address: '14 Gandhi Road, Chennai',
  height_cm: 162,
  weight_kg: 58,
  status: 'ACTIVE',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Hospital',
  branch_id: 'br-1',
  branch_name: 'Main Branch',
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-04-15T10:00:00Z',
};

describe('Patient Journey Flow Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 journey stages in the step indicator header', () => {
    renderWithProviders(
      <PatientJourneyDrawer
        isOpen={true}
        onClose={vi.fn()}
        initialPatient={null}
      />
    );

    // Verify drawer title and stages are represented
    expect(screen.getByText('Complete Patient Journey')).toBeInTheDocument();
    expect(screen.getByText('1. Basic Details')).toBeInTheDocument();
    expect(screen.getByText('2. Past Medical History')).toBeInTheDocument();
    expect(screen.getByText('3. Plan of Management')).toBeInTheDocument();
    expect(screen.getByText('4. Prescription')).toBeInTheDocument();
    expect(screen.getByText('5. Appointments')).toBeInTheDocument();
  });

  it('navigates seamlessly from Past Medical History -> Plan of Management -> Prescription for existing patient', async () => {
    renderWithProviders(
      <PatientJourneyDrawer
        isOpen={true}
        onClose={vi.fn()}
        initialPatient={mockPatient}
      />
    );

    // Existing patient automatically starts at Stage 2: Past Medical History
    await waitFor(() => {
      expect(screen.getAllByText(/Kavitha Ramachandran/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Stage 2 of 5/i).length).toBeGreaterThanOrEqual(1);
    });

    // Click Continue to Plan of Management (Step 2 -> Step 3)
    const continueBtn = screen.getByRole('button', { name: /Continue to Plan of Management/i });
    fireEvent.click(continueBtn);

    // Now in Step 3 (Plan of Management)
    await waitFor(() => {
      expect(screen.getByText(/1\. Doctor's Clinical Diagnosis/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Recommended Investigations & Diagnostic Labs/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Overall Treatment Strategy & Care Plan/i)).toBeInTheDocument();
    });
  });

  it('allows filling Plan of Management and advances to Prescription step with diagnosis pass-through', async () => {
    renderWithProviders(
      <PatientJourneyDrawer
        isOpen={true}
        onClose={vi.fn()}
        initialPatient={mockPatient}
        initialStep="plan"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Doctor's Clinical Diagnosis/i)).toBeInTheDocument();
    });

    // Select or type diagnosis
    const diagnosisInput = screen.getByPlaceholderText(/Or type custom diagnosis.../i);
    fireEvent.change(diagnosisInput, { target: { value: 'Type 2 Diabetes Mellitus' } });

    // Click "Save & Next: Prescription"
    const proceedBtn = screen.getByRole('button', { name: /Save & Next: Prescription/i });
    fireEvent.click(proceedBtn);

    // Prescription Step is displayed
    await waitFor(() => {
      expect(screen.getByText(/Active Clinical Assessment \(From Plan of Management\)/i)).toBeInTheDocument();
      expect(screen.getAllByText('Type 2 Diabetes Mellitus').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders Performance Status card with 0 to 10 score selection and description textarea', async () => {
    renderWithProviders(
      <PatientJourneyDrawer
        isOpen={true}
        onClose={vi.fn()}
        initialPatient={mockPatient}
        initialStep="plan"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Doctor's Clinical Diagnosis/i)).toBeInTheDocument();
      expect(screen.getByText('Performance Status')).toBeInTheDocument();
    });

    // Verify 0 to 10 number selection buttons exist
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByTestId(`performance-score-btn-${i}`)).toBeInTheDocument();
    }

    // Click score 3
    const score3Btn = screen.getByTestId('performance-score-btn-3');
    fireEvent.click(score3Btn);
    expect(screen.getByText(/Selected: Score 3 \/ 10/i)).toBeInTheDocument();

    // Verify description textarea
    const descTextarea = screen.getByPlaceholderText(/Enter performance status description/i);
    expect(descTextarea).toBeInTheDocument();
    fireEvent.change(descTextarea, { target: { value: 'Ambulatory, capable of self-care but requires daytime rest.' } });
    expect(descTextarea).toHaveValue('Ambulatory, capable of self-care but requires daytime rest.');
  });

  it('opens appointment scheduling modal on Appointments step', async () => {
    renderWithProviders(
      <PatientJourneyDrawer
        isOpen={true}
        onClose={vi.fn()}
        initialPatient={mockPatient}
        initialStep="appointment"
      />
    );

    expect(screen.getByText(/Schedule Review & Follow-up Visit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Schedule Follow-up Appointment/i })).toBeInTheDocument();

    // Click Schedule Follow-up Appointment
    const scheduleBtn = screen.getByRole('button', { name: /Schedule Follow-up Appointment/i });
    fireEvent.click(scheduleBtn);

    // The appointment modal opens
    await waitFor(() => {
      expect(screen.getByText('Schedule New Appointment')).toBeInTheDocument();
    });
  });
});
