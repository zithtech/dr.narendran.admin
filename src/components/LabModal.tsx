import { Select } from 'antd';
import {
  Activity,
  AlertCircle,
  Check,
  Clock,
  FlaskConical,
  Loader2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

export interface Lab {
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
  services?: { id: string; name: string }[];
  status: 'ACTIVE' | 'INACTIVE';
  portal_account?: {
    id: string;
    username: string;
    email: string;
    status: string;
    must_change_password: boolean;
    last_login_at?: string | null;
    created_at: string;
  } | null | undefined;
  created_at: string;
  updated_at: string;
}

export function validateLabName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Laboratory name is required.';
  if (trimmed.length < 2) return 'Laboratory name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Laboratory name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&-]/i.test(trimmed)) {
    return 'Laboratory name contains invalid characters.';
  }
  return undefined;
}

export function validateLabPhone(val: string): string | undefined {
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

export function validateLabEmail(val: string): string | undefined {
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

export function validateLabAddressLine(val: string, label = 'Address line'): string | undefined {
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

export function validateLabCity(val: string): string | undefined {
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

export function validateLabState(val: string): string | undefined {
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

export function validateLabPincode(val: string): string | undefined {
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

interface LabModalProps {
  isOpen: boolean;
  onClose: () => void;
  lab: Lab | null;
  onSave: () => void;
}

export default function LabModal({ isOpen, onClose, lab, onSave }: LabModalProps) {
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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [availableServices, setAvailableServices] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (lab) {
      setName(lab.name || '');
      setAddressLine1(lab.address_line_1 || '');
      setAddressLine2(lab.address_line_2 || '');
      setCity(lab.city || '');
      setState(lab.state || '');
      setPincode(lab.pincode || '');
      setPhone(lab.phone || '');
      setEmail(lab.email || '');
      setMapLink(lab.map_link || '');
      setStartTime(lab.start_time || '');
      setEndTime(lab.end_time || '');
      setSelectedServices(lab.services ? lab.services.map((s) => s.id) : []);
      setStatus(lab.status || 'ACTIVE');
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
      setSelectedServices([]);
      setStatus('ACTIVE');
    }
    setError('');
    setTouched({});
    setErrors({});

    // Fetch available diagnostic services
    void (async () => {
      try {
        const res = await api.get('/lab-services');
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : [];
        setAvailableServices(data.filter((s: any) => s.status === 'ACTIVE'));
      } catch {
        // Silently catch in dev or if endpoint is unreachable
      }
    })();
  }, [lab, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s.,'&-]/g, '').slice(0, 150);
    setName(val);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateLabName(val) }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
    setPhone(val);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validateLabPhone(val) }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 150);
    setEmail(val);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateLabEmail(val) }));
    }
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine1(val);
    if (touched.addressLine1) {
      setErrors((prev) => ({ ...prev, addressLine1: validateLabAddressLine(val, 'Address line 1') }));
    }
  };

  const handleAddressLine2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine2(val);
    if (touched.addressLine2) {
      setErrors((prev) => ({ ...prev, addressLine2: validateLabAddressLine(val, 'Address line 2') }));
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setCity(val);
    if (touched.city) {
      setErrors((prev) => ({ ...prev, city: validateLabCity(val) }));
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setState(val);
    if (touched.state) {
      setErrors((prev) => ({ ...prev, state: validateLabState(val) }));
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setPincode(val);
    if (touched.pincode) {
      setErrors((prev) => ({ ...prev, pincode: validateLabPincode(val) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateLabName(name);
    const phoneErr = validateLabPhone(phone);
    const emailErr = validateLabEmail(email);
    const addr1Err = validateLabAddressLine(addressLine1, 'Address line 1');
    const addr2Err = validateLabAddressLine(addressLine2, 'Address line 2');
    const cityErr = validateLabCity(city);
    const stateErr = validateLabState(state);
    const pincodeErr = validateLabPincode(pincode);

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
    setErrors(newErrors);

    if (nameErr || phoneErr || emailErr || addr1Err || addr2Err || cityErr || stateErr || pincodeErr) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = lab ? `labs/${lab.id}` : `labs`;
      const method = lab ? 'PUT' : 'POST';

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
          services: selectedServices,
          status,
        },
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save laboratory details.'));
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
      className="lab-drawer-modal"
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
            <FlaskConical size={19} style={{ display: 'block', margin: 'auto' }} />
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
              {lab ? 'Edit Linked Lab' : 'Create Linked Lab'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {lab
                ? `Editing details for ${lab.name}${lab.city ? ` · ${lab.city}` : ''}`
                : 'Register a diagnostic laboratory or pathology center for patient referrals'}
            </div>
          </div>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .lab-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .lab-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .lab-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .lab-section-card {
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
          .lab-section-card:hover {
            border-color: #cbd5e1;
          }
          .lab-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .lab-section-badge {
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
          .lab-section-badge svg {
            display: block;
            margin: auto;
          }
          .lab-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .lab-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .lab-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .lab-drawer-modal .ui-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .lab-drawer-modal .ant-select-selector {
            border-radius: 8px !important;
            border-color: #e2e8f0 !important;
            min-height: 38px !important;
            padding: 3px 8px !important;
            transition: all 0.15s ease !important;
          }
          .lab-drawer-modal .ant-select-focused .ant-select-selector {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
          }
          .lab-drawer-modal .ant-select-selection-item {
            background: #eff6ff !important;
            border-color: #dbeafe !important;
            color: #1d4ed8 !important;
            border-radius: 6px !important;
            font-weight: 500 !important;
            font-size: 12px !important;
          }
          .lab-status-btn {
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
          .lab-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .lab-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .lab-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .lab-radio-circle {
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
          .lab-status-btn.is-active .lab-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .lab-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .lab-drawer-modal .ui-modal-foot {
            padding: 14px 24px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
          @media (max-width: 640px) {
            .lab-drawer-modal {
              width: 100vw !important;
              max-width: 100vw !important;
              border-radius: 0 !important;
            }
            .lab-drawer-modal .ui-modal-head {
              padding: 14px 16px !important;
            }
            .lab-drawer-modal .ui-modal-body {
              padding: 14px 12px !important;
              gap: 12px !important;
            }
            .lab-section-card {
              padding: 14px 12px !important;
              border-radius: 10px !important;
            }
          }
          @media (max-width: 480px) {
            .lab-drawer-modal .ui-modal-foot {
              flex-direction: column-reverse !important;
              padding: 12px 14px !important;
              gap: 8px !important;
            }
            .lab-drawer-modal .ui-modal-foot button {
              width: 100% !important;
              min-height: 40px !important;
              justify-content: center !important;
            }
            .lab-status-btn {
              flex: 1 1 100% !important;
              width: 100% !important;
            }
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Laboratory Information */}
          <div className="lab-section-card">
            <div className="lab-section-header">
              <div className="lab-section-badge">
                <FlaskConical size={14} />
              </div>
              <span className="lab-section-tag">Laboratory Information</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="lab-name-input"
                  className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <span>Laboratory / Diagnostic Center Name</span>
                  <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="lab-name-input"
                  className="ui-input w-full"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, name: true }));
                    setErrors((prev) => ({ ...prev, name: validateLabName(name) }));
                  }}
                  placeholder="e.g. Metropolis Healthcare, SRL Diagnostic Center"
                  style={{
                    borderColor: errors.name ? '#ef4444' : undefined,
                    boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="lab-phone-input" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Contact Phone Number
                  </label>
                  <input
                    id="lab-phone-input"
                    className="ui-input w-full"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, phone: true }));
                      setErrors((prev) => ({ ...prev, phone: validateLabPhone(phone) }));
                    }}
                    placeholder="e.g. +91 44 2829 0250"
                    style={{
                      borderColor: errors.phone ? '#ef4444' : undefined,
                      boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-email-input" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Email Address
                  </label>
                  <input
                    id="lab-email-input"
                    className="ui-input w-full"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, email: true }));
                      setErrors((prev) => ({ ...prev, email: validateLabEmail(email) }));
                    }}
                    placeholder="e.g. reports@metropolislab.com"
                    style={{
                      borderColor: errors.email ? '#ef4444' : undefined,
                      boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="lab-section-card">
            <div className="lab-section-header">
              <div className="lab-section-badge">
                <MapPin size={14} />
              </div>
              <span className="lab-section-tag">Location & Physical Address</span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="lab-address-line-1" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Address Line 1
                  </label>
                  <input
                    id="lab-address-line-1"
                    className="ui-input w-full"
                    type="text"
                    value={addressLine1}
                    onChange={handleAddressLine1Change}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, addressLine1: true }));
                      setErrors((prev) => ({ ...prev, addressLine1: validateLabAddressLine(addressLine1, 'Address line 1') }));
                    }}
                    placeholder="e.g. Plot No. 42, 1st Floor, Medical Plaza"
                    style={{
                      borderColor: errors.addressLine1 ? '#ef4444' : undefined,
                      boxShadow: errors.addressLine1 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.addressLine1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.addressLine1}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-address-line-2" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    id="lab-address-line-2"
                    className="ui-input w-full"
                    type="text"
                    value={addressLine2}
                    onChange={handleAddressLine2Change}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, addressLine2: true }));
                      setErrors((prev) => ({ ...prev, addressLine2: validateLabAddressLine(addressLine2, 'Address line 2') }));
                    }}
                    placeholder="e.g. Near Apollo Hospital, Anna Nagar"
                    style={{
                      borderColor: errors.addressLine2 ? '#ef4444' : undefined,
                      boxShadow: errors.addressLine2 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.addressLine2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.addressLine2}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label htmlFor="lab-city-input" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    City / Town
                  </label>
                  <input
                    id="lab-city-input"
                    className="ui-input w-full"
                    type="text"
                    value={city}
                    onChange={handleCityChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, city: true }));
                      setErrors((prev) => ({ ...prev, city: validateLabCity(city) }));
                    }}
                    placeholder="e.g. Chennai"
                    style={{
                      borderColor: errors.city ? '#ef4444' : undefined,
                      boxShadow: errors.city ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.city}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-state-input" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    State / Province
                  </label>
                  <input
                    id="lab-state-input"
                    className="ui-input w-full"
                    type="text"
                    value={state}
                    onChange={handleStateChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, state: true }));
                      setErrors((prev) => ({ ...prev, state: validateLabState(state) }));
                    }}
                    placeholder="e.g. Tamil Nadu"
                    style={{
                      borderColor: errors.state ? '#ef4444' : undefined,
                      boxShadow: errors.state ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.state && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.state}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-pincode-input" className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Pincode / Postal Code
                  </label>
                  <input
                    id="lab-pincode-input"
                    className="ui-input w-full"
                    type="text"
                    value={pincode}
                    onChange={handlePincodeChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, pincode: true }));
                      setErrors((prev) => ({ ...prev, pincode: validateLabPincode(pincode) }));
                    }}
                    placeholder="e.g. 600040"
                    style={{
                      borderColor: errors.pincode ? '#ef4444' : undefined,
                      boxShadow: errors.pincode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.pincode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.pincode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Google Maps Navigation Link
                </label>
                <input
                  className="ui-input w-full"
                  type="url"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Direct navigation URL embedded in patient digital referral slips
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Operating Hours */}
          <div className="lab-section-card">
            <div className="lab-section-header">
              <div className="lab-section-badge">
                <Clock size={14} />
              </div>
              <span className="lab-section-tag">Operating Hours & Timing</span>
              <span className="lab-section-subtitle hidden sm:inline">
                Sample collection and diagnostic shifts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Opening Time
                </label>
                <input
                  className="ui-input w-full"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Earliest sample drop-off or walk-in hour
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Closing Time
                </label>
                <input
                  className="ui-input w-full"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Center closure and last sample acceptance
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Diagnostic Services Provided */}
          <div className="lab-section-card">
            <div className="lab-section-header">
              <div className="lab-section-badge">
                <Activity size={14} />
              </div>
              <span className="lab-section-tag">Diagnostic Services Offered</span>
              <span className="lab-section-subtitle hidden sm:inline">
                Linked tests and pathology packages
              </span>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Available Services & Investigations
                </label>
                {selectedServices.length > 0 && (
                  <span className="text-[11px] font-semibold text-purple-700">
                    {selectedServices.length}{' '}
                    {selectedServices.length === 1 ? 'service selected' : 'services selected'}
                  </span>
                )}
              </div>
              <Select
                mode="multiple"
                placeholder="Search and attach diagnostic services (e.g. Complete Blood Count, Lipid Profile)..."
                className="w-full lab-services-select"
                value={selectedServices}
                onChange={(values) => setSelectedServices(values)}
                options={availableServices.map((service) => ({
                  label: service.name,
                  value: service.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Doctors will see this laboratory recommended when prescribing these specific
                diagnostic investigations
              </span>
            </div>
          </div>

          {/* Section 5: Operational Status & Visibility */}
          <div className="lab-section-card">
            <div className="lab-section-header">
              <div className="lab-section-badge">
                <ShieldCheck size={14} />
              </div>
              <span className="lab-section-tag">Referral Status & Visibility</span>
              <span className="lab-section-subtitle hidden sm:inline">
                Clinical recommendation availability
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                Laboratory Catalog Status <span className="font-bold text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`lab-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <div className="lab-radio-circle">
                    {status === 'ACTIVE' && <div className="lab-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Active for Referrals
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Live
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Recommended to patients and selectable during doctor appointment orders.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`lab-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <div className="lab-radio-circle">
                    {status === 'INACTIVE' && <div className="lab-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Inactive / Suspended
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Disabled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Temporarily paused. Hidden from doctor requisition dropdowns.
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
                <span>{lab ? 'Save Changes' : 'Create Linked Lab'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
