import {
  Building2,
  CalendarClock,
  CalendarX2,
  CheckCircle,
  HeartPulse,
  Mail,
  Phone,
  Stethoscope,
  User,
} from 'lucide-react';

import type { Appointment } from '../types/appointment';
import { Drawer } from './ui/Drawer';
import { Badge } from './ui/primitives';

interface AppointmentDrawerProps {
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
}

export default function AppointmentDrawer({
  appointment,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
}: AppointmentDrawerProps) {
  if (!appointment) return null;

  const isCancellable =
    appointment.status === 'scheduled' ||
    appointment.status === 'confirmed' ||
    appointment.status === 'rescheduled';

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'scheduled':
      case 'confirmed':
        return 'blue';
      case 'rescheduled':
        return 'purple';
      case 'cancelled':
        return 'red';
      case 'no_show':
        return 'gray';
      default:
        return 'neutral';
    }
  };

  const hero = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 17,
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
            flexShrink: 0,
          }}
        >
          {appointment.patientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ui-text, #0f172a)', margin: 0 }}>
              {appointment.patientName}
            </h2>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              Token #{appointment.tokenNumber}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ui-text-muted, #64748b)', marginTop: 2 }}>
            {appointment.purpose} · {appointment.date} at {appointment.time}
          </div>
        </div>
      </div>
      <div>
        <Badge tone={getStatusTone(appointment.status) as any}>
          <span style={{ textTransform: 'capitalize' }}>{appointment.status.replace('_', ' ')}</span>
        </Badge>
      </div>
    </div>
  );

  const stats = [
    {
      label: 'Consultation Date',
      value: (
        <span style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>
          {appointment.date}
        </span>
      ),
    },
    {
      label: 'Scheduled Time',
      value: (
        <span style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>
          {appointment.time}
        </span>
      ),
    },
    {
      label: 'Token Number',
      value: (
        <span style={{ fontWeight: 700, color: '#0284c7' }}>
          {appointment.tokenNumber}
        </span>
      ),
    },
  ];

  const footer = isCancellable ? (
    <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      {onComplete && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 13,
            background: '#16a34a',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: 'none',
            padding: '0 14px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => onComplete(appointment)}
        >
          <CheckCircle size={15} />
          <span>Mark Completed</span>
        </button>
      )}
      <button
        type="button"
        className="ui-btn ui-btn-danger"
        style={{ fontSize: 13 }}
        onClick={() => onCancel(appointment)}
      >
        <CalendarX2 size={16} />
        <span>Cancel Appointment</span>
      </button>
      <button
        type="button"
        className="ui-btn ui-btn-primary"
        style={{ fontSize: 13 }}
        onClick={() => onReschedule(appointment)}
      >
        <CalendarClock size={16} />
        <span>Reschedule</span>
      </button>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <button type="button" className="ui-btn" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Drawer
      open={Boolean(appointment)}
      onClose={onClose}
      label="Appointment Details"
      hero={hero}
      stats={stats}
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Doctor Information Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Stethoscope size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Consulting Physician
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Assigned doctor and clinical facility location
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope size={16} style={{ color: '#0284c7' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {appointment.doctorName}
                </span>
              </div>
              {appointment.doctorSpecialty && (
                <Badge tone="blue">{appointment.doctorSpecialty}</Badge>
              )}
            </div>

            {(appointment.hospitalName || appointment.branchName) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b' }}>
                <Building2 size={14} style={{ color: '#94a3b8' }} />
                <span>
                  {[appointment.branchName, appointment.hospitalName].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            {appointment.doctorPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b' }}>
                <Phone size={14} style={{ color: '#94a3b8' }} />
                <a href={`tel:${appointment.doctorPhone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                  {appointment.doctorPhone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Patient Details Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Patient Profile & Contact
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Patient identification and communication records
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} style={{ color: '#64748b' }} />
              <span style={{ fontWeight: 600, color: '#475569' }}>Name:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{appointment.patientName}</span>
            </div>

            {appointment.patientPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={15} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: 600, color: '#475569' }}>Phone:</span>
                <a href={`tel:${appointment.patientPhone}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
                  {appointment.patientPhone}
                </a>
              </div>
            )}

            {appointment.patientEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={15} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: 600, color: '#475569' }}>Email:</span>
                <a href={`mailto:${appointment.patientEmail}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                  {appointment.patientEmail}
                </a>
              </div>
            )}

            {appointment.patientGender && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartPulse size={15} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: 600, color: '#475569' }}>Gender:</span>
                <span style={{ textTransform: 'capitalize', color: '#1e293b' }}>
                  {appointment.patientGender.toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Specifics Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#fef3c7',
                color: '#b45309',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CalendarClock size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Consultation Details
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Purpose of visit and clinical instructions
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Purpose:</span>
              <span style={{ fontWeight: 600, color: '#0284c7' }}>{appointment.purpose}</span>
            </div>

            {appointment.patientNote && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontWeight: 600, color: '#475569', marginBottom: 4 }}>Notes / Instructions:</div>
                <div style={{ padding: 10, background: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>
                  {appointment.patientNote}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule History Card */}
        {appointment.rescheduleReason && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              color: '#6b21a8',
              fontSize: 13,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4 }}>Reschedule Reason:</strong>
            <div>{appointment.rescheduleReason}</div>
          </div>
        )}

        {/* Cancellation Information Card */}
        {appointment.cancellationReason && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4 }}>Cancellation Reason:</strong>
            <div>{appointment.cancellationReason}</div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ fontSize: 11.5, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
          Created: {new Date(appointment.createdAt).toLocaleString()} · ID: {appointment.id}
        </div>
      </div>
    </Drawer>
  );
}
