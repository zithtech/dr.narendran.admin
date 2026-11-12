import { App } from 'antd';
import {
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Stethoscope,
  Sun,
  Sunset,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import type { Appointment, AppointmentSlot, DateSlotSummary } from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal } from './ui/Modal';
import { Alert } from './ui/primitives';

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
}

export default function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: RescheduleAppointmentModalProps) {
  const { message } = App.useApp();

  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch doctor availability slots for the chosen date
  const fetchDoctorSlots = useCallback(
    async (doctorId: string, date: string) => {
      setSlotsLoading(true);
      setError('');
      try {
        const response = await api.get<{
          status: string;
          data: { summaries: DateSlotSummary[] };
        }>('appointments/slots', {
          params: {
            doctorId,
            startDate: date,
            days: 1,
            locationId: 'all',
          },
        });

        const summaries = response.data?.data?.summaries || [];
        const daySlots = summaries[0]?.slots || [];
        setSlots(daySlots);
        setSelectedSlotId('');
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load doctor availability.'));
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && appointment) {
      const initialDate = appointment.date && /^\d{4}-\d{2}-\d{2}$/.test(appointment.date)
        ? appointment.date
        : todayStr;
      setSelectedDate(initialDate);
      setSelectedSlotId('');
      setReason('');
      setError('');
      void fetchDoctorSlots(appointment.doctorId, initialDate);
    }
  }, [isOpen, appointment, fetchDoctorSlots, todayStr]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (appointment?.doctorId) {
      void fetchDoctorSlots(appointment.doctorId, newDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError('Please select an available time slot.');
      return;
    }

    if (!appointment) return;

    setSubmitting(true);
    setError('');

    try {
      await api.post(`appointments/${appointment.id}/reschedule`, {
        newSlotId: selectedSlotId,
        reason: reason.trim() || undefined,
      });
      message?.success?.('Appointment rescheduled successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reschedule appointment. Slot may no longer be available.'));
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
    const isSelected = selectedSlotId === slot.id;
    const isBooked = slot.isBooked;

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
            setSelectedSlotId(slot.id);
            setError('');
          }
        }}
        title={isBooked ? 'Slot already booked (Prevent double booking)' : `Select ${timeLabel}`}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          border: isSelected
            ? '2px solid #2563eb'
            : isBooked
              ? '1px dashed #cbd5e1'
              : '1px solid #e2e8f0',
          background: isSelected
            ? '#eff6ff'
            : isBooked
              ? '#f8fafc'
              : '#ffffff',
          color: isSelected
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
        {isBooked && (
          <span
            style={{
              fontSize: 9.5,
              textTransform: 'uppercase',
              color: '#ef4444',
              fontWeight: 700,
            }}
          >
            Booked
          </span>
        )}
      </button>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={submitting ? () => undefined : onClose}
      variant="drawer"
      size="md"
      className="reschedule-appointment-modal"
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
            <CalendarClock size={18} style={{ display: 'block', margin: 'auto' }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              Reschedule Appointment
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Select a new consultation date and available doctor time slot
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="ui-modal-form">
        <div className="ui-modal-body" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <Alert>{error}</Alert>}

          {/* Current Booking Summary Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 650, color: '#0f172a' }}>
                <User size={13.5} style={{ color: '#64748b' }} />
                <span>{appointment.patientName}</span>
                {appointment.patientPhone && (
                  <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
                    ({appointment.patientPhone})
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1d4ed8',
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  padding: '1.5px 6.5px',
                  borderRadius: 4,
                }}
              >
                Token {tokenDisplay}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
              <Stethoscope size={13.5} style={{ color: '#64748b' }} />
              <span>{appointment.doctorName}</span>
              {appointment.doctorSpecialty && (
                <span style={{ color: '#94a3b8' }}>· {appointment.doctorSpecialty}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
              <Clock size={13.5} style={{ color: '#64748b' }} />
              <span style={{ fontWeight: 600, color: '#334155' }}>Current:</span>
              <span>{appointment.date} at {appointment.time}</span>
            </div>
          </div>

          {/* Date Picker Card */}
          <div className="resched-section-card">
            <div className="resched-section-header">
              <div className="resched-section-badge">
                <CalendarDays size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="resched-section-title">Select New Date</div>
                <div className="resched-section-subtitle">Choose the target consultation date for the patient</div>
              </div>
            </div>

            <Field label="Target Consultation Date" required>
              <input
                type="date"
                className="ui-input"
                min={todayStr}
                value={selectedDate}
                onChange={handleDateChange}
                disabled={submitting}
                required
                style={{ height: 38 }}
              />
            </Field>
          </div>

          {/* Slot Selection Card */}
          <div className="resched-section-card">
            <div className="resched-section-header">
              <div className="resched-section-badge">
                <Clock size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <div className="resched-section-title">Select Available Time Slot</div>
                  <div className="resched-section-subtitle">Choose from verified open intervals</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    padding: '2px 7px',
                    borderRadius: 4,
                  }}
                >
                  Double-booking protected
                </span>
              </div>
            </div>

            {slotsLoading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ color: '#2563eb' }} />
                <span>Checking doctor availability slots...</span>
              </div>
            ) : slots.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: 12.5,
                }}
              >
                No consultation slots available for this doctor on {selectedDate}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {morningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#b45309',
                        marginBottom: 6,
                      }}
                    >
                      <Sun size={12} />
                      <span>Morning Slots</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 6 }}>
                      {morningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#c2410c',
                        marginBottom: 6,
                      }}
                    >
                      <Sun size={12} />
                      <span>Afternoon Slots</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 6 }}>
                      {afternoonSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}

                {eveningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#4338ca',
                        marginBottom: 6,
                      }}
                    >
                      <Sunset size={12} />
                      <span>Evening Slots</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 6 }}>
                      {eveningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reschedule Reason Card */}
          <div className="resched-section-card">
            <div className="resched-section-header">
              <div className="resched-section-badge">
                <FileText size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="resched-section-title">Reason for Reschedule</div>
                <div className="resched-section-subtitle">Optional record for patient notes and audit history</div>
              </div>
            </div>

            <Field label="Reschedule Reason">
              <textarea
                className="ui-input"
                rows={2}
                placeholder="e.g. Doctor schedule changed, patient requested adjustment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                style={{ resize: 'vertical' }}
              />
            </Field>
          </div>
        </div>

        <div
          className="ui-modal-foot"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '12px 22px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={onClose}
            disabled={submitting}
            style={{ fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={submitting || !selectedSlotId}
            style={{
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 18px',
              height: 36,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              cursor: submitting || !selectedSlotId ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Rescheduling...</span>
              </>
            ) : (
              <span>Confirm Reschedule</span>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .reschedule-appointment-modal {
          max-width: 600px !important;
        }
        .resched-section-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .resched-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
        }
        .resched-section-badge {
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
        .resched-section-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .resched-section-subtitle {
          font-size: 11px;
          color: #64748b;
        }
      `}</style>
    </Modal>
  );
}
