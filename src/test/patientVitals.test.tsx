import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientModal, { type Patient } from '../components/PatientModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as any).get = vi.fn();
  (fn as any).post = vi.fn();
  (fn as any).put = vi.fn();
  (fn as any).delete = vi.fn();
  return { default: fn };
});

const mockHospitals = [
  { id: 'hosp-1', name: 'Apollo Hospitals', code: 'APL', status: 'ACTIVE', branches_count: 1, doctors_count: 2 },
];

const mockBranches = [
  { id: 'branch-1', hospital_id: 'hosp-1', name: 'Greams Road Branch', code: 'GRM', status: 'ACTIVE' },
];

const mockPatientWithVitals: Patient = {
  id: 'pat-002',
  user_account_id: null,
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Hospitals',
  branch_id: 'branch-1',
  branch_name: 'Greams Road Branch',
  name: 'Rajesh Sharma',
  phone: '+91 9845012345',
  email: 'rajesh@example.com',
  address: '123 Medical Street, Chennai',
  date_of_birth: '1985-04-10',
  gender: 'MALE',
  status: 'ACTIVE',
  height_cm: 175,
  weight_kg: 72,
  blood_group: 'O+',
  blood_pressure: '120/80 mmHg',
  blood_sugar: '98 mg/dL',
  body_temperature: '98.6 °F',
  custom_vitals: [
    { label: 'Pulse Rate', value: '72 bpm' },
    { label: 'SpO2', value: '99%' },
  ],
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('PatientModal - Physical Vitals & Dynamic Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: mockBranches });
      if (url === 'user-accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api).mockResolvedValue({ data: { success: true } } as any);
  });

  it('renders BP, Blood Sugar, and Body Temperature fields in the New Patient drawer', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} onSave={() => {}} />,
    );

    expect(screen.getByText('Physical Vitals & Metrics')).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Pressure \(BP\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Sugar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Body Temperature/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Custom Field/i })).toBeInTheDocument();
  }, 15000);

  it('allows dynamically adding and removing custom vital fields', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} onSave={() => {}} />,
    );

    const addCustomBtn = screen.getByRole('button', { name: /Add Custom Field/i });
    fireEvent.click(addCustomBtn);

    const labelInput = screen.getByPlaceholderText(/Metric name/i);
    const valueInput = screen.getByPlaceholderText(/Value/i);

    expect(labelInput).toBeInTheDocument();
    expect(valueInput).toBeInTheDocument();

    fireEvent.change(labelInput, { target: { value: 'Pulse Rate' } });
    fireEvent.change(valueInput, { target: { value: '76 bpm' } });

    expect(labelInput).toHaveValue('Pulse Rate');
    expect(valueInput).toHaveValue('76 bpm');

    const removeBtn = screen.getByTitle(/Remove custom vital/i);
    fireEvent.click(removeBtn);

    expect(screen.queryByPlaceholderText(/Metric name/i)).not.toBeInTheDocument();
  });

  it('submits BP, Blood Sugar, Temperature, and custom vitals when saving a patient', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} onSave={onSave} />,
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('hospitals');
    });

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText(/e.g. John Doe/i), {
      target: { value: 'Suresh Kumar' },
    });

    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });

    // Fill in vitals
    fireEvent.change(screen.getByLabelText(/Blood Pressure \(BP\)/i), {
      target: { value: '130/85 mmHg' },
    });
    fireEvent.change(screen.getByLabelText(/Blood Sugar/i), {
      target: { value: '110 mg/dL' },
    });
    fireEvent.change(screen.getByLabelText(/Body Temperature/i), {
      target: { value: '99.1 °F' },
    });

    // Add a custom field
    fireEvent.click(screen.getByRole('button', { name: /Add Custom Field/i }));
    fireEvent.change(screen.getByPlaceholderText(/Metric name/i), {
      target: { value: 'SpO2' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Value/i), {
      target: { value: '98%' },
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'patients',
          data: expect.objectContaining({
            name: 'Suresh Kumar',
            hospital_id: 'hosp-1',
            blood_pressure: '130/85 mmHg',
            blood_sugar: '110 mg/dL',
            body_temperature: '99.1 °F',
            custom_vitals: [{ label: 'SpO2', value: '98%' }],
          }),
        }),
      );
      expect(onSave).toHaveBeenCalled();
    });
  }, 15000);

  it('populates existing vitals and custom metrics when editing a patient', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={mockPatientWithVitals} onSave={() => {}} />,
    );

    expect(screen.getByLabelText(/Blood Pressure \(BP\)/i)).toHaveValue('120/80 mmHg');
    expect(screen.getByLabelText(/Blood Sugar/i)).toHaveValue('98 mg/dL');
    expect(screen.getByLabelText(/Body Temperature/i)).toHaveValue('98.6 °F');

    expect(screen.getByDisplayValue('Pulse Rate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('72 bpm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SpO2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('99%')).toBeInTheDocument();
  });
});

