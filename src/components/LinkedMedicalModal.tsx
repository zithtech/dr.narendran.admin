import {
  AlertCircle,
  Building2,
  Check,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

export interface LinkedMedical {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  map_link: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export function validateMedicalName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Pharmacy or medical store name is required.';
  if (trimmed.length < 2) return 'Pharmacy name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Pharmacy name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&-]/i.test(trimmed)) {
    return 'Pharmacy name contains invalid characters.';
  }
  return undefined;
}

export function validateMedicalPhone(val: string): string | undefined {
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

export function validateMedicalEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  if (trimmed.length > 150) {
    return 'Email address cannot exceed 150 characters.';
  }
  return undefined;
}

export function validateMedicalAddressLine(val: string, label = 'Address line'): string | undefined {
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

export function validateMedicalCity(val: string): string | undefined {
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

export function validateMedicalState(val: string): string | undefined {
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

export function validateMedicalPincode(val: string): string | undefined {
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

interface LinkedMedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  medical: LinkedMedical | null;
  onSave: () => void;
}

export default function LinkedMedicalModal({
  isOpen,
  onClose,
  medical,
  onSave,
}: LinkedMedicalModalProps) {
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (medical) {
      setName(medical.name || '');
      setAddressLine1(medical.address_line_1 || '');
      setAddressLine2(medical.address_line_2 || '');
      setCity(medical.city || '');
      setState(medical.state || '');
      setPincode(medical.pincode || '');
      setPhone(medical.phone || '');
      setEmail(medical.email || '');
      setMapLink(medical.map_link || '');
      setStartTime(medical.start_time || '');
      setEndTime(medical.end_time || '');
      setStatus(medical.status || 'ACTIVE');
    } else {
      setName('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
      setPhone('');
      setEmail('');
      setMapLink('');
      setStartTime('');
      setEndTime('');
      setStatus('ACTIVE');
    }
    setError('');
    setErrors({});
    setTouched({});
  }, [medical, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,'&-]/g, '').slice(0, 150);
    setName(sanitized);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateMedicalName(sanitized) }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9+\s-]/g, '').slice(0, 16);
    setPhone(sanitized);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validateMedicalPhone(sanitized) }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.slice(0, 150);
    setEmail(raw);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateMedicalEmail(raw) }));
    }
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine1(sanitized);
    if (touched.addressLine1) {
      setErrors((prev) => ({
        ...prev,
        addressLine1: validateMedicalAddressLine(sanitized, 'Address line 1'),
      }));
    }
  };

  const handleAddressLine2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine2(sanitized);
    if (touched.addressLine2) {
      setErrors((prev) => ({
        ...prev,
        addressLine2: validateMedicalAddressLine(sanitized, 'Address line 2'),
      }));
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setCity(sanitized);
    if (touched.city) {
      setErrors((prev) => ({ ...prev, city: validateMedicalCity(sanitized) }));
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setState(sanitized);
    if (touched.state) {
      setErrors((prev) => ({ ...prev, state: validateMedicalState(sanitized) }));
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, '').slice(0, 10);
    setPincode(sanitized);
    if (touched.pincode) {
      setErrors((prev) => ({ ...prev, pincode: validateMedicalPincode(sanitized) }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'name') err = validateMedicalName(name);
    else if (field === 'phone') err = validateMedicalPhone(phone);
    else if (field === 'email') err = validateMedicalEmail(email);
    else if (field === 'addressLine1')
      err = validateMedicalAddressLine(addressLine1, 'Address line 1');
    else if (field === 'addressLine2')
      err = validateMedicalAddressLine(addressLine2, 'Address line 2');
    else if (field === 'city') err = validateMedicalCity(city);
    else if (field === 'state') err = validateMedicalState(state);
    else if (field === 'pincode') err = validateMedicalPincode(pincode);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateMedicalName(name);
    const phoneErr = validateMedicalPhone(phone);
    const emailErr = validateMedicalEmail(email);
    const addr1Err = validateMedicalAddressLine(addressLine1, 'Address line 1');
    const addr2Err = validateMedicalAddressLine(addressLine2, 'Address line 2');
    const cityErr = validateMedicalCity(city);
    const stateErr = validateMedicalState(state);
    const pincodeErr = validateMedicalPincode(pincode);

    const newErrors: Record<string, string | undefined> = {
      name: nameErr,
      phone: phoneErr,
      email: emailErr,
      addressLine1: addr1Err,
      addressLine2: addr2Err,
      city: cityErr,
      state: stateErr,
      pincode: pincodeErr,
    };

    setErrors(newErrors);
    setTouched({
      name: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
    });

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = medical ? `linked-medicals/${medical.id}` : `linked-medicals`;
      const method = medical ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name: name.trim(),
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          map_link: mapLink.trim() || null,
          start_time: startTime || null,
          end_time: endTime || null,
          status,
        },
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save medical store details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="medical-drawer-modal"
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            <Stethoscope size={19} style={{ display: 'block', margin: 'auto' }} />
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
              {medical ? 'Edit Linked Medical' : 'Create Linked Medical'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {medical
                ? `Editing partner pharmacy record for ${medical.name}${medical.city ? ` · ${medical.city}` : ''}`
                : 'Register a partner pharmacy or medical shop for patient prescription fulfillment'}
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
          .medical-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .medical-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .medical-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .medical-section-card {
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
          .medical-section-card:hover {
            border-color: #cbd5e1;
          }
          .medical-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .medical-section-badge {
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
          .medical-section-badge svg {
            display: block;
            margin: auto;
          }
          .medical-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .medical-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .medical-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .medical-drawer-modal .ui-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .medical-status-btn {
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
          .medical-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .medical-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .medical-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .medical-radio-circle {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.15s ease;
          }
          .medical-status-btn.is-active .medical-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .medical-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .medical-drawer-modal .ui-modal-foot {
            padding: 14px 24px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Pharmacy / Medical Store Information */}
          <div className="medical-section-card">
            <div className="medical-section-header">
              <div className="medical-section-badge">
                <Building2 size={14} />
              </div>
              <span className="medical-section-tag">Pharmacy & Contact Details</span>
              <span className="medical-section-subtitle hidden sm:inline">
                Trade name and primary contact lines
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="medical-name-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Pharmacy / Medical Store Name <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="medical-name-input"
                  className="ui-input w-full"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Apollo Pharmacy, MedPlus Chemist, LifeCare Pharmacy"
                  style={{
                    borderColor: errors.name ? '#ef4444' : undefined,
                    boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.name && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="medical-phone-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Phone Number
                  </label>
                  <input
                    id="medical-phone-input"
                    className="ui-input w-full"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => handleBlur('phone')}
                    placeholder="e.g. +91 44 2829 0250"
                    style={{
                      borderColor: errors.phone ? '#ef4444' : undefined,
                      boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.phone && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.phone}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medical-email-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Email Address
                  </label>
                  <input
                    id="medical-email-input"
                    className="ui-input w-full"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => handleBlur('email')}
                    placeholder="e.g. orders@apollopharmacy.com"
                    style={{
                      borderColor: errors.email ? '#ef4444' : undefined,
                      boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.email && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Physical Address */}
          <div className="medical-section-card">
            <div className="medical-section-header">
              <div className="medical-section-badge">
                <MapPin size={14} />
              </div>
              <span className="medical-section-tag">Location & Physical Address</span>
              <span className="medical-section-subtitle hidden sm:inline">
                Storefront location for patient walk-in pickup
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="medical-address1-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Address Line 1
                  </label>
                  <input
                    id="medical-address1-input"
                    className="ui-input w-full"
                    type="text"
                    value={addressLine1}
                    onChange={handleAddressLine1Change}
                    onBlur={() => handleBlur('addressLine1')}
                    placeholder="e.g. Shop No. 12, Ground Floor, Hospital Road"
                    style={{
                      borderColor: errors.addressLine1 ? '#ef4444' : undefined,
                      boxShadow: errors.addressLine1
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.addressLine1 && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.addressLine1}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medical-address2-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Address Line 2 (Optional)
                  </label>
                  <input
                    id="medical-address2-input"
                    className="ui-input w-full"
                    type="text"
                    value={addressLine2}
                    onChange={handleAddressLine2Change}
                    onBlur={() => handleBlur('addressLine2')}
                    placeholder="e.g. Opposite Metro Station, Greams Road"
                    style={{
                      borderColor: errors.addressLine2 ? '#ef4444' : undefined,
                      boxShadow: errors.addressLine2
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.addressLine2 && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.addressLine2}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="medical-city-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    City / Town
                  </label>
                  <input
                    id="medical-city-input"
                    className="ui-input w-full"
                    type="text"
                    value={city}
                    onChange={handleCityChange}
                    onBlur={() => handleBlur('city')}
                    placeholder="e.g. Chennai"
                    style={{
                      borderColor: errors.city ? '#ef4444' : undefined,
                      boxShadow: errors.city ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.city && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.city}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medical-state-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    State / Province
                  </label>
                  <input
                    id="medical-state-input"
                    className="ui-input w-full"
                    type="text"
                    value={state}
                    onChange={handleStateChange}
                    onBlur={() => handleBlur('state')}
                    placeholder="e.g. Tamil Nadu"
                    style={{
                      borderColor: errors.state ? '#ef4444' : undefined,
                      boxShadow: errors.state ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.state && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.state}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medical-pincode-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Pincode / Postal Code
                  </label>
                  <input
                    id="medical-pincode-input"
                    className="ui-input w-full"
                    type="text"
                    value={pincode}
                    onChange={handlePincodeChange}
                    onBlur={() => handleBlur('pincode')}
                    placeholder="e.g. 600006"
                    style={{
                      borderColor: errors.pincode ? '#ef4444' : undefined,
                      boxShadow: errors.pincode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.pincode && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.pincode}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="medical-map-link-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Google Maps Navigation Link
                </label>
                <input
                  id="medical-map-link-input"
                  className="ui-input w-full"
                  type="url"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Operating Hours */}
          <div className="medical-section-card">
            <div className="medical-section-header">
              <div className="medical-section-badge">
                <Clock size={14} />
              </div>
              <span className="medical-section-tag">Operating Hours & Schedule</span>
              <span className="medical-section-subtitle hidden sm:inline">
                Daily medicine dispensing shifts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="medical-start-time-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Opening Time
                </label>
                <input
                  id="medical-start-time-input"
                  className="ui-input w-full"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="medical-end-time-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Closing Time
                </label>
                <input
                  id="medical-end-time-input"
                  className="ui-input w-full"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Partner Status & Fulfillment Visibility */}
          <div className="medical-section-card">
            <div className="medical-section-header">
              <div className="medical-section-badge">
                <ShieldCheck size={14} />
              </div>
              <span className="medical-section-tag">Referral Status & Visibility</span>
              <span className="medical-section-subtitle hidden sm:inline">
                Prescription referral availability
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                Partner Catalog Status <span className="font-bold text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`medical-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <div className="medical-radio-circle">
                    {status === 'ACTIVE' && <div className="medical-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Active for Referrals
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Live
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Recommended to patients and selectable during doctor appointment fulfillment.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`medical-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <div className="medical-radio-circle">
                    {status === 'INACTIVE' && <div className="medical-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Inactive / Suspended
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Disabled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Temporarily paused. Hidden from doctor prescription delivery options.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div className="ui-modal-foot">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{medical ? 'Save Changes' : 'Create Linked Medical'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
