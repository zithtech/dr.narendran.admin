import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientModal from '../components/PatientModal';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: vi.fn(),
}));

const mockHospitals = [{ id: 'hosp-1', name: 'Apollo Main Hospital' }];
const mockBranches = [{ id: 'br-1', hospital_id: 'hosp-1', name: 'Greams Road Branch' }];
const mockUsers = [{ id: 'user-1', name: 'Patient User', role: 'PATIENT', status: 'ACTIVE' }];

describe('Unified Register New Patient Drawer with Save & Next Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api as any).get = vi.fn().mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: mockBranches });
      if (url === 'user-accounts') return Promise.resolve({ data: mockUsers });
      if (url.includes('medical-histories')) return Promise.resolve({ data: [] });
      if (url.includes('medical-documents')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    (api as any).mockImplementation((opts: any) => {
      if (opts?.method === 'POST' && opts?.url === 'patients') {
        return Promise.resolve({
          data: {
            id: 'pat-new-123',
            name: opts.data.name,
            phone: opts.data.phone,
            email: opts.data.email,
            hospital_id: opts.data.hospital_id,
            gender: opts.data.gender,
            blood_group: opts.data.blood_group,
            date_of_birth: opts.data.date_of_birth,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    (api as any).post = vi.fn().mockImplementation((url: string, data: any) => {
      if (url.includes('medical-histories')) {
        return Promise.resolve({
          data: {
            id: 'hist-created-456',
            patient_id: 'pat-new-123',
            current_medical_info: data.current_medical_info,
            created_at: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    (api as any).put = vi.fn().mockResolvedValue({ data: {} });
    (api as any).delete = vi.fn().mockResolvedValue({ data: {} });
  });

  it('renders the unified 7-step navigation header inside Register New Patient drawer', async () => {
    render(
      <PatientModal
        isOpen={true}
        onClose={vi.fn()}
        patient={null}
        onSave={vi.fn()}
      />
    );

    // Verify Title & Stepper
    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-personal')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-current')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-previous')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-family')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-reproductive')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-lifestyle')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-step-documents')).toBeInTheDocument();

    // Verify Save & Next button is present on Step 1
    expect(screen.getByTestId('save-and-next-from-personal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register patient/i })).toBeInTheDocument();
  });

  it('navigates seamlessly from Personal details to Clinical Examination via Save & Next', async () => {
    const handleSave = vi.fn();

    render(
      <PatientModal
        isOpen={true}
        onClose={vi.fn()}
        patient={null}
        onSave={handleSave}
      />
    );

    // Wait for dropdown data
    await waitFor(() => {
      expect(screen.getByLabelText(/Assigned Hospital/i)).toBeInTheDocument();
    });

    // Fill Step 1 required personal fields
    fireEvent.change(screen.getByPlaceholderText(/e.g. John Doe/i), {
      target: { value: 'Ramesh Sundaram' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });
    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: '9840198401' },
    });
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'ramesh@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address Line 1'), {
      target: { value: '12 Temple Street' },
    });
    fireEvent.change(screen.getByLabelText('City / Town'), {
      target: { value: 'Chennai' },
    });
    fireEvent.change(screen.getByLabelText('State / Province'), {
      target: { value: 'Tamil Nadu' },
    });
    fireEvent.change(screen.getByLabelText('Pincode / Postal Code'), {
      target: { value: '600004' },
    });

    // Click "Save & Next" from Step 1
    const saveAndNextBtn = screen.getByTestId('save-and-next-from-personal');
    fireEvent.click(saveAndNextBtn);

    // Should call API to register patient
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'patients',
          data: expect.objectContaining({
            name: 'Ramesh Sundaram',
            phone: '9840198401',
          }),
        })
      );
    });

    // Drawer should transition to Step 2 (Examination & Vitals) in the same drawer
    await waitFor(() => {
      expect(screen.getByText(/Presenting Complaints/i)).toBeInTheDocument();
      expect(screen.getByText(/Physical Vitals & Biometrics/i)).toBeInTheDocument();
    });

    // Step 2 has Previous and Save & Next
    expect(screen.getByTestId('prev-step-btn')).toBeInTheDocument();
    expect(screen.getByTestId('save-and-next-btn')).toBeInTheDocument();

    // Verify back navigation: click Previous
    fireEvent.click(screen.getByTestId('prev-step-btn'));

    // Returns back to Step 1 Personal details
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ramesh Sundaram')).toBeInTheDocument();
    });

    // Free stepper jump: click Step 3 (Previous Medical History)
    fireEvent.click(screen.getByTestId('drawer-step-previous'));

    await waitFor(() => {
      expect(screen.getByText('Common Chronic Diseases')).toBeInTheDocument();
      expect(screen.getAllByText(/Previous Surgeries/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('allows navigating forward with plain Next button without saving to database', async () => {
    render(
      <PatientModal
        isOpen={true}
        onClose={vi.fn()}
        patient={null}
        onSave={vi.fn()}
      />
    );

    // Verify Next button exists on Step 1
    const nextBtnStep1 = screen.getByTestId('next-from-personal');
    expect(nextBtnStep1).toBeInTheDocument();

    // Click Next without saving
    fireEvent.click(nextBtnStep1);

    // Should transition to Step 2 (Examination & Vitals) without calling api
    await waitFor(() => {
      expect(screen.getByText(/Presenting Complaints/i)).toBeInTheDocument();
    });
    expect(api).not.toHaveBeenCalled();

    // On Step 2, Next without save button should exist
    const nextBtnStep2 = screen.getByTestId('next-step-btn');
    expect(nextBtnStep2).toBeInTheDocument();

    // Click Next on Step 2
    fireEvent.click(nextBtnStep2);

    // Should transition to Step 3 (Previous Medical History) without calling api.post
    await waitFor(() => {
      expect(screen.getByText('Common Chronic Diseases')).toBeInTheDocument();
    });
    expect((api as any).post).not.toHaveBeenCalled();
  });

  it('safely switches directly to Prescription and Appointments steps without null id crash when patient is null', async () => {
    render(
      <PatientModal
        isOpen={true}
        onClose={vi.fn()}
        patient={null}
        onSave={vi.fn()}
      />
    );

    // Click Step 4 (Prescription)
    const rxStepBtn = screen.getByTestId('drawer-step-prescription');
    fireEvent.click(rxStepBtn);

    // Verify Prescriptions section renders safely with official drawer launcher
    await waitFor(() => {
      expect(screen.getByText(/Prescriptions & Medication Orders/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Open Prescriptions Drawer/i).length).toBeGreaterThan(0);
    });

    // Click Step 5 (Appointments)
    const apptStepBtn = screen.getByTestId('drawer-step-appointment');
    fireEvent.click(apptStepBtn);

    // Verify it renders the dedicated Appointments section with official drawer launcher!
    await waitFor(() => {
      expect(screen.getByText(/Patient Appointments & Scheduled Consultations/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Open Appointments Drawer/i).length).toBeGreaterThan(0);
    });
  });
});
