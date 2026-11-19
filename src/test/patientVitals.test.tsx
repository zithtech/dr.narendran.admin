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
  body_temperature: '98.6',
  custom_vitals: [
    { label: 'Pulse Rate', value: '72 bpm' },
    { label: 'SpO2', value: '99%' },
  ],
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('PatientModal & Past Medical History - Physical Vitals & Dynamic Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: mockBranches });
      if (url === 'user-accounts') return Promise.resolve({ data: [] });
      if (url.includes('medical-histories')) return Promise.resolve({ data: [] });
      if (url.includes('medical-documents')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api).mockResolvedValue({ data: { success: true } } as any);
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'pmh-saved-1',
        patient_id: 'pat-002',
        recorded_date: '2026-11-18',
        current_medical_info: {
          blood_pressure: '130/85 mmHg',
          blood_sugar: '110 mg/dL',
          temperature: 99.1,
          custom_vitals: [{ label: 'SpO2', value: '98%' }],
        },
      },
    } as any);
  });

  it('does NOT render Physical Vitals & Metrics in Basic Details (Step 1)', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} initialStep="personal" onSave={() => {}} />,
    );

    // Verify Title is present
    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    // Verify Physical Vitals & Metrics section has been removed from Step 1
    expect(screen.queryByText('Physical Vitals & Metrics')).not.toBeInTheDocument();
  });

  it('renders BP, Blood Sugar, and Body Temperature fields in Physical Vitals & Biometrics in the Past Medical History tab', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} initialStep="history" onSave={() => {}} />,
    );

    expect(screen.getByText('Physical Vitals & Biometrics')).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Pressure \(BP\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Sugar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Body Temperature/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add Custom Field/i }).length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('allows dynamically adding and removing custom vital fields in Physical Vitals & Biometrics', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} initialStep="history" onSave={() => {}} />,
    );

    const addCustomBtn = screen.getAllByRole('button', { name: /Add Custom Field/i })[0]!;
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

  it('submits BP, Blood Sugar, Temperature, and custom vitals when saving in Past Medical History', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={mockPatientWithVitals} initialStep="history" onSave={onSave} />,
    );

    // Fill in vitals
    fireEvent.change(screen.getByLabelText(/Blood Pressure \(BP\)/i), {
      target: { value: '130/85 mmHg' },
    });
    fireEvent.change(screen.getByLabelText(/Blood Sugar/i), {
      target: { value: '110 mg/dL' },
    });
    fireEvent.change(screen.getByLabelText(/Body Temperature/i), {
      target: { value: '99.1' },
    });

    // Add a custom field
    const addCustomBtn = screen.getAllByRole('button', { name: /Add Custom Field/i })[0]!;
    fireEvent.click(addCustomBtn);
    const metricInputs = screen.getAllByPlaceholderText(/Metric name/i);
    const valueInputs = screen.getAllByPlaceholderText(/Value/i);
    fireEvent.change(metricInputs[metricInputs.length - 1]!, {
      target: { value: 'SpO2' },
    });
    fireEvent.change(valueInputs[valueInputs.length - 1]!, {
      target: { value: '98%' },
    });

    // Click Save & Next in medical history
    const saveBtn = screen.getByTestId('save-and-next-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'patients/pat-002/medical-histories',
        expect.objectContaining({
          current_medical_info: expect.objectContaining({
            blood_pressure: '130/85 mmHg',
            blood_sugar: '110 mg/dL',
            temperature: 99.1,
            custom_vitals: expect.arrayContaining([
              expect.objectContaining({ label: 'SpO2', value: '98%' }),
            ]),
          }),
        }),
      );
    });
  }, 15000);

  it('populates existing vitals and custom metrics when editing a patient in Past Medical History', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={mockPatientWithVitals} initialStep="history" onSave={() => {}} />,
    );

    expect(screen.getByLabelText(/Blood Pressure \(BP\)/i)).toHaveValue('120/80 mmHg');
    expect(screen.getByLabelText(/Blood Sugar/i)).toHaveValue('98 mg/dL');
    expect(screen.getByLabelText(/Body Temperature/i)).toHaveValue(98.6);

    expect(screen.getByDisplayValue('Pulse Rate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('72 bpm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SpO2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('99%')).toBeInTheDocument();
  });

  it('renders metric name, value, and tablet name in custom field rows when clicking Add Custom Field', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={() => {}} patient={null} initialStep="history" onSave={() => {}} />,
    );

    // Click Add Custom Field
    const addCustomBtn = screen.getAllByTestId('add-custom-vital-btn')[0]!;
    expect(addCustomBtn).toBeInTheDocument();
    fireEvent.click(addCustomBtn);

    // Verify all 3 inputs: Metric Name, Value, Tablet Name are present
    const metricInput = screen.getByPlaceholderText(/Metric name/i);
    const valueInput = screen.getByPlaceholderText(/Value/i);
    const tabletInput = screen.getByPlaceholderText(/Tablet name/i);

    expect(metricInput).toBeInTheDocument();
    expect(valueInput).toBeInTheDocument();
    expect(tabletInput).toBeInTheDocument();

    // Type into all 3 fields
    fireEvent.change(metricInput, { target: { value: 'Blood Pressure' } });
    fireEvent.change(valueInput, { target: { value: '140/90' } });
    fireEvent.change(tabletInput, { target: { value: 'Telmisartan 40mg' } });

    expect(metricInput).toHaveValue('Blood Pressure');
    expect(valueInput).toHaveValue('140/90');
    expect(tabletInput).toHaveValue('Telmisartan 40mg');
  });
});
