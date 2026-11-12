import { App } from 'antd';
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Stethoscope,
  Sun,
  Sunset,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { Appointment, AppointmentSlot, AppointmentStatus, DateSlotSummary } from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Doctor } from './DoctorModal';
import { Field, Modal } from './ui/Modal';
import { Alert } from './ui/primitives';
import SearchableSelect, { type SearchableSelectOption } from './ui/SearchableSelect';

export interface EditAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_PURPOSES = [
  'General Consultation',
  'Follow-up Visit',
  'Routine Health Checkup',
  'Second Opinion',
  'Review Lab Reports',
  'Medication Review',
];

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function EditAppointmentModal({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}: EditAppointmentModalProps) {
  const { message } = App.useApp();

  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Form states
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [keepCurrentSlot, setKeepCurrentSlot] = useState(true);

  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [isCustomPurpose, setIsCustomPurpose] = useState(false);

  const [patientNote, setPatientNote] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get<Doctor[]>('doctors');
      const docList = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
      setDoctors(docList);
    } catch (err: unknown) {
      console.error('Failed to load doctors:', err);
    }
  }, []);

  // Fetch slots for doctor and date
  const fetchSlots = useCallback(async (docId: string, date: string) => {
    if (!docId || !date) {
      setSlots([]);
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
      setSlots(daySlots);
    } catch (err: unknown) {
      console.error('Failed to fetch doctor availability slots:', err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // Extract ISO date YYYY-MM-DD from appointment
  const extractDate = (appt: Appointment): string => {
    if (appt.scheduledStart) {
      const d = new Date(appt.scheduledStart);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0] ?? '';
      }
    }
    if (appt.date && /^\d{4}-\d{2}-\d{2}$/.test(appt.date)) {
      return appt.date;
    }
    return new Date().toISOString().split('T')[0] ?? '';
  };

  // Populate data when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      void fetchDoctors();

      setSelectedDoctorId(appointment.doctorId || '');
      const dStr = extractDate(appointment);
      setAppointmentDate(dStr);
      setSelectedSlotId(appointment.slotId || '');
      setKeepCurrentSlot(true);

      const isKnown = COMMON_PURPOSES.includes(appointment.purpose);
      if (isKnown) {
        setPurpose(appointment.purpose);
        setIsCustomPurpose(false);
        setCustomPurpose('');
      } else {
        setPurpose('Other');
        setIsCustomPurpose(true);
        setCustomPurpose(appointment.purpose || '');
      }

      setPatientNote(appointment.patientNote || '');
      setStatus(appointment.status || 'scheduled');
      setPatientName(appointment.patientName || '');
      setPatientPhone(appointment.patientPhone || '');
      setRescheduleReason(appointment.rescheduleReason || '');
      setCancellationReason(appointment.cancellationReason || '');
      setError('');

      if (appointment.doctorId && dStr) {
        void fetchSlots(appointment.doctorId, dStr);
      }
    }
  }, [isOpen, appointment, fetchDoctors, fetchSlots]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (isOpen && selectedDoctorId && appointmentDate) {
      void fetchSlots(selectedDoctorId, appointmentDate);
    }
  }, [isOpen, selectedDoctorId, appointmentDate, fetchSlots]);

  // Doctor options for SearchableSelect
  const doctorOptions = useMemo<SearchableSelectOption[]>(() => {
    return doctors.map((doc) => ({
      value: doc.id,
      label: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
      sublabel: [doc.specialization, doc.branch_name || doc.hospital_name].filter(Boolean).join(' · ') || undefined,
      badge: doc.specialization || undefined,
      badgeTone: 'violet' as const,
      extraSearchTerms: [doc.specialization, doc.email, doc.phone, doc.hospital_name].filter(Boolean) as string[],
    }));
  }, [doctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    setError('');

    const finalPurpose = isCustomPurpose ? customPurpose.trim() : purpose.trim();
    if (!finalPurpose) {
      setError('Please specify the purpose of the consultation.');
      return;
    }

    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    if (!appointmentDate) {
      setError('Please select an appointment date.');
      return;
    }

    if (!keepCurrentSlot && !selectedSlotId) {
      setError('Please select an available time slot or keep the current schedule.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        doctorId: selectedDoctorId,
        purpose: finalPurpose,
        patientNote: patientNote.trim() || undefined,
        status,
        patientName: patientName.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
      };

      if (!keepCurrentSlot && selectedSlotId) {
        payload['slotId'] = selectedSlotId;
      }

      if (status === 'rescheduled' || (!keepCurrentSlot && selectedSlotId && selectedSlotId !== appointment.slotId)) {
        payload['rescheduleReason'] = rescheduleReason.trim() || 'Rescheduled via admin';
      }

      if (status === 'cancelled') {
        payload['cancellationReason'] = cancellationReason.trim() || 'Cancelled via admin';
      }

      await api.put(`appointments/${appointment.id}`, payload);

      message?.success?.('Appointment updated successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update appointment. Please check your inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const rawToken = appointment.tokenNumber ? String(appointment.tokenNumber).trim() : '01';
  const tokenDisplay = rawToken.startsWith('#') ? rawToken : `#${rawToken}`;

  // Group slots by session
  const morningSlots = slots.filter((s) => s.session === 'morning');
  const afternoonSlots = slots.filter((s) => s.session === 'afternoon');
  const eveningSlots = slots.filter((s) => s.session === 'evening');

  const renderSlotButton = (slot: AppointmentSlot) => {
    const isCurrentActive = appointment.slotId === slot.id;
    const isSelected = !keepCurrentSlot && selectedSlotId === slot.id;
    const isBooked = slot.isBooked && !isCurrentActive;

    const timeLabel = slot.start_time
      ? new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : slot.slotTime
        ? new Date(slot.slotTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : slot.id;

    return (
      <button
        key={slot.id}
        type="button"
        disabled={isBooked || submitting}
        onClick={() => {
          if (!isBooked) {
            setKeepCurrentSlot(false);
            setSelectedSlotId(slot.id);
            setError('');
          }
        }}
        title={isBooked ? 'Slot already booked' : `Select ${timeLabel}`}
        style={{
          padding: '7px 10px',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          border: isSelected
            ? '2px solid #2563eb'
            : isCurrentActive && keepCurrentSlot
              ? '2px solid #2563eb'
              : isBooked
                ? '1px dashed #cbd5e1'
                : '1px solid #e2e8f0',
          background: isSelected
            ? '#eff6ff'
            : isCurrentActive && keepCurrentSlot
              ? '#eff6ff'
              : isBooked
                ? '#f8fafc'
                : '#ffffff',
          color: isSelected
            ? '#1d4ed8'
            : isCurrentActive && keepCurrentSlot
              ? '#1d4ed8'
              : isBooked
                ? '#94a3b8'
                : '#1e293b',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          opacity: isBooked ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          transition: 'all 0.15s ease',
        }}
      >
        <span>{timeLabel}</span>
        {isBooked ? (
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', color: '#ef4444', fontWeight: 700 }}>
            Booked
          </span>
        ) : isCurrentActive && keepCurrentSlot ? (
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', color: '#2563eb', fontWeight: 700 }}>
            Current
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={submitting ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="appointment-edit-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            <Pencil size={18} style={{ display: 'block', margin: 'auto' }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              Edit Appointment
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Token {tokenDisplay} · {appointment.patientName} · {appointment.doctorName}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, flex: '1 1 0%', overflow: 'hidden' }}
      >
        <div
          className="ui-modal-body"
          style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}
        >
          {error && <Alert>{error}</Alert>}

          {/* Patient Overview Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {appointment.patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                    {appointment.patientName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1d4ed8',
                      background: '#eff6ff',
                      padding: '1.5px 7px',
                      borderRadius: 4,
                    }}
                  >
                    Token {tokenDisplay}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12 }}>
                  {appointment.patientPhone && <span>📞 {appointment.patientPhone}</span>}
                  {appointment.patientEmail && <span>✉️ {appointment.patientEmail}</span>}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '4px 10px',
                fontWeight: 500,
              }}
            >
              Current: <strong>{appointment.date}</strong> at <strong>{appointment.time}</strong>
            </div>
          </div>

          {/* Section 1: Doctor & Status */}
          <div className="appointment-section-card">
            <div className="appointment-section-header">
              <div className="appointment-section-badge">
                <Stethoscope size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="appointment-section-title">Doctor & Status</div>
                <div className="appointment-section-subtitle">
                  Assign consultation doctor and update current appointment status
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <Field label="Attending Doctor" required>
                <SearchableSelect
                  options={doctorOptions}
                  value={selectedDoctorId}
                  onChange={(val) => {
                    setSelectedDoctorId(val);
                    setKeepCurrentSlot(false);
                  }}
                  placeholder="Select doctor..."
                />
              </Field>

              <Field label="Appointment Status" required>
                <select
                  className="ui-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                  style={{ fontWeight: 600, height: 38 }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Section 2: Consultation Reason & Notes */}
          <div className="appointment-section-card">
            <div className="appointment-section-header">
              <div className="appointment-section-badge">
                <FileText size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="appointment-section-title">Consultation Reason & Clinical Notes</div>
                <div className="appointment-section-subtitle">
                  Chief complaint, visit purpose, and clinical notes
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <Field label="Consultation Purpose" required>
                <select
                  className="ui-input"
                  value={isCustomPurpose ? 'Other' : purpose}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsCustomPurpose(true);
                      setPurpose('Other');
                    } else {
                      setIsCustomPurpose(false);
                      setPurpose(val);
                      setCustomPurpose('');
                    }
                  }}
                  style={{ height: 38 }}
                >
                  {COMMON_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Other">Other (Custom Purpose)</option>
                </select>
              </Field>

              {isCustomPurpose && (
                <Field label="Specify Custom Purpose" required>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="e.g. Pre-operative assessment"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                  />
                </Field>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Patient Note / Chief Complaint">
                <textarea
                  className="ui-input"
                  rows={2}
                  maxLength={500}
                  placeholder="Clinical notes, symptom duration, or patient requests..."
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </Field>
            </div>

            {status === 'rescheduled' && (
              <div style={{ marginTop: 12 }}>
                <Field label="Reschedule Reason">
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="e.g. Doctor emergency / Patient requested afternoon"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {status === 'cancelled' && (
              <div style={{ marginTop: 12 }}>
                <Field label="Cancellation Reason" required>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="e.g. Patient called to cancel / Duplicate booking"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Section 3: Date & Slot Schedule */}
          <div className="appointment-section-card">
            <div className="appointment-section-header">
              <div className="appointment-section-badge">
                <CalendarClock size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="appointment-section-title">Appointment Schedule & Time Slot</div>
                <div className="appointment-section-subtitle">
                  Choose appointment date and doctor availability time slot
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field label="Consultation Date" required>
                <input
                  type="date"
                  className="ui-input"
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setKeepCurrentSlot(false);
                  }}
                  style={{ height: 38 }}
                />
              </Field>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={keepCurrentSlot}
                    onChange={(e) => {
                      setKeepCurrentSlot(e.target.checked);
                      if (e.target.checked) {
                        setSelectedSlotId(appointment.slotId || '');
                      }
                    }}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: '#2563eb',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Keep existing time ({appointment.time})</span>
                </label>
              </div>
            </div>

            {/* Time Slot Selection Grid */}
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 650, color: '#334155' }}>
                  Available Doctor Slots for {appointmentDate || 'Selected Date'}
                </span>
                {slotsLoading && (
                  <span style={{ fontSize: 11.5, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={12} className="animate-spin" /> Loading slots...
                  </span>
                )}
              </div>

              {slots.length === 0 && !slotsLoading ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12.5,
                  }}
                >
                  No specific time slots generated for this date. The appointment can retain its current slot or use doctor default hours.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {morningSlots.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        <Sun size={12} /> Morning
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                        {morningSlots.map(renderSlotButton)}
                      </div>
                    </div>
                  )}

                  {afternoonSlots.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#c2410c',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        <Sun size={12} /> Afternoon
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                        {afternoonSlots.map(renderSlotButton)}
                      </div>
                    </div>
                  )}

                  {eveningSlots.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        <Sunset size={12} /> Evening
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                        {eveningSlots.map(renderSlotButton)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Patient Contact Info Update */}
          <div className="appointment-section-card">
            <div className="appointment-section-header">
              <div className="appointment-section-badge">
                <User size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="appointment-section-title">Patient Contact Information</div>
                <div className="appointment-section-subtitle">
                  Update contact information attached to this appointment
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field label="Patient Name">
                <input
                  type="text"
                  className="ui-input"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient full name"
                />
              </Field>

              <Field label="Contact Phone">
                <input
                  type="tel"
                  className="ui-input"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="Contact phone number"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div
          className="ui-modal-foot"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0 18px',
              height: 38,
              borderRadius: 8,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .appointment-edit-drawer-modal {
          width: min(740px, 100vw) !important;
          max-width: 740px !important;
          background: #ffffff;
          box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          height: 100% !important;
          max-height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .appointment-edit-drawer-modal .ui-modal-head {
          padding: 18px 24px;
          background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .appointment-edit-drawer-modal .ui-modal-form {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          flex: 1 1 0% !important;
          overflow: hidden !important;
        }
        .appointment-edit-drawer-modal .ui-modal-body {
          padding: 20px 24px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          -webkit-overflow-scrolling: touch;
        }
        .appointment-edit-drawer-modal .ui-modal-foot {
          flex-shrink: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 10px !important;
          padding: 14px 24px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }
        .appointment-section-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.15s ease;
        }
        .appointment-section-card:hover {
          border-color: #cbd5e1;
        }
        .appointment-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .appointment-section-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justifyContent: center;
          flex-shrink: 0;
          margin: 0;
        }
        .appointment-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .appointment-section-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 1px;
        }
      `}</style>
    </Modal>
  );
}
