import {
  Activity,
  AlertCircle,
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
import React, { useEffect, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Modal, SwitchRow } from './ui/Modal';
import { Alert, Avatar } from './ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';
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
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
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

export function validatePatientName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Patient full name is required.';
  }
  if (trimmed.length < 2) {
    return 'Patient name must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Patient name cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in patient name.';
  }
  if (/[^a-zA-Z\s.-]/.test(val)) {
    return 'Patient name can only contain letters, spaces, hyphens, and periods.';
  }
  return undefined;
}

export function validatePatientPhone(val: string): string | undefined {
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

export function validatePatientEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address (e.g. patient@example.com).';
  }
  if (trimmed.length > 150) {
    return 'Email address cannot exceed 150 characters.';
  }
  return undefined;
}

export function validatePatientHospital(val: string): string | undefined {
  if (!val || !val.trim()) {
    return 'Please select an assigned hospital.';
  }
  return undefined;
}

export function validatePatientAddressLine(val: string, label = 'Address line'): string | undefined {
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

export function validatePatientCity(val: string): string | undefined {
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

export function validatePatientState(val: string): string | undefined {
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

export function validatePatientPincode(val: string): string | undefined {
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

export function validatePatientHeight(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 20 || num > 300) {
    return 'Height must be between 20 cm and 300 cm.';
  }
  return undefined;
}

export function validatePatientWeight(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 1 || num > 500) {
    return 'Weight must be between 1 kg and 500 kg.';
  }
  return undefined;
}

export function validatePatientEmergencyName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return 'Contact person name cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in contact person name.';
  }
  if (/[^a-zA-Z\s.-]/.test(val)) {
    return 'Contact person name can only contain letters, spaces, hyphens, and periods.';
  }
  return undefined;
}

export function validatePatientEmergencyPhone(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[a-zA-Z]/.test(val)) {
    return 'Letters are not allowed in emergency contact phone.';
  }
  if (/[^0-9+\s-]/.test(val)) {
    return 'Special characters are not allowed in emergency contact phone.';
  }
  const digits = val.replace(/\D/g, '');
  if (digits.length < 7) {
    return 'Emergency contact phone must be at least 7 digits.';
  }
  if (digits.length > 15) {
    return 'Emergency contact phone cannot exceed 15 digits.';
  }
  return undefined;
}

export function validatePatientEmergencyRelation(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 50) {
    return 'Relationship cannot exceed 50 characters.';
  }
  if (/[^a-zA-Z\s/-]/.test(val)) {
    return 'Relationship can only contain letters, spaces, and hyphens/slashes.';
  }
  return undefined;
}

export function validatePatientImageUrl(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) {
    return 'Profile image URL cannot exceed 500 characters.';
  }
  return undefined;
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

const GENDER_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'Not specified' },
  { value: 'MALE', label: 'Male', badge: 'Male', badgeTone: 'blue' },
  { value: 'FEMALE', label: 'Female', badge: 'Female', badgeTone: 'violet' },
  { value: 'OTHER', label: 'Other', badge: 'Other', badgeTone: 'neutral' },
];

const MARITAL_STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'Not specified' },
  { value: 'SINGLE', label: 'Single', badgeTone: 'neutral' },
  { value: 'MARRIED', label: 'Married', badgeTone: 'green' },
  { value: 'DIVORCED', label: 'Divorced', badgeTone: 'amber' },
  { value: 'WIDOWED', label: 'Widowed', badgeTone: 'neutral' },
];

const BLOOD_GROUP_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'Not specified' },
  { value: 'A+', label: 'A Positive (A+)', badge: 'A+', badgeTone: 'red' },
  { value: 'A-', label: 'A Negative (A-)', badge: 'A-', badgeTone: 'red' },
  { value: 'B+', label: 'B Positive (B+)', badge: 'B+', badgeTone: 'red' },
  { value: 'B-', label: 'B Negative (B-)', badge: 'B-', badgeTone: 'red' },
  { value: 'AB+', label: 'AB Positive (AB+)', badge: 'AB+', badgeTone: 'red' },
  { value: 'AB-', label: 'AB Negative (AB-)', badge: 'AB-', badgeTone: 'red' },
  { value: 'O+', label: 'O Positive (O+)', badge: 'O+', badgeTone: 'red' },
  { value: 'O-', label: 'O Negative (O-)', badge: 'O-', badgeTone: 'red' },
];

