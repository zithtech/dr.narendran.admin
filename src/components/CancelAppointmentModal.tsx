import { App } from 'antd';
import {
  AlertTriangle,
  Calendar,
  CalendarX2,
  Clock,
  Loader2,
  Stethoscope,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Appointment } from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal } from './ui/Modal';
import { Alert } from './ui/primitives';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
}

export default function CancelAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: CancelAppointmentModalProps) {
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !appointment) return null;

  const rawToken = appointment.tokenNumber ? String(appointment.tokenNumber).trim() : '01';
  const tokenDisplay = rawToken.startsWith('#') ? rawToken : `#${rawToken}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post(`appointments/${appointment.id}/cancel`, {
        reason: reason.trim() || undefined,
      });
      message?.success?.('Appointment cancelled successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to cancel appointment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={submitting ? () => undefined : onClose}
      size="md"
      className="cancel-appointment-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)',
            }}
          >
            <CalendarX2 size={18} style={{ display: 'block', margin: 'auto' }} />
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
              Cancel Appointment
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Release the reserved consultation slot and update status to cancelled
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="ui-modal-form">
        <div className="ui-modal-body" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <Alert>{error}</Alert>}

          {/* Appointment Details Summary Card */}
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
              <Calendar size={13.5} style={{ color: '#64748b' }} />
              <span>{appointment.date}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <Clock size={13.5} style={{ color: '#64748b' }} />
              <span>{appointment.time}</span>
            </div>
          </div>

          {/* Warning Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: 8,
              fontSize: 12,
              color: '#991b1b',
              lineHeight: 1.45,
            }}
          >
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <span>
              This will cancel the booking and release the time slot back into the doctor's available schedule.
            </span>
          </div>

          {/* Cancellation Reason */}
          <Field label="Cancellation Reason" hint="Optional explanation for record keeping and patient notification">
            <textarea
              className="ui-input"
              rows={3}
              placeholder="e.g. Patient rescheduled, emergency, unable to attend..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              style={{ resize: 'vertical' }}
            />
          </Field>
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
            Keep Appointment
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-danger"
            disabled={submitting}
            style={{
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 16px',
              height: 36,
              fontWeight: 600,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .cancel-appointment-modal {
          max-width: 500px !important;
        }
      `}</style>
    </Modal>
  );
}
