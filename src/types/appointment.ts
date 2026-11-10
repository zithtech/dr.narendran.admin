export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientGender?: string;
  patientDob?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorPhone?: string;
  doctorEmail?: string;
  branchName?: string;
  hospitalName?: string;
  slotId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  date: string;
  time: string;
  tokenNumber: string;
  purpose: string;
  patientNote?: string;
  status: AppointmentStatus;
  rescheduleReason?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  createdAt: string;
  created_at: string;
  updatedAt: string;
}

export interface AppointmentSlot {
  id: string;
  doctorId: string;
  slotTime: string;
  session: 'morning' | 'afternoon' | 'evening';
  maxCapacity: number;
  isBooked: boolean;
  start_time?: string;
  end_time?: string;
  location_id?: string;
  location_name?: string;
  location_address?: string;
  source?: 'custom' | 'regular';
}

export interface DateSlotSummary {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. Mon, Tue
  dayNumber: number;
  availableCount: number;
  isDoctorAvailable?: boolean;
  blockedReason?: string;
  slots: AppointmentSlot[];
}

export interface CreateAppointmentInput {
  slotId?: string;
  purpose: string;
  doctorId?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientNote?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface DoctorScheduleAppointmentItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorId: string;
  scheduledStart: string;
  scheduledEnd: string;
  date: string;
  time: string;
  tokenNumber: string;
  purpose: string;
  patientNote?: string;
  status: AppointmentStatus;
  rescheduleReason?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface DoctorScheduleSummary {
  id: string;
  userAccountId?: string;
  name: string;
  specialization: string;
  phone?: string;
  email?: string;
  hospitalName?: string;
  branchName?: string;
  profileImageUrl?: string;
  stats: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  appointments: DoctorScheduleAppointmentItem[];
}

export interface DoctorDailyScheduleResult {
  date: string;
  totalAppointments: number;
  doctors: DoctorScheduleSummary[];
}
