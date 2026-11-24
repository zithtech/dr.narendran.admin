import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { ImageUploadField } from './ui/ImageUploadField';
import { Modal, SwitchRow } from './ui/Modal';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

export interface Referral {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  occupation: string | null;
  profile_image_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

const GENDER_OPTIONS: SearchableSelectOption[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

export function validateReferralName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Full name cannot exceed 150 characters.';
  if (/[0-9]/.test(val)) return 'Numbers are not allowed in name.';
  if (/[^a-zA-Z\s._-]/.test(val)) return 'Special characters are not allowed in name.';
  return undefined;
}

export function validateReferralPhone(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Phone number is required.';
  if (/[a-zA-Z]/.test(val)) return 'Letters are not allowed in phone number.';
  if (/[^0-9+\s-]/.test(val)) return 'Special characters are not allowed in phone number.';
  const digits = val.replace(/\D/g, '');
  if (digits.length < 7) return 'Phone number must be at least 7 digits.';
  if (digits.length > 15) return 'Phone number cannot exceed 15 digits.';
  return undefined;
}

export function validateReferralEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  if (trimmed.length > 150) return 'Email address cannot exceed 150 characters.';
  return undefined;
}

export function validateReferralOccupation(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 150) return 'Occupation cannot exceed 150 characters.';
  return undefined;
}

export function validateReferralAddressLine(val: string, label = 'Address line'): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 255) return `${label} cannot exceed 255 characters.`;
  if (/[^a-zA-Z0-9\s,./#&-]/.test(val)) return `${label} contains invalid characters.`;
  return undefined;
}

export function validateReferralCity(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'City cannot exceed 100 characters.';
  if (/[0-9]/.test(val)) return 'Numbers are not allowed in city.';
  if (/[^a-zA-Z\s-]/.test(val)) return 'City can only contain letters, spaces, and hyphens.';
  return undefined;
}

export function validateReferralState(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'State cannot exceed 100 characters.';
  if (/[0-9]/.test(val)) return 'Numbers are not allowed in state.';
  if (/[^a-zA-Z\s-]/.test(val)) return 'State can only contain letters, spaces, and hyphens.';
  return undefined;
}

export function validateReferralPincode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[^0-9]/.test(trimmed)) return 'Pincode must contain only numbers.';
  if (trimmed.length < 5 || trimmed.length > 10) return 'Pincode must be between 5 and 10 digits.';
  return undefined;
}

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: Referral | null;
  onSave: () => void;
}

