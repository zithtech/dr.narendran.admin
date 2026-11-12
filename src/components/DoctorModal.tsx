import {
  Award,
  Building2,
  CheckCircle2,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
  Video,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Modal, SwitchRow } from './ui/Modal';
import { Alert, Avatar } from './ui/primitives';
import { type UserAccount } from './UserModal';

export interface Doctor {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name?: string;
  branch_id: string | null;
  branch_name?: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  qualification?: string | null;
  medical_registration_number?: string | null;
  clinic_address?: string | null;
  years_of_experience?: number | null;
  profile_image_url?: string | null;
  podcast_url?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSave: () => void;
}

export default function DoctorModal({ isOpen, onClose, doctor, onSave }: DoctorModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [qualification, setQualification] = useState('');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [hRes, bRes, uRes] = await Promise.all([
            api.get('hospitals'),
            api.get('branches'),
            api.get('user-accounts'),
          ]);
          setHospitals(hRes.data);
          setBranches(bRes.data);
          const allUsers: UserAccount[] = uRes.data;
          setUsers(allUsers.filter((u) => u.role === 'DOCTOR' && u.status === 'ACTIVE'));
        } catch (err) {
          console.error('Failed to fetch required data for doctor modal', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setHospitalId(doctor.hospital_id);
      setBranchId(doctor.branch_id || '');
      setUserAccountId(doctor.user_account_id || '');
      setPhone(doctor.phone || '');
      setEmail(doctor.email || '');
      setSpecialization(doctor.specialization || '');
      setStatus(doctor.status);
      setQualification(doctor.qualification || '');
      setMedicalRegistrationNumber(doctor.medical_registration_number || '');
      setClinicAddress(doctor.clinic_address || '');
      setYearsOfExperience(doctor.years_of_experience ? doctor.years_of_experience.toString() : '');
      setProfileImageUrl(doctor.profile_image_url || '');
      setPodcastUrl(doctor.podcast_url || '');
      setIsActive(
        doctor.is_active !== undefined && doctor.is_active !== null ? doctor.is_active : true,
      );
    } else {
      setName('');
      setHospitalId('');
      setBranchId('');
      setUserAccountId('');
      setPhone('');
      setEmail('');
      setSpecialization('');
      setStatus('ACTIVE');
      setQualification('');
      setMedicalRegistrationNumber('');
      setClinicAddress('');
      setYearsOfExperience('');
      setProfileImageUrl('');
      setPodcastUrl('');
      setIsActive(true);
    }
    setError('');
  }, [doctor, isOpen]);

  // Filter branches by selected hospital
  const availableBranches = branches.filter((b) => b.hospital_id === hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the doctor’s full name.');
      return;
    }
    if (hospitalId === '') {
      setError('Please select an assigned hospital.');
      return;
    }
    setLoading(true);
    setError('');

    const normalizeUrl = (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };

    try {
      const url = doctor ? `doctors/${doctor.id}` : `doctors`;
      const method = doctor ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          hospital_id: hospitalId,
          branch_id: branchId === '' ? null : branchId,
          user_account_id: userAccountId === '' ? null : userAccountId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          specialization: specialization.trim() || null,
          status,
          qualification: qualification.trim() || null,
          medical_registration_number: medicalRegistrationNumber.trim() || null,
          clinic_address: clinicAddress.trim() || null,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
          profile_image_url: normalizeUrl(profileImageUrl),
          podcast_url: normalizeUrl(podcastUrl),
          is_active: isActive,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save doctor.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      variant="drawer"
      className="doctor-create-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            {doctor ? <Pencil size={18} /> : <Stethoscope size={18} />}
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {doctor ? `Edit Doctor · ${doctor.name}` : 'Add New Doctor'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {doctor
                ? 'Update doctor credentials, specialization, hospital assignments, and practice details.'
                : 'Register a medical doctor, assign hospital facilities, and set up professional profile credentials.'}
            </div>
          </div>
        </div>
      }
      description=""
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        noValidate
      >
        <style>{`
          .doctor-create-drawer-modal {
            width: min(720px, 100vw) !important;
            max-width: 720px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .doctor-create-drawer-modal .ui-modal-head {
            padding: 18px 26px;
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
          }
          .doctor-create-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .doctor-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .doctor-section-card:hover {
            border-color: #cbd5e1;
          }
          .doctor-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .doctor-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #dbeafe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .doctor-section-badge svg {
            display: block;
            margin: auto;
          }
          .doctor-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .doctor-create-drawer-modal .ui-input,
          .doctor-create-drawer-modal .ui-select,
          .doctor-create-drawer-modal .ui-textarea {
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .doctor-create-drawer-modal .ui-input,
          .doctor-create-drawer-modal .ui-select {
            height: 38px;
          }
          .doctor-create-drawer-modal .ui-input:focus,
          .doctor-create-drawer-modal .ui-select:focus,
          .doctor-create-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .doctor-status-btn {
            flex: 1;
            padding: 12px 14px;
            border-radius: 9px;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            transition: all 0.15s ease;
            position: relative;
          }
          .doctor-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .doctor-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .doctor-status-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .doctor-submit-btn {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
            border: none !important;
            color: #ffffff !important;
            height: 38px;
            padding: 0 18px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
          }
          .doctor-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Section 1: Basic Information */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <User size={13} />
              </div>
              <div className="doctor-section-tag">Basic Information</div>
            </div>

            <div>
              <label
                htmlFor="doctor-name"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 5,
                }}
              >
                <span>Doctor Full Name</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Stethoscope
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  id="doctor-name"
                  className="ui-input"
                  style={{ paddingLeft: 34 }}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Jane Smith"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="doctor-phone"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    id="doctor-phone"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="doctor-email"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    id="doctor-email"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. doctor@hospital.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="doctor-image-url"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Profile Image URL
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={name || 'Doctor'} src={profileImageUrl} size={40} />
                <input
                  id="doctor-image-url"
                  className="ui-input"
                  style={{ flex: 1 }}
                  type="text"
                  inputMode="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  onBlur={() => {
                    const trimmed = profileImageUrl.trim();
                    if (trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
                      setProfileImageUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="https://… (Direct photo or avatar URL)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hospital & Practice Location */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <Building2 size={13} />
              </div>
              <div className="doctor-section-tag">Hospital & Practice Assignment</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="doctor-hospital"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  <span>Assigned Hospital</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="doctor-hospital"
                  className="ui-select"
                  value={hospitalId}
                  onChange={(e) => {
                    setHospitalId(e.target.value);
                    setBranchId('');
                  }}
                  required
                >
                  <option value="" disabled>
                    Select hospital…
                  </option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="doctor-branch"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Branch Location
                </label>
                <select
                  id="doctor-branch"
                  className="ui-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={hospitalId === ''}
                >
                  <option value="">No specific branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="doctor-clinic-address"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 5,
                }}
              >
                <MapPin size={13} style={{ color: '#64748b' }} />
                <span>Clinic / Consultation Room Address</span>
              </label>
              <textarea
                id="doctor-clinic-address"
                className="ui-textarea"
                rows={2}
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="e.g. Block B, 3rd Floor, Suite 302, Dr. Narendran Specialty Clinic"
              />
            </div>
          </div>

          {/* Section 3: Professional Credentials & Specialization */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <Award size={13} />
              </div>
              <div className="doctor-section-tag">Professional Credentials & Expertise</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="doctor-specialization"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Specialization
                </label>
                <input
                  id="doctor-specialization"
                  className="ui-input"
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist, Neurologist, General"
                />
              </div>

              <div>
                <label
                  htmlFor="doctor-qualification"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  <GraduationCap size={13} style={{ color: '#64748b' }} />
                  <span>Qualification</span>
                </label>
                <input
                  id="doctor-qualification"
                  className="ui-input"
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. MBBS, MD (General Medicine), FRCP"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="doctor-med-reg"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Medical Registration Number
                </label>
                <input
                  id="doctor-med-reg"
                  className="ui-input"
                  type="text"
                  value={medicalRegistrationNumber}
                  onChange={(e) => setMedicalRegistrationNumber(e.target.value)}
                  placeholder="e.g. MCI-2018-98421"
                />
              </div>

              <div>
                <label
                  htmlFor="doctor-experience"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Years of Experience
                </label>
                <input
                  id="doctor-experience"
                  className="ui-input"
                  type="number"
                  min="0"
                  max="70"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Digital Media & Channels */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <Video size={13} />
              </div>
              <div className="doctor-section-tag">Media & Digital Channels</div>
            </div>

            <div>
              <label
                htmlFor="doctor-podcast-url"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 5,
                }}
              >
                <span>Podcast / YouTube Channel Link</span>
                <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Video
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 11,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  id="doctor-podcast-url"
                  className="ui-input"
                  style={{ paddingLeft: 34 }}
                  type="text"
                  inputMode="url"
                  value={podcastUrl}
                  onChange={(e) => setPodcastUrl(e.target.value)}
                  onBlur={() => {
                    const trimmed = podcastUrl.trim();
                    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
                      setPodcastUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="e.g. https://youtube.com/@doctorchannel or video podcast URL"
                />
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Enables patients to watch educational videos, health podcasts, or clinical discussions.
              </div>
            </div>
          </div>

          {/* Section 5: Access & Profile Status */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <ShieldCheck size={13} />
              </div>
              <div className="doctor-section-tag">Access & System Status</div>
            </div>

            <div>
              <label
                htmlFor="doctor-user-account"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Linked User Account
              </label>
              <select
                id="doctor-user-account"
                className="ui-select"
                value={userAccountId}
                onChange={(e) => setUserAccountId(e.target.value)}
              >
                <option value="">No account linked (External / Guest Doctor)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Only active doctor logins are listed.
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Doctor Profile Status
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`doctor-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: status === 'ACTIVE' ? '#1d4ed8' : '#334155',
                      }}
                    >
                      Active Doctor
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Doctor is available for patient consultation slots & queues.
                    </div>
                  </div>
                  {status === 'ACTIVE' && (
                    <CheckCircle2 size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>

                <button
                  type="button"
                  className={`doctor-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#94a3b8',
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: status === 'INACTIVE' ? '#1d4ed8' : '#334155',
                      }}
                    >
                      Inactive
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Temporarily unavailable for bookings or consultations.
                    </div>
                  </div>
                  {status === 'INACTIVE' && (
                    <CheckCircle2 size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>
              </div>
            </div>

            <div style={{ paddingTop: 4 }}>
              <SwitchRow
                checked={isActive}
                onChange={setIsActive}
                title="Active in system"
                description="Allow this doctor to appear in booking, search, and scheduling directories."
              />
            </div>
          </div>
        </div>

        <div className="ui-modal-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="ui-btn ui-btn-neutral">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="doctor-submit-btn">
              {loading ? (
                'Saving…'
              ) : doctor ? (
                <>
                  <Pencil size={14} />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Stethoscope size={14} />
                  <span>Create Doctor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
