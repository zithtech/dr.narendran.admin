import { App } from 'antd';
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  ExternalLink,
  Flame,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import SearchableSelect, { type SearchableSelectOption } from '../components/ui/SearchableSelect';
import { getDoctorDefaultAvatar, resolveImageUrl } from '../utils/doctorAvatar';
import { DoctorQualificationView } from '../components/DoctorQualificationBadge';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Doctor } from '../components/DoctorModal';

interface Slot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  branch_name?: string;
  branch_id?: string;
}

interface Branch {
  id: string;
  name: string;
  hospital_id?: string;
}

interface AppointmentSummary {
  total: number;
  todayCount: number;
  completed: number;
  upcoming: number;
  cancelled: number;
  patientsCount: number;
  followupCount: number;
}

const DAYS_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_OPTIONS: SearchableSelectOption[] = DAYS_ORDER.map((d) => ({
  value: d,
  label: d.charAt(0) + d.slice(1).toLowerCase(),
}));

const DURATION_OPTIONS: SearchableSelectOption[] = [
  { value: '15', label: '15 minutes' },
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 mins (Standard)' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 mins (1 hr)' },
];

export default function DoctorProfilePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [doctor?.id, doctor?.profile_image_url, (doctor as any)?.profileImageUrl]);

  // Availability slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Memoized branch options for SearchableSelect
  const branchOptions = useMemo<SearchableSelectOption[]>(() => {
    return branches.map((b) => ({
      value: b.id,
      label: b.name,
    }));
  }, [branches]);

  // Add weekly schedule slot inline form state
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState('MONDAY');
  const [newSlotStartTime, setNewSlotStartTime] = useState('09:00');
  const [newSlotEndTime, setNewSlotEndTime] = useState('17:00');
  const [newSlotDuration, setNewSlotDuration] = useState(30);
  const [newSlotBranchId, setNewSlotBranchId] = useState('');
  const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  // Appointments summary counts
  const [summary, setSummary] = useState<AppointmentSummary>({
    total: 0,
    todayCount: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0,
    patientsCount: 0,
    followupCount: 0,
  });

  // Inline editing state for individual fields: 'name' | 'email' | 'phone' | null
  const [editingField, setEditingField] = useState<'name' | 'email' | 'phone' | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Profile image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchDoctorProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/doctors/me');
      const data = res.data;
      setDoctor(data);

      if (data?.id) {
        fetchAvailability(data.id);
        fetchAppointmentStats(data.id);
      }
    } catch (err: any) {
      console.error('Failed to load doctor profile:', err);
      setError(getErrorMessage(err, 'Failed to fetch doctor profile.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (doctorId: string) => {
    setSlotsLoading(true);
    try {
      const res = await api.get(`/doctor-availability/doctor/${doctorId}`);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setSlots(list);
    } catch (err) {
      console.warn('Could not load doctor slots:', err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('branches');
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setBranches(list);
    } catch (err) {
      console.warn('Could not load branches:', err);
      setBranches([]);
    }
  };

  const fetchAppointmentStats = async (doctorId: string) => {
    try {
      const res = await api.get('appointments', { params: { doctorId } });
      const raw = res.data;
      const appointmentsList: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      const todayStr = new Date().toISOString().split('T')[0];
      const patientIdSet = new Set<string>();

      let todayCount = 0;
      let completed = 0;
      let upcoming = 0;
      let cancelled = 0;
      let followupCount = 0;

      appointmentsList.forEach((a) => {
        const aptDate = (a.appointment_date || a.appointmentDate || '').split('T')[0];
        if (aptDate === todayStr) {
          todayCount++;
        }
        const status = (a.status || '').toUpperCase();
        if (status === 'COMPLETED') completed++;
        else if (status === 'CANCELLED') cancelled++;
        else if (status === 'SCHEDULED' || status === 'CONFIRMED' || status === 'PENDING') upcoming++;

        const type = (a.type || a.appointment_type || '').toUpperCase();
        if (type.includes('FOLLOW')) followupCount++;

        const pId = a.patient_id || a.patientId || a.patient?.id;
        if (pId) patientIdSet.add(pId);
      });

      setSummary({
        total: appointmentsList.length,
        todayCount,
        completed,
        upcoming,
        cancelled,
        patientsCount: patientIdSet.size,
        followupCount,
      });
    } catch (err) {
      console.warn('Could not load doctor appointments stats:', err);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
    fetchBranches();
  }, []);

  // Inline field editing triggers
  const startEditing = (field: 'name' | 'email' | 'phone') => {
    if (!doctor) return;
    setFieldErrors({});
    if (field === 'name') setTempName(doctor.name || '');
    if (field === 'email') setTempEmail(doctor.email || '');
    if (field === 'phone') setTempPhone(doctor.phone || '');
    setEditingField(field);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setFieldErrors({});
  };

  const saveInlineField = async (field: 'name' | 'email' | 'phone') => {
    if (!doctor) return;

    let payload: Record<string, any> = {};
    if (field === 'name') {
      const trimmed = tempName.trim();
      if (!trimmed) {
        setFieldErrors({ name: 'Doctor name cannot be empty' });
        return;
      }
      payload = { name: trimmed, fullName: trimmed };
    } else if (field === 'email') {
      const trimmed = tempEmail.trim();
      payload = { email: trimmed || null, contactEmail: trimmed || null };
    } else if (field === 'phone') {
      const trimmed = tempPhone.trim();
      payload = { phone: trimmed || null };
    }

    setSavingField(field);
    try {
      const res = await api.put('/doctors/me', payload);
      message.success(`${field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Phone'} updated successfully!`);
      setEditingField(null);
      if (res?.data) {
        setDoctor(res.data);
      } else {
        fetchDoctorProfile();
      }
    } catch (err: any) {
      console.error(`Failed to update doctor ${field}:`, err);
      message.error(getErrorMessage(err, `Failed to update ${field}.`));
    } finally {
      setSavingField(null);
    }
  };

  // Inline Profile Photo Upload & Remove
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('Photo size exceeds 10MB limit.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'doctor-profiles');

      let uploadedUrl = '';
      try {
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = res.data?.data?.url || res.data?.url || '';
      } catch {
        const fallbackRes = await api.post('/doctors/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = fallbackRes.data?.data?.url || fallbackRes.data?.url || '';
      }

      if (!uploadedUrl) {
        throw new Error('Server did not return image URL.');
      }

      await api.put('/doctors/me', { profile_image_url: uploadedUrl });
      message.success('Profile photo updated successfully!');
      setImgError(false);
      fetchDoctorProfile();
    } catch (err: any) {
      console.error('Failed to upload doctor photo:', err);
      message.error(getErrorMessage(err, 'Failed to upload photo.'));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!doctor) return;
    setIsUploadingPhoto(true);
    try {
      await api.put('/doctors/me', { profile_image_url: null });
      message.success('Profile photo removed.');
      fetchDoctorProfile();
    } catch (err: any) {
      console.error('Failed to remove doctor photo:', err);
      message.error(getErrorMessage(err, 'Failed to remove photo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Add weekly schedule slot handler
  const handleAddWeeklySlot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!doctor?.id) return;
    if (newSlotEndTime <= newSlotStartTime) {
      setSlotError('End time must be after start time.');
      return;
    }
    setIsSubmittingSlot(true);
    setSlotError(null);
    try {
      const branchToUse =
        newSlotBranchId ||
        doctor.branch_id ||
        (branches.length > 0 ? branches[0]?.id || '' : '');

      await api.post('doctor-availability', {
        doctor_id: doctor.id,
        branch_id: branchToUse || undefined,
        day_of_week: newSlotDay,
        start_time: newSlotStartTime,
        end_time: newSlotEndTime,
        slot_length: newSlotDuration,
        status: 'ACTIVE',
      });
      message.success(`Weekly schedule added for ${newSlotDay}!`);
      setShowAddSlot(false);
      fetchAvailability(doctor.id);
    } catch (err: any) {
      console.error('Failed to add schedule slot:', err);
      setSlotError(getErrorMessage(err, 'Failed to add weekly schedule slot.'));
    } finally {
      setIsSubmittingSlot(false);
    }
  };

  // Delete weekly schedule slot handler
  const handleDeleteSlot = async (slotId: string, day: string) => {
    if (!doctor?.id) return;
    setDeletingSlotId(slotId);
    try {
      await api.delete(`doctor-availability/${slotId}`);
      message.success(`Removed slot on ${day}.`);
      fetchAvailability(doctor.id);
    } catch (err: any) {
      console.error('Failed to remove slot:', err);
      message.error(getErrorMessage(err, 'Failed to remove schedule slot.'));
    } finally {
      setDeletingSlotId(null);
    }
  };

  // Resolved Avatar image
  const defaultAvatar = getDoctorDefaultAvatar(doctor);
  const rawImage = doctor?.profile_image_url || (doctor as any)?.profileImageUrl;
  const resolvedPhoto = resolveImageUrl(rawImage);
  const hasCustomPhoto = Boolean(resolvedPhoto && !imgError);
  const displayPhotoSrc = !resolvedPhoto || imgError ? defaultAvatar : resolvedPhoto;

  // Group slots by day of week
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    DAYS_ORDER.forEach((day) => map.set(day, []));

    slots.forEach((s) => {
      const day = (s.day_of_week || '').toUpperCase();
      if (map.has(day)) {
        map.get(day)!.push(s);
      }
    });

    return map;
  }, [slots]);

  const isActive = Boolean(
    (!doctor?.status || String(doctor.status).toUpperCase() === 'ACTIVE') &&
    doctor?.is_active !== false,
  );

  if (loading) {
    return (
      <div className="doctor-profile-wrapper">
        <div className="doctor-profile-loading">
          <Activity size={32} className="animate-spin text-blue-600" />
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
            Loading doctor profile & clinical workspace…
          </span>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="doctor-profile-wrapper">
        <div className="doctor-profile-error">
          <AlertCircle size={40} style={{ color: '#ef4444' }} />
          <h2 style={{ fontSize: 18, fontWeight: 750, color: '#0f172a', margin: '12px 0 6px' }}>
            Doctor Profile Not Found
          </h2>
          <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20, maxWidth: 440 }}>
            {error || 'Could not find an active doctor record associated with your user account.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={fetchDoctorProfile}
              className="doctor-card-secondary-btn"
              style={{ width: 'auto', padding: '0 20px' }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/appointments/today')}
              className="doctor-card-secondary-btn"
              style={{ width: 'auto', padding: '0 18px' }}
            >
              <span>Today's Appointments</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-profile-container">
      {/* ── Top Header Bar ── */}
      <div className="doctor-profile-topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="doctor-profile-title">Doctor Profile</h1>
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
          <p className="doctor-profile-subtitle">
            Verified practitioner credentials, clinical practice records, and weekly consulting schedule.
          </p>
        </div>

        {/* Topbar Quick Navigation */}
        <div className="doctor-topbar-actions">
          <button
            type="button"
            onClick={() => navigate('/appointments/today')}
            className="doctor-topbar-secondary-btn"
          >
            <CalendarClock size={14} style={{ color: '#2563eb' }} />
            <span>Today's Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/availability')}
            className="doctor-topbar-secondary-btn"
          >
            <Clock size={14} style={{ color: '#16a34a' }} />
            <span>Consulting Hours</span>
          </button>
        </div>
      </div>

      {/* ── Two-Column Split Layout matching Doctor Drawer ── */}
      <div className="doctor-drawer-split">
        {/* ══════════════════════════════════════════════════════════════════════
            LEFT SIDE: Doctor Profile Card (Matching Doctor View Reference Layout)
            ══════════════════════════════════════════════════════════════════════ */}
        <aside className="doctor-drawer-left">
          <div className="doctor-ref-card">
            {/* Hidden File Input for Direct Inline Photo Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
              aria-label="Upload Profile Photo File"
            />

            {/* Doctor Photo Header with Enhanced Upload Controls */}
            <div className="doctor-card-photo-hero">
              <img
                src={displayPhotoSrc}
                alt={doctor.name || 'Doctor'}
                className={`doctor-card-photo ${!hasCustomPhoto ? 'doctor-card-photo-default' : ''}`}
                onError={() => setImgError(true)}
              />

              {/* Inline Photo Overlay Controls */}
              <div className="doctor-photo-actions-overlay">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="doctor-photo-btn"
                  title="Upload / Change Photo"
                  aria-label="Change Profile Photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Camera size={12} />
                  )}
                  <span>{isUploadingPhoto ? 'Uploading…' : hasCustomPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {hasCustomPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="doctor-photo-remove-btn"
                    title="Remove custom photo"
                    aria-label="Remove Profile Photo"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="doctor-card-photo-badge">
                <Stethoscope size={13} />
                <span>Verified Practicing Doctor</span>
              </div>
            </div>

            {/* Doctor Details Body */}
            <div className="doctor-card-body">
              {/* Doctor Name with Inline Edit */}
              <div className="doctor-card-name-block">
                {editingField === 'name' ? (
                  <div className="doctor-inline-editor">
                    <label htmlFor="inline-doc-name" className="doctor-field-micro-label">
                      Doctor Name
                    </label>
                    <div className="doctor-inline-input-row">
                      <input
                        id="inline-doc-name"
                        aria-label="Doctor Name"
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveInlineField('name');
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className={`doctor-inline-input ${fieldErrors.name ? 'is-invalid' : ''}`}
                        placeholder="Enter full name"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void saveInlineField('name')}
                        disabled={savingField === 'name'}
                        className="doctor-inline-save-btn"
                        title="Save name"
                        aria-label="Save Name"
                      >
                        {savingField === 'name' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingField === 'name'}
                        className="doctor-inline-cancel-btn"
                        title="Cancel"
                        aria-label="Cancel Name"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {fieldErrors.name && (
                      <span className="doctor-inline-error">{fieldErrors.name}</span>
                    )}
                  </div>
                ) : (
                  <div className="doctor-name-display-group">
                    <h2 className="doctor-card-name">{doctor.name}</h2>
                    <button
                      type="button"
                      onClick={() => startEditing('name')}
                      className="doctor-inline-edit-btn"
                      title="Edit doctor name"
                      aria-label="Edit Name"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
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

              {/* Section 1: Professional & Clinical Credentials */}
              <div className="doctor-card-section">
                <div className="doctor-card-section-head">
                  <span className="doctor-section-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Stethoscope size={13} />
                  </span>
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
                      {doctor.years_of_experience !== null && doctor.years_of_experience !== undefined ? (
                        <>
                          <span>{doctor.years_of_experience} Years</span> in Practice
                        </>
                      ) : (
                        'Not specified'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="doctor-card-divider" />

              {/* Section 2: Support / Email with Inline Edit */}
              <div className="doctor-card-section">
                <div className="doctor-card-section-head">
                  <span className="doctor-section-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                    <Mail size={13} />
                  </span>
                  <span className="doctor-card-section-title">Support (Email)</span>
                  {editingField !== 'email' && (
                    <button
                      type="button"
                      onClick={() => startEditing('email')}
                      className="doctor-inline-field-edit-btn"
                      title="Edit email address"
                      aria-label="Edit Email"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>

                {editingField === 'email' ? (
                  <div className="doctor-inline-editor" style={{ paddingLeft: 30, marginTop: 4 }}>
                    <div className="doctor-inline-input-row">
                      <input
                        type="email"
                        aria-label="Doctor Email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveInlineField('email');
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="doctor-inline-input"
                        placeholder="e.g. doctor@hospital.com"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void saveInlineField('email')}
                        disabled={savingField === 'email'}
                        className="doctor-inline-save-btn"
                        title="Save email"
                        aria-label="Save Email"
                      >
                        {savingField === 'email' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingField === 'email'}
                        className="doctor-inline-cancel-btn"
                        title="Cancel"
                        aria-label="Cancel Email"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="doctor-card-section-text" style={{ paddingLeft: 30 }}>
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
                )}
              </div>

              <div className="doctor-card-divider" />

              {/* Section 3: Call Me / Phone with Inline Edit */}
              <div className="doctor-card-section">
                <div className="doctor-card-section-head">
                  <span className="doctor-section-icon-badge" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <Phone size={13} />
                  </span>
                  <span className="doctor-card-section-title">Call Me (Phone)</span>
                  {editingField !== 'phone' && (
                    <button
                      type="button"
                      onClick={() => startEditing('phone')}
                      className="doctor-inline-field-edit-btn"
                      title="Edit phone number"
                      aria-label="Edit Phone"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>

                {editingField === 'phone' ? (
                  <div className="doctor-inline-editor" style={{ paddingLeft: 30, marginTop: 4 }}>
                    <div className="doctor-inline-input-row">
                      <input
                        type="tel"
                        aria-label="Doctor Phone"
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveInlineField('phone');
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="doctor-inline-input"
                        placeholder="e.g. 9876543210"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void saveInlineField('phone')}
                        disabled={savingField === 'phone'}
                        className="doctor-inline-save-btn"
                        title="Save phone"
                        aria-label="Save Phone"
                      >
                        {savingField === 'phone' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingField === 'phone'}
                        className="doctor-inline-cancel-btn"
                        title="Cancel"
                        aria-label="Cancel Phone"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="doctor-card-section-text" style={{ paddingLeft: 30 }}>
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
                )}
              </div>

              <div className="doctor-card-divider" />

              {/* Navigation Action Buttons (No Edit Profile Button) */}
              <div className="doctor-card-actions">
                <button
                  type="button"
                  onClick={() => navigate('/appointments/today')}
                  className="doctor-card-secondary-btn"
                >
                  <CalendarClock size={13} />
                  <span>Today's Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/availability')}
                  className="doctor-card-secondary-btn"
                >
                  <Clock size={13} />
                  <span>Consulting Hours</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT SIDE: Clinical Counts, Weekly Schedule & Practice Details
            ══════════════════════════════════════════════════════════════════════ */}
        <main className="doctor-drawer-right">
          {/* ══════════════════════════════════════════════════════════════════
              TOP SECTION: Patient & Appointment Counts (Left) + Weekly Schedule (Right)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="doctor-right-top-split">
            {/* Left Side: Clinical Patient & Appointment Counts */}
            <div className="doctor-view-card doctor-counts-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
                  <Activity size={16} />
                </div>
                <div>
                  <div className="doctor-view-title">Patient & Consultation Summary</div>
                  <div className="doctor-view-subtitle">Live practice metrics and workload</div>
                </div>
              </div>

              <div className="doctor-counts-list">
                <div className="doctor-count-row is-active-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                      <Users size={12} />
                    </span>
                    <span className="doctor-count-label">Total Patients</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    {summary.patientsCount}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                      <Flame size={12} />
                    </span>
                    <span className="doctor-count-label">Today's Patients</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#d1fae5', color: '#065f46' }}>
                    {summary.todayCount}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      <CalendarCheck size={12} />
                    </span>
                    <span className="doctor-count-label">Total Appointments</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                    {summary.total}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      <CheckCircle2 size={12} />
                    </span>
                    <span className="doctor-count-label">Completed Consultations</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#dcfce7', color: '#15803d' }}>
                    {summary.completed}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                      <Clock3 size={12} />
                    </span>
                    <span className="doctor-count-label">Upcoming Scheduled</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#fef3c7', color: '#92400e' }}>
                    {summary.upcoming}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                      <XCircle size={12} />
                    </span>
                    <span className="doctor-count-label">Cancelled / No-show</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    {summary.cancelled}
                  </span>
                </div>

                <div className="doctor-count-row">
                  <div className="doctor-count-row-left">
                    <span className="doctor-count-icon-badge" style={{ background: '#faf5ff', color: '#7c3aed' }}>
                      <RotateCcw size={12} />
                    </span>
                    <span className="doctor-count-label">Follow-up Patients</span>
                  </div>
                  <span className="doctor-count-pill" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
                    {summary.followupCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Weekly Availability Schedule with Enhanced Dropdowns */}
            <div className="doctor-view-card doctor-schedule-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
                  <Calendar size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doctor-view-title">Weekly Schedule & Availability</div>
                  <div className="doctor-view-subtitle">Regular consultation timing by day</div>
                </div>

                {/* Enhanced Add Schedule Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSlot(!showAddSlot);
                    setSlotError(null);
                  }}
                  className="doctor-add-slot-btn"
                  aria-label="Add Weekly Schedule"
                >
                  {showAddSlot ? <X size={13} /> : <Plus size={13} />}
                  <span>{showAddSlot ? 'Cancel' : 'Add Schedule'}</span>
                </button>
              </div>

              {/* Enhanced Inline Add Schedule Form with Polished Dropdown UI */}
              {showAddSlot && (
                <form onSubmit={handleAddWeeklySlot} className="doctor-slot-inline-form">
                  <div className="doctor-slot-form-title">
                    <Sparkles size={13} style={{ color: '#16a34a' }} />
                    <span>New Consultation Slot</span>
                  </div>

                  <div className="doctor-slot-form-grid">
                    {/* Day of Week Dropdown (SearchableSelect) */}
                    <div className="doctor-form-field">
                      <label htmlFor="slot-day-select" className="doctor-field-micro-label">
                        Day of Week
                      </label>
                      <SearchableSelect
                        id="slot-day-select"
                        aria-label="Day of Week"
                        value={newSlotDay}
                        onChange={(val) => setNewSlotDay(val)}
                        options={DAY_OPTIONS}
                        searchable={false}
                        placeholder="Select Day"
                      />
                    </div>

                    {/* Start Time Input */}
                    <div className="doctor-form-field">
                      <label htmlFor="slot-start-time" className="doctor-field-micro-label">
                        Start Time
                      </label>
                      <div className="doctor-time-input-wrapper">
                        <input
                          id="slot-start-time"
                          aria-label="Start Time"
                          type="time"
                          value={newSlotStartTime}
                          onChange={(e) => setNewSlotStartTime(e.target.value)}
                          className="doctor-custom-time-input"
                          required
                        />
                      </div>
                    </div>

                    {/* End Time Input */}
                    <div className="doctor-form-field">
                      <label htmlFor="slot-end-time" className="doctor-field-micro-label">
                        End Time
                      </label>
                      <div className="doctor-time-input-wrapper">
                        <input
                          id="slot-end-time"
                          aria-label="End Time"
                          type="time"
                          value={newSlotEndTime}
                          onChange={(e) => setNewSlotEndTime(e.target.value)}
                          className="doctor-custom-time-input"
                          required
                        />
                      </div>
                    </div>

                    {/* Slot Duration Dropdown (SearchableSelect) */}
                    <div className="doctor-form-field">
                      <label htmlFor="slot-duration-select" className="doctor-field-micro-label">
                        Slot Duration
                      </label>
                      <SearchableSelect
                        id="slot-duration-select"
                        aria-label="Slot Duration"
                        value={String(newSlotDuration)}
                        onChange={(val) => setNewSlotDuration(Number(val))}
                        options={DURATION_OPTIONS}
                        searchable={false}
                        placeholder="Select Duration"
                      />
                    </div>

                    {/* Branch Location Dropdown (SearchableSelect) */}
                    {branches.length > 1 && (
                      <div className="doctor-form-field" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="slot-branch-select" className="doctor-field-micro-label">
                          Consulting Branch / Clinic Location
                        </label>
                        <SearchableSelect
                          id="slot-branch-select"
                          aria-label="Branch Location"
                          value={newSlotBranchId || doctor?.branch_id || (branches[0]?.id || '')}
                          onChange={(val) => setNewSlotBranchId(val)}
                          options={branchOptions}
                          searchable={branches.length > 5}
                          placeholder="Select Branch"
                        />
                      </div>
                    )}
                  </div>

                  {slotError && (
                    <div className="doctor-inline-error" style={{ marginTop: 4 }}>
                      {slotError}
                    </div>
                  )}

                  <div className="doctor-slot-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSlot(false);
                        setSlotError(null);
                      }}
                      disabled={isSubmittingSlot}
                      className="doctor-slot-cancel-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSlot}
                      className="doctor-slot-save-btn"
                      aria-label="Save Schedule Slot"
                    >
                      {isSubmittingSlot ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Save Schedule Slot</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {slotsLoading ? (
                <div className="doctor-schedule-empty" style={{ minHeight: 180 }}>
                  <Activity size={18} className="animate-spin text-blue-500" />
                  <span>Loading weekly consultation slots…</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="doctor-schedule-empty" style={{ minHeight: 180 }}>
                  <Calendar size={28} style={{ color: '#94a3b8' }} />
                  <span style={{ fontWeight: 600, color: '#475569' }}>No Regular Slots Configured</span>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', maxWidth: 220 }}>
                    Consulting hours have not been registered for this doctor.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSlot(true);
                      setSlotError(null);
                    }}
                    className="doctor-card-secondary-btn"
                    style={{ width: 'auto', padding: '0 16px', height: 32, fontSize: 12, marginTop: 4 }}
                  >
                    <Plus size={13} />
                    <span>Add Schedule Slot</span>
                  </button>
                </div>
              ) : (
                <div className="doctor-week-grid">
                  {DAYS_ORDER.map((day) => {
                    const daySlots = slotsByDay.get(day) || [];
                    const hasSlots = daySlots.length > 0;
                    return (
                      <div
                        key={day}
                        className={`doctor-day-row ${hasSlots ? 'has-slots' : 'is-off'}`}
                      >
                        <div className="doctor-day-name">{day}</div>
                        <div className="doctor-day-slots">
                          {hasSlots ? (
                            daySlots.map((s) => (
                              <span key={s.id} className="doctor-slot-pill">
                                <Clock size={11} style={{ color: '#16a34a' }} />
                                <span>
                                  {s.start_time} - {s.end_time}
                                </span>
                                {s.branch_name && (
                                  <span className="doctor-slot-branch">({s.branch_name})</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteSlot(s.id, day)}
                                  disabled={deletingSlotId === s.id}
                                  className="doctor-slot-delete-btn"
                                  title="Delete this slot"
                                  aria-label={`Delete ${day} slot ${s.start_time} - ${s.end_time}`}
                                >
                                  {deletingSlotId === s.id ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <X size={10} />
                                  )}
                                </button>
                              </span>
                            ))
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="doctor-day-off">Day Off</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSlotDay(day);
                                  setShowAddSlot(true);
                                  setSlotError(null);
                                }}
                                className="doctor-day-add-slot-btn"
                                aria-label={`Add slot for ${day}`}
                              >
                                + Add
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CARD 2: Hospital & Clinic Assignment
              ══════════════════════════════════════════════════════════════════ */}
          <div className="doctor-view-card">
            <div className="doctor-view-header">
              <div className="doctor-view-badge" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#b45309' }}>
                <Building2 size={16} />
              </div>
              <div>
                <div className="doctor-view-title">Hospital & Clinic Assignment</div>
                <div className="doctor-view-subtitle">Physical consultation base and branch linkage</div>
              </div>
            </div>

            <div className="doctor-grid-2col">
              <div className="doctor-info-field">
                <div className="doctor-info-label">Affiliated Hospital / Practice</div>
                <div className="doctor-info-value" style={{ fontWeight: 650, color: '#0f172a' }}>
                  {doctor.hospital_name || doctor.clinic_address || 'Dr. Narendran Care Center'}
                </div>
              </div>

              <div className="doctor-info-field">
                <div className="doctor-info-label">Assigned Branch / Clinic</div>
                <div className="doctor-info-value">
                  {doctor.branch_name || 'Main Medical Campus'}
                </div>
              </div>

              <div className="doctor-info-field" style={{ gridColumn: '1 / -1' }}>
                <div className="doctor-info-label">Physical Practice Address</div>
                <div className="doctor-info-value doctor-address-box">
                  <MapPin size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {[
                      doctor.address_line_1,
                      doctor.address_line_2,
                      doctor.city,
                      doctor.state,
                      doctor.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') ||
                      doctor.clinic_address ||
                      'Main Health Complex, Anna Nagar, Chennai'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CARD 3: Media & External Channels
              ══════════════════════════════════════════════════════════════════ */}
          {doctor.podcast_url ? (
            <div className="doctor-view-card">
              <div className="doctor-view-header">
                <div className="doctor-view-badge" style={{ background: '#ffe4e6', borderColor: '#fecdd3', color: '#e11d48' }}>
                  <Video size={16} />
                </div>
                <div>
                  <div className="doctor-view-title">Media & External Channels</div>
                  <div className="doctor-view-subtitle">Clinical discussions, podcasts, and video links</div>
                </div>
              </div>

              <div className="doctor-grid-1col">
                <div className="doctor-info-field">
                  <div className="doctor-info-label">Podcast / Video URL</div>
                  <div className="doctor-info-value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a
                      href={doctor.podcast_url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doctor-card-link"
                      style={{ fontSize: 13 }}
                    >
                      {doctor.podcast_url}
                    </a>
                    <a
                      href={doctor.podcast_url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doctor-card-secondary-btn"
                      style={{ width: 'auto', padding: '0 12px', height: 28, fontSize: 11.5, flexShrink: 0 }}
                    >
                      <span>Open</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* ── CSS Styles Scoped to Doctor Profile Page ── */}
      <style>{`
        .doctor-profile-container {
          padding: 24px 28px;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .doctor-profile-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e2e8f0;
        }
        .doctor-profile-title {
          font-size: 23px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.015em;
        }
        .doctor-profile-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0;
        }
        .doctor-topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .doctor-topbar-secondary-btn {
          height: 38px;
          padding: 0 16px;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6.5px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .doctor-topbar-secondary-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        /* ── Split Layout matching Doctor Drawer ── */
        .doctor-drawer-split {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .doctor-drawer-split {
            grid-template-columns: 1fr;
          }
        }
        .doctor-drawer-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .doctor-drawer-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        /* ── Doctor Reference Card (Left Side) ── */
        .doctor-ref-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
          transition: border-color 0.15s ease;
        }
        .doctor-card-photo-hero {
          width: 100%;
          height: 230px;
          min-height: 210px;
          position: relative;
          background: #ffffff;
          overflow: hidden;
          border-bottom: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 14px 16px 36px;
        }
        .doctor-card-photo {
          max-width: 100%;
          width: auto;
          height: 100%;
          max-height: 180px;
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
          max-height: 180px;
          object-fit: contain;
          object-position: bottom center;
          padding: 0;
          margin: 0 auto;
        }
        .doctor-photo-actions-overlay {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 3;
        }
        .doctor-photo-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4.5px 10px;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-photo-btn:hover {
          background: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }
        .doctor-photo-remove-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 27px;
          height: 27px;
          border-radius: 9999px;
          background: rgba(239, 68, 68, 0.92);
          backdrop-filter: blur(8px);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-photo-remove-btn:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
        .doctor-card-photo-badge {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 5.5px;
          padding: 3.5px 11px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(6px);
          color: #1d4ed8;
          font-size: 10.5px;
          font-weight: 650;
          z-index: 2;
          border: 1px solid rgba(191, 219, 254, 0.85);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          white-space: nowrap;
        }
        .doctor-card-body {
          padding: 16px 20px 22px;
        }
        .doctor-card-name-block {
          text-align: center;
        }
        .doctor-name-display-group {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .doctor-card-name {
          font-size: 20px;
          font-weight: 750;
          color: #0c2340;
          margin: 0;
          letter-spacing: -0.015em;
          line-height: 1.25;
        }
        .doctor-inline-edit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 25px;
          height: 25px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .doctor-inline-edit-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }
        .doctor-section-icon-badge {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .doctor-inline-field-edit-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          border: 1px solid transparent;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-inline-field-edit-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }

        /* ── Inline Micro Editors ── */
        .doctor-inline-editor {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .doctor-field-micro-label {
          font-size: 10.5px;
          font-weight: 650;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: left;
          margin-bottom: 3px;
          display: block;
        }
        .doctor-inline-input-row {
          display: flex;
          align-items: center;
          gap: 5px;
          width: 100%;
        }
        .doctor-inline-input {
          flex: 1;
          min-width: 0;
          height: 32px;
          padding: 5px 9px;
          font-size: 12.5px;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
        }
        .doctor-inline-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .doctor-inline-input.is-invalid {
          border-color: #ef4444;
        }
        .doctor-inline-save-btn {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          background: #16a34a;
          color: #ffffff;
          border: none;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .doctor-inline-save-btn:hover {
          background: #15803d;
        }
        .doctor-inline-cancel-btn {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .doctor-inline-cancel-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .doctor-inline-error {
          font-size: 11px;
          color: #ef4444;
          text-align: left;
        }

        .doctor-card-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 2.5px 9px;
          border-radius: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .doctor-status-dot {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .doctor-status-dot.is-active {
          background: #22c55e;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
        }
        .doctor-card-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 12px 0;
        }
        .doctor-card-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .doctor-card-section-head {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .doctor-card-section-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0c2340;
        }
        .doctor-card-cred-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 8px;
          padding-left: 32px;
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
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 1.5px 7px;
          border-radius: 4px;
        }
        .doctor-card-section-text {
          font-size: 12px;
          color: #334155;
          line-height: 1.5;
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
          padding: 2.5px 8px;
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

        /* ── Top Split Section: Counts Left, Schedule Right ── */
        .doctor-right-top-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .doctor-right-top-split {
            grid-template-columns: 1fr;
          }
        }
        .doctor-counts-card {
          gap: 12px;
          height: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .doctor-schedule-card {
          gap: 12px;
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

        /* ── Right Side Enhanced Cards ── */
        .doctor-view-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
          transition: all 0.15s ease;
        }
        .doctor-view-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }
        .doctor-view-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          min-height: 44px;
        }
        .doctor-view-badge {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0;
        }
        .doctor-view-title {
          font-size: 14px;
          font-weight: 750;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .doctor-view-subtitle {
          font-size: 11.5px;
          color: #64748b;
          margin-top: 1.5px;
        }

        /* ── Enhanced Add Schedule Button & Dropdown UI ── */
        .doctor-add-slot-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          font-size: 11.5px;
          font-weight: 650;
          padding: 4px 11px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(22, 101, 52, 0.08);
        }
        .doctor-add-slot-btn:hover {
          background: #dcfce7;
          border-color: #86efac;
          transform: translateY(-1px);
        }

        .doctor-slot-inline-form {
          padding: 14px 16px;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
        }
        .doctor-slot-form-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .doctor-slot-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
          gap: 10px;
        }
        .doctor-form-field {
          display: flex;
          flex-direction: column;
        }

        /* ── Modern Dropdown Styling with Custom Chevron ── */
        .doctor-dropdown-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .doctor-custom-select {
          width: 100%;
          height: 34px;
          padding: 5px 28px 5px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .doctor-custom-select:hover {
          border-color: #94a3b8;
        }
        .doctor-custom-select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }
        .doctor-dropdown-chevron {
          position: absolute;
          right: 9px;
          pointer-events: none;
          color: #64748b;
          transition: transform 0.15s ease;
        }

        /* ── Modern Time Input Styling ── */
        .doctor-time-input-wrapper {
          position: relative;
          width: 100%;
        }
        .doctor-custom-time-input {
          width: 100%;
          height: 38px;
          padding: 8px 11px;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .doctor-custom-time-input:hover {
          border-color: #94a3b8;
        }
        .doctor-custom-time-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }

        .doctor-slot-form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
        }
        .doctor-slot-save-btn {
          height: 30px;
          padding: 0 14px;
          background: #16a34a;
          color: #ffffff;
          border: none;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(22, 163, 74, 0.25);
        }
        .doctor-slot-save-btn:hover {
          background: #15803d;
          transform: translateY(-1px);
        }
        .doctor-slot-cancel-btn {
          height: 30px;
          padding: 0 12px;
          background: #ffffff;
          color: #64748b;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-slot-cancel-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .doctor-slot-delete-btn {
          margin-left: 2px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #166534;
          display: grid;
          place-items: center;
          cursor: pointer;
          opacity: 0.75;
          transition: all 0.15s ease;
        }
        .doctor-slot-delete-btn:hover {
          opacity: 1;
          background: #bbf7d0;
          color: #dc2626;
        }
        .doctor-day-add-slot-btn {
          font-size: 10.5px;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 2px 7px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doctor-day-add-slot-btn:hover {
          background: #dbeafe;
          transform: translateY(-1px);
        }
        .doctor-schedule-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px 12px;
        }
        .doctor-week-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .doctor-day-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 11px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          font-size: 11.5px;
          min-height: 34px;
          transition: all 0.15s ease;
        }
        .doctor-day-row.has-slots {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
        }
        .doctor-day-name {
          font-weight: 700;
          color: #334155;
          width: 90px;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }
        .doctor-day-slots {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .doctor-slot-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 2.5px 8px;
          border-radius: 6px;
        }
        .doctor-slot-branch {
          font-size: 10px;
          color: #15803d;
          opacity: 0.85;
        }
        .doctor-day-off {
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        }
        .doctor-grid-2col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px 20px;
        }
        .doctor-grid-1col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .doctor-info-field {
          display: flex;
          flex-direction: column;
          gap: 3.5px;
        }
        .doctor-info-label {
          font-size: 11px;
          font-weight: 650;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .doctor-info-value {
          font-size: 13px;
          color: #0f172a;
          word-break: break-word;
        }
        .doctor-address-box {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 12.5px;
          color: #334155;
          line-height: 1.45;
        }
        .doctor-profile-loading,
        .doctor-profile-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