export default function PatientModal({ isOpen, onClose, patient, onSave }: PatientModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
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
      setAddressLine1(patient.address_line_1 || patient.address || '');
      setAddressLine2(patient.address_line_2 || '');
      setCity(patient.city || '');
      setState(patient.state || '');
      setPincode(patient.pincode || '');
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
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
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
    setErrors({});
  }, [patient, isOpen]);

  const availableBranches = branches.filter((b) => b.hospital_id === hospitalId);

  const hospitalOptions = useMemo<SearchableSelectOption[]>(() => {
    return hospitals.map((h) => ({
      value: h.id,
      label: h.name,
      badge: h.status === 'ACTIVE' ? 'Active' : 'Inactive',
      badgeTone: h.status === 'ACTIVE' ? 'green' : 'neutral',
      sublabel: h.hospital_code ? `Code: ${h.hospital_code}` : undefined,
    }));
  }, [hospitals]);

  const branchOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [
      { value: '', label: 'No specific branch' },
    ];
    availableBranches.forEach((b) => {
      opts.push({
        value: b.id,
        label: b.name,
        sublabel: b.address || undefined,
        badge: b.status === 'ACTIVE' ? 'Active' : undefined,
        badgeTone: 'blue',
      });
    });
    return opts;
  }, [availableBranches]);

  const userAccountOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [
      { value: '', label: 'No account linked (Walk-in / Offline)' },
    ];
    users.forEach((u) => {
      opts.push({
        value: u.id,
        label: `@${u.username}`,
        badge: u.role || 'PATIENT',
        badgeTone: 'blue',
        sublabel: u.status === 'ACTIVE' ? 'Active Account' : 'Inactive',
      });
    });
    return opts;
  }, [users]);
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

    const nameErr = validatePatientName(name);
    const hospErr = validatePatientHospital(hospitalId);
    const phoneErr = validatePatientPhone(phone);
    const emailErr = validatePatientEmail(email);
    const addr1Err = validatePatientAddressLine(addressLine1, 'Address line 1');
    const addr2Err = validatePatientAddressLine(addressLine2, 'Address line 2');
    const cityErr = validatePatientCity(city);
    const stateErr = validatePatientState(state);
    const pinErr = validatePatientPincode(pincode);
    const heightErr = validatePatientHeight(heightCm);
    const weightErr = validatePatientWeight(weightKg);
    const emNameErr = validatePatientEmergencyName(emergencyName);
    const emPhoneErr = validatePatientEmergencyPhone(emergencyPhone);
    const emRelErr = validatePatientEmergencyRelation(emergencyRelation);
    const imgErr = validatePatientImageUrl(profileImageUrl);

    const validationErrors = {
      name: nameErr,
      hospitalId: hospErr,
      phone: phoneErr,
      email: emailErr,
      addressLine1: addr1Err,
      addressLine2: addr2Err,
      city: cityErr,
      state: stateErr,
      pincode: pinErr,
      heightCm: heightErr,
      weightKg: weightErr,
      emergencyName: emNameErr,
      emergencyPhone: emPhoneErr,
      emergencyRelation: emRelErr,
      profileImageUrl: imgErr,
    };

    setErrors(validationErrors);

    const firstMsg =
      nameErr ||
      hospErr ||
      phoneErr ||
      emailErr ||
      addr1Err ||
      addr2Err ||
      cityErr ||
      stateErr ||
      pinErr ||
      heightErr ||
      weightErr ||
      emNameErr ||
      emPhoneErr ||
      emRelErr ||
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
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          address:
            [addressLine1.trim(), addressLine2.trim(), city.trim(), state.trim(), pincode.trim()]
              .filter(Boolean)
              .join(', ') || null,
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
                    color: errors.name ? '#ef4444' : '#94a3b8',
                  }}
                />
                <input
                  id="patient-name"
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
                    setErrors((prev) => ({ ...prev, name: validatePatientName(sanitized) }));
                  }}
                  required
                  placeholder="e.g. John Doe"
                />
              </div>
              {errors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.name}</span>
                </div>
              )}
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
                <SearchableSelect
                  id="patient-gender"
                  value={gender}
                  onChange={(val) => setGender(val)}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender..."
                  searchable={false}
                />
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
                <SearchableSelect
                  id="patient-marital"
                  value={maritalStatus}
                  onChange={(val) => setMaritalStatus(val)}
                  options={MARITAL_STATUS_OPTIONS}
                  placeholder="Select marital status..."
                  searchable={false}
                />
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
                <SearchableSelect
                  id="patient-blood"
                  value={bloodGroup}
                  onChange={(val) => setBloodGroup(val)}
                  options={BLOOD_GROUP_OPTIONS}
                  placeholder="Select blood group..."
                  searchPlaceholder="Search blood group..."
                  searchable={true}
                />
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
                  style={{
                    flex: 1,
                    borderColor: errors.profileImageUrl ? '#ef4444' : undefined,
                    boxShadow: errors.profileImageUrl ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="text"
                  inputMode="url"
                  value={profileImageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileImageUrl(val);
                    setErrors((prev) => ({ ...prev, profileImageUrl: validatePatientImageUrl(val) }));
                  }}
                  onBlur={() => {
                    const trimmed = profileImageUrl.trim();
                    if (trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
                      setProfileImageUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="https://… (Direct avatar or photo URL)"
                />
              </div>
              {errors.profileImageUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.profileImageUrl}</span>
                </div>
              )}
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
                <SearchableSelect
                  id="patient-hospital"
                  value={hospitalId}
                  onChange={(val) => {
                    setHospitalId(val);
                    setBranchId('');
                    setErrors((prev) => ({ ...prev, hospitalId: validatePatientHospital(val) }));
                  }}
                  options={hospitalOptions}
                  placeholder="Select hospital…"
                  searchPlaceholder="Search hospital by name or code..."
                  required
                  searchable={true}
                  className={errors.hospitalId ? 'has-error' : ''}
                />
                {errors.hospitalId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.hospitalId}</span>
                  </div>
                )}
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
                <SearchableSelect
                  id="patient-branch"
                  value={branchId}
                  onChange={(val) => setBranchId(val)}
                  disabled={hospitalId === ''}
                  options={branchOptions}
                  placeholder={hospitalId === '' ? 'Select hospital first…' : 'Select branch location…'}
                  searchPlaceholder="Search branch..."
                  searchable={true}
                />
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
                      color: errors.phone ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="patient-phone"
                    className="ui-input"
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.phone ? '#ef4444' : undefined,
                      boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
                      setPhone(sanitized);
                      setErrors((prev) => ({ ...prev, phone: validatePatientPhone(sanitized) }));
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
                      color: errors.email ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="patient-email"
                    className="ui-input"
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.email ? '#ef4444' : undefined,
                      boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 150);
                      setEmail(val);
                      setErrors((prev) => ({ ...prev, email: validatePatientEmail(val) }));
                    }}
                    placeholder="e.g. patient@example.com"
                  />
                </div>
                {errors.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.email}</span>
                  </div>
                )}
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
                <span>Residential Address</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      htmlFor="patient-address-line-1"
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
                      id="patient-address-line-1"
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
                        setErrors((prev) => ({
                          ...prev,
                          addressLine1: validatePatientAddressLine(sanitized, 'Address line 1'),
                        }));
                      }}
                      placeholder="e.g. Flat 4B, Green Meadows Apartment"
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
                      htmlFor="patient-address-line-2"
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
                      id="patient-address-line-2"
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
                        setErrors((prev) => ({
                          ...prev,
                          addressLine2: validatePatientAddressLine(sanitized, 'Address line 2'),
                        }));
                      }}
                      placeholder="e.g. 1st Cross Street, Gandhi Nagar"
                    />
                    {errors.addressLine2 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.addressLine2}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      htmlFor="patient-city"
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
                      id="patient-city"
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
                        setErrors((prev) => ({ ...prev, city: validatePatientCity(sanitized) }));
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
                      htmlFor="patient-state"
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
                      id="patient-state"
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
                        setErrors((prev) => ({ ...prev, state: validatePatientState(sanitized) }));
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
                      htmlFor="patient-pincode"
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
                      id="patient-pincode"
                      className="ui-input"
                      style={{
                        borderColor: errors.pincode ? '#ef4444' : undefined,
                        boxShadow: errors.pincode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      type="text"
                      value={pincode}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setPincode(sanitized);
                        setErrors((prev) => ({ ...prev, pincode: validatePatientPincode(sanitized) }));
                      }}
                      placeholder="e.g. 600020"
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
                  style={{
                    borderColor: errors.heightCm ? '#ef4444' : undefined,
                    boxShadow: errors.heightCm ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightCm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHeightCm(val);
                    setErrors((prev) => ({ ...prev, heightCm: validatePatientHeight(val) }));
                  }}
                  placeholder="e.g. 175"
                />
                {errors.heightCm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.heightCm}</span>
                  </div>
                )}
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
                  style={{
                    borderColor: errors.weightKg ? '#ef4444' : undefined,
                    boxShadow: errors.weightKg ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightKg}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWeightKg(val);
                    setErrors((prev) => ({ ...prev, weightKg: validatePatientWeight(val) }));
                  }}
                  placeholder="e.g. 70"
                />
                {errors.weightKg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.weightKg}</span>
                  </div>
                )}
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
                    style={{
                      borderColor: errors.emergencyName ? '#ef4444' : undefined,
                      boxShadow: errors.emergencyName ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="text"
                    value={emergencyName}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z\s.-]/g, '').slice(0, 100);
                      handlePrimaryEmergencyChange(sanitized, emergencyPhone, emergencyRelation);
                      setErrors((prev) => ({
                        ...prev,
                        emergencyName: validatePatientEmergencyName(sanitized),
                      }));
                    }}
                    placeholder="e.g. Jane Doe"
                  />
                  {errors.emergencyName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.emergencyName}</span>
                    </div>
                  )}
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
                    style={{
                      borderColor: errors.emergencyPhone ? '#ef4444' : undefined,
                      boxShadow: errors.emergencyPhone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
                      handlePrimaryEmergencyChange(emergencyName, sanitized, emergencyRelation);
                      setErrors((prev) => ({
                        ...prev,
                        emergencyPhone: validatePatientEmergencyPhone(sanitized),
                      }));
                    }}
                    placeholder="e.g. +91 98765 43210"
                  />
                  {errors.emergencyPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.emergencyPhone}</span>
                    </div>
                  )}
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
                    style={{
                      borderColor: errors.emergencyRelation ? '#ef4444' : undefined,
                      boxShadow: errors.emergencyRelation ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z\s/-]/g, '').slice(0, 50);
                      handlePrimaryEmergencyChange(emergencyName, emergencyPhone, sanitized);
                      setErrors((prev) => ({
                        ...prev,
                        emergencyRelation: validatePatientEmergencyRelation(sanitized),
                      }));
                    }}
                    placeholder="e.g. Spouse / Parent / Sibling"
                  />
                  {errors.emergencyRelation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.emergencyRelation}</span>
                    </div>
                  )}
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
              <SearchableSelect
                id="patient-user-account"
                value={userAccountId}
                onChange={(val) => setUserAccountId(val)}
                options={userAccountOptions}
                placeholder="No account linked (Walk-in / Offline)"
                searchPlaceholder="Search username..."
                searchable={true}
              />
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
