import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EditAppointmentModal from '../components/EditAppointmentModal';
import ScheduleAppointmentModal, {
  validateAppointmentNote,
  validateAppointmentPatientName,
  validateAppointmentPatientPhone,
  validateAppointmentPurpose,
} from '../components/ScheduleAppointmentModal';
import type { Appointment } from '../types/appointment';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDoctors = [
  { id: 'doctor-1', name: 'Dr. Narendran', specialization: 'Oncology', status: 'ACTIVE' },
];

const mockSlots = [
  {
    id: 'slot-1',
    doctorId: 'doctor-1',
    slotTime: '2026-11-06T09:30:00',
    start_time: '09:30:00',
    end_time: '10:00:00',
    session: 'morning' as const,
    maxCapacity: 1,
    isBooked: false,
  },
];

const mockAppointment: Appointment = {
  id: 'appt-1',
  patientId: 'patient-1',
  patientName: 'Jane Smith',
  patientPhone: '9876543210',
  patientEmail: 'jane@example.com',
  doctorId: 'doctor-1',
  doctorName: 'Dr. Narendran',
  doctorSpecialty: 'Oncology',
  date: '2026-11-06',
  time: '10:00 AM',
  tokenNumber: '#01',
  purpose: 'Routine Follow-up',
  status: 'scheduled',
  scheduledStart: '2026-11-06T04:30:00.000Z',
  scheduledEnd: '2026-11-06T04:55:00.000Z',
  createdAt: '2026-11-01T10:00:00.000Z',
  created_at: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

describe('Appointment validation functions', () => {
  describe('validateAppointmentPatientName', () => {
    it('requires patient name', () => {
      expect(validateAppointmentPatientName('')).toBe('Patient full name is required.');
      expect(validateAppointmentPatientName('   ')).toBe('Patient full name is required.');
    });

    it('enforces min 2 chars and max 100 chars', () => {
      expect(validateAppointmentPatientName('A')).toBe('Patient name must be at least 2 characters.');
      expect(validateAppointmentPatientName('A'.repeat(101))).toBe('Patient name cannot exceed 100 characters.');
    });

    it('rejects numbers and disallowed special characters', () => {
      expect(validateAppointmentPatientName('Patient 123')).toBe('Numbers are not allowed in patient name.');
      expect(validateAppointmentPatientName('Jane @ Hospital')).toBe(
        'Patient name can only contain letters, spaces, hyphens, and periods.',
      );
    });

    it('accepts valid patient names', () => {
      expect(validateAppointmentPatientName('Jane Doe')).toBeUndefined();
      expect(validateAppointmentPatientName('Mary-Jane Watson')).toBeUndefined();
      expect(validateAppointmentPatientName('Dr. A. B. Raman')).toBeUndefined();
    });
  });

  describe('validateAppointmentPatientPhone', () => {
    it('requires phone when isRequired is true', () => {
      expect(validateAppointmentPatientPhone('', true)).toBe('Patient phone number is required.');
      expect(validateAppointmentPatientPhone('   ', true)).toBe('Patient phone number is required.');
    });

    it('allows blank when isRequired is false', () => {
      expect(validateAppointmentPatientPhone('', false)).toBeUndefined();
      expect(validateAppointmentPatientPhone('   ', false)).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateAppointmentPatientPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateAppointmentPatientPhone('1234567')).toBeUndefined();
      expect(validateAppointmentPatientPhone('+919876543210')).toBeUndefined();
      expect(validateAppointmentPatientPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateAppointmentPatientPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateAppointmentPatientPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateAppointmentPurpose and validateAppointmentNote', () => {
    it('validates appointment purpose', () => {
      expect(validateAppointmentPurpose('')).toBe('Please specify the purpose of the appointment.');
      expect(validateAppointmentPurpose('A'.repeat(256))).toBe('Purpose cannot exceed 255 characters.');
      expect(validateAppointmentPurpose('General Consultation')).toBeUndefined();
    });

    it('validates appointment note', () => {
      expect(validateAppointmentNote('')).toBeUndefined();
      expect(validateAppointmentNote('A'.repeat(501))).toBe('Note must be under 500 characters.');
      expect(validateAppointmentNote('Patient prefers morning slots.')).toBeUndefined();
    });
  });
});

describe('ScheduleAppointmentModal Real-time Typing Sanitization and Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'doctors') return Promise.resolve({ data: mockDoctors });
      if (url === 'patients') return Promise.resolve({ data: [] });
      if (url === 'appointments/slots') {
        return Promise.resolve({
          data: {
            data: {
              summaries: [
                {
                  date: '2026-11-06',
                  dayName: 'Fri',
                  dayNumber: 6,
                  availableCount: 1,
                  slots: mockSlots,
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('strips letters and special characters typed into the new patient phone field', async () => {
    renderWithProviders(
      <ScheduleAppointmentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('New Patient'));

    const phoneInput = screen.getByPlaceholderText('Enter contact number') as HTMLInputElement;

    // Type letters and special characters into phone
    fireEvent.change(phoneInput, { target: { value: 'abc+91#98765$43210' } });

    // Sanitizer removes abc, #, $ but keeps + and digits
    expect(phoneInput.value).toBe('+919876543210');
  });

  it('strips numbers and invalid symbols typed into new patient name', async () => {
    renderWithProviders(
      <ScheduleAppointmentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('New Patient'));

    const nameInput = screen.getByPlaceholderText('Enter full name') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Jane Doe 2nd #Best' } });

    expect(nameInput.value).toBe('Jane Doe nd Best');
  });

  it('shows validation errors and prevents submit when new patient name and phone are empty', async () => {
    const handleSuccess = vi.fn();
    renderWithProviders(
      <ScheduleAppointmentModal isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Morning Slots')).toBeInTheDocument();
    });

    // Select available slot
    fireEvent.click(screen.getByText(/9:30/i));

    // Switch to new patient mode
    fireEvent.click(screen.getByText('New Patient'));

    const submitBtn = screen.getByRole('button', { name: /Schedule Appointment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Patient full name is required.').length).toBeGreaterThanOrEqual(1);
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <ScheduleAppointmentModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Morning Slots')).toBeInTheDocument();
    });

    // Select available slot
    fireEvent.click(screen.getByText(/9:30/i));

    fireEvent.click(screen.getByText('New Patient'));

    fireEvent.change(screen.getByPlaceholderText('Enter full name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter contact number'), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Schedule Appointment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Phone number must be at least 7 digits.').length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('EditAppointmentModal Real-time Typing Sanitization and Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'doctors') return Promise.resolve({ data: mockDoctors });
      if (url === 'appointments/slots') {
        return Promise.resolve({
          data: {
            data: {
              summaries: [
                {
                  date: '2026-11-06',
                  dayName: 'Fri',
                  dayNumber: 6,
                  availableCount: 1,
                  slots: mockSlots,
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('strips numbers and invalid characters from edit patient name and phone', async () => {
    renderWithProviders(
      <EditAppointmentModal
        isOpen={true}
        appointment={mockAppointment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const nameInput = screen.getByPlaceholderText('Patient full name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Jane 123 Doe!' } });
    expect(nameInput.value).toBe('Jane  Doe');

    const phoneInput = screen.getByPlaceholderText('Contact phone number') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: 'call+91#98765' } });
    expect(phoneInput.value).toBe('+9198765');
  });

  it('shows error if edited phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <EditAppointmentModal
        isOpen={true}
        appointment={mockAppointment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const phoneInput = screen.getByPlaceholderText('Contact phone number') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Phone number must be at least 7 digits.').length).toBeGreaterThanOrEqual(1);
      expect(api.put).not.toHaveBeenCalled();
    });
  });
});
