import { App } from 'antd';
import { CalendarX2 } from 'lucide-react';
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarX2 size={20} className="text-red-500" />
          <span>Cancel Appointment</span>
        </div>
      }
      description={`Cancel appointment for ${appointment.patientName} with ${appointment.doctorName}`}
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

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
              gap: 6,
            }}
          >
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Patient:</strong>{' '}
              {appointment.patientName} ({appointment.patientPhone || 'No phone'})
            </div>
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Doctor:</strong>{' '}
              {appointment.doctorName}
            </div>
            <div>
              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>Scheduled For:</strong>{' '}
              {appointment.date} at {appointment.time} (Token {appointment.tokenNumber})
            </div>
          </div>

          <Field label="Cancellation Reason" hint="Optional explanation for record keeping">
            <textarea
              className="ui-input"
              rows={3}
              placeholder="e.g. Patient rescheduled, emergency, unable to attend..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="ui-modal-foot">
          <button type="button" className="ui-btn" onClick={onClose} disabled={submitting}>
            Keep Appointment
          </button>
          <button type="submit" className="ui-btn ui-btn-danger" disabled={submitting}>
            {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
