import { Mail, Pencil, Phone } from 'lucide-react';

import { ageFrom, formatDate, timeAgo, titleCase } from '../lib/format';
import { ContactLine } from './DoctorDrawer';
import { type Patient } from './PatientModal';
import { DetailList, Drawer } from './ui/Drawer';
import { Section } from './ui/Modal';
import { Avatar, Badge, StatusDot } from './ui/primitives';

interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

/** `emergency_contacts` is free-form JSON; keep only entries that look like contacts. */
function readContacts(raw: unknown): EmergencyContact[] {
  const list: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  return list
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => {
      const pick = (k: string) =>
        typeof c[k] === 'string' || typeof c[k] === 'number' ? String(c[k]) : undefined;
      const contact: EmergencyContact = {};
      const name = pick('name');
      const phone = pick('phone');
      const relation = pick('relation');
      if (name) contact.name = name;
      if (phone) contact.phone = phone;
      if (relation) contact.relation = relation;
      return contact;
    })
    .filter((c) => c.name ?? c.phone);
}

function bmiOf(heightCm: number | null | undefined, weightKg: number | null | undefined) {
  if (!heightCm || !weightKg) return null;
  const bmi = Number(weightKg) / (Number(heightCm) / 100) ** 2;
  if (!Number.isFinite(bmi)) return null;
  const band =
    bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';
  return { value: bmi.toFixed(1), band };
}

interface PatientDrawerProps {
  patient: Patient | null;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
}

export default function PatientDrawer({ patient, onClose, onEdit }: PatientDrawerProps) {
  if (!patient) return null;

  const age = ageFrom(patient.date_of_birth);
  const bmi = bmiOf(patient.height_cm, patient.weight_kg);
  const contacts = readContacts(patient.emergency_contacts);

  return (
    <Drawer
      open
      onClose={onClose}
      label="Patient details"
      hero={
        <>
          <Avatar name={patient.name} src={patient.profile_image_url} size={56} />
          <div style={{ minWidth: 0 }}>
            <h2>{patient.name}</h2>
            <div className="ui-drawer-hero-sub">
              {[
                age !== null ? `${age} yrs` : null,
                patient.gender ? titleCase(patient.gender) : null,
                patient.hospital_name,
              ]
                .filter(Boolean)
                .join(' · ') || 'No details yet'}
            </div>
            <div className="ui-drawer-tags">
              {patient.blood_group && <Badge tone="red">{patient.blood_group}</Badge>}
              <StatusDot active={patient.status === 'ACTIVE'} />
            </div>
          </div>
        </>
      }
      stats={[
        { label: 'Height', value: patient.height_cm ? `${patient.height_cm} cm` : '—' },
        { label: 'Weight', value: patient.weight_kg ? `${patient.weight_kg} kg` : '—' },
        { label: 'BMI', value: bmi ? `${bmi.value} · ${bmi.band}` : '—' },
      ]}
      footer={
        <>
          <button type="button" className="ui-btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => onEdit(patient)}>
            <Pencil size={14} /> Edit patient
          </button>
        </>
      }
    >
      <Section title="Contact">
        <ContactLine
          icon={<Phone size={15} />}
          value={patient.phone}
          href={patient.phone ? `tel:${patient.phone}` : null}
        />
        <ContactLine
          icon={<Mail size={15} />}
          value={patient.email}
          href={patient.email ? `mailto:${patient.email}` : null}
        />
      </Section>

      <DetailList
        title="Personal"
        items={[
          {
            label: 'Date of birth',
            value: patient.date_of_birth
              ? `${formatDate(patient.date_of_birth)}${age !== null ? ` (${age} yrs)` : ''}`
              : null,
          },
          { label: 'Gender', value: patient.gender ? titleCase(patient.gender) : null },
          {
            label: 'Marital status',
            value: patient.marital_status ? titleCase(patient.marital_status) : null,
          },
          { label: 'Address', value: patient.address },
        ]}
      />

      <DetailList
        title="Assignment"
        items={[
          { label: 'Hospital', value: patient.hospital_name },
          { label: 'Branch', value: patient.branch_name || 'No specific branch' },
        ]}
      />

      <Section title={`Emergency contacts${contacts.length ? ` · ${contacts.length}` : ''}`}>
        {contacts.length === 0 ? (
          <span className="ui-muted">No emergency contacts on file.</span>
        ) : (
          contacts.map((c, i) => (
            <div className="ui-contact-card" key={`${c.name ?? ''}-${i}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={c.name ?? '?'} size={30} />
                <span style={{ minWidth: 0 }}>
                  <span className="ui-cell-title" style={{ display: 'block' }}>
                    {c.name ?? 'Unnamed'}
                  </span>
                  <span className="ui-cell-sub">
                    {[c.relation, c.phone].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
              {c.phone && (
                <a className="ui-btn ui-btn-sm" href={`tel:${c.phone}`}>
                  Call
                </a>
              )}
            </div>
          ))
        )}
      </Section>

      <DetailList
        title="Access & record"
        items={[
          {
            label: 'App login',
            value: patient.user_account_id ? 'Linked account' : 'No account linked',
          },
          { label: 'Status', value: titleCase(patient.status) },
          { label: 'Active in system', value: patient.is_active === false ? 'No' : 'Yes' },
          {
            label: 'Registered',
            value: `${formatDate(patient.created_at)} · ${timeAgo(patient.created_at)}`,
          },
          { label: 'Last updated', value: patient.updated_at ? timeAgo(patient.updated_at) : null },
        ]}
      />
    </Drawer>
  );
}
