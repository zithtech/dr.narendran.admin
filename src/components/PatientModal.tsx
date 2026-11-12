import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  PhoneCall,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Modal, SwitchRow } from './ui/Modal';
import { Alert, Avatar } from './ui/primitives';
import { type UserAccount } from './UserModal';

export interface Patient {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name?: string;
  branch_id: string | null;
  branch_name?: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_group?: string | null;
  marital_status?: string | null;
  emergency_contacts?: any | null;
  profile_image_url?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: () => void;
}

function calculateBmi(heightStr: string, weightStr: string) {
  const h = parseFloat(heightStr);
  const w = parseFloat(weightStr);
  if (!h || !w || h <= 0 || w <= 0) return null;
  const bmi = w / (h / 100) ** 2;
  if (!Number.isFinite(bmi)) return null;
  const band =
    bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';
  const color =
    bmi < 18.5 ? '#eab308' : bmi < 25 ? '#16a34a' : bmi < 30 ? '#ea580c' : '#dc2626';
  return { value: bmi.toFixed(1), band, color };
}

export default function PatientModal({ isOpen, onClose, patient, onSave }: PatientModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
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
          setUsers(allUsers.filter((u) => u.role === 'PATIENT' && u.status === 'ACTIVE'));
        } catch (err) {
          console.error('Failed to fetch required data for patient modal', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setHospitalId(patient.hospital_id);
      setBranchId(patient.branch_id || '');
      setUserAccountId(patient.user_account_id || '');
      setPhone(patient.phone || '');
      setEmail(patient.email || '');
      setDateOfBirth(
        patient.date_of_birth
          ? new Date(patient.date_of_birth).toISOString().split('T')[0] || ''
          : '',
      );
      setGender(patient.gender || '');
      setAddress(patient.address || '');
      setStatus(patient.status);
      setHeightCm(patient.height_cm ? patient.height_cm.toString() : '');
      setWeightKg(patient.weight_kg ? patient.weight_kg.toString() : '');
      setBloodGroup(patient.blood_group || '');
      setMaritalStatus(patient.marital_status || '');

      // Parse emergency contact into primary fields or JSON string
      if (patient.emergency_contacts) {
        const raw = patient.emergency_contacts;
        setEmergencyContacts(JSON.stringify(raw, null, 2));
        const list = Array.isArray(raw) ? raw : [raw];
        if (list.length > 0 && typeof list[0] === 'object' && list[0] !== null) {
          setEmergencyName(list[0].name || '');
          setEmergencyPhone(list[0].phone || '');
          setEmergencyRelation(list[0].relation || '');
        } else {
          setEmergencyName('');
          setEmergencyPhone('');
          setEmergencyRelation('');
        }
      } else {
        setEmergencyContacts('');
        setEmergencyName('');
        setEmergencyPhone('');
        setEmergencyRelation('');
      }

      setShowRawJson(false);
      setProfileImageUrl(patient.profile_image_url || '');
      setIsActive(
        patient.is_active !== undefined && patient.is_active !== null ? patient.is_active : true,
      );
    } else {
      setName('');
      setHospitalId('');
      setBranchId('');
      setUserAccountId('');
      setPhone('');
      setEmail('');
      setDateOfBirth('');
      setGender('');
      setAddress('');
      setStatus('ACTIVE');
      setHeightCm('');
      setWeightKg('');
      setBloodGroup('');
      setMaritalStatus('');
      setEmergencyContacts('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRelation('');
      setShowRawJson(false);
      setProfileImageUrl('');
      setIsActive(true);
    }
    setError('');
  }, [patient, isOpen]);

  const availableBranches = branches.filter((b) => b.hospital_id === hospitalId);
  const bmiInfo = calculateBmi(heightCm, weightKg);

  const handlePrimaryEmergencyChange = (nameVal: string, phoneVal: string, relVal: string) => {
    setEmergencyName(nameVal);
    setEmergencyPhone(phoneVal);
    setEmergencyRelation(relVal);

    if (nameVal.trim() || phoneVal.trim() || relVal.trim()) {
      const contactObj = [
        {
          name: nameVal.trim() || undefined,
          phone: phoneVal.trim() || undefined,
          relation: relVal.trim() || undefined,
        },
      ];
      setEmergencyContacts(JSON.stringify(contactObj, null, 2));
    } else {
      setEmergencyContacts('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the patient’s full name.');
      return;
    }
    if (!hospitalId) {
      setError('Please select a hospital.');
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

    let parsedContacts: any = null;
    if (showRawJson) {
      if (emergencyContacts.trim()) {
        try {
          parsedContacts = JSON.parse(emergencyContacts);
        } catch {
          setError('Emergency contacts must be valid JSON.');
          setLoading(false);
          return;
        }
      }
    } else if (emergencyName.trim() || emergencyPhone.trim() || emergencyRelation.trim()) {
      parsedContacts = [
        {
          name: emergencyName.trim() || undefined,
          phone: emergencyPhone.trim() || undefined,
          relation: emergencyRelation.trim() || undefined,
        },
      ];
    } else if (emergencyContacts.trim()) {
      try {
        parsedContacts = JSON.parse(emergencyContacts);
      } catch {
        parsedContacts = null;
      }
    }

    try {
      const url = patient ? `patients/${patient.id}` : `patients`;
      const method = patient ? 'PUT' : 'POST';

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
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          address: address.trim() || null,
          status,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          blood_group: bloodGroup || null,
          marital_status: maritalStatus || null,
          emergency_contacts: parsedContacts,
          profile_image_url: normalizeUrl(profileImageUrl),
          is_active: isActive,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save patient.'));
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
      className="patient-create-drawer-modal"
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
            {patient ? <Pencil size={18} /> : <UserPlus size={18} />}
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
              {patient ? `Edit Patient · ${patient.name}` : 'Register New Patient'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {patient
                ? 'Update patient demographic records, health metrics, and hospital branch assignments.'
                : 'Enter personal details, hospital assignment, health vitals, and emergency contact info.'}
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
          .patient-create-drawer-modal {
            width: min(720px, 100vw) !important;
            max-width: 720px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .patient-create-drawer-modal .ui-modal-head {
            padding: 18px 26px;
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
          }
          .patient-create-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .patient-section-card {
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
          .patient-section-card:hover {
            border-color: #cbd5e1;
          }
          .patient-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .patient-section-badge {
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
          .patient-section-badge svg {
            display: block;
            margin: auto;
          }
          .patient-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .patient-create-drawer-modal .ui-input,
          .patient-create-drawer-modal .ui-select,
          .patient-create-drawer-modal .ui-textarea {
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .patient-create-drawer-modal .ui-input,
          .patient-create-drawer-modal .ui-select {
            height: 38px;
          }
          .patient-create-drawer-modal .ui-input:focus,
          .patient-create-drawer-modal .ui-select:focus,
          .patient-create-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .patient-status-btn {
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
          .patient-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .patient-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .patient-status-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .patient-submit-btn {
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
          .patient-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Section 1: Basic Information */}
          <div className="patient-section-card">
            <div className="patient-section-header">
              <div className="patient-section-badge">
                <User size={13} />
              </div>
              <div className="patient-section-tag">Basic Information</div>
            </div>

            <div>
              <label
                htmlFor="patient-name"
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
                <span>Full Name</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
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
                  id="patient-name"
                  className="ui-input"
                  style={{ paddingLeft: 34 }}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="patient-dob"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Date of Birth
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar
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
                    id="patient-dob"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="patient-gender"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Gender
                </label>
                <select
                  id="patient-gender"
                  className="ui-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="patient-marital"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Marital Status
                </label>
                <select
                  id="patient-marital"
                  className="ui-select"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="patient-blood"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Blood Group
                </label>
                <select
                  id="patient-blood"
                  className="ui-select"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="patient-image-url"
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
                <Avatar name={name || 'Patient'} src={profileImageUrl} size={40} />
                <input
                  id="patient-image-url"
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
                  placeholder="https://… (Direct avatar or photo URL)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hospital & Branch Assignment */}
          <div className="patient-section-card">
            <div className="patient-section-header">
              <div className="patient-section-badge">
                <Building2 size={13} />
              </div>
              <div className="patient-section-tag">Hospital & Branch Assignment</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="patient-hospital"
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
                  id="patient-hospital"
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
                  htmlFor="patient-branch"
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
                  id="patient-branch"
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
          </div>

          {/* Section 3: Contact & Address */}
          <div className="patient-section-card">
            <div className="patient-section-header">
              <div className="patient-section-badge">
                <Phone size={13} />
              </div>
              <div className="patient-section-tag">Contact & Address</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="patient-phone"
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
                    id="patient-phone"
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
                  htmlFor="patient-email"
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
                    id="patient-email"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. patient@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="patient-address"
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
                <span>Residential Address</span>
              </label>
              <textarea
                id="patient-address"
                className="ui-textarea"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full residential or mailing address"
              />
            </div>
          </div>

          {/* Section 4: Physical Vitals & Medical Profile */}
          <div className="patient-section-card">
            <div className="patient-section-header">
              <div className="patient-section-badge">
                <Activity size={13} />
              </div>
              <div className="patient-section-tag">Physical Vitals & Metrics</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="patient-height"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Height (cm)
                </label>
                <input
                  id="patient-height"
                  className="ui-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 175"
                />
              </div>

              <div>
                <label
                  htmlFor="patient-weight"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Weight (kg)
                </label>
                <input
                  id="patient-weight"
                  className="ui-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 70"
                />
              </div>
            </div>

            {bmiInfo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  color: '#1e40af',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Activity size={15} style={{ color: '#2563eb' }} />
                <span>
                  Calculated BMI: <strong>{bmiInfo.value}</strong> —{' '}
                  <span style={{ color: bmiInfo.color }}>{bmiInfo.band}</span>
                </span>
              </div>
            )}
          </div>

          {/* Section 5: Emergency Contacts */}
          <div className="patient-section-card">
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
                <div className="patient-section-badge">
                  <PhoneCall size={13} />
                </div>
                <div className="patient-section-tag">Emergency Contact</div>
              </div>

              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Code2 size={13} />
                <span>{showRawJson ? 'Standard Form View' : 'Raw JSON Editor'}</span>
              </button>
            </div>

            {!showRawJson ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    htmlFor="emergency-name"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Contact Person Name
                  </label>
                  <input
                    id="emergency-name"
                    className="ui-input"
                    type="text"
                    value={emergencyName}
                    onChange={(e) =>
                      handlePrimaryEmergencyChange(e.target.value, emergencyPhone, emergencyRelation)
                    }
                    placeholder="e.g. Jane Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="emergency-phone"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Contact Phone
                  </label>
                  <input
                    id="emergency-phone"
                    className="ui-input"
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) =>
                      handlePrimaryEmergencyChange(emergencyName, e.target.value, emergencyRelation)
                    }
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div>
                  <label
                    htmlFor="emergency-relation"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Relationship
                  </label>
                  <input
                    id="emergency-relation"
                    className="ui-input"
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) =>
                      handlePrimaryEmergencyChange(emergencyName, emergencyPhone, e.target.value)
                    }
                    placeholder="e.g. Spouse / Parent / Sibling"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="emergency-json"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Emergency Contacts JSON Array
                </label>
                <textarea
                  id="emergency-json"
                  className="ui-textarea"
                  rows={4}
                  value={emergencyContacts}
                  onChange={(e) => setEmergencyContacts(e.target.value)}
                  placeholder='[{"name": "Jane Doe", "phone": "1234567890", "relation": "Spouse"}]'
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                />
              </div>
            )}
          </div>

          {/* Section 6: Access & Profile Status */}
          <div className="patient-section-card">
            <div className="patient-section-header">
              <div className="patient-section-badge">
                <ShieldCheck size={13} />
              </div>
              <div className="patient-section-tag">Access & System Status</div>
            </div>

            <div>
              <label
                htmlFor="patient-user-account"
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
                id="patient-user-account"
                className="ui-select"
                value={userAccountId}
                onChange={(e) => setUserAccountId(e.target.value)}
              >
                <option value="">No account linked (Walk-in / Offline)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Only active patient user credentials are listed.
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
                Patient Profile Status
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`patient-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
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
                      Active
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Patient is active and can receive appointments & care.
                    </div>
                  </div>
                  {status === 'ACTIVE' && (
                    <CheckCircle2 size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>

                <button
                  type="button"
                  className={`patient-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
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
                      Suspended from booking new appointments.
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
                description="Allow this patient to book appointments and sign in."
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
            <button type="submit" disabled={loading} className="patient-submit-btn">
              {loading ? (
                'Saving…'
              ) : patient ? (
                <>
                  <Pencil size={14} />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Register Patient</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
