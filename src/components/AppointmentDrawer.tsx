import {
  Building2,
  CalendarClock,
  CalendarX2,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  Pencil,
  Phone,
  Stethoscope,
  User,
} from 'lucide-react';

import { titleCase } from '../lib/format';
import type { Appointment } from '../types/appointment';
import { Drawer } from './ui/Drawer';

interface AppointmentDrawerProps {
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
}

export default function AppointmentDrawer({
  appointment,
  onClose,
  onReschedule,
  onCancel,
  onEdit,
  onComplete,
}: AppointmentDrawerProps) {
  if (!appointment) return null;

  const isCancellable =
    appointment.status === 'scheduled' ||
    appointment.status === 'confirmed' ||
    appointment.status === 'rescheduled';

  const rawToken = appointment.tokenNumber ? String(appointment.tokenNumber).trim() : '01';
  const tokenDisplay = rawToken.startsWith('#') ? rawToken : `#${rawToken}`;

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bg = '#f8fafc';
    let fg = '#475569';
    let border = '#e2e8f0';
    let dot = '#94a3b8';

    if (s === 'scheduled' || s === 'confirmed') {
      bg = '#f5f3ff';
      fg = '#6d28d9';
      border = '#ede9fe';
      dot = '#7c3aed';
    } else if (s === 'completed') {
      bg = '#f0fdf4';
      fg = '#166534';
      border = '#dcfce7';
      dot = '#22c55e';
    } else if (s === 'rescheduled') {
      bg = '#fffbeb';
      fg = '#92400e';
      border = '#fef3c7';
      dot = '#d97706';
    } else if (s === 'cancelled') {
      bg = '#fef2f2';
      fg = '#991b1b';
      border = '#fee2e2';
      dot = '#ef4444';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
        <span>{titleCase(status.replace('_', ' '))}</span>
      </span>
    );
  };

  const hero = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.22)',
            flexShrink: 0,
          }}
        >
          {appointment.patientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 17.5, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              {appointment.patientName}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#6d28d9',
                background: '#f5f3ff',
                border: '1px solid #ede9fe',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              Token {tokenDisplay}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            {appointment.purpose} · {appointment.date} at {appointment.time}
          </div>
        </div>
      </div>
      <div>
        {renderStatusBadge(appointment.status)}
      </div>
    </div>
  );

  const stats = [
    {
      label: 'Consultation Date',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {appointment.date}
        </span>
      ),
    },
    {
      label: 'Scheduled Time',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {appointment.time}
        </span>
      ),
    },
    {
      label: 'Token Number',
      value: (
        <span style={{ fontWeight: 700, color: '#6d28d9', fontSize: 13 }}>
          {tokenDisplay}
        </span>
      ),
    },
  ];

  const footer = (
    <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
      {isCancellable && onComplete && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 12.5,
            background: '#ffffff',
            color: '#166534',
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '0 13px',
            height: 35,
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => onComplete(appointment)}
        >
          <CheckCircle size={14} style={{ color: '#16a34a' }} />
          <span>Mark Completed</span>
        </button>
      )}

      {isCancellable && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 12.5,
            background: '#ffffff',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '0 13px',
            height: 35,
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => onCancel(appointment)}
        >
          <CalendarX2 size={14} style={{ color: '#dc2626' }} />
          <span>Cancel Appointment</span>
        </button>
      )}

      {isCancellable && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          style={{
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 35,
            padding: '0 13px',
            fontWeight: 600,
          }}
          onClick={() => onReschedule(appointment)}
        >
          <CalendarClock size={14} style={{ color: '#64748b' }} />
          <span>Reschedule</span>
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 12.5,
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '0 16px',
            height: 35,
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.28)',
          }}
          onClick={() => onEdit(appointment)}
        >
          <Pencil size={14} />
          <span>Edit</span>
        </button>
      )}

      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        style={{ fontSize: 12.5, height: 35, padding: '0 14px' }}
      >
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
      size="lg"
      className="appointment-view-drawer"
      width="min(740px, 100vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Physician & Location Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <Stethoscope size={13.5} style={{ color: '#7c3aed', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Attending Physician</div>
              <div className="appt-view-subtitle">Assigned doctor and clinical facility location</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {appointment.doctorName}
              </span>
              {appointment.doctorSpecialty && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    color: '#6d28d9',
                    background: '#f5f3ff',
                    border: '1px solid #ede9fe',
                    padding: '2px 8px',
                    borderRadius: 5,
                  }}
                >
                  {appointment.doctorSpecialty}
                </span>
              )}
            </div>

            {(appointment.hospitalName || appointment.branchName) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12.5 }}>
                <Building2 size={13.5} style={{ color: '#64748b', flexShrink: 0 }} />
                <span>{[appointment.branchName, appointment.hospitalName].filter(Boolean).join(' · ')}</span>
              </div>
            )}

            {appointment.doctorPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12.5 }}>
                <Phone size={13.5} style={{ color: '#64748b', flexShrink: 0 }} />
                <a href={`tel:${appointment.doctorPhone}`} style={{ color: '#334155', textDecoration: 'none', fontWeight: 500 }}>
                  {appointment.doctorPhone}
                </a>
              </div>
            )}

            {appointment.doctorEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12.5 }}>
                <Mail size={13.5} style={{ color: '#64748b', flexShrink: 0 }} />
                <span style={{ color: '#64748b' }}>{appointment.doctorEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Patient Profile & Contact Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <User size={13.5} style={{ color: '#7c3aed', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Patient Profile & Contact</div>
              <div className="appt-view-subtitle">Patient identification and demographic record</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12.5 }}>
            <div className="appt-view-item">
              <span className="appt-view-label">Full Name</span>
              <span className="appt-view-val" style={{ fontWeight: 650 }}>{appointment.patientName}</span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Contact Phone</span>
              <span className="appt-view-val">
                {appointment.patientPhone ? (
                  <a href={`tel:${appointment.patientPhone}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>
                    {appointment.patientPhone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Not provided</span>
                )}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Email Address</span>
              <span className="appt-view-val">
                {appointment.patientEmail || <span style={{ color: '#94a3b8' }}>Not provided</span>}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Gender / DOB</span>
              <span className="appt-view-val">
                {[appointment.patientGender ? titleCase(appointment.patientGender) : null, appointment.patientDob]
                  .filter(Boolean)
                  .join(' · ') || <span style={{ color: '#94a3b8' }}>Not recorded</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Consultation Specifics Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <FileText size={13.5} style={{ color: '#7c3aed', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Consultation Details</div>
              <div className="appt-view-subtitle">Visit reason, scheduled session, and clinical notes</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#64748b' }}>Purpose:</span>
                <span style={{ fontWeight: 650, color: '#0f172a' }}>{appointment.purpose}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                <Clock size={13} style={{ color: '#94a3b8' }} />
                <span>{appointment.date} at {appointment.time}</span>
              </div>
            </div>

            {appointment.patientNote && (
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 11.5, fontWeight: 650, color: '#475569', marginBottom: 4 }}>
                  Notes / Chief Complaint:
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {appointment.patientNote}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Reason Card (if applicable) */}
        {appointment.rescheduleReason && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '3px solid #d97706',
              fontSize: 12.5,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reschedule Reason
            </div>
            <div style={{ color: '#334155', marginTop: 3 }}>
              {appointment.rescheduleReason}
            </div>
          </div>
        )}

        {/* Cancellation Reason Card (if applicable) */}
        {appointment.cancellationReason && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '3px solid #dc2626',
              fontSize: 12.5,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cancellation Reason
            </div>
            <div style={{ color: '#334155', marginTop: 3 }}>
              {appointment.cancellationReason}
            </div>
          </div>
        )}

        {/* Audit Metadata */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: 8,
          }}
        >
          <span>Created: {new Date(appointment.createdAt).toLocaleString()}</span>
          <span>ID: {appointment.id}</span>
        </div>
      </div>

      <style>{`
        .appointment-view-drawer {
          width: min(740px, 100vw) !important;
          max-width: 740px !important;
          box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
        }
        .appt-view-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .appt-view-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .appt-view-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #f5f3ff;
          border: 1px solid #ede9fe;
          display: flex;
          align-items: center;
          justifyContent: center;
          flex-shrink: 0;
          margin: 0;
        }
        .appt-view-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .appt-view-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 1px;
        }
        .appt-view-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 8px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }
        .appt-view-label {
          font-size: 11px;
          color: #64748b;
        }
        .appt-view-val {
          color: #0f172a;
          font-size: 12.5px;
        }
      `}</style>
    </Drawer>
  );
}