export default function ReferralModal({
  isOpen,
  onClose,
  referral,
  onSave,
}: ReferralModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (referral) {
      setName(referral.name || '');
      setPhone(referral.phone || '');
      setEmail(referral.email || '');
      setGender(referral.gender || '');
      setOccupation(referral.occupation || '');
      setProfileImageUrl(referral.profile_image_url || '');
      setAddressLine1(referral.address_line_1 || '');
      setAddressLine2(referral.address_line_2 || '');
      setCity(referral.city || '');
      setState(referral.state || '');
      setPincode(referral.pincode || '');
      setStatus(referral.status || 'ACTIVE');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setGender('');
      setOccupation('');
      setProfileImageUrl('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
      setStatus('ACTIVE');
    }
    setError('');
    setErrors({});
    setTouched({});
  }, [referral, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s._-]/g, '').slice(0, 150);
    setName(sanitized);
    setErrors((prev) => ({ ...prev, name: validateReferralName(sanitized) }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9+\s-]/g, '').slice(0, 16);
    setPhone(sanitized);
    setErrors((prev) => ({ ...prev, phone: validateReferralPhone(sanitized) }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 150);
    setEmail(val);
    setErrors((prev) => ({ ...prev, email: validateReferralEmail(val) }));
  };

  const handleOccupationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 150);
    setOccupation(val);
    setErrors((prev) => ({ ...prev, occupation: validateReferralOccupation(val) }));
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine1(sanitized);
    setErrors((prev) => ({ ...prev, addressLine1: validateReferralAddressLine(sanitized, 'Address Line 1') }));
  };

  const handleAddressLine2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine2(sanitized);
    setErrors((prev) => ({ ...prev, addressLine2: validateReferralAddressLine(sanitized, 'Address Line 2') }));
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setCity(sanitized);
    setErrors((prev) => ({ ...prev, city: validateReferralCity(sanitized) }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setState(sanitized);
    setErrors((prev) => ({ ...prev, state: validateReferralState(sanitized) }));
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setPincode(digitsOnly);
    setErrors((prev) => ({ ...prev, pincode: validateReferralPincode(digitsOnly) }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string | undefined> = {
      name: validateReferralName(name),
      phone: validateReferralPhone(phone),
      email: validateReferralEmail(email),
      occupation: validateReferralOccupation(occupation),
      addressLine1: validateReferralAddressLine(addressLine1, 'Address Line 1'),
      addressLine2: validateReferralAddressLine(addressLine2, 'Address Line 2'),
      city: validateReferralCity(city),
      state: validateReferralState(state),
      pincode: validateReferralPincode(pincode),
    };
    setErrors(newErrors);
    setTouched({
      name: true,
      phone: true,
      email: true,
      occupation: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
    });
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAll()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        gender: gender || null,
        occupation: occupation.trim() || null,
        profile_image_url: profileImageUrl.trim() || null,
        address_line_1: addressLine1.trim() || null,
        address_line_2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        status,
      };

      if (referral) {
        await api.put(`referrals/${referral.id}`, payload);
      } else {
        await api.post('referrals', payload);
      }
      onSave();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to save referral'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      variant="drawer"
      className="referral-drawer-modal"
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
            {referral ? <UserCheck size={18} /> : <UserPlus size={18} />}
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 750,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {referral ? `Edit Referral · ${referral.name}` : 'Register New Referral'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {referral
                ? 'Update referral partner demographic records, credentials, and location.'
                : 'Enter referral partner details, contact info, occupation, and verified address.'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        noValidate
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .referral-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .referral-drawer-modal .ui-modal-head {
            padding: 16px 24px;
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .referral-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 16px;
            overflow-y: auto;
          }
          .referral-section-card {
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
          .referral-section-card:hover {
            border-color: #cbd5e1;
          }
          .referral-section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
          }
          .referral-section-badge {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #eff6ff;
            color: #2563eb;
            display: grid;
            place-items: center;
            flex-shrink: 0;
            border: 1px solid #bfdbfe;
          }
          .referral-drawer-modal .ui-input,
          .referral-drawer-modal .ui-select,
          .referral-drawer-modal .ui-searchable-trigger,
          .referral-drawer-modal input[type="text"],
          .referral-drawer-modal input[type="tel"],
          .referral-drawer-modal input[type="email"] {
            height: 38px !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
          }
          .referral-drawer-modal .ui-searchable-trigger {
            display: flex !important;
            align-items: center !important;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="referral-section-card">
            <div className="referral-section-header">
              <div className="referral-section-badge">
                <User size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Basic Information
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Referral contact name, communication details, gender, and occupation
                </div>
              </div>
            </div>

            {/* Row 1: Full Name */}
            <div>
              <label
                htmlFor="referral-name"
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
                <input
                  id="referral-name"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  required
                />
              </div>
              {touched.name && errors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* Row 2: Phone & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="referral-phone"
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
                  <span>Phone Number</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={15}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    id="referral-phone"
                    type="tel"
                    className="ui-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    required
                  />
                </div>
                {touched.phone && errors.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="referral-email"
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
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    id="referral-email"
                    type="email"
                    className="ui-input"
                    style={{ paddingLeft: 38 }}
                    placeholder="e.g. rajesh@example.com"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  />
                </div>
                {touched.email && errors.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Gender & Occupation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 12 }}>
              <div>
                <label
                  htmlFor="referral-gender"
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
                  id="referral-gender"
                  value={gender}
                  onChange={(val) => setGender(val)}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender..."
                  searchable={false}
                />
              </div>

              <div>
                <label
                  htmlFor="referral-occupation"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Occupation / Specialty
                </label>
                <input
                  id="referral-occupation"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. General Physician, Cardiologist"
                  value={occupation}
                  onChange={handleOccupationChange}
                  onBlur={() => setTouched((p) => ({ ...p, occupation: true }))}
                />
                {touched.occupation && errors.occupation && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.occupation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Image */}
            <div style={{ paddingTop: 4 }}>
              <ImageUploadField
                id="referral-profile-img"
                label="Profile Photo"
                value={profileImageUrl}
                onChange={(url) => setProfileImageUrl(url)}
                name={name || 'Referral'}
                folder="referral-profiles"
                helperText="Upload referral photo (JPG, PNG, WEBP up to 10MB)"
              />
            </div>
          </div>

          {/* Section 2: Address Details */}
          <div className="referral-section-card">
            <div className="referral-section-header">
              <div className="referral-section-badge">
                <MapPin size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Address Details
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Street address, locality, city, state and postal code
                </div>
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label
                htmlFor="referral-address-line-1"
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
                id="referral-address-line-1"
                type="text"
                className="ui-input"
                placeholder="e.g. Clinic 4B, Metro Healthcare Complex"
                value={addressLine1}
                onChange={handleAddressLine1Change}
                onBlur={() => setTouched((p) => ({ ...p, addressLine1: true }))}
              />
              {touched.addressLine1 && errors.addressLine1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.addressLine1}</span>
                </div>
              )}
            </div>

            {/* Address Line 2 */}
            <div>
              <label
                htmlFor="referral-address-line-2"
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
                id="referral-address-line-2"
                type="text"
                className="ui-input"
                placeholder="e.g. Near City Hospital, MG Road"
                value={addressLine2}
                onChange={handleAddressLine2Change}
                onBlur={() => setTouched((p) => ({ ...p, addressLine2: true }))}
              />
              {touched.addressLine2 && errors.addressLine2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errors.addressLine2}</span>
                </div>
              )}
            </div>

            {/* City, State, Pincode in 3 Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <div>
                <label
                  htmlFor="referral-city"
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
                  id="referral-city"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={handleCityChange}
                  onBlur={() => setTouched((p) => ({ ...p, city: true }))}
                />
                {touched.city && errors.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.city}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="referral-state"
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
                  id="referral-state"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Tamil Nadu"
                  value={state}
                  onChange={handleStateChange}
                  onBlur={() => setTouched((p) => ({ ...p, state: true }))}
                />
                {touched.state && errors.state && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.state}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="referral-pincode"
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
                  id="referral-pincode"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. 600001"
                  value={pincode}
                  onChange={handlePincodeChange}
                  onBlur={() => setTouched((p) => ({ ...p, pincode: true }))}
                />
                {touched.pincode && errors.pincode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.pincode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Status */}
          <div className="referral-section-card">
            <div className="referral-section-header">
              <div className="referral-section-badge">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Account &amp; Status
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Enable or disable this referral partner in the hospital referral system
                </div>
              </div>
            </div>

            <SwitchRow
              checked={status === 'ACTIVE'}
              onChange={(checked) => setStatus(checked ? 'ACTIVE' : 'INACTIVE')}
              title="Active in Referral Network"
              description="Allow doctors and staff to route and credit patient referrals to this provider."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="ui-modal-foot" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', background: '#ffffff' }}>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : referral ? (
              <>
                <Check size={14} />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Register Referral</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
