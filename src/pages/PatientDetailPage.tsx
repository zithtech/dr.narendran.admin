import { Button, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  Download,
  Droplet,
  Eye,
  FileClock,
  FileText,
  HeartPulse,
  History,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { type Patient } from '../components/PatientModal';
import { usePermission } from '../context/PermissionContext';
import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import { MedicalRecordPreviewDrawer } from '../features/medical_records/components/MedicalRecordPreviewDrawer';
import type { MedicalRecord } from '../features/medical_records/types/medicalRecords';
import { TimelineEventItem } from '../features/timelines/components/TimelineEventItem';
import { TimelineFilterBar } from '../features/timelines/components/TimelineFilterBar';
import { patientTimelinesApi } from '../features/timelines/services/patientTimelinesApi';
import type {
  TimelineEvent,
  TimelineFilterType,
} from '../features/timelines/types/patientTimelines';
import { PatientMedicalHistoryTab } from '../features/medical_history/components/PatientMedicalHistoryTab';
import { formatDate, formatPatientAge, formatPatientDisplayName, timeAgo, titleCase } from '../lib/format';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { getAuthenticatedFileUrl } from '../utils/fileUrl';

interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

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

type PatientTab =
  | 'overview'
  | 'medical-history'
  | 'prescriptions'
  | 'appointments'
  | 'documents'
  | 'timeline';

const DEFAULT_PATIENT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200"><rect width="320" height="200" fill="%23ffffff"/><circle cx="160" cy="78" r="44" fill="%23cbd5e1"/><path d="M72 200c0-48.6 39.4-88 88-88s88 39.4 88 88z" fill="%2394a3b8"/></svg>`;

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { canCreate, canUpdate } = usePermission();
  const isPatientEditable = canUpdate('PATIENTS');
  const isRxCreatable = canCreate('PRESCRIPTIONS');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');
  const [imgError, setImgError] = useState(false);

  // Modals state
  const [isCreateRxOpen, setIsCreateRxOpen] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
  const [previewRecord, setPreviewRecord] = useState<MedicalRecord | null>(null);

  // Reset img error on patient change
  useEffect(() => {
    setImgError(false);
  }, [patient?.id, patient?.profile_image_url]);

  // Tab data
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);
  const [loadingMoreTimeline, setLoadingMoreTimeline] = useState<boolean>(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TimelineFilterType>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [timelinePage, setTimelinePage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [totalTimelineEvents, setTotalTimelineEvents] = useState<number>(0);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Load Patient Profile
  const loadPatient = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Patient>(`patients/${patientId}`);
      setPatient(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load patient record.'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Load Prescriptions
  const loadPrescriptions = useCallback(async () => {
    if (!patientId) return;
    setLoadingRx(true);
    try {
      const data = await prescriptionsApi.getByPatient(patientId);
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoadingRx(false);
    }
  }, [patientId]);

  // Load Appointments
  const loadAppointments = useCallback(async () => {
    if (!patientId) return;
    setLoadingAppts(true);
    try {
      const res = await api.get('appointments', { params: { patientId } });
      const raw = res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
      setAppointments(list);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }, [patientId]);

  // Load Medical Records
  const loadMedicalRecords = useCallback(async () => {
    if (!patientId) return;
    setLoadingRecords(true);
    try {
      const res = await api.get('medical-records', { params: { patientId } });
      const raw = res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.records)
            ? raw.records
            : [];
      setMedicalRecords(list);
    } catch {
      setMedicalRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [patientId]);

  // Load Medical Timeline
  const loadTimeline = useCallback(
    async (isAppend = false, targetPage = 1) => {
      if (!patientId) return;

      if (isAppend) {
        setLoadingMoreTimeline(true);
      } else {
        setLoadingTimeline(true);
      }
      setTimelineError(null);

      try {
        const params: Record<string, string | number> = {
          page: targetPage,
          limit: 20,
          type: selectedType,
        };

        if (dateRange?.[0] && dateRange?.[1]) {
          params.from_date = dateRange[0].format('YYYY-MM-DD');
          params.to_date = dateRange[1].format('YYYY-MM-DD');
        } else if (selectedYear !== 'All') {
          params.year = selectedYear;
        }

        const data = await patientTimelinesApi.getPatientTimeline(patientId, params);

        if (data) {
          if (data.timeline) {
            if (isAppend) {
              setTimelineEvents((prev) => [...prev, ...data.timeline]);
            } else {
              setTimelineEvents(data.timeline);
            }
          }
          if (data.pagination) {
            setTimelinePage(data.pagination.page);
            setHasNextPage(Boolean(data.pagination.has_next));
            setTotalTimelineEvents(
              data.pagination.total ?? (data.timeline ? data.timeline.length : 0),
            );
          }
        }
      } catch (err: unknown) {
        setTimelineError(getErrorMessage(err, 'Failed to load medical timeline events.'));
      } finally {
        if (isAppend) {
          setLoadingMoreTimeline(false);
        } else {
          setLoadingTimeline(false);
        }
      }
    },
    [patientId, selectedType, selectedYear, dateRange],
  );

  const handleLoadMore = () => {
    if (!hasNextPage || loadingMoreTimeline) return;
    const nextPage = timelinePage + 1;
    void loadTimeline(true, nextPage);
  };

  const handleExportTimelinePdf = async () => {
    if (!patientId || !patient) return;
    setDownloadingPdf(true);
    try {
      await patientTimelinesApi.downloadPatientHistoryPdf(patient.id, patient.name);
    } catch (err) {
      console.error('Failed to export timeline PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    void loadPatient();
    void loadPrescriptions();
    void loadAppointments();
    void loadMedicalRecords();
    void loadTimeline(false, 1);
  }, [loadPatient, loadPrescriptions, loadAppointments, loadMedicalRecords, loadTimeline]);

  const bmi = useMemo(() => {
    return patient ? bmiOf(patient.height_cm, patient.weight_kg) : null;
  }, [patient]);

  const contacts = useMemo(() => {
    return patient ? readContacts(patient.emergency_contacts) : [];
  }, [patient]);

  const displayImageSrc = useMemo(() => {
    if (imgError || !patient?.profile_image_url || typeof patient.profile_image_url !== 'string') {
      return DEFAULT_PATIENT_AVATAR;
    }
    const trimmed = patient.profile_image_url.trim();
    if (!trimmed) return DEFAULT_PATIENT_AVATAR;
    // Pure email address without URL scheme or image extension is not an image URL
    if (
      trimmed.includes('@') &&
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('data:image/')
    ) {
      return DEFAULT_PATIENT_AVATAR;
    }
    return trimmed;
  }, [patient?.profile_image_url, imgError]);

  const isActive = Boolean(
    (!patient?.status || String(patient.status).toUpperCase() === 'ACTIVE') &&
    patient?.is_active !== false,
  );

  if (loading && !patient) {
    return (
      <div className="patient-page-container w-full min-h-full block relative">
        <div className="w-full px-4 sm:px-6 pt-6 pb-10">
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200 space-y-4 shadow-2xs">
            <Spin size="large" />
            <div className="text-sm text-gray-500 font-medium">
              Loading patient profile & clinical records...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-page-container">
        <div className="patient-error-box">
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
            {error || 'Patient record not found'}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            The requested patient could not be retrieved from the clinical registry.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="ui-btn ui-btn-neutral"
              onClick={() => navigate('/patients')}
            >
              <ArrowLeft size={14} /> Back to Patients
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => void loadPatient()}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-page-container">
      {/* ── Top Header & Breadcrumbs ── */}
      <div className="patient-page-topbar">
        <div className="patient-page-topbar-left">
          <button
            type="button"
            className="patient-back-btn"
            onClick={() => navigate('/patients')}
            title="Return to Patients directory"
          >
            <ArrowLeft size={15} />
            <span>Patients</span>
          </button>
          <span className="patient-breadcrumb-sep">/</span>
          <span className="patient-breadcrumb-current">{formatPatientDisplayName(patient.name, patient.patient_id)}</span>
        </div>

        <div className="patient-page-topbar-actions">
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={() => {
              void loadPatient();
              void loadPrescriptions();
              void loadAppointments();
              void loadMedicalRecords();
            }}
            title="Refresh record"
            style={{ height: 34, fontSize: 12.5 }}
          >
            <RefreshCw size={13.5} />
            <span>Refresh</span>
          </button>

          {isPatientEditable && (
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => {
                navigate(`/patients/${patient.id}/edit`);
              }}
              style={{
                height: 34,
                fontSize: 12.5,
                background: '#2563eb',
                color: '#ffffff',
                border: '1px solid #2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Pencil size={13.5} />
              <span>Edit Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Two-Column Layout (Left Profile + Right Tabs) ── */}
      <div className="patient-page-layout">
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT SIDE: Patient Profile Card (Matching Doctor View Reference Layout)
            ══════════════════════════════════════════════════════════════════════ */}
        <aside className="patient-page-sidebar">
          <div className="patient-ref-card">
            {/* Patient Profile Photo Header */}
            <div className="patient-card-photo-hero">
              <img
                src={displayImageSrc}
                alt={patient.name}
                className="patient-card-photo"
                onError={() => setImgError(true)}
              />
              <div className="patient-card-photo-badge">
                <HeartPulse size={12} />
                <span>Verified Patient Record</span>
              </div>
            </div>

            {/* Patient Details Body */}
            <div className="patient-card-body">
              {/* Patient Name & Status */}
              <div className="patient-card-name-block">
                <h1 className="patient-card-name">{formatPatientDisplayName(patient.name, patient.patient_id)}</h1>

                <div className="patient-card-badges-row">
                  {(patient.patient_code || patient.patient_id) && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 650,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                      }}
                      title="Patient Code"
                    >
                      <ShieldCheck size={11} />
                      <span>{patient.patient_code || patient.patient_id}</span>
                    </span>
                  )}

                  {patient.legacy_patient_code && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                      }}
                      title={`Migrated from legacy Patient Code: ${patient.legacy_patient_code}`}
                    >
                      {/* <span>Old: {patient.legacy_patient_code}</span> */}
                    </span>
                  )}

                  <span className="patient-card-status-pill">
                    <span className={`patient-status-dot ${isActive ? 'is-active' : ''}`} />
                    <span>{isActive ? 'Active Patient' : 'Inactive'}</span>
                  </span>

                  {patient.blood_group && (
                    <span className="patient-card-blood-pill">
                      <Droplet size={11} />
                      <span>{patient.blood_group}</span>
                    </span>
                  )}

                  {patient.user_account_id ? (
                    <span className="patient-card-account-pill">
                      <UserCheck size={11} style={{ color: '#16a34a' }} />
                      <span>App Linked</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="patient-card-divider" />

              {/* Section 1: Clinical & Demographic Credentials */}
              <div className="patient-card-section">
                <div className="patient-card-section-head">
                  <HeartPulse size={15} className="patient-card-icon" />
                  <span className="patient-card-section-title">Clinical Profile & Vitals</span>
                </div>

                <div className="patient-card-cred-list">
                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">Age & DOB</span>
                    <span className="patient-card-cred-val" style={{ fontWeight: 650, color: '#0f172a' }}>
                      {patient.date_of_birth
                        ? `${formatPatientAge(patient.date_of_birth)} (${formatDate(patient.date_of_birth)})`
                        : 'DOB not set'}
                    </span>
                  </div>

                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">Gender</span>
                    <span className="patient-card-cred-val" style={{ fontWeight: 600 }}>
                      {patient.gender ? titleCase(patient.gender) : 'Not specified'}
                    </span>
                  </div>

                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">Height & Weight</span>
                    <span className="patient-card-cred-val" style={{ fontWeight: 600 }}>
                      {patient.height_cm ? `${patient.height_cm} cm` : '—'}
                      {' · '}
                      {patient.weight_kg ? `${patient.weight_kg} kg` : '—'}
                    </span>
                  </div>

                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">BMI Score</span>
                    {bmi ? (
                      <span className="patient-card-reg-pill">
                        {bmi.value} · {bmi.band}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11.5 }}>
                        Not recorded
                      </span>
                    )}
                  </div>

                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">Marital Status</span>
                    <span className="patient-card-cred-val">
                      {patient.marital_status ? titleCase(patient.marital_status) : '—'}
                    </span>
                  </div>

                  <div className="patient-card-cred-row">
                    <span className="patient-card-cred-label">Occupation</span>
                    <span className="patient-card-cred-val">
                      {(patient as any).occupation || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="patient-card-divider" />

              {/* Section 2: Support / Direct Contact */}
              <div className="patient-card-section">
                <div className="patient-card-section-head">
                  <Mail size={15} className="patient-card-icon" />
                  <span className="patient-card-section-title">Support</span>
                </div>
                <div className="patient-card-section-text">
                  {patient.email ? (
                    <a href={`mailto:${patient.email}`} className="patient-card-link">
                      {patient.email}
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No email recorded</span>
                  )}
                </div>
              </div>

              <div className="patient-card-divider" />

              {/* Section 4: Call Me / Phone */}
              <div className="patient-card-section">
                <div className="patient-card-section-head">
                  <Phone size={15} className="patient-card-icon" />
                  <span className="patient-card-section-title">Call Me</span>
                </div>
                <div className="patient-card-section-text">
                  {patient.phone ? (
                    <a href={`tel:${patient.phone}`} className="patient-card-link">
                      {patient.phone}
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No phone recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT SIDE: Tabbed Interface for Rest of Patient Details
            ══════════════════════════════════════════════════════════════════════ */}
        <main className="patient-page-main">
          {/* ── Modern Tab Navigation Bar ── */}
          <div className="patient-tabs-bar">
            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <HeartPulse size={14} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'medical-history' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('medical-history')}
            >
              <Stethoscope size={14} />
              <span>Medical History</span>
            </button>

            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'prescriptions' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('prescriptions')}
            >
              <FileText size={14} />
              <span>Prescriptions</span>
              <span className="patient-tab-count">{prescriptions.length}</span>
            </button>

            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'appointments' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              <CalendarDays size={14} />
              <span>Appointments</span>
              <span className="patient-tab-count">{appointments.length}</span>
            </button>

            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'documents' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText size={14} />
              <span>Medical Documents</span>
              <span className="patient-tab-count">{medicalRecords.length}</span>
            </button>

            <button
              type="button"
              className={`patient-tab-btn ${activeTab === 'timeline' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={14} />
              <span>Timeline History</span>
              {totalTimelineEvents > 0 && (
                <span className="patient-tab-count">{totalTimelineEvents}</span>
              )}
            </button>
          </div>

          {/* ── Scrollable Tab Content Pane ── */}
          <div className="patient-tab-scroll-pane">
            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="patient-tab-content">
                {/* Card: Hospital & Branch Assignment */}
                <div className="patient-card-block">
                  <div className="patient-card-block-header">
                    <div className="patient-card-block-badge">
                      <Building2 size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="patient-card-block-title">Hospital & Facility Assignment</div>
                      <div className="patient-card-block-subtitle">Primary clinical network and health center</div>
                    </div>
                  </div>

                  <div className="patient-grid-2">
                    <div className="patient-info-item">
                      <span className="patient-info-label">Assigned Hospital</span>
                      <span className="patient-info-val" style={{ fontWeight: 600, color: '#0f172a' }}>
                        {patient.hospital_name || 'Not assigned'}
                      </span>
                    </div>

                    <div className="patient-info-item">
                      <span className="patient-info-label">Hospital Branch</span>
                      <span className="patient-info-val" style={{ fontWeight: 600 }}>
                        {patient.branch_name || 'No specific branch'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card: Physical Address */}
                <div className="patient-card-block">
                  <div className="patient-card-block-header">
                    <div className="patient-card-block-badge">
                      <MapPin size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="patient-card-block-title">Residential & Mailing Address</div>
                      <div className="patient-card-block-subtitle">Primary physical location recorded for patient</div>
                    </div>
                  </div>

                  <div className="patient-info-item">
                    <span className="patient-info-val" style={{ fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
                      {[
                        patient.address_line_1,
                        patient.address_line_2,
                        patient.city,
                        patient.state,
                        patient.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || patient.address || 'No residential address recorded.'}
                    </span>
                  </div>
                </div>

                {/* Card: Emergency Contacts Full List */}
                <div className="patient-card-block">
                  <div className="patient-card-block-header">
                    <div className="patient-card-block-badge">
                      <Users size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="patient-card-block-title">
                        Emergency Contacts ({contacts.length})
                      </div>
                      <div className="patient-card-block-subtitle">Family members, caretakers, or designated guardians</div>
                    </div>
                  </div>

                  {contacts.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                      No emergency contacts recorded on file.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                      {contacts.map((c, i) => (
                        <div key={`${c.name || ''}-${i}`} className="patient-contact-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="patient-contact-avatar">
                              {(c.name || 'E').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 650, fontSize: 13, color: '#0f172a' }}>
                                {c.name || 'Emergency Contact'}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                {c.relation || 'Relation not specified'}
                              </div>
                            </div>
                          </div>
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} className="patient-contact-call-btn">
                              <Phone size={11} /> Call
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card: System Record & Access Control */}
                <div className="patient-card-block">
                  <div className="patient-card-block-header">
                    <div className="patient-card-block-badge">
                      <ShieldCheck size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="patient-card-block-title">System Record & Account Access</div>
                      <div className="patient-card-block-subtitle">Portal login credentials and registration audit logs</div>
                    </div>
                  </div>

                  <div className="patient-grid-3">
                    <div className="patient-info-item">
                      <span className="patient-info-label">Patient Portal Account</span>
                      <span className="patient-info-val">
                        {patient.user_account_id ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <UserCheck size={13} /> Linked User
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>No portal user linked</span>
                        )}
                      </span>
                    </div>

                    <div className="patient-info-item">
                      <span className="patient-info-label">Created At</span>
                      <span className="patient-info-val" style={{ fontSize: 12 }}>
                        {formatDate(patient.created_at)} ({timeAgo(patient.created_at)})
                      </span>
                    </div>

                    <div className="patient-info-item">
                      <span className="patient-info-label">Last Modified</span>
                      <span className="patient-info-val" style={{ fontSize: 12 }}>
                        {patient.updated_at ? timeAgo(patient.updated_at) : 'Never updated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: MEDICAL HISTORY ── */}
            {activeTab === 'medical-history' && (
              <PatientMedicalHistoryTab patient={patient} isEditable={isPatientEditable} />
            )}

            {/* ── TAB 2: PRESCRIPTIONS ── */}
            {activeTab === 'prescriptions' && (
              <div className="patient-tab-content">
                <div className="patient-tab-header-row">
                  <div>
                    <h3 className="patient-tab-heading">Prescriptions on File ({prescriptions.length})</h3>
                    <p className="patient-tab-subheading">
                      Medication schedules, dosages, and clinical orders issued to this patient.
                    </p>
                  </div>

                  {isRxCreatable && (
                    <button
                      type="button"
                      onClick={() => setIsCreateRxOpen(true)}
                      className="ui-btn ui-btn-primary"
                      style={{ fontSize: 12.5, height: 35 }}
                    >
                      <Plus size={14} /> New Prescription
                    </button>
                  )}
                </div>

                {loadingRx ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-gray-100 space-y-3 my-2">
                    <Spin />
                    <div className="text-xs text-gray-500 font-medium">Loading prescriptions…</div>
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="patient-empty-box">
                    <FileText size={32} style={{ color: '#94a3b8' }} />
                    <h4>No prescriptions on file</h4>
                    <p>There are no medical prescriptions recorded for this patient yet.</p>
                    {isRxCreatable && (
                      <button
                        type="button"
                        onClick={() => setIsCreateRxOpen(true)}
                        className="ui-btn ui-btn-primary"
                        style={{ marginTop: 6 }}
                      >
                        <Plus size={14} /> Create First Prescription
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="patient-rx-card">
                        <div className="patient-rx-card-top">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                {rx.diagnosis || rx.additional_notes || 'General Consultation'}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {rx.prescription_number || `RX-${rx.id.slice(0, 8).toUpperCase()}`}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              Issued {rx.prescription_date} · By {rx.doctor?.name || 'Practicing Doctor'}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 650,
                              padding: '2.5px 8px',
                              borderRadius: 6,
                              background: rx.status === 'active' ? '#f0fdf4' : '#f8fafc',
                              border: rx.status === 'active' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                              color: rx.status === 'active' ? '#15803d' : '#64748b',
                              textTransform: 'capitalize',
                            }}
                          >
                            {rx.status}
                          </span>
                        </div>

                        <div className="patient-rx-card-bottom">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1d4ed8', fontSize: 12, fontWeight: 550 }}>
                            <Pill size={13} />
                            <span>{rx.medicines?.length || rx.medicines_count || 0} prescribed medicine(s)</span>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => setViewingRx(rx)}
                              className="patient-action-pill-btn"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => void prescriptionsApi.downloadPdf(rx.id)}
                              className="patient-action-pill-btn is-primary"
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
            )}

            {/* ── TAB 3: APPOINTMENTS ── */}
            {activeTab === 'appointments' && (
              <div className="patient-tab-content">
                <div className="patient-tab-header-row">
                  <div>
                    <h3 className="patient-tab-heading">Appointments & Consultations ({appointments.length})</h3>
                    <p className="patient-tab-subheading">
                      Schedule history, consultation visits, and clinic appointments for this patient.
                    </p>
                  </div>
                </div>

                {loadingAppts ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-gray-100 space-y-3 my-2">
                    <Spin />
                    <div className="text-xs text-gray-500 font-medium">Loading appointments…</div>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="patient-empty-box">
                    <CalendarDays size={32} style={{ color: '#94a3b8' }} />
                    <h4>No appointments found</h4>
                    <p>There are no past or upcoming appointments recorded for this patient.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {appointments.map((appt) => {
                      const status = String(appt.status || '').toLowerCase();
                      const statusColor =
                        status === 'completed'
                          ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' }
                          : status === 'cancelled'
                            ? { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' }
                            : { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };

                      return (
                        <div key={appt.id} className="patient-rx-card">
                          <div className="patient-rx-card-top">
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                                {appt.purpose || appt.appointment_type || 'General Consultation'}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Date:{' '}
                                <strong>
                                  {appt.scheduled_start ? formatDate(appt.scheduled_start) : '—'}
                                </strong>
                                {' · '}
                                With: {appt.doctor_name || appt.doctorName || 'Doctor'}
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 650,
                                padding: '2.5px 8px',
                                borderRadius: 6,
                                background: statusColor.bg,
                                border: `1px solid ${statusColor.border}`,
                                color: statusColor.text,
                                textTransform: 'capitalize',
                              }}
                            >
                              {appt.status || 'Scheduled'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: MEDICAL DOCUMENTS ── */}
            {activeTab === 'documents' && (
              <div className="patient-tab-content">
                <div className="patient-tab-header-row">
                  <div>
                    <h3 className="patient-tab-heading">Medical Records & Reports ({medicalRecords.length})</h3>
                    <p className="patient-tab-subheading">
                      Lab reports, clinical uploads, scan attachments, and patient medical files.
                    </p>
                  </div>
                </div>

                {loadingRecords ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-gray-100 space-y-3 my-2">
                    <Spin />
                    <div className="text-xs text-gray-500 font-medium">Loading medical records…</div>
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="patient-empty-box">
                    <FileText size={32} style={{ color: '#94a3b8' }} />
                    <h4>No medical documents recorded</h4>
                    <p>There are no uploaded diagnostic documents or clinical files for this patient.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {medicalRecords.map((rec) => {
                      const docUrl = rec.documentUrl || rec.file_url || (rec.id ? `/api/medical-records/${rec.id}/file` : '');
                      const downloadUrl = getAuthenticatedFileUrl(docUrl, true);
                      const title = rec.testName || rec.fileName || rec.title || rec.document_name || 'Medical Document';
                      const recordType = rec.isExternal ? 'External Record' : (rec.record_type || rec.type || 'Prescribed Lab Test');
                      const uploadDate = rec.createdAt || rec.created_at || rec.reportDate;

                      return (
                        <div key={rec.id} className="patient-rx-card">
                          <div className="patient-rx-card-top">
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                                {title}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Type: {titleCase(recordType)} · Uploaded {uploadDate ? formatDate(uploadDate) : 'Recently'}
                                {rec.uploadedBy ? ` by ${rec.uploadedBy}` : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {docUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewRecord(rec)}
                                  className="patient-action-pill-btn is-primary"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <Eye size={12} /> Preview
                                </button>
                              )}
                              {docUrl && (
                                <a
                                  href={downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="patient-action-pill-btn"
                                  style={{ textDecoration: 'none' }}
                                >
                                  <Download size={12} /> Download
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 5: TIMELINE HISTORY (Unified with Patient Timelines Module) ── */}
            {activeTab === 'timeline' && (
              <div className="patient-tab-content space-y-3.5">
                {/* Header row with Title and Export PDF Action */}
                <div className="patient-tab-header-row">
                  <div>
                    <h3 className="patient-tab-heading">Clinical Timeline & History</h3>
                    <p className="patient-tab-subheading">
                      Chronological activity log of consultations, prescriptions, lab reports, and clinical events.
                    </p>
                  </div>
                  {patient && (
                    <button
                      type="button"
                      onClick={handleExportTimelinePdf}
                      disabled={downloadingPdf}
                      className="patient-action-pill-btn"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={12} />
                      <span>{downloadingPdf ? 'Exporting PDF…' : 'Export Timeline PDF'}</span>
                    </button>
                  )}
                </div>

                {/* Event Category & Period Filter Bar */}
                <TimelineFilterBar
                  selectedType={selectedType}
                  onSelectType={(type) => {
                    setSelectedType(type);
                    setTimelinePage(1);
                  }}
                  selectedYear={selectedYear}
                  onSelectYear={(yr) => {
                    setSelectedYear(yr);
                    setTimelinePage(1);
                  }}
                  dateRange={dateRange}
                  onDateRangeChange={(dates) => {
                    setDateRange(dates);
                    setTimelinePage(1);
                  }}
                  totalEvents={totalTimelineEvents}
                />

                {/* 3. Chronological Medical Events Feed */}
                {loadingTimeline && timelineEvents.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-gray-200 space-y-4 shadow-2xs my-4">
                    <Spin size="large" />
                    <div className="text-sm text-gray-500 font-medium">
                      Loading chronological medical timeline...
                    </div>
                  </div>
                ) : timelineError ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3 shadow-2xs">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                    <h4 className="text-base font-semibold text-gray-900">
                      Unable to Load Medical Timeline
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">{timelineError}</p>
                    <Button
                      type="primary"
                      className="bg-teal-700 hover:bg-teal-800"
                      icon={<RefreshCw size={13} />}
                      onClick={() => void loadTimeline(false, 1)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : timelineEvents.length > 0 ? (
                  <div className="pt-1 max-w-5xl mx-auto px-4 sm:px-8">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-teal-700" />
                        Chronological Medical Events (Newest First)
                      </span>
                      <span className="text-xs text-gray-400">
                        Displaying {timelineEvents.length} of {totalTimelineEvents} records
                      </span>
                    </div>

                    <div className="space-y-0">
                      {timelineEvents.map((evt, idx) => (
                        <TimelineEventItem
                          key={evt.id || idx}
                          event={evt}
                          isLast={idx === timelineEvents.length - 1}
                        />
                      ))}

                      {/* Load More Button */}
                      {hasNextPage && (
                        <div className="pt-4 text-center">
                          <Button
                            size="middle"
                            loading={loadingMoreTimeline}
                            onClick={handleLoadMore}
                            className="border-teal-700 text-teal-800 hover:bg-teal-50 font-semibold"
                          >
                            Load Older Medical Events
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Empty Timeline State */
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center space-y-3">
                    <FileClock className="w-10 h-10 text-gray-400 mx-auto" />
                    <div className="text-base font-bold text-gray-800">
                      No Clinical Events Found
                    </div>
                    <div className="text-xs text-gray-500 max-w-md mx-auto">
                      {selectedType !== 'All' || selectedYear !== 'All' || dateRange
                        ? `No medical events match the selected category ("${selectedType}") or date filter. Try selecting "All Events" or resetting filters.`
                        : 'This patient has no recorded consultations, prescriptions, lab reports, or medical history yet.'}
                    </div>
                    {(selectedType !== 'All' || selectedYear !== 'All' || dateRange) && (
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedType('All');
                          setSelectedYear('All');
                          setDateRange(null);
                        }}
                      >
                        Clear Filter Selection
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {patient && (
        <CreatePrescriptionModal
          open={isCreateRxOpen}
          onClose={() => setIsCreateRxOpen(false)}
          onSuccess={() => {
            setIsCreateRxOpen(false);
            void loadPrescriptions();
          }}
          preselectedPatient={{
            id: patient.id,
            name: formatPatientDisplayName(patient.name, patient.patient_id),
            phone: patient.phone || undefined,
            gender: patient.gender || undefined,
            date_of_birth: patient.date_of_birth || undefined,
          }}
        />
      )}

      {viewingRx && (
        <ViewPrescriptionModal
          open={Boolean(viewingRx)}
          onClose={() => setViewingRx(null)}
          prescription={viewingRx}
        />
      )}

      {/* Medical Record Document Preview Drawer */}
      <MedicalRecordPreviewDrawer
        record={previewRecord}
        open={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
      />

      {/* ── Scoped Styling Matching Doctor View Reference Layout ── */}
      <style>{`
        .patient-page-container {
          height: 100%;
          max-height: calc(100vh - 52px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f8fafc;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        .patient-loading-box,
        .patient-error-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
          padding: 40px 20px;
        }
        .patient-page-topbar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          z-index: 20;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .patient-page-topbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .patient-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 6px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .patient-back-btn:hover {
          background: #dbeafe;
          border-color: #bfdbfe;
        }
        .patient-breadcrumb-sep {
          color: #94a3b8;
          font-size: 13px;
        }
        .patient-breadcrumb-current {
          font-weight: 700;
          color: #0f172a;
          font-size: 14px;
        }
        .patient-page-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .patient-page-layout {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 310px 1fr;
          gap: 18px;
          padding: 12px 24px 16px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .patient-page-container {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .patient-page-layout {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            overflow: visible !important;
            padding: 12px 14px 24px !important;
            gap: 16px !important;
          }
          .patient-page-sidebar {
            height: auto !important;
            overflow: visible !important;
            padding-right: 0 !important;
            padding-bottom: 0 !important;
          }
          .patient-page-main {
            height: auto !important;
            overflow: visible !important;
          }
          .patient-tab-scroll-pane {
            height: auto !important;
            overflow: visible !important;
            padding-right: 0 !important;
          }
        }
        @media (max-width: 640px) {
          .patient-page-topbar {
            padding: 10px 14px !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .patient-page-topbar-actions {
            width: 100% !important;
            justify-content: flex-end !important;
          }
        }
        .patient-page-sidebar {
          height: 100%;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          padding-bottom: 32px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .patient-page-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .patient-page-sidebar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        /* Left Patient Profile Card (White background with generous spacing) */
        .patient-ref-card {
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }
        .patient-card-photo-hero {
          width: 100%;
          height: 220px;
          min-height: 200px;
          position: relative;
          background: #ffffff;
          overflow: hidden;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px 16px 36px;
        }
        .patient-card-photo {
          width: 100%;
          height: 100%;
          max-height: 165px;
          object-fit: contain;
          object-position: center center;
          display: block;
        }
        .patient-card-photo-badge {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 11px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(8px);
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(191, 219, 254, 0.9);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
          white-space: nowrap;
          z-index: 2;
        }
        .patient-card-body {
          padding: 18px 20px 22px;
        }
        .patient-card-name-block {
          text-align: center;
        }
        .patient-card-id-row {
          display: flex;
          justify-content: center;
          margin-bottom: 6px;
        }
        .patient-card-initials-badge {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 2px 8px;
          border-radius: 6px;
          letter-spacing: 0.05em;
        }
        .patient-card-name {
          font-size: 18px;
          font-weight: 750;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .patient-card-badges-row {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
        }
        .patient-card-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 2.5px 8px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .patient-card-blood-pill {
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          font-size: 11px;
          font-weight: 700;
          padding: 2.5px 7px;
          border-radius: 6px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #dc2626;
        }
        .patient-card-account-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 2.5px 8px;
          border-radius: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .patient-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .patient-status-dot.is-active {
          background: #22c55e;
        }
        .patient-card-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 16px 0;
        }
        .patient-card-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .patient-card-section-head {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .patient-card-icon {
          color: #2563eb;
          flex-shrink: 0;
        }
        .patient-card-section-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
        }
        .patient-card-cred-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
          padding-left: 22px;
        }
        .patient-card-cred-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 1px 0;
          flex-wrap: wrap;
        }
        .patient-card-cred-label {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
        }
        .patient-card-cred-val {
          font-size: 12px;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
        }
        .patient-card-reg-pill {
          font-size: 11px;
          font-weight: 700;
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 1.5px 6px;
          border-radius: 4px;
        }
        .patient-card-section-text {
          font-size: 12px;
          color: #334155;
          line-height: 1.5;
          padding-left: 22px;
        }
        .patient-card-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          word-break: break-all;
        }
        .patient-card-link:hover {
          text-decoration: underline;
        }
        .patient-card-actions {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          width: 100%;
        }
        .patient-card-primary-btn {
          width: 100%;
          height: 38px;
          background: #082857; /* Dark navy pill button */
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 3px 10px rgba(8, 40, 87, 0.2);
        }
        .patient-card-primary-btn:hover {
          background: #051a3a;
          box-shadow: 0 4px 14px rgba(8, 40, 87, 0.3);
          transform: translateY(-1px);
        }
        .patient-card-secondary-btn {
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
        .patient-card-secondary-btn:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        /* Right Side Tabs & Content */
        .patient-page-main {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          overflow: hidden;
        }
        .patient-tabs-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 6px;
          background: #f1f5f9;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
          overflow-x: auto;
          scrollbar-width: none;
          flex-wrap: nowrap;
        }
        .patient-tabs-bar::-webkit-scrollbar {
          display: none;
        }
        .patient-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .patient-tab-btn:hover {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.7);
        }
        .patient-tab-btn.is-active {
          color: #1d4ed8;
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
          font-weight: 700;
        }
        .patient-tab-count {
          font-size: 10.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
          background: #e2e8f0;
          color: #475569;
          border: 1px solid transparent;
        }
        .patient-tab-btn.is-active .patient-tab-count {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }
        .patient-tab-scroll-pane {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 6px;
          padding-bottom: 28px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .patient-tab-scroll-pane::-webkit-scrollbar {
          width: 5px;
        }
        .patient-tab-scroll-pane::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .patient-tab-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .patient-tab-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .patient-tab-heading {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .patient-tab-subheading {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0;
        }
        /* Top KPI Strip */
        .patient-kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1200px) {
          .patient-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 680px) {
          .patient-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 480px) {
          .patient-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .patient-kpi-card {
            padding: 8px 10px;
          }
          .patient-kpi-val {
            font-size: 14px;
          }
        }
        .patient-kpi-card {
          padding: 11px 14px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .patient-kpi-label {
          font-size: 10.5px;
          font-weight: 650;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .patient-kpi-val {
          font-size: 16px;
          font-weight: 750;
          color: #0f172a;
          margin: 3px 0 1px;
        }
        .patient-kpi-sub {
          font-size: 11px;
          color: #94a3b8;
        }
        /* Right Block Cards */
        .patient-card-block {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .patient-card-block-header {
          display: flex;
          align-items: center;
          gap: 11px;
          padding-bottom: 9px;
          border-bottom: 1px solid #f1f5f9;
        }
        .patient-card-block-badge {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: grid;
          place-items: center;
          color: #2563eb;
          flex-shrink: 0;
        }
        .patient-card-block-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0c2340;
        }
        .patient-card-block-subtitle {
          font-size: 11.5px;
          color: #64748b;
        }
        .patient-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .patient-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        .patient-info-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 9px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .patient-info-label {
          font-size: 10.5px;
          font-weight: 650;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .patient-info-val {
          font-size: 13px;
          font-weight: 550;
          color: #0f172a;
        }
        .patient-contact-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 13px;
          background: #f8fafc;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
          gap: 10px;
        }
        .patient-contact-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }
        .patient-contact-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 3px 9px;
          text-decoration: none;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .patient-contact-call-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
        /* Prescription Card */
        .patient-rx-card {
          padding: 13px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          transition: all 0.15s ease;
        }
        .patient-rx-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
        }
        .patient-rx-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .patient-rx-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 9px;
          border-top: 1px solid #f1f5f9;
        }
        .patient-action-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3.5px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .patient-action-pill-btn:hover {
          background: #ffffff;
          border-color: #cbd5e1;
        }
        .patient-action-pill-btn.is-primary {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .patient-action-pill-btn.is-primary:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
        .patient-empty-box {
          padding: 36px 20px;
          text-align: center;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .patient-empty-box h4 {
          font-size: 14px;
          font-weight: 650;
          color: #334155;
          margin: 0;
        }
        .patient-empty-box p {
          font-size: 12.5px;
          color: #64748b;
          margin: 0;
        }
        /* Timeline */
        .patient-timeline-box {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 20px;
        }
        .patient-timeline-box::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 10px;
          bottom: 10px;
          width: 2px;
          background: #e2e8f0;
        }
        .patient-timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 20px;
          position: relative;
        }
        .patient-timeline-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #94a3b8;
          position: absolute;
          left: -20px;
          top: 2px;
          z-index: 1;
        }
        .patient-timeline-dot.is-active {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .patient-timeline-content {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          padding: 10px 14px;
          width: 100%;
        }
        .patient-timeline-title {
          font-size: 13px;
          font-weight: 650;
          color: #0f172a;
        }
        .patient-timeline-desc {
          font-size: 12px;
          color: #64748b;
          margin-top: 3px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
