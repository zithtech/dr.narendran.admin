import { App } from 'antd';
import { CalendarClock, Clock, Loader2, Sun, Sunset } from 'lucide-react';
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

  // Fetch doctor's availability slots for the chosen date
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
      const initialDate = appointment.date ? todayStr : todayStr;
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
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          border: isSelected
            ? '2px solid var(--ui-primary, #0284c7)'
            : isBooked
              ? '1px dashed var(--ui-border, #cbd5e1)'
              : '1px solid var(--ui-border, #cbd5e1)',
          background: isSelected
            ? 'var(--ui-primary-subtle, #e0f2fe)'
            : isBooked
              ? 'var(--ui-surface-disabled, #f1f5f9)'
              : 'var(--ui-surface, #ffffff)',
          color: isSelected
            ? 'var(--ui-primary, #0284c7)'
            : isBooked
              ? 'var(--ui-text-muted, #94a3b8)'
              : 'var(--ui-text, #1e293b)',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          opacity: isBooked ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
        }}
      >
        <span>{timeLabel}</span>
        {isBooked && (
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              color: '#ef4444',
              fontWeight: 600,
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={20} className="text-primary" />
          <span>Reschedule Appointment</span>
        </div>
      }
      description={`Rescheduling appointment for ${appointment.patientName} with ${appointment.doctorName}`}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Current appointment info */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--ui-surface-2, #f8fafc)',
              border: '1px solid var(--ui-border, #e2e8f0)',
              marginBottom: 16,
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Patient:</strong>{' '}
              {appointment.patientName}
            </div>
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Doctor:</strong>{' '}
              {appointment.doctorName} ({appointment.doctorSpecialty || 'General'})
            </div>
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Current Schedule:</strong>{' '}
              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                {appointment.date} at {appointment.time} (Token {appointment.tokenNumber})
              </span>
            </div>
          </div>

          {/* New Date Picker */}
          <Field label="Select New Date" required hint="Choose the target consultation date">
            <input
              type="date"
              className="ui-input"
              min={todayStr}
              value={selectedDate}
              onChange={handleDateChange}
              disabled={submitting}
              required
            />
          </Field>

          {/* Time Slot Picker */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="ui-field-label">
                Select Available Time Slot <em>*</em>
              </span>
              <span style={{ fontSize: 12, color: 'var(--ui-text-muted, #64748b)' }}>
                Double-booking protected
              </span>
            </div>

            {slotsLoading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--ui-text-muted, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Loader2 size={18} className="animate-spin text-primary" />
                <span>Checking doctor availability...</span>
              </div>
            ) : slots.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  borderRadius: 6,
                  background: 'var(--ui-surface-2, #f8fafc)',
                  border: '1px dashed var(--ui-border, #cbd5e1)',
                  color: 'var(--ui-text-muted, #64748b)',
                  fontSize: 13,
                }}
              >
                No consultation slots available for this doctor on this date.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {morningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sun size={14} className="text-amber-500" />
                      <span>Morning Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 8,
                      }}
                    >
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
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Clock size={14} className="text-blue-500" />
                      <span>Afternoon Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 8,
                      }}
                    >
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
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sunset size={14} className="text-purple-500" />
                      <span>Evening Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {eveningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reschedule Reason */}
          <Field label="Reschedule Reason" hint="Optional explanation for the patient and audit log">
            <textarea
              className="ui-input"
              rows={2}
              placeholder="e.g. Doctor schedule changed, patient requested adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="ui-modal-foot">
          <button type="button" className="ui-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={submitting || !selectedSlotId}
          >
            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
