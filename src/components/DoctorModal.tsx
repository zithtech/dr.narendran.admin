import {
  AlertCircle,
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
import React, { useEffect, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Modal, SwitchRow } from './ui/Modal';
import { Alert } from './ui/primitives';
import { ImageUploadField } from './ui/ImageUploadField';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';
import { type UserAccount } from './UserModal';
import { getDoctorDefaultAvatar } from '../utils/doctorAvatar';

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
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  years_of_experience?: number | null;
  profile_image_url?: string | null;
  podcast_url?: string | null;
  gender?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

export const GENDER_OPTIONS: SearchableSelectOption[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export function validateDoctorName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Doctor full name is required.';
  }
  if (trimmed.length < 2) {
    return 'Doctor name must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Doctor name cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in doctor name.';
  }
  if (/[^a-zA-Z\s.-]/.test(val)) {
    return 'Doctor name can only contain letters, spaces, hyphens, and periods.';
  }
  return undefined;
}

export function validateDoctorPhone(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[a-zA-Z]/.test(val)) {
    return 'Letters are not allowed in phone number.';
  }
  if (/[^0-9+\s-]/.test(val)) {
    return 'Special characters are not allowed in phone number.';
  }
  const digits = val.replace(/\D/g, '');
  if (digits.length < 7) {
    return 'Phone number must be at least 7 digits.';
  }
  if (digits.length > 15) {
    return 'Phone number cannot exceed 15 digits.';
  }
  return undefined;
}

export function validateDoctorEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address (e.g. doctor@hospital.com).';
  }
  if (trimmed.length > 150) {
    return 'Email address cannot exceed 150 characters.';
  }
  return undefined;
}

export function validateDoctorHospital(val: string): string | undefined {
  if (!val || !val.trim()) {
    return 'Please select an assigned hospital.';
  }
  return undefined;
}

export function validateDoctorSpecialization(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return 'Specialization cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in specialization.';
  }
  if (/[^a-zA-Z\s,()./&-]/.test(val)) {
    return 'Specialization can only contain letters and standard punctuation.';
  }
  return undefined;
}

export function validateDoctorQualification(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return 'Qualification cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in qualification.';
  }
  if (/[^a-zA-Z\s.,/()-]/.test(val)) {
    return 'Qualification can only contain letters and academic punctuation.';
  }
  return undefined;
}

export function validateDoctorRegistrationNumber(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 3) {
    return 'Registration number must be at least 3 characters.';
  }
  if (trimmed.length > 50) {
    return 'Registration number cannot exceed 50 characters.';
  }
  if (/[^a-zA-Z0-9/-]/.test(val)) {
    return 'Medical registration number can only contain letters, numbers, hyphens, and slashes.';
  }
  return undefined;
}

export function validateDoctorExperience(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[^0-9]/.test(trimmed)) {
    return 'Years of experience must contain only numbers.';
  }
  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 0) {
    return 'Years of experience cannot be negative.';
  }
  if (num > 70) {
    return 'Years of experience cannot exceed 70.';
  }
  return undefined;
}

export function validateDoctorAddressLine(val: string, label = 'Address line'): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 255) {
    return `${label} cannot exceed 255 characters.`;
  }
  if (/[^a-zA-Z0-9\s,./#&-]/.test(val)) {
    return `${label} contains invalid characters.`;
  }
  return undefined;
}

export function validateDoctorCity(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return 'City cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in city.';
  }
  if (/[^a-zA-Z\s-]/.test(val)) {
    return 'City can only contain letters, spaces, and hyphens.';
  }
  return undefined;
}

export function validateDoctorState(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return 'State cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in state.';
  }
  if (/[^a-zA-Z\s-]/.test(val)) {
    return 'State can only contain letters, spaces, and hyphens.';
  }
  return undefined;
}

export function validateDoctorPincode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[^0-9]/.test(trimmed)) {
    return 'Pincode must contain only numbers.';
  }
  if (trimmed.length < 5 || trimmed.length > 10) {
    return 'Pincode must be between 5 and 10 digits.';
  }
  return undefined;
}

