import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppointmentDrawer from '../components/AppointmentDrawer';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import EditAppointmentModal from '../components/EditAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import Appointments from '../pages/Appointments';
import DoctorTodayAppointments from '../pages/DoctorTodayAppointments';
import type { Appointment, DoctorDailyScheduleResult } from '../types/appointment';
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

const mockAppointments: Appointment[] = [
  {
    id: 'appt-1',
    patientId: 'patient-1',
    patientName: 'Jane Smith',
    patientPhone: '9876543210',
    patientEmail: 'jane@example.com',
    doctorId: 'doctor-1',
    doctorName: 'Dr. Narendran',
    doctorSpecialty: 'Oncology',
    date: 'Fri, Nov 6, 2026',
    time: '10:00 AM',
    tokenNumber: '#01',
    purpose: 'Routine Follow-up',
    status: 'scheduled',
    scheduledStart: '2026-11-06T04:30:00.000Z',
    scheduledEnd: '2026-11-06T04:55:00.000Z',
    createdAt: '2026-11-01T10:00:00.000Z',
    created_at: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'appt-2',
    patientId: 'patient-2',
    patientName: 'Robert Johnson',
    patientPhone: '9812345678',
    doctorId: 'doctor-1',
    doctorName: 'Dr. Narendran',
    doctorSpecialty: 'Oncology',
    date: 'Fri, Nov 6, 2026',
    time: '10:30 AM',
    tokenNumber: '#02',
    purpose: 'Biopsy Consultation',
    status: 'rescheduled',
    rescheduleReason: 'Patient requested afternoon slot',
    scheduledStart: '2026-11-06T05:00:00.000Z',
    scheduledEnd: '2026-11-06T05:25:00.000Z',
    createdAt: '2026-11-02T10:00:00.000Z',
    created_at: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
  },
];

const mockDoctors = [
  {
    id: 'doctor-1',
    name: 'Dr. Narendran',
    specialization: 'Oncology',
    status: 'ACTIVE',
  },
];

const mockPatients = [
  {
    id: 'patient-1',
    name: 'Jane Smith',
    phone: '9876543210',
    email: 'jane@example.com',
    status: 'ACTIVE',
    hospital_id: 'hosp-1',
  },
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
  {
    id: 'slot-2',
    doctorId: 'doctor-1',
    slotTime: '2026-11-06T10:00:00',
    start_time: '10:00:00',
    end_time: '10:30:00',
    session: 'morning' as const,
    maxCapacity: 1,
    isBooked: true, // Booked to test double-booking prevention!
  },
];

const mockDoctorSchedules: DoctorDailyScheduleResult = {
  date: '2026-11-06',
  totalAppointments: 2,
  doctors: [
    {
      id: 'doctor-1',
      name: 'Dr. Narendran',
      specialization: 'Oncology',
      phone: '+91 9876543210',
      email: 'dr.narendran@example.com',
      hospitalName: 'Apollo Hospital',
      branchName: 'Main Campus',
      stats: {
        total: 2,
        scheduled: 1,
        completed: 1,
        cancelled: 0,
      },
      appointments: [
        {
          id: 'sched-appt-1',
          patientId: 'patient-1',
          patientName: 'Jane Smith',
          patientPhone: '9876543210',
          doctorId: 'doctor-1',
          scheduledStart: '2026-11-06T09:30:00.000Z',
          scheduledEnd: '2026-11-06T10:00:00.000Z',
          date: '2026-11-06',
          time: '09:30 AM',
          tokenNumber: '#01',
          purpose: 'Cardiology Checkup',
          status: 'scheduled',
          createdAt: '2026-11-06T08:00:00.000Z',
        },
        {
          id: 'sched-appt-2',
          patientId: 'patient-2',
          patientName: 'Robert Johnson',
          patientPhone: '9812345678',
          doctorId: 'doctor-1',
          scheduledStart: '2026-11-06T10:30:00.000Z',
          scheduledEnd: '2026-11-06T11:00:00.000Z',
          date: '2026-11-06',
          time: '10:30 AM',
          tokenNumber: '#02',
          purpose: 'Biopsy Consultation',
          status: 'completed',
          createdAt: '2026-11-06T08:15:00.000Z',
        },
      ],
    },
    {
      id: 'doctor-2',
      name: 'Dr. Sarah Johnson',
      specialization: 'General Medicine',
      phone: '+91 9845123456',
      hospitalName: 'Apollo Hospital',
      branchName: 'North Wing',
      stats: {
        total: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      },
      appointments: [],
    },
  ],
};

