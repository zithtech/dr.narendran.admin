import { Download, Eye, FileText, Mail, Pencil, Phone, Pill, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import { ageFrom, formatDate, timeAgo, titleCase } from '../lib/format';
import { ContactLine } from './DoctorDrawer';
import { type Patient } from './PatientModal';
import { DetailList, Drawer } from './ui/Drawer';
import { Section } from './ui/Modal';
import { Avatar, Badge, StatusDot } from './ui/primitives';
import { usePermission } from '../context/PermissionContext';

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
  const { canCreate, canUpdate } = usePermission();
  const isPatientEditable = canUpdate('PATIENTS');
  const isRxCreatable = canCreate('PRESCRIPTIONS');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);
  const [isCreateRxOpen, setIsCreateRxOpen] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);

  const fetchPrescriptions = async () => {
    if (!patient?.id) return;
    setLoadingRx(true);
    try {
      const data = await prescriptionsApi.getByPatient(patient.id);
      setPrescriptions(data);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoadingRx(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      void fetchPrescriptions();
    }
  }, [patient?.id]);

  if (!patient) return null;

  const age = ageFrom(patient.date_of_birth);
  const bmi = bmiOf(patient.height_cm, patient.weight_kg);
  const contacts = readContacts(patient.emergency_contacts);

  return (
    <>
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
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="ui-btn" onClick={onClose}>
              Close
            </button>
            {isRxCreatable && (
              <button
                type="button"
                className="ui-btn"
                onClick={() => setIsCreateRxOpen(true)}
                style={{
                  background: '#7c3aed',
                  borderColor: '#7c3aed',
                  color: '#ffffff',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <FileText size={14} /> Create Prescription
              </button>
            )}
            {isPatientEditable && (
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => onEdit(patient)}
                title="Edit patient"
              >
                <Pencil size={14} /> Edit patient
              </button>
            )}
          </div>
        }
      >
        {/* Prescriptions Section */}
        <Section title={`Prescriptions (${prescriptions.length})`}>
          {isRxCreatable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setIsCreateRxOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7c3aed',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={13} /> New Prescription
              </button>
            </div>
          )}
          {loadingRx ? (
            <div style={{ fontSize: 12, color: '#64748b', padding: '6px 0' }}>Loading prescriptions...</div>
          ) : prescriptions.length === 0 ? (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b' }}>No prescriptions recorded yet.</div>
              <button
                type="button"
                onClick={() => setIsCreateRxOpen(true)}
                style={{
                  marginTop: 6,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#7c3aed',
                  background: '#f5f3ff',
                  border: '1px solid #ede9fe',
                  cursor: 'pointer',
                }}
              >
                + Create First Prescription
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 12.5 }}>
                        {rx.diagnosis || rx.additional_notes || 'General Consultation'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {rx.prescription_date} · By {rx.doctor?.name || 'Doctor'}
                      </div>
                    </div>
                    <Badge tone={rx.status === 'active' ? 'green' : 'neutral'}>{rx.status}</Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 11, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pill size={11} />
                      <span>{rx.medicines?.length || rx.medicines_count || 0} medicine(s)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setViewingRx(rx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#475569',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void prescriptionsApi.downloadPdf(rx.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#7c3aed',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Download size={12} /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

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

      {/* Create Prescription Modal */}
      {isCreateRxOpen && (
        <CreatePrescriptionModal
          open={isCreateRxOpen}
          preselectedPatient={{
            id: patient.id,
            name: patient.name,
            phone: patient.phone ?? undefined,
            gender: patient.gender ?? undefined,
            date_of_birth: patient.date_of_birth ?? undefined,
          }}
          onClose={() => setIsCreateRxOpen(false)}
          onSuccess={() => {
            void fetchPrescriptions();
          }}
        />
      )}

      {/* View Prescription Modal */}
      <ViewPrescriptionModal
        prescription={viewingRx}
        open={Boolean(viewingRx)}
        onClose={() => setViewingRx(null)}
      />
    </>
  );
}
