import { message as staticMessage } from 'antd';
import dayjs from 'dayjs';
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { formatDate } from '../../../lib/format';
import type { Appointment, AppointmentSlot, DateSlotSummary } from '../../../types/appointment';
import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';

export interface DoctorOption {
  id: string;
  name: string;
  specialty?: string;
  specialization?: string;
  department?: string;
}

export interface PatientAppointmentsTabProps {
  patient: {
    id: string;
    name: string;
    phone?: string | undefined;
    gender?: string | undefined;
    date_of_birth?: string | undefined;
    blood_group?: string | undefined;
  };
  onPrevious: () => void;
  onAppointmentScheduled?: () => void;
  onComplete?: () => void;
  ensurePatientSaved?: () => Promise<string>;
}

const COMMON_PURPOSES = [
  'General Consultation',
  'Follow-up Visit',
  'Routine Health Checkup',
  'Review Lab Reports',
  'Medication Review',
  'Second Opinion',
  'Specialist Review',
];

const STANDARD_TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
];

export function PatientAppointmentsTab({
  patient,
  onPrevious,
  onAppointmentScheduled,
  onComplete,
  ensurePatientSaved,
}: PatientAppointmentsTabProps) {
  const todayStr = dayjs().format('YYYY-MM-DD');

  // Doctor & Slots
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Form states
  const [appointmentDate, setAppointmentDate] = useState<string>(todayStr);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00 AM');
  const [purpose, setPurpose] = useState<string>('General Consultation');
  const [patientNote, setPatientNote] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');

  // Doctor slots from API
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Existing Appointments for this patient
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [lastBooked, setLastBooked] = useState<Appointment | null>(null);

  // 1. Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const res = await api.get('doctors');
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      const mapped = list.map((d: any) => ({
        id: d.id,
        name: d.name || `Dr. ${d.first_name || ''} ${d.last_name || ''}`.trim(),
        specialty: d.specialty || d.specialization || d.department,
        specialization: d.specialization,
        department: d.department,
      }));
      setDoctors(mapped);
      if (mapped.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(mapped[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setDoctorsLoading(false);
    }
  }, [selectedDoctorId]);

  // 2. Fetch Existing Appointments for Patient
  const fetchPatientAppointments = useCallback(async () => {
    if (!patient.id) return;
    setAppointmentsLoading(true);
    try {
      const res = await api.get('appointments', { params: { patientId: patient.id } });
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      setAppointments(raw);
    } catch {
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [patient.id]);

  // 3. Fetch Doctor Slots
  const fetchDoctorSlots = useCallback(async (docId: string, date: string) => {
    if (!docId || !date) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const response = await api.get<{
        status: string;
        data: { summaries: DateSlotSummary[] };
      }>('appointments/slots', {
        params: {
          doctorId: docId,
          startDate: date,
          days: 1,
          locationId: 'all',
        },
      });
      const summaries = response.data?.data?.summaries || [];
      const daySlots = summaries[0]?.slots || [];
      setAvailableSlots(daySlots);
      const firstSlot = daySlots[0];
      if (firstSlot) {
        setSelectedSlotId(firstSlot.id);
        const timeVal = firstSlot.start_time || firstSlot.slotTime;
        if (timeVal) {
          setAppointmentTime(timeVal);
        }
      } else {
        setSelectedSlotId('');
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    void fetchPatientAppointments();
  }, [fetchPatientAppointments]);

  useEffect(() => {
    if (selectedDoctorId && appointmentDate) {
      void fetchDoctorSlots(selectedDoctorId, appointmentDate);
    }
  }, [selectedDoctorId, appointmentDate, fetchDoctorSlots]);

  const doctorOptions = useMemo<SearchableSelectOption[]>(() => {
    return doctors.map((d) => ({
      value: d.id,
      label: d.name,
      sublabel: [d.specialty, d.specialization, d.department].filter(Boolean).join(' · '),
    }));
  }, [doctors]);

  // Quick Date presets
  const setQuickDate = (daysToAdd: number) => {
    const d = dayjs().add(daysToAdd, 'day').format('YYYY-MM-DD');
    setAppointmentDate(d);
  };

  // Submit & Schedule Appointment
  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate) {
      staticMessage.error('Please select an appointment date.');
      return;
    }

    setSubmitting(true);
    try {
      let resolvedPatientId = patient.id;
      if (!resolvedPatientId && ensurePatientSaved) {
        try {
          resolvedPatientId = await ensurePatientSaved();
        } catch (saveErr: unknown) {
          staticMessage.error(getErrorMessage(saveErr, 'Please fill in required patient basic details first.'));
          setSubmitting(false);
          return;
        }
      }

      if (!resolvedPatientId) {
        staticMessage.error('Please save patient basic details first.');
        setSubmitting(false);
        return;
      }

      const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);

      const payload: Record<string, any> = {
        patientId: resolvedPatientId,
        patientName: patient.name,
        patientPhone: patient.phone || undefined,
        doctorId: selectedDoctorId || undefined,
        slotId: selectedSlotId || undefined,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime || undefined,
        date: appointmentDate,
        purpose: purpose.trim() || 'General Consultation',
        patientNote: patientNote.trim() || undefined,
        type: appointmentType,
      };

      const res = await api.post('appointments', payload);
      const createdAppt: Appointment = res.data;

      const docName = selectedDoc?.name ? ` with ${selectedDoc.name}` : '';
      staticMessage.success(
        `Appointment scheduled for ${patient.name}${docName} on ${dayjs(appointmentDate).format('MMM D, YYYY')}!`
      );

      setLastBooked(createdAppt);
      onAppointmentScheduled?.();

      // Refresh appointments list
      if (resolvedPatientId) {
        const refreshRes = await api.get('appointments', { params: { patientId: resolvedPatientId } });
        const list = Array.isArray(refreshRes.data) ? refreshRes.data : (refreshRes.data as any)?.data || [];
        setAppointments(list);
      }
    } catch (err: unknown) {
      staticMessage.error(getErrorMessage(err, 'Failed to schedule appointment. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="patient-appointments-tab-root"
      style={{
        padding: '24px 28px',
        maxWidth: 1040,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── Patient Context & Appointments Header Banner ── */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(to right, #ffffff, #eff6ff)',
          borderRadius: 12,
          border: '1px solid #bfdbfe',
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              5. Patient Appointments &amp; Scheduled Consultations
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Manage follow-ups, specialist consultations, and schedule new clinic visits for{' '}
              <strong style={{ color: '#1e293b' }}>{patient.name || 'New Patient'}</strong>.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchPatientAppointments()}
          disabled={appointmentsLoading}
          className="ui-btn ui-btn-neutral"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          title="Refresh appointments"
        >
          <RefreshCw size={13} className={appointmentsLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Success Confirmation Banner ── */}
      {lastBooked && (
        <div
          style={{
            padding: '14px 18px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarCheck size={18} style={{ color: '#16a34a' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                Appointment Booked Successfully!
              </div>
              <div style={{ fontSize: 12, color: '#166534', marginTop: 1 }}>
                Scheduled for {dayjs(lastBooked.scheduledStart || (lastBooked as any).scheduled_start || appointmentDate).format('dddd, MMMM D, YYYY')}{' '}
                at {lastBooked.scheduledStart || (lastBooked as any).scheduled_start ? dayjs(lastBooked.scheduledStart || (lastBooked as any).scheduled_start).format('hh:mm A') : appointmentTime} ·{' '}
                {doctors.find((d) => d.id === selectedDoctorId)?.name || 'Assigned Doctor'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastBooked(null)}
            style={{ fontSize: 11.5, color: '#166534', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── SCHEDULE NEW APPOINTMENT FORM CARD ── */}
      <form
        onSubmit={handleScheduleAppointment}
        className="patient-section-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #dbeafe',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CalendarPlus size={15} />
            </div>
            <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Schedule New Consultation
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setAppointmentType('IN_PERSON')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                border: appointmentType === 'IN_PERSON' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: appointmentType === 'IN_PERSON' ? '#eff6ff' : '#ffffff',
                color: appointmentType === 'IN_PERSON' ? '#1d4ed8' : '#64748b',
                cursor: 'pointer',
              }}
            >
              In-Person Visit
            </button>
            <button
              type="button"
              onClick={() => setAppointmentType('ONLINE')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                border: appointmentType === 'ONLINE' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: appointmentType === 'ONLINE' ? '#eff6ff' : '#ffffff',
                color: appointmentType === 'ONLINE' ? '#1d4ed8' : '#64748b',
                cursor: 'pointer',
              }}
            >
              Online Teleconsult
            </button>
          </div>
        </div>

        {/* Doctor & Date Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
              Consulting Doctor <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <SearchableSelect
              options={doctorOptions}
              value={selectedDoctorId}
              onChange={(val) => setSelectedDoctorId(val)}
              placeholder={doctorsLoading ? 'Loading doctors…' : 'Select Doctor'}
              disabled={doctorsLoading}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 650, color: '#334155' }}>
                Appointment Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                {appointmentDate ? dayjs(appointmentDate).format('ddd, MMM D, YYYY') : ''}
              </span>
            </div>
            <input
              type="date"
              className="patient-form-input"
              value={appointmentDate}
              min={todayStr}
              onChange={(e) => setAppointmentDate(e.target.value)}
              style={{ width: '100%', height: 36, fontSize: 12.5 }}
              required
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 2 }}>Quick Select:</span>
          {[
            { label: 'Today', days: 0 },
            { label: 'Tomorrow', days: 1 },
            { label: 'In 3 Days', days: 3 },
            { label: 'In 1 Week', days: 7 },
            { label: 'In 2 Weeks', days: 14 },
            { label: 'In 1 Month', days: 30 },
          ].map((preset) => {
            const isMatch = appointmentDate === dayjs().add(preset.days, 'day').format('YYYY-MM-DD');
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setQuickDate(preset.days)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 600,
                  border: isMatch ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isMatch ? '#eff6ff' : '#f8fafc',
                  color: isMatch ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Time Slot Selection */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 8 }}>
            Available Time Slot {slotsLoading && <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(loading availability…)</span>}
          </label>

          {availableSlots.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
              {availableSlots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const isAvailable = !slot.isBooked;
                const displayTime = slot.start_time || slot.slotTime || 'Slot';
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      if (displayTime) setAppointmentTime(displayTime);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 650,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : !isAvailable ? '#f1f5f9' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : !isAvailable ? '#94a3b8' : '#334155',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <span>{displayTime}</span>
                    <span style={{ fontSize: 9.5, opacity: 0.8 }}>{isAvailable ? 'Available' : 'Booked'}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 7 }}>
              {STANDARD_TIME_SLOTS.map((t) => {
                const isSelected = appointmentTime === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAppointmentTime(t)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 7,
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Purpose of Consultation */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
            Purpose of Visit <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {COMMON_PURPOSES.map((p) => {
              const isMatch = purpose === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 550,
                    border: isMatch ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isMatch ? '#eff6ff' : '#f8fafc',
                    color: isMatch ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            className="patient-form-input"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Follow-up consultation, Review Blood Sugar & ECG reports..."
            style={{ width: '100%', height: 36, fontSize: 12 }}
            required
          />
        </div>

        {/* Clinical / Patient Note */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
            Clinical Notes &amp; Special Instructions
          </label>
          <textarea
            className="patient-form-input"
            rows={2}
            value={patientNote}
            onChange={(e) => setPatientNote(e.target.value)}
            placeholder="e.g. Patient to bring fasting blood glucose report, fasting required 8 hours prior..."
            style={{ width: '100%', fontSize: 11.5, height: 60 }}
          />
        </div>

        {/* Submit Booking Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
          <button
            type="submit"
            disabled={submitting}
            className="patient-footer-btn patient-footer-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 18px', fontSize: 12.5 }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Scheduling Appointment…</span>
              </>
            ) : (
              <>
                <CalendarCheck size={14} />
                <span>Confirm &amp; Schedule Appointment</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── SCHEDULED & PAST APPOINTMENTS LIST ── */}
      <div
        className="patient-section-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Clock size={15} />
            </div>
            <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Scheduled &amp; Past Appointments ({appointments.length})
            </h4>
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Historical record of consultations for {patient.name || 'this patient'}
          </span>
        </div>

        {appointmentsLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563eb' }} />
            Loading appointments record…
          </div>
        ) : appointments.length === 0 ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px dashed #cbd5e1',
            }}
          >
            <CalendarClock size={32} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
            <div style={{ fontSize: 13.5, fontWeight: 650, color: '#334155' }}>
              No Appointments Recorded Yet
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Use the scheduling form above to book a new appointment or follow-up consultation for this patient.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {appointments.map((appt: any) => {
              const statusStr = String(appt.status || 'SCHEDULED').toUpperCase();
              const isDone = statusStr === 'COMPLETED';
              const isCancel = statusStr === 'CANCELLED';
              const statusColor = isDone
                ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' }
                : isCancel
                  ? { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' }
                  : { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };

              const startDisplay = appt.scheduled_start
                ? formatDate(appt.scheduled_start)
                : appt.appointment_date || appt.date || '—';

              return (
                <div
                  key={appt.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#475569',
                        flexShrink: 0,
                      }}
                    >
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {appt.purpose || appt.appointment_type || 'General Consultation'}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span>
                          <strong>Date:</strong> {startDisplay}
                        </span>
                        <span>·</span>
                        <span>
                          <strong>Doctor:</strong> {appt.doctor_name || appt.doctorName || 'Assigned Doctor'}
                        </span>
                        {appt.type && (
                          <>
                            <span>·</span>
                            <span style={{ textTransform: 'capitalize' }}>{String(appt.type).toLowerCase()}</span>
                          </>
                        )}
                      </div>
                      {appt.patient_note && (
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4, background: '#f8fafc', padding: '3px 8px', borderRadius: 4 }}>
                          Note: {appt.patient_note}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: statusColor.bg,
                      border: `1px solid ${statusColor.border}`,
                      color: statusColor.text,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusStr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER NAVIGATION ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={onPrevious}
          className="patient-footer-btn patient-footer-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ChevronLeft size={15} />
          <span>Previous: Prescription</span>
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="patient-footer-btn patient-footer-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          <CheckCircle2 size={15} />
          <span>Complete &amp; Close Drawer</span>
        </button>
      </div>
    </div>
  );
}
