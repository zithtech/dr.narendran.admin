import {
  Building2,
  Download,
  Droplet,
  Eye,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Plus,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import { ageFrom, formatDate, timeAgo, titleCase } from '../lib/format';
import { type Patient } from './PatientModal';
import { usePermission } from '../context/PermissionContext';
import { Drawer } from './ui/Drawer';

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
  const isActive = patient.status === 'ACTIVE';

  const hero = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: '100%',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {patient.profile_image_url ? (
          <img
            src={patient.profile_image_url}
            alt={patient.name}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.18)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 18,
              boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)',
              flexShrink: 0,
            }}
          >
            {patient.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17.5,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {patient.name}
            </h2>
            {patient.blood_group && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3.5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '2px 7px',
                  borderRadius: 5,
                }}
              >
                <Droplet size={11} />
                <span>{patient.blood_group}</span>
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: 12.5,
              color: '#64748b',
              marginTop: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {[
              age !== null ? `${age} yrs` : null,
              patient.gender ? titleCase(patient.gender) : null,
              patient.hospital_name,
              patient.branch_name,
            ]
              .filter(Boolean)
              .join(' · ') || 'Patient Record'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 5,
                background: isActive ? '#f0fdf4' : '#f8fafc',
                border: isActive ? '1px solid #dcfce7' : '1px solid #e2e8f0',
                color: isActive ? '#15803d' : '#64748b',
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
              {isActive ? 'Active Patient' : 'Inactive'}
            </span>

            {patient.user_account_id && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  padding: '2px 7px',
                  borderRadius: 5,
                }}
              >
                App Linked
              </span>
            )}
          </div>
        </div>
      </div>

      {isPatientEditable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={() => onEdit(patient)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              height: 32,
              padding: '0 11px',
            }}
          >
            <Pencil size={13.5} />
            <span>Edit</span>
          </button>
        </div>
      )}
    </div>
  );

  const stats = [
    {
      label: 'Height',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {patient.height_cm ? `${patient.height_cm} cm` : '—'}
        </span>
      ),
    },
    {
      label: 'Weight',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {patient.weight_kg ? `${patient.weight_kg} kg` : '—'}
        </span>
      ),
    },
    {
      label: 'BMI Score',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {bmi ? `${bmi.value} · ${bmi.band}` : '—'}
        </span>
      ),
    },
    {
      label: 'Prescriptions',
      value: (
        <span style={{ fontWeight: 650, color: '#2563eb', fontSize: 13 }}>
          {prescriptions.length} on file
        </span>
      ),
    },
  ];

  const footer = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        style={{ fontSize: 12.5, height: 35, padding: '0 14px' }}
      >
        Close
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isRxCreatable && (
          <button
            type="button"
            className="ui-btn"
            onClick={() => setIsCreateRxOpen(true)}
            style={{
              fontSize: 12.5,
              background: '#ffffff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              padding: '0 13px',
              height: 35,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <FileText size={14} />
            <span>New Prescription</span>
          </button>
        )}

        {isPatientEditable && (
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => onEdit(patient)}
            style={{
              fontSize: 12.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              padding: '0 15px',
              height: 35,
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Pencil size={14} />
            <span>Edit Patient</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        label="Patient details"
        hero={hero}
        stats={stats}
        footer={footer}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section: Prescriptions */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #dbeafe',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={13} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Prescriptions ({prescriptions.length})
                </span>
              </div>

              {isRxCreatable && (
                <button
                  type="button"
                  onClick={() => setIsCreateRxOpen(true)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    color: '#2563eb',
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={13} />
                  <span>New Prescription</span>
                </button>
              )}
            </div>

            {loadingRx ? (
              <div style={{ fontSize: 12, color: '#64748b', padding: '6px 0' }}>
                Loading prescriptions...
              </div>
            ) : prescriptions.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  borderRadius: 9,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileText size={24} style={{ color: '#94a3b8' }} />
                <div style={{ fontSize: 12, color: '#64748b' }}>No prescriptions recorded yet.</div>
                <button
                  type="button"
                  onClick={() => setIsCreateRxOpen(true)}
                  style={{
                    marginTop: 2,
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
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
                      padding: '12px 14px',
                      borderRadius: 9,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                          {rx.diagnosis || rx.additional_notes || 'General Consultation'}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          {rx.prescription_date} · By {rx.doctor?.name || 'Doctor'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 5,
                          background: rx.status === 'active' ? '#f0fdf4' : '#f8fafc',
                          border: rx.status === 'active' ? '1px solid #dcfce7' : '1px solid #e2e8f0',
                          color: rx.status === 'active' ? '#15803d' : '#64748b',
                          textTransform: 'capitalize',
                        }}
                      >
                        {rx.status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11.5,
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 500,
                        }}
                      >
                        <Pill size={12} />
                        <span>{rx.medicines?.length || rx.medicines_count || 0} medicine(s)</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setViewingRx(rx)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 5,
                            color: '#475569',
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
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
                            background: '#eff6ff',
                            border: '1px solid #dbeafe',
                            borderRadius: 5,
                            color: '#2563eb',
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
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
          </div>

          {/* Section: Contact Details */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                Contact Details
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patient.phone ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Phone size={14} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b' }}>
                      {patient.phone}
                    </span>
                  </div>
                  <a
                    href={`tel:${patient.phone}`}
                    className="ui-btn ui-btn-xs"
                    style={{
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      textDecoration: 'none',
                    }}
                  >
                    Call
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No phone number provided
                </div>
              )}

              {patient.email ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Mail size={14} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b' }}>
                      {patient.email}
                    </span>
                  </div>
                  <a
                    href={`mailto:${patient.email}`}
                    className="ui-btn ui-btn-xs"
                    style={{
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      textDecoration: 'none',
                    }}
                  >
                    Email
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No email address provided
                </div>
              )}

              {patient.address && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <MapPin size={14} style={{ color: '#2563eb', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>
                    {patient.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Personal & Demographic Info */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                Demographic & Profile
              </span>
            </div>

            <dl className="ui-dl" style={{ marginTop: 0 }}>
              <dt>Date of birth</dt>
              <dd>
                {patient.date_of_birth
                  ? `${formatDate(patient.date_of_birth)}${age !== null ? ` (${age} yrs)` : ''}`
                  : <span className="ui-muted">—</span>}
              </dd>
              <dt>Gender</dt>
              <dd>{patient.gender ? titleCase(patient.gender) : <span className="ui-muted">—</span>}</dd>
              <dt>Blood Group</dt>
              <dd>{patient.blood_group || <span className="ui-muted">—</span>}</dd>
              <dt>Marital Status</dt>
              <dd>{patient.marital_status ? titleCase(patient.marital_status) : <span className="ui-muted">—</span>}</dd>
            </dl>
          </div>

          {/* Section: Hospital Assignment */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                Hospital & Branch Assignment
              </span>
            </div>

            <dl className="ui-dl" style={{ marginTop: 0 }}>
              <dt>Hospital</dt>
              <dd>{patient.hospital_name || <span className="ui-muted">—</span>}</dd>
              <dt>Branch</dt>
              <dd>{patient.branch_name || 'No specific branch'}</dd>
            </dl>
          </div>

          {/* Section: Emergency Contacts */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Users size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                Emergency Contacts {contacts.length ? `(${contacts.length})` : ''}
              </span>
            </div>

            {contacts.length === 0 ? (
              <span className="ui-muted" style={{ fontSize: 12 }}>
                No emergency contacts on file.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contacts.map((c, i) => (
                  <div
                    key={`${c.name ?? ''}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #dbeafe',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {(c.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>
                          {c.name ?? 'Unnamed Contact'}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          {[c.relation, c.phone].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    {c.phone && (
                      <a
                        className="ui-btn ui-btn-xs"
                        href={`tel:${c.phone}`}
                        style={{
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px solid #dbeafe',
                          textDecoration: 'none',
                          flexShrink: 0,
                        }}
                      >
                        Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: System & Access Records */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                System & Access Records
              </span>
            </div>

            <dl className="ui-dl" style={{ marginTop: 0 }}>
              <dt>App login</dt>
              <dd>{patient.user_account_id ? 'Linked account' : 'No account linked'}</dd>
              <dt>Status</dt>
              <dd>{titleCase(patient.status)}</dd>
              <dt>Active in system</dt>
              <dd>{patient.is_active === false ? 'No' : 'Yes'}</dd>
              <dt>Registered</dt>
              <dd>{`${formatDate(patient.created_at)} · ${timeAgo(patient.created_at)}`}</dd>
              <dt>Last updated</dt>
              <dd>{patient.updated_at ? timeAgo(patient.updated_at) : '—'}</dd>
            </dl>
          </div>
        </div>
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
