import {
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AppointmentDrawer from '../components/AppointmentDrawer';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import { Avatar, Badge, type BadgeTone } from '../components/ui/primitives';
import type {
  Appointment,
  AppointmentStatus,
  DoctorDailyScheduleResult,
  DoctorScheduleAppointmentItem,
  DoctorScheduleSummary,
} from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function shiftDate(dateStr: string, deltaDays: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d + deltaDays);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    const nextD = String(date.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  } catch {
    return dateStr;
  }
}

function toFullAppointment(item: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary): Appointment {
  const appt: Appointment = {
    id: item.id,
    patientId: item.patientId,
    patientName: item.patientName,
    patientPhone: item.patientPhone,
    doctorId: doc.id,
    doctorName: doc.name,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    date: item.date,
    time: item.time,
    tokenNumber: item.tokenNumber,
    purpose: item.purpose,
    status: item.status,
    createdAt: item.createdAt,
    created_at: item.createdAt,
    updatedAt: item.createdAt,
  };
  if (item.patientEmail) appt.patientEmail = item.patientEmail;
  if (doc.specialization) appt.doctorSpecialty = doc.specialization;
  if (doc.phone) appt.doctorPhone = doc.phone;
  if (doc.email) appt.doctorEmail = doc.email;
  if (doc.hospitalName) appt.hospitalName = doc.hospitalName;
  if (doc.branchName) appt.branchName = doc.branchName;
  if (item.patientNote) appt.patientNote = item.patientNote;
  if (item.rescheduleReason) appt.rescheduleReason = item.rescheduleReason;
  if (item.cancellationReason) appt.cancellationReason = item.cancellationReason;
  return appt;
}