describe('Appointments Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders appointments list page with appointments, doctor, and status', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('appointments')) {
        return Promise.resolve({ data: mockAppointments });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Appointments />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Robert Johnson')).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Narendran').length).toBeGreaterThan(0);
      expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
    });

    // Check that 3-dot action buttons are rendered for rows
    const actionButtons = screen.getAllByRole('button', { name: /Actions for/i });
    expect(actionButtons.length).toBe(2);

    // Clicking the 3-dot button opens the actions menu with Edit, View Details, Reschedule, Cancel
    fireEvent.click(actionButtons[0]!);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Reschedule')).toBeInTheDocument();
      expect(screen.getByText('Cancel Appointment')).toBeInTheDocument();
    });

    // Check that clicking a row checkbox displays the floating bulk action bar
    const rowCheckbox = screen.getByLabelText(/Select Jane Smith/i);
    fireEvent.click(rowCheckbox);
    expect(screen.getByText('Clear selection')).toBeInTheDocument();
    expect(screen.getByText(/appointment selected/i)).toBeInTheDocument();

    // Clicking clear deselects
    fireEvent.click(screen.getByText('Clear selection'));
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('opens appointment details drawer when appointment is viewed', async () => {
    const handleClose = vi.fn();
    const handleReschedule = vi.fn();
    const handleCancel = vi.fn();

    renderWithProviders(
      <AppointmentDrawer
        appointment={mockAppointments[0]!}
        onClose={handleClose}
        onReschedule={handleReschedule}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    expect(screen.getByText('Dr. Narendran')).toBeInTheDocument();
    expect(screen.getByText('Routine Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Cancel Appointment')).toBeInTheDocument();
    expect(screen.getByText('Reschedule')).toBeInTheDocument();
  });

  it('schedule appointment modal switches between Existing Patient and New Patient and displays available slots', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'doctors') return Promise.resolve({ data: mockDoctors });
      if (url === 'patients') return Promise.resolve({ data: mockPatients });
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

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderWithProviders(
      <ScheduleAppointmentModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Schedule New Appointment')).toBeInTheDocument();
    expect(screen.getByText('Existing Patient')).toBeInTheDocument();
    expect(screen.getByText('New Patient')).toBeInTheDocument();

    // Wait for patients to load into SearchableSelect
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Jane Smith/i })).toBeInTheDocument();
    });
    const patientSelect = screen.getByLabelText(/Select Patient/i);
    fireEvent.change(patientSelect, { target: { value: 'patient-1' } });
    await waitFor(() => {
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Click New Patient
    fireEvent.click(screen.getByText('New Patient'));
    expect(screen.getByPlaceholderText('Enter full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter contact number')).toBeInTheDocument();

    // Verify double-booking prevention: slot-2 is booked and disabled
    await waitFor(() => {
      const bookedLabels = screen.getAllByText('Booked');
      expect(bookedLabels.length).toBeGreaterThan(0);
    });
  });

  it('reschedule modal displays slots with double booking prevention and submits', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
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

    vi.mocked(api.post).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderWithProviders(
      <RescheduleAppointmentModal
        isOpen={true}
        appointment={mockAppointments[0]!}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Reschedule Appointment')).toBeInTheDocument();
    expect(screen.getByText(/Double-booking protected/i)).toBeInTheDocument();

    // Wait for slots to load
    await waitFor(() => {
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });
  });

  it('cancel modal renders and submits cancellation reason', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderWithProviders(
      <CancelAppointmentModal
        isOpen={true}
        appointment={mockAppointments[0]!}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Cancel Appointment')).toBeInTheDocument();
    expect(screen.getByText(/Confirm Cancellation/i)).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Patient rescheduled/i);
    fireEvent.change(reasonInput, { target: { value: 'Patient had travel conflict' } });

    fireEvent.click(screen.getByText('Confirm Cancellation'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('appointments/appt-1/cancel', {
        reason: 'Patient had travel conflict',
      });
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renders Doctors Today Appointments tab displaying registered doctors and their daily schedules', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('doctor-schedules')) {
        return Promise.resolve({ data: { status: 'success', data: mockDoctorSchedules } });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<DoctorTodayAppointments />);

    await waitFor(() => {
      // Check Doctors Today Appointments view and doctor with appointment are displayed
      expect(screen.getByText('Doctors Today Appointments')).toBeInTheDocument();
      expect(screen.getByText('Dr. Narendran')).toBeInTheDocument();
    });

    // Check doctor-wise stats
    expect(screen.getByText('2 total')).toBeInTheDocument();
    expect(screen.getByText('1 scheduled')).toBeInTheDocument();
    expect(screen.getByText('1 done')).toBeInTheDocument();

    // Check appointment details for scheduled day
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('09:30 AM')).toBeInTheDocument();
    expect(screen.getByText('#01')).toBeInTheDocument();
    expect(screen.getByText('Cardiology Checkup')).toBeInTheDocument();

    // Doctor with appointments is listed. By default, doctor without appointments is filtered out.
    // Unchecking "Only show doctors with appointments" displays doctors without appointments
    const onlyWithApptsCheckbox = screen.getByLabelText(/Only show doctors with appointments/i);
    fireEvent.click(onlyWithApptsCheckbox);

    expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText(/No appointments scheduled for Dr. Sarah Johnson/i)).toBeInTheDocument();
  });

  it('filters appointments by doctor and by date in Doctors Today Appointments', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('doctor-schedules')) {
        return Promise.resolve({ data: { status: 'success', data: mockDoctorSchedules } });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<DoctorTodayAppointments />);

    await waitFor(() => {
      expect(screen.getByText('Dr. Narendran')).toBeInTheDocument();
    });

    // Filter by doctor
    const doctorSelect = screen.getByLabelText(/Doctor:/i);
    fireEvent.change(doctorSelect, { target: { value: 'doctor-1' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        'appointments/doctor-schedules',
        expect.objectContaining({
          params: expect.objectContaining({ doctorId: 'doctor-1' }),
        }),
      );
    });

    // Navigate to previous day
    const prevDayBtn = screen.getByTitle('Previous Day');
    fireEvent.click(prevDayBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        'appointments/doctor-schedules',
        expect.objectContaining({
          params: expect.objectContaining({ doctorId: 'doctor-1' }),
        }),
      );
    });
  });

  it('switches between All Appointments and Doctors Today Appointments tab in Appointments page', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('doctor-schedules')) {
        return Promise.resolve({ data: { status: 'success', data: mockDoctorSchedules } });
      }
      if (url.includes('appointments')) {
        return Promise.resolve({ data: mockAppointments });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Appointments />);

    // By default, All Appointments is displayed
    await waitFor(() => {
      expect(screen.getByText('All Appointments')).toBeInTheDocument();
      expect(screen.getByText('Doctors Today Appointments')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Click Doctors Today Appointments tab
    fireEvent.click(screen.getByText('Doctors Today Appointments'));

    // Should now display Doctor Today Appointments view
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Doctors Today Appointments/i })).toBeInTheDocument();
      expect(screen.getByText('Dr. Narendran')).toBeInTheDocument();
    });
  });

  it('opens edit drawer instead of view drawer when Edit action is clicked from row menu', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('appointments')) {
        return Promise.resolve({ data: mockAppointments });
      }
      if (url === 'doctors') return Promise.resolve({ data: mockDoctors });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Appointments />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByRole('button', { name: /Actions for/i });
    fireEvent.click(actionButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    // Click "Edit"
    fireEvent.click(screen.getByText('Edit'));

    // Should open the Edit Appointment drawer, NOT Appointment Details (view)
    await waitFor(() => {
      expect(screen.getByText('Edit Appointment')).toBeInTheDocument();
      expect(screen.getAllByText(/Token #01/i).length).toBeGreaterThan(0);
      expect(screen.queryByText('Appointment Details')).not.toBeInTheDocument();
    });
  });

  it('edit drawer pre-fills existing appointment data and submits updates via api.put', async () => {
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

    vi.mocked(api.put).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderWithProviders(
      <EditAppointmentModal
        isOpen={true}
        appointment={mockAppointments[0]!}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Edit Appointment')).toBeInTheDocument();
    expect(screen.getByText(/Doctor & Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Consultation Reason & Clinical Notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Appointment Schedule & Time Slot/i)).toBeInTheDocument();

    // Verify scrollable drawer body layout
    const modalBody = document.querySelector('.appointment-edit-drawer-modal .ui-modal-body');
    expect(modalBody).toBeInTheDocument();
    expect(modalBody).toHaveStyle({ overflowY: 'auto' });

    // Check pre-filled patient info
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();

    // Change patient note
    const noteTextarea = screen.getByPlaceholderText(/Clinical notes, symptom duration, or patient requests/i);
    fireEvent.change(noteTextarea, { target: { value: 'Patient reported mild headache and fatigue.' } });

    // Submit changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        'appointments/appt-1',
        expect.objectContaining({
          doctorId: 'doctor-1',
          purpose: 'Routine Follow-up',
          patientNote: 'Patient reported mild headache and fatigue.',
          status: 'scheduled',
          patientName: 'Jane Smith',
          patientPhone: '9876543210',
        }),
      );
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('appointment details drawer includes Edit button that allows switching to edit mode', async () => {
    const handleClose = vi.fn();
    const handleReschedule = vi.fn();
    const handleCancel = vi.fn();
    const handleEdit = vi.fn();

    renderWithProviders(
      <AppointmentDrawer
        appointment={mockAppointments[0]!}
        onClose={handleClose}
        onReschedule={handleReschedule}
        onCancel={handleCancel}
        onEdit={handleEdit}
      />
    );

    expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    const editBtn = screen.getByRole('button', { name: /Edit/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockAppointments[0]!);
  });
});

