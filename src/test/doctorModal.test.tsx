import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DoctorModal, { type Doctor } from '../components/DoctorModal';
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

const mockUsers = [
  { id: 'usr-1', username: 'dr.smith', role: 'DOCTOR', status: 'ACTIVE' },
];

const mockDoctor: Doctor = {
  id: 'doc-001',
  name: 'Dr. Ramesh Kumar',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Hospitals',
  branch_id: 'branch-1',
  branch_name: 'Greams Road Branch',
  user_account_id: 'usr-1',
  phone: '+91 9876543210',
  email: 'ramesh@apollo.com',
  specialization: 'Cardiology',
  status: 'ACTIVE',
  qualification: 'MBBS, MD (Cardiology)',
  medical_registration_number: 'TN-MED-12345',
  address_line_1: 'Room 204, Heart Centre, Tower A',
  address_line_2: '21 Greams Lane, Thousand Lights',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600006',
  clinic_address: 'Room 204, Heart Centre, Tower A, 21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu, 600006',
  years_of_experience: 12,
  profile_image_url: 'https://example.com/dr-ramesh.jpg',
  podcast_url: 'https://youtube.com/@dr-ramesh',
  is_active: true,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Doctor Create/Edit Modal - Clinic Address fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: mockBranches });
      if (url === 'user-accounts') return Promise.resolve({ data: mockUsers });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders all 5 clinic address fields in Doctor create modal', async () => {
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    expect(screen.getByText('Add New Doctor')).toBeInTheDocument();
    expect(screen.getByText('Clinic / Consultation Room Address')).toBeInTheDocument();

    expect(screen.getByLabelText('Address Line 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Address Line 2 (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('City / Town')).toBeInTheDocument();
    expect(screen.getByLabelText('State / Province')).toBeInTheDocument();
    expect(screen.getByLabelText('Pincode / Postal Code')).toBeInTheDocument();
  });

  it('submits multiple address fields when creating a doctor', async () => {
    vi.mocked(api).mockResolvedValue({ data: { id: 'new-doc-1' } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <DoctorModal isOpen={true} onClose={handleClose} doctor={null} onSave={handleSave} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Assigned Hospital/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Dr. Jane Smith/i), {
      target: { value: 'Dr. Ananya Roy' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });

    fireEvent.change(screen.getByLabelText('Address Line 1'), {
      target: { value: 'Suite 401, OPD Block B' },
    });
    fireEvent.change(screen.getByLabelText('Address Line 2 (Optional)'), {
      target: { value: 'Opposite Main Atrium' },
    });
    fireEvent.change(screen.getByLabelText('City / Town'), {
      target: { value: 'Coimbatore' },
    });
    fireEvent.change(screen.getByLabelText('State / Province'), {
      target: { value: 'Tamil Nadu' },
    });
    fireEvent.change(screen.getByLabelText('Pincode / Postal Code'), {
      target: { value: '641018' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Doctor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'doctors',
          data: expect.objectContaining({
            name: 'Dr. Ananya Roy',
            hospital_id: 'hosp-1',
            address_line_1: 'Suite 401, OPD Block B',
            address_line_2: 'Opposite Main Atrium',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pincode: '641018',
            clinic_address:
              'Suite 401, OPD Block B, Opposite Main Atrium, Coimbatore, Tamil Nadu, 641018',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('populates multiple address fields when editing an existing doctor', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <DoctorModal isOpen={true} onClose={handleClose} doctor={mockDoctor} onSave={handleSave} />,
    );

    expect(screen.getByText(`Edit Doctor · ${mockDoctor.name}`)).toBeInTheDocument();

    expect(screen.getByDisplayValue('Room 204, Heart Centre, Tower A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('21 Greams Lane, Thousand Lights')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chennai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tamil Nadu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('600006')).toBeInTheDocument();

    // Modify city and address line 1
    fireEvent.change(screen.getByLabelText('City / Town'), {
      target: { value: 'Madurai' },
    });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'doctors/doc-001',
          data: expect.objectContaining({
            address_line_1: 'Room 204, Heart Centre, Tower A',
            city: 'Madurai',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('renders enhanced Assigned Hospital and Linked User Account dropdowns with status cards', async () => {
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Assigned Hospital/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Linked User Account/i)).toBeInTheDocument();
    });

    // Both enhanced dropdowns exist
    expect(screen.getByText('Hospital & Practice Assignment')).toBeInTheDocument();
    expect(screen.getByText('Doctor portal web login credentials')).toBeInTheDocument();
    expect(screen.getByText('No portal account linked')).toBeInTheDocument();

    // Select a hospital
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });

    await waitFor(() => {
      expect(screen.getByText('APL')).toBeInTheDocument();
    });

    // Select linked user account
    fireEvent.change(screen.getByLabelText(/Linked User Account/i), {
      target: { value: 'usr-1' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Portal Login Linked: @dr\.smith/i)).toBeInTheDocument();
    });
  });

  it('pre-selects gender when editing a doctor and submits updated gender', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();

    const doctorWithGender: Doctor = {
      ...mockDoctor,
      gender: 'FEMALE',
    };

    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={doctorWithGender} onSave={handleSave} />,
    );

    const genderSelect = screen.getByLabelText(/^Gender$/i) as HTMLSelectElement;
    expect(genderSelect.value).toBe('FEMALE');

    // Change gender to MALE
    fireEvent.change(genderSelect, { target: { value: 'MALE' } });
    expect(genderSelect.value).toBe('MALE');

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'doctors/doc-001',
          data: expect.objectContaining({
            gender: 'MALE',
          }),
        }),
      );
    });
  });
});
