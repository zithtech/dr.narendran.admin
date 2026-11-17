import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DoctorProfilePage from '../pages/DoctorProfilePage';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDoctor = {
  id: 'doc-001',
  name: 'Dr. S. Narendran',
  phone: '9876543210',
  email: 'narendran@hospital.com',
  specialization: 'Consultant Oncologist',
  qualification: 'MBBS, MD (RT)',
  medical_registration_number: '106226',
  years_of_experience: 15,
  gender: 'MALE',
  status: 'ACTIVE',
  clinic_address: 'Main Health Complex, Anna Nagar, Chennai',
  address_line_1: 'Main Health Complex',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600040',
  podcast_url: 'https://youtube.com/watch?v=sample',
  profile_image_url: null,
};

const mockSlots = [
  {
    id: 'slot-1',
    day_of_week: 'MONDAY',
    start_time: '09:00',
    end_time: '13:00',
  },
  {
    id: 'slot-2',
    day_of_week: 'WEDNESDAY',
    start_time: '14:00',
    end_time: '18:00',
  },
];

describe('DoctorProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('doctors/me')) {
        return { data: mockDoctor };
      }
      if (url.includes('doctor-availability/doctor/')) {
        return { data: mockSlots };
      }
      if (url.includes('branches')) {
        return { data: [{ id: 'br-1', name: 'Main Campus Branch' }] };
      }
      return { data: null };
    });
  });

  it('loads and displays authenticated doctor credentials and practice information', async () => {
    renderWithProviders(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Dr. S. Narendran')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Consultant Oncologist').length).toBeGreaterThan(0);
    expect(screen.getByText('MBBS, MD (RT)')).toBeInTheDocument();
    expect(screen.getByText('106226')).toBeInTheDocument();
    expect(screen.getByText('15 Years')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('narendran@hospital.com')).toBeInTheDocument();
    expect(screen.getByText(/Main Health Complex, Anna Nagar, Chennai/i)).toBeInTheDocument();

    // Check consultation slots
    await waitFor(() => {
      expect(screen.getByText('MONDAY')).toBeInTheDocument();
      expect(screen.getByText(/09:00 - 13:00/i)).toBeInTheDocument();
      expect(screen.getByText('WEDNESDAY')).toBeInTheDocument();
      expect(screen.getByText(/14:00 - 18:00/i)).toBeInTheDocument();
    });

    // Edit Profile button should NOT be present
    expect(screen.queryByRole('button', { name: /Edit Profile/i })).not.toBeInTheDocument();

    // Inline photo upload button should be present
    expect(screen.getByRole('button', { name: /Change Profile Photo/i })).toBeInTheDocument();

    // Add Weekly Schedule button should be present
    expect(screen.getByRole('button', { name: /Add Weekly Schedule/i })).toBeInTheDocument();
  });

  it('allows inline editing for name, email, and phone directly without drawer or modal', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: {
        ...mockDoctor,
      },
    });

    renderWithProviders(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Dr. S. Narendran')).toBeInTheDocument();
    });

    // 1. Inline Edit Name
    const editNameBtn = screen.getByRole('button', { name: /Edit Name/i });
    fireEvent.click(editNameBtn);

    const nameInput = screen.getByLabelText(/Doctor Name/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. S. Narendran, MD' } });

    const saveNameBtn = screen.getByRole('button', { name: /Save Name/i });
    fireEvent.click(saveNameBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/doctors/me',
        expect.objectContaining({
          name: 'Dr. S. Narendran, MD',
        })
      );
    });

    // 2. Inline Edit Email
    const editEmailBtn = screen.getByRole('button', { name: /Edit Email/i });
    fireEvent.click(editEmailBtn);

    const emailInput = screen.getByLabelText(/Doctor Email/i);
    fireEvent.change(emailInput, { target: { value: 'dr.new@hospital.com' } });

    const saveEmailBtn = screen.getByRole('button', { name: /Save Email/i });
    fireEvent.click(saveEmailBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/doctors/me',
        expect.objectContaining({
          email: 'dr.new@hospital.com',
        })
      );
    });

    // 3. Inline Edit Phone
    const editPhoneBtn = screen.getByRole('button', { name: /Edit Phone/i });
    fireEvent.click(editPhoneBtn);

    const phoneInput = screen.getByLabelText(/Doctor Phone/i);
    fireEvent.change(phoneInput, { target: { value: '9123456789' } });

    const savePhoneBtn = screen.getByRole('button', { name: /Save Phone/i });
    fireEvent.click(savePhoneBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/doctors/me',
        expect.objectContaining({
          phone: '9123456789',
        })
      );
    });
  });

  it('allows adding and removing weekly schedule slots directly on the profile page', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'slot-new',
        day_of_week: 'FRIDAY',
        start_time: '10:00',
        end_time: '14:00',
      },
    });

    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    renderWithProviders(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Dr. S. Narendran')).toBeInTheDocument();
    });

    // Open inline Add Schedule form
    const addScheduleBtn = screen.getByRole('button', { name: /Add Weekly Schedule/i });
    fireEvent.click(addScheduleBtn);

    // Form should appear
    expect(screen.getByText('New Consultation Slot')).toBeInTheDocument();

    const daySelect = screen.getByLabelText(/Day of Week/i);
    fireEvent.change(daySelect, { target: { value: 'FRIDAY' } });

    const startTimeInput = screen.getByLabelText(/Start Time/i);
    fireEvent.change(startTimeInput, { target: { value: '10:00' } });

    const endTimeInput = screen.getByLabelText(/End Time/i);
    fireEvent.change(endTimeInput, { target: { value: '14:00' } });

    const saveSlotBtn = screen.getByRole('button', { name: /Save Schedule Slot/i });
    fireEvent.click(saveSlotBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'doctor-availability',
        expect.objectContaining({
          doctor_id: 'doc-001',
          day_of_week: 'FRIDAY',
          start_time: '10:00',
          end_time: '14:00',
        })
      );
    });

    // Delete existing slot directly on page
    const deleteSlotBtn = screen.getByRole('button', { name: /Delete MONDAY slot 09:00 - 13:00/i });
    fireEvent.click(deleteSlotBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('doctor-availability/slot-1');
    });
  });
});