export function validateDoctorPodcastUrl(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 255) {
    return 'Podcast link cannot exceed 255 characters.';
  }
  return undefined;
}

export function validateDoctorImageUrl(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) {
    return 'Profile image URL cannot exceed 500 characters.';
  }
  return undefined;
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
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
  const [gender, setGender] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

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
      setAddressLine1(doctor.address_line_1 || doctor.clinic_address || '');
      setAddressLine2(doctor.address_line_2 || '');
      setCity(doctor.city || '');
      setState(doctor.state || '');
      setPincode(doctor.pincode || '');
      setYearsOfExperience(doctor.years_of_experience ? doctor.years_of_experience.toString() : '');
      setProfileImageUrl(doctor.profile_image_url || '');
      setPodcastUrl(doctor.podcast_url || '');
      setGender(doctor.gender ? doctor.gender.trim().toUpperCase() : '');
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
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
      setYearsOfExperience('');
      setProfileImageUrl('');
      setPodcastUrl('');
      setGender('');
      setIsActive(true);
    }
    setError('');
    setErrors({});
  }, [doctor, isOpen]);

  // Filter branches by selected hospital
  const availableBranches = useMemo(
    () => branches.filter((b) => b.hospital_id === hospitalId),
    [branches, hospitalId]
  );

  const hospitalOptions = useMemo<SearchableSelectOption[]>(() => {
    return hospitals.map((h) => {
      const code = h.hospital_code || (h as any).code;
      return {
        value: h.id,
        label: h.name,
        sublabel: [code ? `Code: ${code}` : null, h.city || null]
          .filter(Boolean)
          .join(' · ') || undefined,
        badge: h.status === 'ACTIVE' ? 'Active' : 'Inactive',
        badgeTone: h.status === 'ACTIVE' ? ('blue' as const) : ('neutral' as const),
        icon: <Building2 size={14} style={{ color: '#2563eb' }} />,
        extraSearchTerms: [code, h.address, h.phone, h.email, h.city].filter(Boolean) as string[],
      };
    });
  }, [hospitals]);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === hospitalId) || null,
    [hospitals, hospitalId]
  );

  const branchOptions = useMemo<SearchableSelectOption[]>(() => {
    const noneOption: SearchableSelectOption = {
      value: '',
      label: 'No specific branch (All Branches)',
      sublabel: 'Consulting across any campus or general facility',
      badge: 'General',
      badgeTone: 'neutral',
      icon: <Building2 size={14} style={{ color: '#94a3b8' }} />,
    };

    const bOpts: SearchableSelectOption[] = availableBranches.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.branch_code ? `Branch Code: ${b.branch_code}` : undefined,
      badge: b.status === 'ACTIVE' ? 'Active' : 'Inactive',
      badgeTone: b.status === 'ACTIVE' ? ('violet' as const) : ('neutral' as const),
      icon: <Building2 size={14} style={{ color: '#7c3aed' }} />,
      extraSearchTerms: [b.branch_code, b.address, b.phone].filter(Boolean) as string[],
    }));

    return [noneOption, ...bOpts];
  }, [availableBranches]);

  const userAccountOptions = useMemo<SearchableSelectOption[]>(() => {
    const unlinkedOption: SearchableSelectOption = {
      value: '',
      label: 'No account linked (External / Guest Doctor)',
      sublabel: 'Practicing without doctor portal web login credentials',
      badge: 'Unlinked',
      badgeTone: 'neutral',
      icon: <User size={14} style={{ color: '#94a3b8' }} />,
    };

    const uOpts: SearchableSelectOption[] = users.map((u) => ({
      value: u.id,
      label: u.username,
      sublabel: `Doctor Portal Login · Active Account`,
      badge: 'Doctor Login',
      badgeTone: 'green',
      icon: <ShieldCheck size={14} style={{ color: '#16a34a' }} />,
      extraSearchTerms: [u.username, u.role],
    }));

    return [unlinkedOption, ...uOpts];
  }, [users]);

  const selectedUserAccount = useMemo(
    () => users.find((u) => u.id === userAccountId) || null,
    [users, userAccountId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateDoctorName(name);
    const hospErr = validateDoctorHospital(hospitalId);
    const phoneErr = validateDoctorPhone(phone);
    const emailErr = validateDoctorEmail(email);
    const specErr = validateDoctorSpecialization(specialization);
    const qualErr = validateDoctorQualification(qualification);
    const regErr = validateDoctorRegistrationNumber(medicalRegistrationNumber);
    const addr1Err = validateDoctorAddressLine(addressLine1, 'Address line 1');
    const addr2Err = validateDoctorAddressLine(addressLine2, 'Address line 2');
    const cityErr = validateDoctorCity(city);
    const stateErr = validateDoctorState(state);
    const pinErr = validateDoctorPincode(pincode);
    const expErr = validateDoctorExperience(yearsOfExperience);
    const podErr = validateDoctorPodcastUrl(podcastUrl);
    const imgErr = validateDoctorImageUrl(profileImageUrl);

    const validationErrors = {
      name: nameErr,
      hospitalId: hospErr,
      phone: phoneErr,
      email: emailErr,
      specialization: specErr,
      qualification: qualErr,
      medicalRegistrationNumber: regErr,
      addressLine1: addr1Err,
      addressLine2: addr2Err,
      city: cityErr,
      state: stateErr,
      pincode: pinErr,
      yearsOfExperience: expErr,
      podcastUrl: podErr,
      profileImageUrl: imgErr,
    };

    setErrors(validationErrors);

    const firstMsg =
      nameErr ||
      hospErr ||
      phoneErr ||
      emailErr ||
      specErr ||
      qualErr ||
      regErr ||
      addr1Err ||
      addr2Err ||
      cityErr ||
      stateErr ||
      pinErr ||
      expErr ||
      podErr ||
      imgErr;

    if (firstMsg) {
      setError(firstMsg);
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
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          clinic_address:
            [addressLine1.trim(), addressLine2.trim(), city.trim(), state.trim(), pincode.trim()]
              .filter(Boolean)
              .join(', ') || null,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
          profile_image_url: normalizeUrl(profileImageUrl),
          podcast_url: normalizeUrl(podcastUrl),
          gender: gender || null,
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
          <div className="doctor-modal-title-wrap">
            <div
              className="doctor-modal-title"
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {doctor ? `Edit Doctor · ${doctor.name}` : 'Add New Doctor'}
            </div>
            <div className="doctor-modal-subtitle" style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
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
          .doctor-modal-grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
          }
          .doctor-modal-grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
          }
          .doctor-status-options-row {
            display: flex;
            gap: 10px;
          }
          .doctor-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            border-top: 1px solid #f1f5f9;
            background: #ffffff;
          }
          .doctor-modal-footer-hint {
            font-size: 12px;
            color: #64748b;
          }
          .doctor-modal-footer-actions {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          @media (max-width: 640px) {
            .doctor-create-drawer-modal {
              width: 100vw !important;
              max-width: 100vw !important;
            }
            .doctor-create-drawer-modal .ui-modal-head {
              padding: 14px 16px !important;
            }
            .doctor-create-drawer-modal .ui-modal-body {
              padding: 12px 14px !important;
              gap: 12px !important;
            }
            .doctor-section-card {
              padding: 14px 12px !important;
              gap: 12px !important;
            }
            .doctor-modal-grid-2,
            .doctor-modal-grid-3 {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
            .doctor-modal-footer {
              flex-direction: column-reverse !important;
              align-items: stretch !important;
              gap: 12px !important;
              padding: 12px 16px !important;
            }
            .doctor-modal-footer-hint {
              text-align: center !important;
              font-size: 11px !important;
            }
            .doctor-modal-footer-actions {
              width: 100% !important;
              display: flex !important;
              gap: 8px !important;
            }
            .doctor-modal-footer-actions > button {
              flex: 1 !important;
              justify-content: center !important;
              min-height: 38px !important;
            }
            .doctor-modal-title {
              font-size: 15px !important;
            }
            .doctor-modal-subtitle {
              font-size: 11px !important;
              line-height: 1.35 !important;
            }
          }
          @media (max-width: 480px) {
            .doctor-status-options-row {
              flex-direction: column !important;
              gap: 8px !important;
            }
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
                    color: errors.name ? '#ef4444' : '#94a3b8',
                  }}
                />
                <input
                  id="doctor-name"
                  className="ui-input"
                  style={{
                    paddingLeft: 34,
                    borderColor: errors.name ? '#ef4444' : undefined,
                    boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z\s.-]/g, '').slice(0, 100);
                    setName(sanitized);
                    setErrors((prev) => ({ ...prev, name: validateDoctorName(sanitized) }));
                  }}
                  required
                  placeholder="e.g. Dr. Jane Smith"
                />
              </div>
              {errors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div className="doctor-modal-grid-2">
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
                      color: errors.phone ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="doctor-phone"
                    className="ui-input"
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.phone ? '#ef4444' : undefined,
                      boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^0-9+]/g, '').slice(0, 16);
                      setPhone(sanitized);
                      setErrors((prev) => ({ ...prev, phone: validateDoctorPhone(sanitized) }));
                    }}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                {errors.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.phone}</span>
                  </div>
                )}
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
                      color: errors.email ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="doctor-email"
                    className="ui-input"
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.email ? '#ef4444' : undefined,
                      boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const sanitized = e.target.value.trim().slice(0, 150);
                      setEmail(sanitized);
                      setErrors((prev) => ({ ...prev, email: validateDoctorEmail(sanitized) }));
                    }}
                    placeholder="e.g. doctor@hospital.com"
                  />
                </div>
                {errors.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="doctor-gender"
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
                <SearchableSelect
                  id="doctor-gender"
                  aria-label="Gender"
                  value={gender ? gender.toUpperCase() : ''}
                  onChange={(val) => setGender(val)}
                  options={GENDER_OPTIONS}
                  searchable={false}
                  placeholder="Select gender…"
                />
              </div>
            </div>

            <ImageUploadField
              id="doctor-image-upload"
              label="Doctor Photo"
              value={profileImageUrl}
              onChange={(url) => {
                setProfileImageUrl(url);
                setErrors((prev) => ({
                  ...prev,
                  profileImageUrl: validateDoctorImageUrl(url),
                }));
              }}
              name={name || 'Doctor'}
              folder="doctor-profiles"
              defaultFallbackSrc={getDoctorDefaultAvatar({ name, gender })}
              error={errors.profileImageUrl}
              helperText="Upload doctor photo (JPG, PNG, WEBP up to 10MB)"
            />
          </div>

          {/* Section 2: Hospital & Practice Location */}
          <div className="doctor-section-card">
            <div className="doctor-section-header">
              <div className="doctor-section-badge">
                <Building2 size={13} />
              </div>
              <div className="doctor-section-tag">Hospital & Practice Assignment</div>
            </div>

            <div className="doctor-modal-grid-2">
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
                  <Building2 size={13} style={{ color: '#64748b' }} />
                  <span>Assigned Hospital</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  id="doctor-hospital"
                  aria-label="Assigned Hospital"
                  value={hospitalId}
                  onChange={(val) => {
                    setHospitalId(val);
                    setBranchId('');
                    setErrors((prev) => ({ ...prev, hospitalId: validateDoctorHospital(val) }));
                  }}
                  options={hospitalOptions}
                  placeholder="Select assigned hospital system..."
                  searchPlaceholder="Search hospital by name, code or location..."
                  required
                />
                {errors.hospitalId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.hospitalId}</span>
                  </div>
                )}
                {selectedHospital && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '7px 10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11.5,
                      color: '#475569',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#22c55e',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {selectedHospital.name}
                    </span>
                    {(selectedHospital.hospital_code || (selectedHospital as any).code) && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontFamily: 'monospace',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                      >
                        {selectedHospital.hospital_code || (selectedHospital as any).code}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="doctor-branch"
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
                  <span>Branch Location</span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    (Optional)
                  </span>
                </label>
                <SearchableSelect
                  id="doctor-branch"
                  aria-label="Branch Location"
                  value={branchId}
                  onChange={(val) => setBranchId(val)}
                  options={branchOptions}
                  disabled={!hospitalId}
                  placeholder={!hospitalId ? 'Select hospital first...' : 'Select branch location...'}
                  searchPlaceholder="Search branch by name or code..."
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <MapPin size={13} style={{ color: '#64748b' }} />
                <span>Clinic / Consultation Room Address</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="doctor-modal-grid-2">
                  <div>
                    <label
                      htmlFor="doctor-address-line-1"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
                      Address Line 1
                    </label>
                    <input
                      id="doctor-address-line-1"
                      className="ui-input"
                      style={{
                        borderColor: errors.addressLine1 ? '#ef4444' : undefined,
                        boxShadow: errors.addressLine1 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      value={addressLine1}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
                        setAddressLine1(sanitized);
                        setErrors((prev) => ({ ...prev, addressLine1: validateDoctorAddressLine(sanitized, 'Address line 1') }));
                      }}
                      placeholder="e.g. Block B, 3rd Floor, Suite 302"
                    />
                    {errors.addressLine1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.addressLine1}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="doctor-address-line-2"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
                      Address Line 2 (Optional)
                    </label>
                    <input
                      id="doctor-address-line-2"
                      className="ui-input"
                      style={{
                        borderColor: errors.addressLine2 ? '#ef4444' : undefined,
                        boxShadow: errors.addressLine2 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      value={addressLine2}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
                        setAddressLine2(sanitized);
                        setErrors((prev) => ({ ...prev, addressLine2: validateDoctorAddressLine(sanitized, 'Address line 2') }));
                      }}
                      placeholder="e.g. Near Apollo Hospital, Anna Nagar"
                    />
                    {errors.addressLine2 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.addressLine2}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="doctor-modal-grid-3">
                  <div>
                    <label
                      htmlFor="doctor-city"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
                      City / Town
                    </label>
                    <input
                      id="doctor-city"
                      className="ui-input"
                      style={{
                        borderColor: errors.city ? '#ef4444' : undefined,
                        boxShadow: errors.city ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      value={city}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
                        setCity(sanitized);
                        setErrors((prev) => ({ ...prev, city: validateDoctorCity(sanitized) }));
                      }}
                      placeholder="e.g. Chennai"
                    />
                    {errors.city && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.city}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="doctor-state"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
                      State / Province
                    </label>
                    <input
                      id="doctor-state"
                      className="ui-input"
                      style={{
                        borderColor: errors.state ? '#ef4444' : undefined,
                        boxShadow: errors.state ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      value={state}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
                        setState(sanitized);
                        setErrors((prev) => ({ ...prev, state: validateDoctorState(sanitized) }));
                      }}
                      placeholder="e.g. Tamil Nadu"
                    />
                    {errors.state && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.state}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="doctor-pincode"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'block',
                        marginBottom: 5,
                      }}
                    >
                      Pincode / Postal Code
                    </label>
                    <input
                      id="doctor-pincode"
                      className="ui-input"
                      style={{
                        borderColor: errors.pincode ? '#ef4444' : undefined,
                        boxShadow: errors.pincode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setPincode(sanitized);
                        setErrors((prev) => ({ ...prev, pincode: validateDoctorPincode(sanitized) }));
                      }}
                      placeholder="e.g. 600040"
                    />
                    {errors.pincode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.pincode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

            <div className="doctor-modal-grid-2">
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
                  style={{
                    borderColor: errors.specialization ? '#ef4444' : undefined,
                    boxShadow: errors.specialization ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  value={specialization}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z\s,()./&-]/g, '').slice(0, 100);
                    setSpecialization(sanitized);
                    setErrors((prev) => ({ ...prev, specialization: validateDoctorSpecialization(sanitized) }));
                  }}
                  placeholder="e.g. Cardiologist, Neurologist, General"
                />
                {errors.specialization && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.specialization}</span>
                  </div>
                )}
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
                  style={{
                    borderColor: errors.qualification ? '#ef4444' : undefined,
                    boxShadow: errors.qualification ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  value={qualification}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z\s.,/()-]/g, '').slice(0, 100);
                    setQualification(sanitized);
                    setErrors((prev) => ({ ...prev, qualification: validateDoctorQualification(sanitized) }));
                  }}
                  placeholder="e.g. MBBS, MD (General Medicine), FRCP"
                />
                {errors.qualification && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.qualification}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="doctor-modal-grid-2">
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
                  style={{
                    borderColor: errors.medicalRegistrationNumber ? '#ef4444' : undefined,
                    boxShadow: errors.medicalRegistrationNumber ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  value={medicalRegistrationNumber}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9/-]/g, '').slice(0, 50);
                    setMedicalRegistrationNumber(sanitized);
                    setErrors((prev) => ({
                      ...prev,
                      medicalRegistrationNumber: validateDoctorRegistrationNumber(sanitized),
                    }));
                  }}
                  placeholder="e.g. MCI-2018-98421"
                />
                {errors.medicalRegistrationNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.medicalRegistrationNumber}</span>
                  </div>
                )}
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
                  style={{
                    borderColor: errors.yearsOfExperience ? '#ef4444' : undefined,
                    boxShadow: errors.yearsOfExperience ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  inputMode="numeric"
                  value={yearsOfExperience}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                    setYearsOfExperience(sanitized);
                    setErrors((prev) => ({ ...prev, yearsOfExperience: validateDoctorExperience(sanitized) }));
                  }}
                  placeholder="e.g. 12"
                />
                {errors.yearsOfExperience && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.yearsOfExperience}</span>
                  </div>
                )}
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
                    color: errors.podcastUrl ? '#ef4444' : '#94a3b8',
                  }}
                />
                <input
                  id="doctor-podcast-url"
                  className="ui-input"
                  style={{
                    paddingLeft: 34,
                    borderColor: errors.podcastUrl ? '#ef4444' : undefined,
                    boxShadow: errors.podcastUrl ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  inputMode="url"
                  value={podcastUrl}
                  onChange={(e) => {
                    const sanitized = e.target.value.slice(0, 255);
                    setPodcastUrl(sanitized);
                    setErrors((prev) => ({ ...prev, podcastUrl: validateDoctorPodcastUrl(sanitized) }));
                  }}
                  onBlur={() => {
                    const trimmed = podcastUrl.trim();
                    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
                      setPodcastUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="e.g. https://youtube.com/@doctorchannel or video podcast URL"
                />
              </div>
              {errors.podcastUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.podcastUrl}</span>
                </div>
              )}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 5,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldCheck size={13} style={{ color: '#2563eb' }} />
                  <span>Linked User Account</span>
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                  Doctor portal web login credentials
                </span>
              </label>
              <SearchableSelect
                id="doctor-user-account"
                aria-label="Linked User Account"
                value={userAccountId}
                onChange={(val) => setUserAccountId(val)}
                options={userAccountOptions}
                placeholder="No account linked (External / Guest Doctor)"
                searchPlaceholder="Search doctor portal usernames..."
              />
              <div
                style={{
                  marginTop: 6,
                  padding: '9px 12px',
                  background: selectedUserAccount ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${selectedUserAccount ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 11.5,
                  color: selectedUserAccount ? '#166534' : '#64748b',
                }}
              >
                {selectedUserAccount ? (
                  <>
                    <ShieldCheck size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 650, color: '#14532d' }}>
                        Portal Login Linked: @{selectedUserAccount.username}
                      </div>
                      <div style={{ fontSize: 11, color: '#15803d', marginTop: 1 }}>
                        Doctor can authenticate with this username to access their consultation schedules and patient records.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <User size={15} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        No portal account linked
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        Doctor profile will appear on booking schedules, but the doctor will not have self-service doctor portal login.
                      </div>
                    </div>
                  </>
                )}
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
              <div className="doctor-status-options-row">
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

        <div className="ui-modal-foot doctor-modal-footer">
          <div className="doctor-modal-footer-hint">
            Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
          </div>
          <div className="doctor-modal-footer-actions">
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
