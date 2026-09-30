import { CalendarClock, Mail, Pencil, Phone } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { formatDate, timeAgo,titleCase } from '../lib/format';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Doctor } from './DoctorModal';
import { DetailList, Drawer } from './ui/Drawer';
import { Section } from './ui/Modal';
import { Avatar, Badge, cx, StatusDot } from './ui/primitives';

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
  // Keyed by doctor + version so a stale response never shows under another doctor.
  const [schedule, setSchedule] = useState<{ key: string; slots: Slot[]; error: string } | null>(
    null,
  );
  const key = doctor ? `${doctor.id}:${scheduleVersion}` : '';

  useEffect(() => {
    if (!doctor) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<Slot[]>(`doctor-availability/doctor/${doctor.id}`);
        if (!cancelled)
          setSchedule({ key, slots: Array.isArray(res.data) ? res.data : [], error: '' });
      } catch (err: unknown) {
        if (!cancelled)
          setSchedule({ key, slots: [], error: getErrorMessage(err, 'Failed to load schedule.') });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [doctor, key]);

  if (!doctor) return null;

  const loaded = schedule?.key === key ? schedule : null;
  const slots = loaded?.slots ?? [];
  const weeklyHours =
    slots.reduce((sum, s) => sum + minutes(s.end_time) - minutes(s.start_time), 0) / 60;

  return (
    <Drawer
      open
      onClose={onClose}
      label="Doctor details"
      hero={
        <>
          <Avatar name={doctor.name} size={56} />
          <div style={{ minWidth: 0 }}>
            <h2>{doctor.name}</h2>
            <div className="ui-drawer-hero-sub">
              {[doctor.qualification, doctor.hospital_name].filter(Boolean).join(' · ') ||
                'No details yet'}
            </div>
            <div className="ui-drawer-tags">
              <Badge tone="green">{doctor.specialization || 'General'}</Badge>
              <StatusDot active={doctor.status === 'ACTIVE'} />
            </div>
          </div>
        </>
      }
      stats={[
        {
          label: 'Experience',
          value:
            doctor.years_of_experience !== null && doctor.years_of_experience !== undefined
              ? `${doctor.years_of_experience} yrs`
              : '—',
        },
        { label: 'Weekly slots', value: loaded ? slots.length : '…' },
        { label: 'Weekly hours', value: loaded ? `${Number(weeklyHours.toFixed(1))} h` : '…' },
      ]}
      footer={
        <>
          <button type="button" className="ui-btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="ui-btn ui-btn-soft" onClick={() => onSchedule(doctor)}>
            <CalendarClock size={15} /> Manage schedule
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => onEdit(doctor)}>
            <Pencil size={14} /> Edit doctor
          </button>
        </>
      }
    >
      <Section title="Contact">
        <ContactLine
          icon={<Mail size={15} />}
          value={doctor.email}
          href={doctor.email ? `mailto:${doctor.email}` : null}
        />
        <ContactLine
          icon={<Phone size={15} />}
          value={doctor.phone}
          href={doctor.phone ? `tel:${doctor.phone}` : null}
        />
      </Section>

      <Section title="Weekly schedule">
        {!loaded ? (
          <span className="ui-skeleton" style={{ width: '70%', height: 14 }} />
        ) : loaded.error ? (
          <span style={{ color: 'var(--ui-red)' }}>{loaded.error}</span>
        ) : (
          <div className="ui-mini-week" style={{ marginTop: 0 }}>
            {DAYS.map((day) => {
              const daySlots = slots
                .filter((s) => s.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <div className="ui-mini-week-row" key={day}>
                  <span className={cx('ui-mini-week-day', daySlots.length > 0 && 'is-on')}>
                    {day.slice(0, 3)}
                  </span>
                  <div className="ui-mini-week-slots">
                    {daySlots.length === 0 ? (
                      <span className="ui-mini-off">Off</span>
                    ) : (
                      daySlots.map((s) => (
                        <span className="ui-mini-slot" key={s.id} title={s.branch_name}>
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <DetailList
        title="Assignment"
        items={[
          { label: 'Hospital', value: doctor.hospital_name },
          { label: 'Branch', value: doctor.branch_name || 'No specific branch' },
          { label: 'Clinic address', value: doctor.clinic_address },
        ]}
      />

      <DetailList
        title="Professional"
        items={[
          { label: 'Specialization', value: doctor.specialization },
          { label: 'Qualification', value: doctor.qualification },
          { label: 'Registration no.', value: doctor.medical_registration_number },
          {
            label: 'Experience',
            value:
              doctor.years_of_experience !== null && doctor.years_of_experience !== undefined
                ? `${doctor.years_of_experience} years`
                : null,
          },
        ]}
      />

      <DetailList
        title="Access & record"
        items={[
          {
            label: 'App login',
            value: doctor.user_account_id ? 'Linked account' : 'No account linked',
          },
          { label: 'Status', value: titleCase(doctor.status) },
          { label: 'Active in system', value: doctor.is_active === false ? 'No' : 'Yes' },
          {
            label: 'Added',
            value: `${formatDate(doctor.created_at)} · ${timeAgo(doctor.created_at)}`,
          },
          { label: 'Last updated', value: doctor.updated_at ? timeAgo(doctor.updated_at) : null },
        ]}
      />
    </Drawer>
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

function minutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}
