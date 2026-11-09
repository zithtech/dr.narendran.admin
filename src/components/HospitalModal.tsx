import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

export interface Hospital {
  id: string;
  name: string;
  hospital_code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at?: string;
}

interface HospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  hospital: Hospital | null;
}

export default function HospitalModal({ isOpen, onClose, onSave, hospital }: HospitalModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<{
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }>({});

  const nameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const addressInputId = useId();

  useEffect(() => {
    if (isOpen) {
      if (hospital) {
        setName(hospital.name || '');
        setAddress(hospital.address || '');
        setPhone(hospital.phone || '');
        setEmail(hospital.email || '');
        setStatus(hospital.status || 'ACTIVE');
      } else {
        setName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setStatus('ACTIVE');
      }
      setError('');
      setTouched({});
      setErrors({});
    }
  }, [isOpen, hospital]);

  // Validation functions
  const validateName = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Hospital name is required.';
    if (trimmed.length < 2) return 'Hospital name must be at least 2 characters.';
    return null;
  };

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return null; // optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. info@hospital.org).';
    return null;
  };

  const validatePhone = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return null; // optional
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7) return 'Please enter a valid contact number (at least 7 digits).';
    return null;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateName(val) }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, spaces, plus, minus, parenthesis
    const val = e.target.value.replace(/[^0-9+\s()-]/g, '');
    setPhone(val);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(val) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);

    setTouched({ name: true, email: true, phone: true });
    setErrors({ name: nameErr, email: emailErr, phone: phoneErr });

    if (nameErr || emailErr || phoneErr) {
      return;
    }

    setLoading(true);
    setError('');

    const url = hospital ? `hospitals/${hospital.id}` : 'hospitals';
    const method = hospital ? 'PUT' : 'POST';

    try {
      await api({
        method,
        url,
        data: {
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save hospital.'));
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
      className="hospital-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              color: '#7c3aed',
              border: '1px solid #c4b5fd',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.16)',
            }}
          >
            <Building2 size={19} />
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
              {hospital ? 'Edit Hospital' : 'Create New Hospital'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {hospital
                ? `Hospital Code: ${hospital.hospital_code} · Update profile & facilities`
                : 'Register a healthcare facility or hospital system on the platform'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .hospital-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .hospital-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .hospital-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .hosp-section-card {
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
          .hosp-section-card:hover {
            border-color: #cbd5e1;
          }
          .hosp-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .hosp-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #f5f3ff;
            color: #7c3aed;
            border: 1px solid #ede9fe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .hosp-section-badge svg {
            display: block;
            margin: auto;
          }
          .hosp-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .hospital-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .hospital-drawer-modal .ui-input:focus {
            border-color: #7c3aed !important;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
            outline: none;
          }
          .hosp-status-btn {
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
          .hosp-status-btn.is-active {
            border: 1.5px solid #7c3aed !important;
            background: #f5f3ff !important;
            box-shadow: 0 2px 6px rgba(124, 58, 237, 0.12);
          }
          .hosp-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .hosp-status-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .hosp-submit-btn {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.28) !important;
            border: none !important;
            color: #ffffff !important;
          }
          .hosp-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%) !important;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.36) !important;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Section 1: Basic Information & Profile */}
          <div className="hosp-section-card">
            <div className="hosp-section-header">
              <div className="hosp-section-badge">
                <Building2 size={13} />
              </div>
              <div className="hosp-section-tag">
                Basic Information & Profile
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Hospital Name */}
              <div>
                <label
                  htmlFor={nameInputId}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Hospital Name</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    Official Facility Name
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2
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
                    id={nameInputId}
                    type="text"
                    className="ui-input"
                    placeholder="e.g. Apollo Multi-Specialty Hospital"
                    value={name}
                    onChange={handleNameChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, name: true }));
                      setErrors((prev) => ({ ...prev, name: validateName(name) }));
                    }}
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.name ? '#ef4444' : undefined,
                      boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    required
                  />
                </div>
                {errors.name && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 4,
                      color: '#dc2626',
                      fontSize: 11,
                    }}
                  >
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Hospital Code Badge/Info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569' }}>
                  <Info size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
                  <span>Hospital System Code:</span>
                </div>
                <div>
                  {hospital ? (
                    <Badge tone="violet">{hospital.hospital_code}</Badge>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6d28d9',
                        background: '#f5f3ff',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #ddd6fe',
                      }}
                    >
                      Auto-generated (e.g. HSP-001)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="hosp-section-card">
            <div className="hosp-section-header">
              <div className="hosp-section-badge">
                <Phone size={13} />
              </div>
              <div className="hosp-section-tag">
                Contact Details & Helpline
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {/* Phone */}
              <div>
                <label
                  htmlFor={phoneInputId}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Phone / Helpline</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    Optional
                  </span>
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
                    id={phoneInputId}
                    type="tel"
                    className="ui-input"
                    placeholder="e.g. +91 44 2829 0200"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, phone: true }));
                      setErrors((prev) => ({ ...prev, phone: validatePhone(phone) }));
                    }}
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.phone ? '#ef4444' : undefined,
                      boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                </div>
                {errors.phone && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 4,
                      color: '#dc2626',
                      fontSize: 11,
                    }}
                  >
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor={emailInputId}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Email Address</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    Optional
                  </span>
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
                    id={emailInputId}
                    type="email"
                    className="ui-input"
                    placeholder="e.g. contact@apollohospital.org"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, email: true }));
                      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
                    }}
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.email ? '#ef4444' : undefined,
                      boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                </div>
                {errors.email && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 4,
                      color: '#dc2626',
                      fontSize: 11,
                    }}
                  >
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Physical Location & Address */}
          <div className="hosp-section-card">
            <div className="hosp-section-header">
              <div className="hosp-section-badge">
                <MapPin size={13} />
              </div>
              <div className="hosp-section-tag">
                Physical Facility Location
              </div>
            </div>

            <div>
              <label
                htmlFor={addressInputId}
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
                  <MapPin size={13} style={{ color: '#94a3b8' }} />
                  <span>Facility / Street Address</span>
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                  Street, area, city, pincode
                </span>
              </label>
              <textarea
                id={addressInputId}
                className="ui-input"
                rows={2}
                placeholder="e.g. No. 21 Greams Lane, Thousand Lights West, Chennai, Tamil Nadu 600006"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  minHeight: 64,
                  lineHeight: 1.45,
                  padding: '9px 12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Section 4: Operational Status */}
          <div className="hosp-section-card">
            <div className="hosp-section-header">
              <div className="hosp-section-badge">
                <ShieldCheck size={13} />
              </div>
              <div className="hosp-section-tag">
                Operational Status & Visibility
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Active Option */}
              <button
                type="button"
                className={`hosp-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                onClick={() => setStatus('ACTIVE')}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2)',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: status === 'ACTIVE' ? '#6d28d9' : '#1e293b',
                    }}
                  >
                    Active & Operational
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                    Visible across patient booking, doctor schedules, and hospital directories.
                  </div>
                </div>
                {status === 'ACTIVE' && (
                  <CheckCircle2
                    size={16}
                    style={{ color: '#7c3aed', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
                  />
                )}
              </button>

              {/* Inactive Option */}
              <button
                type="button"
                className={`hosp-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                onClick={() => setStatus('INACTIVE')}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#94a3b8',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: status === 'INACTIVE' ? '#6d28d9' : '#1e293b',
                    }}
                  >
                    Inactive / Suspended
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                    Hidden from patient queues, new branch creation, and doctor associations.
                  </div>
                </div>
                {status === 'INACTIVE' && (
                  <CheckCircle2
                    size={16}
                    style={{ color: '#7c3aed', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Docked Action Footer */}
        <div
          className="ui-modal-foot"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-subtle"
            disabled={loading}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12.5 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ui-btn ui-btn-primary hosp-submit-btn"
            style={{
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '0 18px',
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: 8,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="is-spinning" />
                <span>Saving...</span>
              </>
            ) : hospital ? (
              'Save Changes'
            ) : (
              'Create Hospital'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