const getStatusBadgeTone = (status: AppointmentStatus): BadgeTone => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'green';
    case 'scheduled':
    case 'confirmed':
      return 'blue';
    case 'rescheduled':
      return 'violet';
    case 'cancelled':
      return 'red';
    case 'no_show':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export default function DoctorTodayAppointments() {
  const todayStr = useMemo(() => getTodayString(), []);

  // Filter & Search states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data fetching states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<DoctorDailyScheduleResult | null>(null);

  // Modals and Drawer states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>(undefined);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);

  const fetchDoctorSchedules = useCallback(async (date: string, docId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { date };
      if (docId && docId !== 'all') {
        params['doctorId'] = docId;
      }
      const res = await api.get<{ status: string; data: DoctorDailyScheduleResult }>(
        'appointments/doctor-schedules',
        { params },
      );
      if (res.data?.data) {
        setScheduleData(res.data.data);
      } else {
        setScheduleData({ date, totalAppointments: 0, doctors: [] });
      }
    } catch (err: unknown) {
      console.error('Failed to load doctor schedules:', err);
      setError(getErrorMessage(err, 'Failed to load doctor appointment schedules.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctorSchedules(selectedDate, selectedDoctorId);
  }, [fetchDoctorSchedules, selectedDate, selectedDoctorId]);

  // Overall metrics across all fetched doctors
  const metrics = useMemo(() => {
    if (!scheduleData) {
      return { totalDoctors: 0, totalAppointments: 0, scheduled: 0, completed: 0, cancelled: 0 };
    }
    const totalDoctors = scheduleData.doctors.length;
    let totalAppointments = 0;
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;

    for (const doc of scheduleData.doctors) {
      totalAppointments += doc.stats.total;
      scheduled += doc.stats.scheduled;
      completed += doc.stats.completed;
      cancelled += doc.stats.cancelled;
    }

    return { totalDoctors, totalAppointments, scheduled, completed, cancelled };
  }, [scheduleData]);

  // Filtered doctors and their filtered appointments based on doctor search / status filter
  const displayedDoctors = useMemo(() => {
    if (!scheduleData) return [];

    const query = searchQuery.trim().toLowerCase();

    return scheduleData.doctors
      .map((doc) => {
        // Filter appointments by status and search query
        const filteredAppointments = doc.appointments.filter((appt) => {
          if (statusFilter !== 'all') {
            if (statusFilter === 'scheduled') {
              if (appt.status !== 'scheduled' && appt.status !== 'confirmed' && appt.status !== 'rescheduled') {
                return false;
              }
            } else if (appt.status !== statusFilter) {
              return false;
            }
          }

          if (query) {
            const matchesPatient =
              appt.patientName.toLowerCase().includes(query) ||
              appt.patientPhone.toLowerCase().includes(query) ||
              (appt.patientEmail && appt.patientEmail.toLowerCase().includes(query)) ||
              appt.tokenNumber.toLowerCase().includes(query) ||
              appt.purpose.toLowerCase().includes(query);

            const matchesDoctor =
              doc.name.toLowerCase().includes(query) ||
              doc.specialization.toLowerCase().includes(query);

            return matchesPatient || matchesDoctor;
          }

          return true;
        });

        const docMatchesSearch =
          !query ||
          doc.name.toLowerCase().includes(query) ||
          doc.specialization.toLowerCase().includes(query) ||
          filteredAppointments.length > 0;

        return {
          ...doc,
          filteredAppointments,
          isVisible: docMatchesSearch,
        };
      })
      .filter((doc) => doc.isVisible);
  }, [scheduleData, searchQuery, statusFilter]);

  const isToday = selectedDate === todayStr;

  const handleOpenBooking = (docId?: string) => {
    setPreselectedDoctorId(docId);
    setIsScheduleModalOpen(true);
  };

  const handleOpenDetails = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    setViewingAppointment(toFullAppointment(appt, doc));
  };

  const handleOpenReschedule = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    setReschedulingAppointment(toFullAppointment(appt, doc));
  };

  const handleOpenCancel = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    setCancellingAppointment(toFullAppointment(appt, doc));
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Stethoscope size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ui-text, #0f172a)' }}>
                Doctors Today Appointments
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13.5, color: 'var(--ui-muted, #64748b)' }}>
                Daily doctor-wise consultation schedules, patient queues, and appointment statuses.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="ui-btn ui-btn-subtle"
            onClick={() => void fetchDoctorSchedules(selectedDate, selectedDoctorId)}
            disabled={loading}
            title="Refresh schedules"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
          >
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => handleOpenBooking()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              padding: '0 16px',
              fontWeight: 600,
              background: '#0284c7',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Schedule Appointment</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Controls Card */}
      <div
        style={{
          background: 'var(--ui-surface, #ffffff)',
          border: '1px solid var(--ui-border, #e2e8f0)',
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Date Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="ui-icon-btn is-bordered"
                onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}
                title="Previous Day"
                style={{ width: 34, height: 34 }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: isToday ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: isToday ? '#e0f2fe' : '#ffffff',
                  color: isToday ? '#0369a1' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CalendarDays size={14} />
                <span>Today</span>
              </button>
              <button
                type="button"
                className="ui-icon-btn is-bordered"
                onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))}
                title="Next Day"
                style={{ width: 34, height: 34 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Native Date Picker */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            </div>

            {/* Human Readable Date Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {formatDisplayDate(selectedDate)}
              </span>
              {isToday && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#0284c7',
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  Current Day
                </span>
              )}
            </div>
          </div>

          {/* Doctor Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={15} style={{ color: '#64748b' }} />
              <label htmlFor="doctor-filter-select" style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                Doctor:
              </label>
              <select
                id="doctor-filter-select"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 13,
                  color: '#1e293b',
                  fontWeight: 500,
                  outline: 'none',
                  minWidth: 200,
                }}
              >
                <option value="all">
                  All Registered Doctors ({scheduleData?.doctors.length || 0})
                </option>
                {scheduleData?.doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} - {doc.specialization} ({doc.stats.total} appts)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Second Row: Search & Status Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            borderTop: '1px solid #f1f5f9',
            paddingTop: 12,
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 420 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search doctor, patient, token, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 36,
                paddingRight: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Status Segmented Buttons */}
          <div className="ui-segment" style={{ alignSelf: 'center' }}>
            <button
              type="button"
              className={statusFilter === 'all' ? 'is-on' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All Statuses
            </button>
            <button
              type="button"
              className={statusFilter === 'scheduled' ? 'is-on' : ''}
              onClick={() => setStatusFilter('scheduled')}
            >
              Scheduled / Active
            </button>
            <button
              type="button"
              className={statusFilter === 'completed' ? 'is-on' : ''}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </button>
            <button
              type="button"
              className={statusFilter === 'cancelled' ? 'is-on' : ''}
              onClick={() => setStatusFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Registered Doctors
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              {metrics.totalDoctors}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Appointments
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              {metrics.totalAppointments}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Scheduled / Active
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
              {metrics.scheduled}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#dcfce7',
              color: '#15803d',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CalendarCheck2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Completed
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
              {metrics.completed}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#fee2e2',
              color: '#dc2626',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CalendarX2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Cancelled
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
              {metrics.cancelled}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Doctor-wise Schedules */}
      {loading ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          <Loader2 size={32} className="is-spinning" style={{ color: '#0284c7' }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
            Loading doctor appointment schedules...
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Fetching registered doctors and appointments for {formatDisplayDate(selectedDate)}
          </div>
        </div>
      ) : error ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 14,
            padding: '32px 24px',
            textAlign: 'center',
            color: '#b91c1c',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>Failed to load schedules</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>{error}</div>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => void fetchDoctorSchedules(selectedDate, selectedDoctorId)}
            style={{ marginTop: 16 }}
          >
            Try Again
          </button>
        </div>
      ) : displayedDoctors.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Stethoscope size={44} style={{ color: '#94a3b8' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            No registered doctors found
          </div>
          <div style={{ fontSize: 13.5, color: '#64748b', maxWidth: 460 }}>
            {searchQuery
              ? `No registered doctors or appointments matched "${searchQuery}". Try adjusting your search query.`
              : 'There are currently no active registered doctors in the system.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {displayedDoctors.map((doc) => {
            const hasAppointments = doc.filteredAppointments.length > 0;

            return (
              <div
                key={doc.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Doctor Section Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Avatar name={doc.name} src={doc.profileImageUrl} size={46} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                          {doc.name}
                        </span>
                        <Badge tone="blue">{doc.specialization}</Badge>
                        {(doc.branchName || doc.hospitalName) && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            <MapPin size={12} />
                            <span>
                              {doc.branchName || doc.hospitalName}
                            </span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                        {doc.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                            <Phone size={12} />
                            <span>{doc.phone}</span>
                          </span>
                        )}
                        {doc.email && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                            <Mail size={12} />
                            <span>{doc.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Stats & Booking Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        {doc.stats.total} total
                      </span>
                      {doc.stats.scheduled > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: '#e0f2fe',
                            color: '#0369a1',
                          }}
                        >
                          {doc.stats.scheduled} scheduled
                        </span>
                      )}
                      {doc.stats.completed > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          {doc.stats.completed} done
                        </span>
                      )}
                      {doc.stats.cancelled > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: '#fee2e2',
                            color: '#dc2626',
                          }}
                        >
                          {doc.stats.cancelled} cancelled
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenBooking(doc.id)}
                      style={{
                        height: 32,
                        padding: '0 12px',
                        borderRadius: 7,
                        fontSize: 12.5,
                        fontWeight: 600,
                        border: '1px solid #0284c7',
                        background: '#ffffff',
                        color: '#0284c7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Plus size={14} />
                      <span>Book For Doctor</span>
                    </button>
                  </div>
                </div>

                {/* Doctor's Appointments for Selected Date */}
                {hasAppointments ? (
                  <div style={{ padding: '8px 20px 16px' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 13,
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 10px', fontWeight: 600, width: 140 }}>Time & Token</th>
                            <th style={{ padding: '12px 10px', fontWeight: 600 }}>Patient Details</th>
                            <th style={{ padding: '12px 10px', fontWeight: 600 }}>Purpose / Remarks</th>
                            <th style={{ padding: '12px 10px', fontWeight: 600, width: 130 }}>Status</th>
                            <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right', width: 120 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.filteredAppointments.map((appt) => {
                            const isActive =
                              appt.status === 'scheduled' ||
                              appt.status === 'confirmed' ||
                              appt.status === 'rescheduled';

                            return (
                              <tr
                                key={appt.id}
                                style={{
                                  borderBottom: '1px solid #f8fafc',
                                  transition: 'background-color 0.1s ease',
                                }}
                              >
                                {/* Time & Token */}
                                <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#0284c7',
                                        background: '#e0f2fe',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                      }}
                                    >
                                      {appt.tokenNumber}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      color: '#1e293b',
                                      marginTop: 4,
                                    }}
                                  >
                                    <Clock size={13} style={{ color: '#64748b' }} />
                                    <span>{appt.time}</span>
                                  </div>
                                </td>

                                {/* Patient Details */}
                                <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleOpenDetails(appt, doc)}
                                  >
                                    <div
                                      style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {appt.patientName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          color: '#0284c7',
                                          fontSize: 13.5,
                                        }}
                                      >
                                        {appt.patientName}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                        {appt.patientPhone ? (
                                          <>
                                            <Phone size={11} />
                                            <span>{appt.patientPhone}</span>
                                          </>
                                        ) : (
                                          <span style={{ fontStyle: 'italic' }}>No phone number</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Purpose & Remarks */}
                                <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 500, color: '#1e293b' }}>
                                    {appt.purpose}
                                  </div>
                                  {appt.patientNote && (
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                      {appt.patientNote}
                                    </div>
                                  )}
                                  {appt.cancellationReason && (
                                    <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 2 }}>
                                      Cancelled: {appt.cancellationReason}
                                    </div>
                                  )}
                                  {appt.rescheduleReason && (
                                    <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 2 }}>
                                      Rescheduled: {appt.rescheduleReason}
                                    </div>
                                  )}
                                </td>

                                {/* Status */}
                                <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                  <Badge tone={getStatusBadgeTone(appt.status)}>
                                    <span style={{ textTransform: 'capitalize' }}>
                                      {appt.status.replace('_', ' ')}
                                    </span>
                                  </Badge>
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '14px 10px', verticalAlign: 'top', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                    <button
                                      type="button"
                                      className="ui-icon-btn"
                                      title="View appointment details"
                                      onClick={() => handleOpenDetails(appt, doc)}
                                    >
                                      <Eye size={15} />
                                    </button>
                                    {isActive && (
                                      <>
                                        <button
                                          type="button"
                                          className="ui-icon-btn"
                                          title="Reschedule appointment"
                                          onClick={() => handleOpenReschedule(appt, doc)}
                                        >
                                          <CalendarClock size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          className="ui-icon-btn ui-icon-btn-danger"
                                          title="Cancel appointment"
                                          onClick={() => handleOpenCancel(appt, doc)}
                                        >
                                          <CalendarX2 size={15} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px 20px',
                      textAlign: 'center',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      No appointments scheduled for {doc.name} on {formatDisplayDate(selectedDate)}.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenBooking(doc.id)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0284c7',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      + Schedule an Appointment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Appointment Modal */}
      <ScheduleAppointmentModal
        isOpen={isScheduleModalOpen}
        preselectedDoctorId={preselectedDoctorId}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setPreselectedDoctorId(undefined);
        }}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
        }}
      />

      {/* Reschedule Modal */}
      <RescheduleAppointmentModal
        isOpen={Boolean(reschedulingAppointment)}
        appointment={reschedulingAppointment}
        onClose={() => setReschedulingAppointment(null)}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
          if (viewingAppointment && reschedulingAppointment && viewingAppointment.id === reschedulingAppointment.id) {
            setViewingAppointment(null);
          }
        }}
      />

      {/* Cancel Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(cancellingAppointment)}
        appointment={cancellingAppointment}
        onClose={() => setCancellingAppointment(null)}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
          if (viewingAppointment && cancellingAppointment && viewingAppointment.id === cancellingAppointment.id) {
            setViewingAppointment(null);
          }
        }}
      />

      {/* View Appointment Details Drawer */}
      <AppointmentDrawer
        appointment={viewingAppointment}
        onClose={() => setViewingAppointment(null)}
        onReschedule={(appt) => {
          setReschedulingAppointment(appt);
        }}
        onCancel={(appt) => {
          setCancellingAppointment(appt);
        }}
      />
    </div>
  );
}
