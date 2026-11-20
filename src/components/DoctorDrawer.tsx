import {
  Activity,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { usePermission } from '../context/PermissionContext';
import { formatDate, timeAgo, titleCase } from '../lib/format';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Doctor } from './DoctorModal';
import { Drawer } from './ui/Drawer';
import { getDoctorDefaultAvatar, resolveImageUrl } from '../utils/doctorAvatar';
import { DoctorQualificationView } from './DoctorQualificationBadge';

interface Slot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  branch_name?: string;
}

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

interface DoctorDrawerProps {
  doctor: Doctor | null;
  onClose: () => void;
  onEdit: (doctor: Doctor) => void;
  onSchedule: (doctor: Doctor) => void;
  /** Bump to refetch the schedule after it was edited elsewhere. */
  scheduleVersion: number;
}

export default function DoctorDrawer({
  doctor,
  onClose,
  onEdit,
  onSchedule,
  scheduleVersion,
}: DoctorDrawerProps) {
  const { canUpdate, roleName, hasRole } = usePermission();
  const isDoctorUser =
    Boolean(roleName && String(roleName).toUpperCase().includes('DOCTOR')) ||
    Boolean(typeof hasRole === 'function' && hasRole('DOCTOR', 'Doctor'));
  const isDoctorEditable = canUpdate('DOCTORS');
  const isScheduleEditable = canUpdate('AVAILABILITY') || isDoctorUser;
  // Keyed by doctor + version so a stale response never shows under another doctor.
  const [schedule, setSchedule] = useState<{ key: string; slots: Slot[]; error: string } | null>(
    null,
  );
  const [imgError, setImgError] = useState(false);
  const key = doctor ? `${doctor.id}:${scheduleVersion}` : '';

  useEffect(() => {
    setImgError(false);
  }, [doctor?.id, doctor?.profile_image_url, (doctor as any)?.profileImageUrl]);

  useEffect(() => {
    if (!doctor || !doctor.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<Slot[]>(`doctor-availability/doctor/${doctor.id}`);
        const data = res?.data;
        const slotsArray = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];
        if (!cancelled)
          setSchedule({ key, slots: slotsArray, error: '' });
      } catch (err: unknown) {
        if (!cancelled)
          setSchedule({ key, slots: [], error: getErrorMessage(err, 'Failed to load schedule.') });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [doctor?.id, key]);

  const loaded = schedule?.key === key ? schedule : null;
  const slots = Array.isArray(loaded?.slots) ? loaded.slots : [];

  // Patient & Consultation Metrics
  const [metrics, setMetrics] = useState<{
    totalPatients: number;
    todaysPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
    cancelledAppointments: number;
    followupPatients: number;
    loading: boolean;
  }>({
    totalPatients: 0,
    todaysPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    upcomingAppointments: 0,
    cancelledAppointments: 0,
    followupPatients: 0,
    loading: true,
  });

  useEffect(() => {
    if (!doctor) return;
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const res = await api.get('appointments', { params: { doctorId: doctor.id } });
        const rawData = res?.data;
        const appts: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];

        if (!cancelled) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const todayLocal = new Date().toLocaleDateString('en-CA');

          const patientIds = new Set<string>();
          const todayPatientIds = new Set<string>();
          const followupPatientIds = new Set<string>();

          let completed = 0;
          let upcoming = 0;
          let cancelledCount = 0;

          for (const a of appts) {
            const pid =
              a.patientId ||
              a.patient_id ||
              a.patientName ||
              a.patient_name ||
              a.patientPhone ||
              a.patient_phone;

            if (pid) {
              patientIds.add(String(pid));
            }

            const startStr = a.scheduledStart || a.scheduled_start || a.date || '';
            const apptDate = startStr.slice(0, 10);
            const isToday = apptDate === todayIso || apptDate === todayLocal;

            if (isToday && pid) {
              todayPatientIds.add(String(pid));
            }

            const status = String(a.status || '').toLowerCase();
            if (status === 'completed') {
              completed++;
            } else if (status === 'cancelled') {
              cancelledCount++;
            } else if (['scheduled', 'confirmed', 'rescheduled'].includes(status)) {
              upcoming++;
            }

            const purpose = String(a.purpose || '');
            const type = String(a.appointment_type || a.appointmentType || '');
            if (/follow[\s-]?up/i.test(purpose) || /follow[\s-]?up/i.test(type)) {
              if (pid) followupPatientIds.add(String(pid));
            }
          }

          setMetrics({
            totalPatients: patientIds.size,
            todaysPatients: todayPatientIds.size,
            totalAppointments: appts.length,
            completedAppointments: completed,
            upcomingAppointments: upcoming,
            cancelledAppointments: cancelledCount,
            followupPatients: followupPatientIds.size,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setMetrics((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [doctor?.id]);

  if (!doctor) return null;

  const isActive = Boolean(
    (!doctor?.status || String(doctor.status).toUpperCase() === 'ACTIVE') &&
    doctor?.is_active !== false,
  );

  const defaultAvatar = getDoctorDefaultAvatar(doctor);
  const rawPhoto =
    doctor?.profile_image_url ||
    (doctor as any)?.profileImageUrl ||
    (doctor as any)?.image_url ||
    (doctor as any)?.image;
  const resolvedPhoto = resolveImageUrl(rawPhoto);
  const hasCustomPhoto = !imgError && Boolean(resolvedPhoto);
  const displayPhotoSrc = hasCustomPhoto ? resolvedPhoto! : defaultAvatar;

  const footer = (
    <div className="doctor-view-drawer-footer" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 10 }}>
      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        style={{ fontSize: 12.5, height: 35, padding: '0 14px' }}
      >
        Close
      </button>

      {isScheduleEditable && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={() => onSchedule(doctor)}
          style={{
            fontSize: 12.5,
            height: 35,
            padding: '0 14px',
            color: '#1d4ed8',
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Manage Doctor Availability & Slots"
        >
          <CalendarClock size={14} />
          <span>Manage Schedule</span>
        </button>
      )}

      {isDoctorEditable && (
        <button
          type="button"
          className="ui-btn"
          onClick={() => onEdit(doctor)}
          style={{
            fontSize: 12.5,
            height: 35,
            padding: '0 16px',
            background: '#2563eb',
            color: '#ffffff',
            border: '1px solid #2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.24)',
          }}
          title="Edit Doctor Profile"
        >
          <Pencil size={14} />
          <span>Edit Doctor Details</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        open={Boolean(doctor)}
        onClose={onClose}
        label="Doctor Profile & Clinical Credentials"
        footer={footer}
        size="xl"
        className="doctor-view-drawer"
        width="min(1180px, 100vw)"
      >
        <div className="doctor-drawer-split">
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT SIDE: Doctor Profile Card (Fixed / Sticky on Desktop)
              Matching the User's Reference Layout (Photo + Info + Navy Pill Btn)
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="doctor-drawer-left">
            <div className="doctor-ref-card">
              {/* Doctor Photo Header */}
              <div className="doctor-card-photo-hero">
                <img
                  src={displayPhotoSrc}
                  alt={doctor.name || 'Doctor'}
                  className={`doctor-card-photo ${!hasCustomPhoto ? 'doctor-card-photo-default' : ''}`}
                  onError={() => setImgError(true)}
                />
                <div className="doctor-card-photo-badge">
                  <Stethoscope size={13} />
                  <span>Verified Practicing Doctor</span>
                </div>
              </div>

              {/* Doctor Details Body (Light Blue Container matching Reference) */}
              <div className="doctor-card-body">
                {/* Doctor Name & Status */}
                <div className="doctor-card-name-block">
                  <h2 className="doctor-card-name">{doctor.name}</h2>

                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span className="doctor-card-status-pill">
                      <span className={`doctor-status-dot ${isActive ? 'is-active' : ''}`} />
                      <span>{isActive ? 'Active Doctor' : 'Inactive'}</span>
                    </span>
                    {doctor.user_account_id ? (
                      <span className="doctor-card-account-pill">
                        <UserCheck size={11} style={{ color: '#16a34a' }} />
                        <span>Account Linked</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="doctor-card-divider" />

                {/* Section 1: Professional & Clinical Credentials (Left Side) */}
                <div className="doctor-card-section">
                  <div className="doctor-card-section-head">
                    <Stethoscope size={15} className="doctor-card-icon" />
                    <span className="doctor-card-section-title">Professional & Clinical Credentials</span>
                  </div>
                  <div className="doctor-card-cred-list">
                    <div className="doctor-card-cred-row">
                      <span className="doctor-card-cred-label">Specialization</span>
                      <span className="doctor-card-cred-val" style={{ color: '#1d4ed8', fontWeight: 700 }}>
                        {doctor.specialization || 'General Practitioner'}
                      </span>
                    </div>

                    <div className="doctor-card-cred-row" style={{ alignItems: 'flex-start' }}>
                      <span className="doctor-card-cred-label" style={{ paddingTop: 3 }}>Qualification</span>
                      <DoctorQualificationView qualification={doctor.qualification} maxVisible={3} />
                    </div>

                    <div className="doctor-card-cred-row">
                      <span className="doctor-card-cred-label">Registration No.</span>
                      {doctor.medical_registration_number ? (
                        <span className="doctor-card-reg-pill">
                          {doctor.medical_registration_number}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11.5 }}>Not recorded</span>
                      )}
                    </div>

                    <div className="doctor-card-cred-row">
                      <span className="doctor-card-cred-label">Clinical Experience</span>
                      <span className="doctor-card-cred-val" style={{ fontWeight: 600 }}>
                        {doctor.years_of_experience !== null && doctor.years_of_experience !== undefined
                          ? `${doctor.years_of_experience} Years in Practice`
                          : 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="doctor-card-divider" />

                {/* Section 2: Support / Email */}
                <div className="doctor-card-section">
                  <div className="doctor-card-section-head">
                    <Mail size={16} className="doctor-card-icon" />
                    <span className="doctor-card-section-title">Support</span>
                  </div>
                  <div className="doctor-card-section-text">
                    {doctor.email ? (
                      <a href={`mailto:${doctor.email}`} className="doctor-card-link">
                        {doctor.email}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        No email recorded
                      </span>
                    )}
                  </div>
                </div>

                <div className="doctor-card-divider" />

                {/* Section 3: Call Me / Phone */}
                <div className="doctor-card-section">
                  <div className="doctor-card-section-head">
                    <Phone size={16} className="doctor-card-icon" />
                    <span className="doctor-card-section-title">Call Me</span>
                  </div>
                  <div className="doctor-card-section-text">
                    {doctor.phone ? (
                      <a href={`tel:${doctor.phone}`} className="doctor-card-link">
                        {doctor.phone}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        No phone recorded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT SIDE: Rest of Details (Independent Scrollable Container)
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="doctor-drawer-right">
            {/* ══════════════════════════════════════════════════════════════════
                TOP SECTION: Patient & Appointment Counts (Left) + Weekly Schedule (Right)
                ══════════════════════════════════════════════════════════════════ */}
            <div className="doctor-right-top-split">
              {/* Left Side: Clinical Patient & Appointment Counts */}
              <div className="doctor-view-card doctor-counts-card">
                <div className="doctor-view-header">
                  <div className="doctor-view-badge">
                    <Activity size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doctor-view-title">Patient & Consultation Summary</div>
                  </div>
                </div>

                <div className="doctor-counts-list">
                  {/* Total Patients */}
                  <div className="doctor-count-row is-active-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <Users size={13} />
                      </span>
                      <span className="doctor-count-label">Total Patients</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#1d4ed8', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                      {metrics.loading ? '…' : metrics.totalPatients}
                    </span>
                  </div>

                  {/* Today's Patients */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                        <UserCheck size={13} />
                      </span>
                      <span className="doctor-count-label">Today's Patients</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#047857', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                      {metrics.loading ? '…' : metrics.todaysPatients}
                    </span>
                  </div>

                  {/* Total Appointments */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#0284c7', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                        <CalendarDays size={13} />
                      </span>
                      <span className="doctor-count-label">Total Appointments</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#0369a1', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                      {metrics.loading ? '…' : metrics.totalAppointments}
                    </span>
                  </div>

                  {/* Completed Appointments */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#16a34a', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <CheckCircle2 size={13} />
                      </span>
                      <span className="doctor-count-label">Completed Appointments</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#15803d', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      {metrics.loading ? '…' : metrics.completedAppointments}
                    </span>
                  </div>

                  {/* Upcoming Appointments */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#d97706', background: '#fffbeb', borderColor: '#fde68a' }}>
                        <Clock size={13} />
                      </span>
                      <span className="doctor-count-label">Upcoming Appointments</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' }}>
                      {metrics.loading ? '…' : metrics.upcomingAppointments}
                    </span>
                  </div>

                  {/* Cancelled Appointments */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#dc2626', background: '#fef2f2', borderColor: '#fecaca' }}>
                        <CalendarX2 size={13} />
                      </span>
                      <span className="doctor-count-label">Cancelled Appointments</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#b91c1c', background: '#fef2f2', borderColor: '#fecaca' }}>
                      {metrics.loading ? '…' : metrics.cancelledAppointments}
                    </span>
                  </div>

                  {/* Follow-up Patients */}
                  <div className="doctor-count-row">
                    <div className="doctor-count-row-left">
                      <span className="doctor-count-icon-badge" style={{ color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}>
                        <RotateCcw size={13} />
                      </span>
                      <span className="doctor-count-label">Follow-up Patients</span>
                    </div>
                    <span className="doctor-count-pill" style={{ color: '#6d28d9', background: '#f5f3ff', borderColor: '#ddd6fe' }}>
                      {metrics.loading ? '…' : metrics.followupPatients}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Weekly Schedule */}
              <div className="doctor-view-card doctor-schedule-card">
                <div className="doctor-view-header">
                  <div className="doctor-view-badge">
                    <CalendarClock size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doctor-view-title">Weekly Schedule & Consultation Availability</div>
                  </div>
                </div>

                {!loaded ? (
                  <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
                    <Clock size={14} className="animate-spin" style={{ color: '#2563eb' }} />
                    <span>Loading schedule…</span>
                  </div>
                ) : loaded.error ? (
                  <div style={{ color: '#ef4444', fontSize: 12, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2' }}>
                    {loaded.error}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DAYS.map((day) => {
                      const daySlots = slots
                        .filter((s) => s && String(s.day_of_week || '').toUpperCase() === day)
                        .sort((a, b) =>
                          String(a?.start_time || '').localeCompare(String(b?.start_time || ''))
                        );
                      const isDayActive = daySlots.length > 0;

                      return (
                        <div className={`doctor-schedule-row ${isDayActive ? 'is-active-row' : ''}`} key={day}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span className={`doctor-day-dot ${isDayActive ? 'is-active' : ''}`} />
                            <span className={`doctor-schedule-day ${isDayActive ? 'is-active' : ''}`}>
                              {titleCase(day)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                            {daySlots.length === 0 ? (
                              <span className="doctor-slot-off">Day Off</span>
                            ) : (
                              daySlots.map((s, sIdx) => {
                                const startStr = String(s?.start_time || '').slice(0, 5) || '00:00';
                                const endStr = String(s?.end_time || '').slice(0, 5) || '00:00';
                                return (
                                  <span className="doctor-slot-pill" key={s?.id || `${day}-${sIdx}`} title={s?.branch_name}>
                                    <Clock size={10} style={{ flexShrink: 0, color: '#2563eb' }} />
                                    <span>
                                      {startStr} – {endStr}
                                    </span>
                                    {s?.branch_name && (
                                      <span className="doctor-slot-branch-tag">· {s.branch_name}</span>
                                    )}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Hospital & Clinic Assignment */}
            <div className="doctor-view-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge">
                  <Building2 size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doctor-view-title">Hospital & Clinic Assignment</div>
                  <div className="doctor-view-subtitle">Primary hospital facility, branch placement, and practice address</div>
                </div>
              </div>

              <div className="doctor-view-grid-2">
                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <Building2 size={13} style={{ color: '#2563eb' }} />
                    <span className="doctor-view-label">Affiliated Hospital</span>
                  </div>
                  <span className="doctor-view-val" style={{ fontWeight: 650, color: '#0f172a' }}>
                    {doctor.hospital_name || 'Primary Hospital System'}
                  </span>
                </div>

                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <Building2 size={13} style={{ color: '#64748b' }} />
                    <span className="doctor-view-label">Assigned Branch</span>
                  </div>
                  <span className="doctor-view-val" style={{ fontWeight: 650, color: '#0f172a' }}>
                    {doctor.branch_name || 'All Branches / Central Unit'}
                  </span>
                </div>

                <div className="doctor-view-item doctor-view-item-full">
                  <div className="doctor-view-item-head">
                    <MapPin size={13} style={{ color: '#2563eb' }} />
                    <span className="doctor-view-label">Clinic Location / Physical Address</span>
                  </div>
                  <div className="doctor-view-val" style={{ lineHeight: 1.55 }}>
                    {doctor.address_line_1 ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {[doctor.address_line_1, doctor.address_line_2].filter(Boolean).join(', ')}
                        </div>
                        {Boolean(doctor.city || doctor.state || doctor.pincode) && (
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                            {[doctor.city, doctor.state, doctor.pincode].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      doctor.clinic_address || 'No specific clinic address recorded'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Media & External Channels */}
            <div className="doctor-view-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge">
                  <Video size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doctor-view-title">Media & External Channels</div>
                  <div className="doctor-view-subtitle">Podcasts, clinical videos, and digital presence</div>
                </div>
              </div>

              <div className="doctor-view-item doctor-view-item-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div className="doctor-media-icon-badge">
                    <Video size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="doctor-view-label">Podcast / YouTube Channel</div>
                    <div
                      className="doctor-view-val"
                      style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      {doctor.podcast_url ? (
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{doctor.podcast_url}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                          No podcast or YouTube channel linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {doctor.podcast_url && (
                  <a
                    href={
                      doctor.podcast_url.startsWith('http://') || doctor.podcast_url.startsWith('https://')
                        ? doctor.podcast_url
                        : `https://${doctor.podcast_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doctor-media-link-btn"
                  >
                    <span>Visit Channel</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Card 4: System Record & Access Control */}
            <div className="doctor-view-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge">
                  <ShieldCheck size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doctor-view-title">System Record & Access Control</div>
                  <div className="doctor-view-subtitle">Account linkage, profile status, and audit timestamps</div>
                </div>
              </div>

              <div className="doctor-view-grid-2">
                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <UserCheck size={13} style={{ color: doctor.user_account_id ? '#16a34a' : '#64748b' }} />
                    <span className="doctor-view-label">App Login Account</span>
                  </div>
                  <span className="doctor-view-val">
                    {doctor.user_account_id ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#15803d',
                          fontWeight: 650,
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                        <span>Linked Portal Account</span>
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 12 }}>No account linked</span>
                    )}
                  </span>
                </div>

                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <ShieldCheck size={13} style={{ color: '#2563eb' }} />
                    <span className="doctor-view-label">Profile Status</span>
                  </div>
                  <span className="doctor-view-val" style={{ fontWeight: 650 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isActive ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
                        color: isActive ? '#166534' : '#64748b',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isActive ? '#22c55e' : '#94a3b8',
                        }}
                      />
                      <span>{titleCase(doctor.status)}</span>
                    </span>
                  </span>
                </div>

                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <CalendarClock size={13} style={{ color: '#64748b' }} />
                    <span className="doctor-view-label">Record Created</span>
                  </div>
                  <span className="doctor-view-val" style={{ fontSize: 12, color: '#334155' }}>
                    {formatDate(doctor.created_at)} <span style={{ color: '#94a3b8' }}>· {timeAgo(doctor.created_at)}</span>
                  </span>
                </div>

                <div className="doctor-view-item">
                  <div className="doctor-view-item-head">
                    <Clock size={13} style={{ color: '#64748b' }} />
                    <span className="doctor-view-label">Last Modified</span>
                  </div>
                  <span className="doctor-view-val" style={{ fontSize: 12, color: '#334155' }}>
                    {doctor.updated_at ? timeAgo(doctor.updated_at) : 'Never updated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <style>{`
        .doctor-view-drawer {
          width: min(1180px, 100vw) !important;
          max-width: 1180px !important;
        }
        .doctor-view-drawer .ui-drawer-scroll {
          overflow-y: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .doctor-view-drawer .ui-drawer-content {
          flex: 1 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          padding: 16px 22px 20px !important;
        }
        .doctor-drawer-split {
          display: grid;
          grid-template-columns: 330px 1fr;
          grid-template-rows: minmax(0, 1fr);
          gap: 20px;
          height: 100%;
          min-height: 0;
          align-items: stretch;
        }
        .doctor-drawer-left {
          height: 100%;
          min-height: 0;
          max-height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          padding-right: 6px;
          padding-bottom: 24px;
          display: flex;
          flex-direction: column;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f8fafc;
        }
        .doctor-drawer-left::-webkit-scrollbar {
          width: 6px;
        }
        .doctor-drawer-left::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .doctor-drawer-left::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .doctor-drawer-left::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .doctor-drawer-right {
          height: 100%;
          min-height: 0;
          max-height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 6px;
          padding-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f8fafc;
        }
        .doctor-drawer-right::-webkit-scrollbar {
          width: 6px;
        }
        .doctor-drawer-right::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .doctor-drawer-right::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .doctor-drawer-right::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @media (max-width: 920px) {
          .doctor-view-drawer .ui-drawer-scroll {
            overflow-y: auto !important;
          }
          .doctor-view-drawer .ui-drawer-content {
            overflow: visible !important;
          }
          .doctor-drawer-split {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            height: auto;
          }
          .doctor-drawer-left,
          .doctor-drawer-right {
            height: auto;
            max-height: none;
            overflow-y: visible;
          }
        }
        .doctor-view-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
        }
        .doctor-view-drawer-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          width: 100%;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .doctor-view-drawer {
            width: 100vw !important;
            max-width: 100vw !important;
          }
          .doctor-view-drawer .ui-drawer-content {
            padding: 12px 14px 16px !important;
          }
          .doctor-view-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .doctor-view-drawer-footer {
            justify-content: stretch !important;
            gap: 8px !important;
          }
          .doctor-view-drawer-footer > button {
            flex: 1 1 calc(50% - 8px) !important;
            min-height: 36px !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .doctor-view-drawer-footer > button:last-child {
            flex: 1 1 100% !important;
          }
          .doctor-card-photo-hero {
            height: 145px !important;
            min-height: 130px !important;
            padding: 8px 12px 28px !important;
          }
          .doctor-card-photo,
          .doctor-card-photo.doctor-card-photo-default {
            max-height: 110px !important;
          }
          .doctor-view-card {
            padding: 12px 14px !important;
            gap: 12px !important;
          }
          .doctor-counts-list,
          .doctor-schedule-list {
            gap: 4px !important;
          }
          .doctor-count-row,
          .doctor-schedule-row {
            padding: 6px 10px !important;
          }
          .doctor-card-body {
            padding: 10px 12px 14px !important;
          }
          .doctor-card-name {
            font-size: 17px !important;
          }
        }
        @media (max-width: 480px) {
          .doctor-view-drawer-footer > button {
            flex: 1 1 100% !important;
          }
        }
        /* Left Doctor Profile Card matching Reference Image */
        .doctor-ref-card {
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          flex-shrink: 0;
          margin-bottom: 20px;
        }
        .doctor-card-photo-hero {
          width: 100%;
          height: 180px;
          min-height: 160px;
          position: relative;
          background: #ffffff;
          overflow: hidden;
          border-bottom: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 12px 16px 32px;
        }
        .doctor-card-photo {
          max-width: 100%;
          width: auto;
          height: 100%;
          max-height: 140px;
          object-fit: contain;
          object-position: bottom center;
          display: block;
          margin: 0 auto;
          filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.08));
        }
        .doctor-card-photo.doctor-card-photo-default {
          max-width: 100%;
          width: auto;
          height: 100%;
          max-height: 140px;
          object-fit: contain;
          object-position: bottom center;
          padding: 0;
          margin: 0 auto;
        }
        @media (max-height: 850px) {
          .doctor-card-photo-hero {
            height: 155px;
            min-height: 140px;
            padding: 8px 14px 28px;
          }
          .doctor-card-photo,
          .doctor-card-photo.doctor-card-photo-default {
            max-height: 120px;
          }
          .doctor-card-body {
            padding: 10px 14px 14px !important;
          }
          .doctor-card-name {
            font-size: 17px !important;
          }
          .doctor-card-divider {
            margin: 6px 0 !important;
          }
          .doctor-card-cred-list {
            gap: 4px !important;
            margin-top: 4px !important;
          }
        }
        @media (max-height: 720px) {
          .doctor-card-photo-hero {
            height: 130px;
            min-height: 120px;
            padding: 6px 12px 24px;
          }
          .doctor-card-photo,
          .doctor-card-photo.doctor-card-photo-default {
            max-height: 100px;
          }
          .doctor-card-body {
            padding: 8px 12px 12px !important;
          }
          .doctor-card-name {
            font-size: 16px !important;
          }
          .doctor-card-divider {
            margin: 5px 0 !important;
          }
          .doctor-card-cred-list {
            gap: 3px !important;
          }
        }
        .doctor-card-photo-badge {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 9999px;
          background: #ffffff;
          color: #2563eb;
          font-size: 10.5px;
          font-weight: 600;
          z-index: 2;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
          white-space: nowrap;
        }
        .doctor-card-body {
          padding: 12px 16px 16px;
        }
        .doctor-card-name-block {
          text-align: center;
        }
        .doctor-card-name {
          font-size: 19px;
          font-weight: 750;
          color: #0c2340;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }
        .doctor-card-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .doctor-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .doctor-status-dot.is-active {
          background: #22c55e;
        }
        .doctor-card-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 9px 0;
        }
        .doctor-card-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .doctor-card-section-head {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .doctor-card-icon {
          color: #1d4ed8;
          flex-shrink: 0;
        }
        .doctor-card-section-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0c2340;
        }
        .doctor-card-cred-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 6px;
          padding-left: 22px;
        }
        .doctor-card-cred-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .doctor-card-cred-label {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
        }
        .doctor-card-cred-val {
          font-size: 12px;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
        }
        .doctor-qual-tags-container,
        .doctor-qual-val-container {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: flex-end;
          max-width: 220px;
          background: transparent;
          border: none;
        }
        .doctor-qual-pill,
        .doctor-qual-text {
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
          background: transparent;
          border: none;
          line-height: 1.35;
          word-break: break-word;
        }
        .doctor-qual-more-btn {
          display: inline-flex;
          align-items: center;
          padding: 0;
          border-radius: 0;
          font-size: 11.5px;
          font-weight: 600;
          color: #2563eb;
          background: transparent;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1.35;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }
        .doctor-qual-more-btn:hover {
          color: #1d4ed8;
          background: transparent;
        }
        .doctor-qual-less-btn {
          display: inline-flex;
          align-items: center;
          padding: 0;
          border-radius: 0;
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          line-height: 1.35;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .doctor-qual-less-btn:hover {
          color: #334155;
          background: transparent;
        }
        .doctor-card-reg-pill {
          font-size: 11px;
          font-weight: 700;
          color: #1d4ed8;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 1.5px 6px;
          border-radius: 4px;
        }
        .doctor-card-section-text {
          font-size: 12px;
          color: #334155;
          line-height: 1.5;
          padding-left: 23px;
        }
        .doctor-card-link {
          color: #1d4ed8;
          text-decoration: none;
          font-weight: 500;
          word-break: break-all;
        }
        .doctor-card-link:hover {
          text-decoration: underline;
        }
        .doctor-card-account-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .doctor-card-actions {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          width: 100%;
        }
        .doctor-card-primary-btn {
          width: 100%;
          height: 40px;
          background: #082857; /* Dark navy pill button from reference image */
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 4px 14px rgba(8, 40, 87, 0.28);
        }
        .doctor-card-primary-btn:hover {
          background: #051a3a;
          box-shadow: 0 6px 18px rgba(8, 40, 87, 0.38);
          transform: translateY(-1px);
        }
        .doctor-card-secondary-btn {
          width: 100%;
          height: 36px;
          background: #ffffff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-card-secondary-btn:hover {
          background: #f8fafc;
          border-color: #93c5fd;
        }
        /* Top Split Section: Counts Left, Schedule Right */
        .doctor-right-top-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
          gap: 14px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .doctor-right-top-split {
            grid-template-columns: 1fr;
          }
        }
        .doctor-counts-card {
          gap: 10px;
          height: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .doctor-schedule-card {
          gap: 10px;
          height: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .doctor-counts-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .doctor-count-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6.5px 12px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          transition: all 0.15s ease;
          min-height: 35px;
        }
        .doctor-count-row:hover {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.04);
        }
        .doctor-count-row.is-active-row {
          background: #ffffff;
          border-color: #dbeafe;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.04);
        }
        .doctor-count-row-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .doctor-count-icon-badge {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid transparent;
        }
        .doctor-count-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #334155;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doctor-count-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 21px;
          padding: 0 8px;
          border-radius: 9999px;
          font-size: 11.5px;
          font-weight: 700;
          font-feature-settings: 'tnum';
          border: 1px solid transparent;
          flex-shrink: 0;
        }
        /* Right Side Enhanced Cards */
        .doctor-view-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          transition: all 0.15s ease;
        }
        .doctor-view-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .doctor-view-header {
          display: flex;
          align-items: center;
          gap: 11px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
          min-height: 44px;
        }
        .doctor-view-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0;
          color: #2563eb;
        }
        .doctor-view-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0c2340;
          line-height: 1.25;
        }
        .doctor-view-subtitle {
          font-size: 11.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .doctor-view-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 9px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          transition: all 0.15s ease;
        }
        .doctor-view-item:hover {
          border-color: #e2e8f0;
          background: #ffffff;
        }
        .doctor-view-item-full {
          grid-column: 1 / -1;
        }
        .doctor-view-item-row {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
        }
        .doctor-view-item-head {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .doctor-view-label {
          font-size: 10.5px;
          font-weight: 650;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .doctor-view-val {
          font-size: 13px;
          font-weight: 550;
          color: #0f172a;
          word-break: break-word;
        }
        .doctor-cal-quick-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          color: #2563eb;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 2.5px 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-cal-quick-btn:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .doctor-schedule-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6.5px 12px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          font-size: 12px;
          gap: 12px;
          transition: all 0.15s ease;
          min-height: 35px;
        }
        .doctor-schedule-row.is-active-row {
          background: #ffffff;
          border-color: #e0f2fe;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.04);
        }
        .doctor-day-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #cbd5e1;
          flex-shrink: 0;
        }
        .doctor-day-dot.is-active {
          background: #2563eb;
        }
        .doctor-schedule-day {
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
        }
        .doctor-schedule-day.is-active {
          color: #1d4ed8;
          font-weight: 700;
        }
        .doctor-slot-pill {
          display: inline-flex;
          align-items: center;
          gap: 4.5px;
          padding: 2.5px 8px;
          border-radius: 6px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 650;
        }
        .doctor-slot-branch-tag {
          color: #64748b;
          font-weight: 500;
          font-size: 10.5px;
        }
        .doctor-slot-off {
          font-size: 11.5px;
          color: #94a3b8;
          font-style: italic;
        }
        .doctor-media-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: grid;
          place-items: center;
          color: #2563eb;
          flex-shrink: 0;
        }
        .doctor-media-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 600;
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 4px 10px;
          text-decoration: none;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .doctor-media-link-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
      `}</style>
    </>
  );
}

export function ContactLine({
  icon,
  value,
  href,
}: {
  icon: ReactNode;
  value: string | null | undefined;
  href: string | null;
}) {
  return (
    <div className="ui-contact-card">
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ color: 'var(--ui-subtle)', display: 'flex' }}>{icon}</span>
        {value ? (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        ) : (
          <span className="ui-muted">Not provided</span>
        )}
      </span>
      {href && (
        <a className="ui-btn ui-btn-sm" href={href}>
          {href.startsWith('mailto:') ? 'Email' : 'Call'}
        </a>
      )}
    </div>
  );
}
