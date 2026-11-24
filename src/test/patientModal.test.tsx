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

const mockDoctors = [
  { id: 'doc-001', name: 'Dr. Ramesh Kumar', specialization: 'Cardiology', hospital_name: 'Apollo Hospitals', status: 'ACTIVE' },
];

const mockReferrals = [
  { id: 'ref-001', name: 'Dr. Sarah Connor', occupation: 'Cardiologist', phone: '9876543210', city: 'Chennai', status: 'ACTIVE' },
];

const mockAllianceDoctors = [
  {
    id: 'alliance-doc-001',
    name: 'Dr. Suresh Varma',
    specialization: 'Oncology',
    hospital_clinic_name: 'Metro Care Clinic',
    category: 'Surgical Partner',
    city: 'Coimbatore',
    mobile_number: '+91 94433 22110',
    email: 'suresh.varma@metrocare.com',
    status: 'ACTIVE',
  },
];

const mockPatient: Patient = {
  id: 'pat-001',
  user_account_id: null,
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Hospitals',
  branch_id: 'branch-1',
  branch_name: 'Greams Road Branch',
  name: 'Meena Sundaram',
  phone: '+91 9123456780',
  email: 'meena@example.com',
  date_of_birth: '1988-06-15',
  gender: 'Female',
  address_line_1: 'Flat 3A, Silver Oak Apts',
  address_line_2: '12th Main Road, Anna Nagar',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600040',
  address: 'Flat 3A, Silver Oak Apts, 12th Main Road, Anna Nagar, Chennai, Tamil Nadu, 600040',
  status: 'ACTIVE',
  height_cm: 165,
  weight_kg: 58,
  blood_group: 'B+',
  marital_status: 'Married',
  is_active: true,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Patient Create/Edit Modal - Residential Address fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: mockBranches });
      if (url === 'user-accounts') return Promise.resolve({ data: [] });
      if (url === 'doctors') return Promise.resolve({ data: mockDoctors });
      if (url === 'referrals') return Promise.resolve({ data: mockReferrals });
      if (url.startsWith('alliances/doctors')) return Promise.resolve({ data: mockAllianceDoctors });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders all 5 address fields in Patient create modal', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    expect(screen.getByText('Residential Address')).toBeInTheDocument();

    expect(screen.getByLabelText('Address Line 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Address Line 2 (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('City / Town')).toBeInTheDocument();
    expect(screen.getByLabelText('State / Province')).toBeInTheDocument();
    expect(screen.getByLabelText('Pincode / Postal Code')).toBeInTheDocument();
  });

  it('submits multiple address fields when creating a new patient', async () => {
    vi.mocked(api).mockResolvedValue({ data: { id: 'new-pat-1' } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <PatientModal isOpen={true} onClose={handleClose} patient={null} onSave={handleSave} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Assigned Hospital/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e.g. John Doe/i), {
      target: { value: 'Karthik Subramanian' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });

    fireEvent.change(screen.getByLabelText('Address Line 1'), {
      target: { value: 'No. 45, Temple Street' },
    });
    fireEvent.change(screen.getByLabelText('Address Line 2 (Optional)'), {
      target: { value: 'Mylapore' },
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

    const submitBtn = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'patients',
          data: expect.objectContaining({
            name: 'Karthik Subramanian',
            hospital_id: 'hosp-1',
            address_line_1: 'No. 45, Temple Street',
            address_line_2: 'Mylapore',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600004',
            address: 'No. 45, Temple Street, Mylapore, Chennai, Tamil Nadu, 600004',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('populates multiple address fields when editing an existing patient', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <PatientModal isOpen={true} onClose={handleClose} patient={mockPatient} onSave={handleSave} />,
    );

    expect(screen.getByText(`Edit Patient · ${mockPatient.name}`)).toBeInTheDocument();

    expect(screen.getByDisplayValue('Flat 3A, Silver Oak Apts')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12th Main Road, Anna Nagar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chennai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tamil Nadu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('600040')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('City / Town'), {
      target: { value: 'Tiruchirappalli' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'patients/pat-001',
          data: expect.objectContaining({
            address_line_1: 'Flat 3A, Silver Oak Apts',
            city: 'Tiruchirappalli',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('renders Age field in Basic Information and auto-calculates age by default when Date of Birth is selected', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    const dobInput = screen.getByLabelText('Date of Birth') as HTMLInputElement;
    const ageInput = screen.getByLabelText('Age') as HTMLInputElement;

    expect(dobInput).toBeInTheDocument();
    expect(ageInput).toBeInTheDocument();
    expect(ageInput.value).toBe('');

    // Select Date of Birth (e.g. 1995-05-12)
    fireEvent.change(dobInput, { target: { value: '1995-05-12' } });

    // Age field should automatically show the calculated age by default
    expect(ageInput.value).toMatch(/\d+\s+yrs/);

    // Existing patient with DOB should automatically display calculated age
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={mockPatient} onSave={vi.fn()} />,
    );
    const existingAgeInputs = screen.getAllByLabelText('Age') as HTMLInputElement[];
    const lastAgeInput = existingAgeInputs[existingAgeInputs.length - 1];
    expect(lastAgeInput?.value).toMatch(/\d+\s+yrs/);
  });

  it('renders Referrals card after Basic Information with 2 dropdowns, supporting Referrals and Doctor', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    // Check Referrals card exists
    expect(screen.getAllByText('Referrals').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Specify patient referral channel and referring doctor or partner.'),
    ).toBeInTheDocument();

    // Check dropdowns
    expect(screen.getByLabelText('Referred by')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Choose 'Referred by' first/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('loads referral partner details for existing patient with referral record', async () => {
    const patientWithReferral: Patient = {
      ...mockPatient,
      referred_by: 'REFERRAL',
      referral_id: 'ref-001',
    };

    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={patientWithReferral} onSave={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dr. Sarah Connor').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Active Referral')).toBeInTheDocument();
    });
  });

  it('loads alliance doctor details for existing patient with alliance referral record', async () => {
    const patientWithAlliance: Patient = {
      ...mockPatient,
      referred_by: 'ALLIANCE',
      referral_doctor_id: 'alliance-doc-001',
      alliance_doctor_id: 'alliance-doc-001',
    };

    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={patientWithAlliance} onSave={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dr. Suresh Varma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Active Alliance Doctor')).toBeInTheDocument();
      expect(screen.getByText('+91 94433 22110')).toBeInTheDocument();
    });
  });
});

