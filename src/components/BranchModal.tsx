import {
  AlertCircle,
  Building2,
  CheckCircle2,
  GitBranch,
  Info,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import React, { useEffect, useId, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Hospital } from './HospitalModal';
import { Modal } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

export interface Branch {
  id: string;
  hospital_id: string;
  hospital_name?: string; // from the join
  branch_code: string;
  name: string;
  address: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export function validateBranchName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Branch name is required.';
  if (trimmed.length < 2) return 'Branch name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Branch name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&-]/i.test(trimmed)) {
    return 'Branch name contains invalid characters.';
  }
  return undefined;
}

export function validateBranchHospital(id: string): string | undefined {
  if (!id || !id.trim()) return 'Please select a parent hospital.';
  return undefined;
}

export function validateBranchPhone(val: string): string | undefined {
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

export function validateBranchAddressLine(val: string, label = 'Address line'): string | undefined {
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

export function validateBranchCity(val: string): string | undefined {
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

export function validateBranchState(val: string): string | undefined {
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

export function validateBranchPincode(val: string): string | undefined {
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

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSave: () => void;
}

export default function BranchModal({ isOpen, onClose, branch, onSave }: BranchModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const nameInputId = useId();
  const phoneInputId = useId();

  // Fetch hospitals for SearchableSelect
  useEffect(() => {
    if (isOpen) {
      const fetchHospitals = async () => {
        setHospitalsLoading(true);
        try {
          const response = await api.get<Hospital[]>('hospitals');
          const data = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
          setHospitals(data);
        } catch (err) {
          console.error('Failed to fetch hospitals for branch drawer', err);
        } finally {
          setHospitalsLoading(false);
        }
      };
      void fetchHospitals();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (branch) {
        setName(branch.name || '');
        setHospitalId(branch.hospital_id || '');
        setAddressLine1(branch.address_line_1 || branch.address || '');
        setAddressLine2(branch.address_line_2 || '');
        setCity(branch.city || '');
        setState(branch.state || '');
        setPincode(branch.pincode || '');
        setPhone(branch.phone || '');
        setStatus(branch.status || 'ACTIVE');
      } else {
        setName('');
        setHospitalId('');
        setAddressLine1('');
        setAddressLine2('');
        setCity('');
        setState('');
        setPincode('');
        setPhone('');
        setStatus('ACTIVE');
      }
      setError('');
      setTouched({});
      setErrors({});
    }
  }, [branch, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s.,'&-]/g, '').slice(0, 150);
    setName(val);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateBranchName(val) }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
    setPhone(val);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validateBranchPhone(val) }));
    }
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine1(val);
    if (touched.addressLine1) {
      setErrors((prev) => ({ ...prev, addressLine1: validateBranchAddressLine(val, 'Address line 1') }));
    }
  };

  const handleAddressLine2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\s,./#&-]/g, '').slice(0, 255);
    setAddressLine2(val);
    if (touched.addressLine2) {
      setErrors((prev) => ({ ...prev, addressLine2: validateBranchAddressLine(val, 'Address line 2') }));
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setCity(val);
    if (touched.city) {
      setErrors((prev) => ({ ...prev, city: validateBranchCity(val) }));
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 100);
    setState(val);
    if (touched.state) {
      setErrors((prev) => ({ ...prev, state: validateBranchState(val) }));
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setPincode(val);
    if (touched.pincode) {
      setErrors((prev) => ({ ...prev, pincode: validateBranchPincode(val) }));
    }
  };

  // Convert hospitals to SearchableSelect options
  const hospitalOptions = useMemo<SearchableSelectOption[]>(() => {
    return hospitals.map((h) => ({
      value: h.id,
      label: h.name,
      sublabel: h.hospital_code ? `Code: ${h.hospital_code}` : undefined,
      badge: h.status === 'ACTIVE' ? 'Active' : 'Inactive',
      badgeTone: h.status === 'ACTIVE' ? ('violet' as const) : ('neutral' as const),
      icon: <Building2 size={14} />,
      extraSearchTerms: [h.hospital_code, h.address, h.phone, h.email].filter(Boolean) as string[],
    }));
  }, [hospitals]);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === hospitalId) || null,
    [hospitals, hospitalId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateBranchName(name);
    const hospErr = validateBranchHospital(hospitalId);
    const phoneErr = validateBranchPhone(phone);
    const addr1Err = validateBranchAddressLine(addressLine1, 'Address line 1');
    const addr2Err = validateBranchAddressLine(addressLine2, 'Address line 2');
    const cityErr = validateBranchCity(city);
    const stateErr = validateBranchState(state);
    const pincodeErr = validateBranchPincode(pincode);

    const newErrors: Record<string, string | undefined> = {
      name: nameErr,
      hospital: hospErr,
      phone: phoneErr,
      addressLine1: addr1Err,
      addressLine2: addr2Err,
      city: cityErr,
      state: stateErr,
      pincode: pincodeErr,
    };

    setTouched({
      name: true,
      hospital: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
    });
    setErrors(newErrors);

    if (nameErr || hospErr || phoneErr || addr1Err || addr2Err || cityErr || stateErr || pincodeErr) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = branch ? `branches/${branch.id}` : `branches`;
      const method = branch ? 'PUT' : 'POST';

      const addressLines = [
        addressLine1.trim(),
        addressLine2.trim(),
        city.trim(),
        state.trim(),
        pincode.trim(),
      ]
        .filter(Boolean)
        .join(', ');

      await api({
        method,
        url,
        data: {
          hospital_id: hospitalId,
          name: name.trim(),
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          address: addressLines || null,
          phone: phone.trim() || null,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save branch.'));
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
      className="branch-drawer-modal"
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
            <GitBranch size={19} />
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
              {branch ? 'Edit Branch' : 'Create New Branch'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {branch
                ? `Branch Code: ${branch.branch_code} · Connected to ${branch.hospital_name || selectedHospital?.name || 'Hospital'}`
                : 'Add a new hospital branch, satellite center or regional clinic'}
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
          .branch-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .branch-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .branch-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .branch-section-card {
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
          .branch-section-card:hover {
            border-color: #cbd5e1;
          }
          .branch-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .branch-section-badge {
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
          .branch-section-badge svg {
            display: block;
            margin: auto;
          }
          .branch-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .branch-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .branch-drawer-modal .ui-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .branch-status-btn {
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
          .branch-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .branch-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .branch-status-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .branch-submit-btn {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
            border: none !important;
            color: #ffffff !important;
          }
          .branch-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
          }
          @media (max-width: 640px) {
            .branch-drawer-modal {
              width: 100vw !important;
              max-width: 100vw !important;
            }
            .branch-drawer-modal .ui-modal-head {
              padding: 14px 16px !important;
            }
            .branch-drawer-modal .ui-modal-body {
              padding: 14px 14px !important;
              gap: 12px !important;
            }
            .branch-section-card {
              padding: 14px 14px !important;
              border-radius: 10px !important;
              gap: 12px !important;
            }
            .branch-section-header {
              padding-bottom: 6px !important;
            }
            .branch-drawer-modal .ui-modal-foot {
              padding: 12px 16px !important;
            }
          }
          @media (max-width: 480px) {
            .branch-drawer-modal .ui-modal-foot {
              flex-direction: column-reverse !important;
              align-items: stretch !important;
              gap: 8px !important;
            }
            .branch-drawer-modal .ui-modal-foot button {
              width: 100% !important;
              height: 40px !important;
              justify-content: center !important;
            }
            .branch-status-btn {
              flex: 1 1 100% !important;
            }
          }
        `}</style>

        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Section 1: Hospital & Branch Identity */}
          <div className="branch-section-card">
            <div className="branch-section-header">
              <div className="branch-section-badge">
                <Building2 size={13} />
              </div>
              <div className="branch-section-tag">
                Hospital & Branch Identity
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {/* Parent Hospital Dropdown (SearchableSelect) */}
              <div>
                <label
                  htmlFor="branch-hospital-select"
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
                  <span>Parent Hospital System</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  id="branch-hospital-select"
                  value={hospitalId}
                  onChange={(val) => {
                    setHospitalId(val);
                    setTouched((prev) => ({ ...prev, hospital: true }));
                    setErrors((prev) => ({ ...prev, hospital: validateBranchHospital(val) }));
                    setError('');
                  }}
                  searchable={true}
                  required
                  placeholder={hospitalsLoading ? 'Loading hospitals...' : 'Select parent hospital system...'}
                  searchPlaceholder="Search hospital by name, code, or location..."
                  options={hospitalOptions}
                  emptyText="No hospitals found. Please register a hospital first."
                />
                {errors.hospital && (
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
                    <span>{errors.hospital}</span>
                  </div>
                )}
              </div>

              {/* Branch Name */}
              <div>
                <label
                  htmlFor={nameInputId}
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
                  <span>Branch Name</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <GitBranch
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
                    placeholder="e.g. Apollo South Campus"
                    value={name}
                    onChange={handleNameChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, name: true }));
                      setErrors((prev) => ({ ...prev, name: validateBranchName(name) }));
                    }}
                    style={{
                      paddingLeft: 34,
                      borderColor: errors.name ? '#ef4444' : undefined,
                      boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
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

              {/* Branch Code Badge/Info */}
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
                  <Info size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span>Branch Reference Code:</span>
                </div>
                <div>
                  {branch ? (
                    <Badge tone="blue">{branch.branch_code}</Badge>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #dbeafe',
                      }}
                    >
                      Auto-generated (e.g. BRN-001)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Reception Helpline */}
          <div className="branch-section-card">
            <div className="branch-section-header">
              <div className="branch-section-badge">
                <Phone size={13} />
              </div>
              <div className="branch-section-tag">
                Contact & Reception Helpline
              </div>
            </div>

            <div>
              <label
                htmlFor={phoneInputId}
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
                <span>Branch Phone / Reception Contact</span>
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
                  placeholder="e.g. +91 44 2829 0250"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, phone: true }));
                    setErrors((prev) => ({ ...prev, phone: validateBranchPhone(phone) }));
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
          </div>

          {/* Section 3: Physical Facility Location */}
          <div className="branch-section-card">
            <div className="branch-section-header">
              <div className="branch-section-badge">
                <MapPin size={13} />
              </div>
              <div className="branch-section-tag">
                Physical Facility Location
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
                <span>Facility / Street Address</span>
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
                      htmlFor="branch-address-line-1"
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
                      id="branch-address-line-1"
                      className="ui-input"
                      type="text"
                      value={addressLine1}
                      onChange={handleAddressLine1Change}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, addressLine1: true }));
                        setErrors((prev) => ({
                          ...prev,
                          addressLine1: validateBranchAddressLine(addressLine1, 'Address line 1'),
                        }));
                      }}
                      placeholder="e.g. Block C, South Wing, Greams Road"
                      style={{
                        borderColor: errors.addressLine1 ? '#ef4444' : undefined,
                        boxShadow: errors.addressLine1 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.addressLine1 && (
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
                        <span>{errors.addressLine1}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="branch-address-line-2"
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
                      id="branch-address-line-2"
                      className="ui-input"
                      type="text"
                      value={addressLine2}
                      onChange={handleAddressLine2Change}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, addressLine2: true }));
                        setErrors((prev) => ({
                          ...prev,
                          addressLine2: validateBranchAddressLine(addressLine2, 'Address line 2'),
                        }));
                      }}
                      placeholder="e.g. Opp City Park"
                      style={{
                        borderColor: errors.addressLine2 ? '#ef4444' : undefined,
                        boxShadow: errors.addressLine2 ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.addressLine2 && (
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
                        <span>{errors.addressLine2}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      htmlFor="branch-city"
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
                      id="branch-city"
                      className="ui-input"
                      type="text"
                      value={city}
                      onChange={handleCityChange}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, city: true }));
                        setErrors((prev) => ({ ...prev, city: validateBranchCity(city) }));
                      }}
                      placeholder="e.g. Chennai"
                      style={{
                        borderColor: errors.city ? '#ef4444' : undefined,
                        boxShadow: errors.city ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.city && (
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
                        <span>{errors.city}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="branch-state"
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
                      id="branch-state"
                      className="ui-input"
                      type="text"
                      value={state}
                      onChange={handleStateChange}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, state: true }));
                        setErrors((prev) => ({ ...prev, state: validateBranchState(state) }));
                      }}
                      placeholder="e.g. Tamil Nadu"
                      style={{
                        borderColor: errors.state ? '#ef4444' : undefined,
                        boxShadow: errors.state ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.state && (
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
                        <span>{errors.state}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="branch-pincode"
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
                      id="branch-pincode"
                      className="ui-input"
                      type="text"
                      value={pincode}
                      onChange={handlePincodeChange}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, pincode: true }));
                        setErrors((prev) => ({ ...prev, pincode: validateBranchPincode(pincode) }));
                      }}
                      placeholder="e.g. 600006"
                      style={{
                        borderColor: errors.pincode ? '#ef4444' : undefined,
                        boxShadow: errors.pincode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.pincode && (
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
                        <span>{errors.pincode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Status */}
          <div className="branch-section-card">
            <div className="branch-section-header">
              <div className="branch-section-badge">
                <ShieldCheck size={13} />
              </div>
              <div className="branch-section-tag">
                Operational Status & Visibility
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Active Option */}
              <button
                type="button"
                className={`branch-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
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
                      color: status === 'ACTIVE' ? '#1d4ed8' : '#1e293b',
                    }}
                  >
                    Active & Operational
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                    Open for doctor shifts, patient bookings, and staff deployments.
                  </div>
                </div>
                {status === 'ACTIVE' && (
                  <CheckCircle2
                    size={16}
                    style={{ color: '#2563eb', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
                  />
                )}
              </button>

              {/* Inactive Option */}
              <button
                type="button"
                className={`branch-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
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
                      color: status === 'INACTIVE' ? '#1d4ed8' : '#1e293b',
                    }}
                  >
                    Inactive / Suspended
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                    Temporarily closed or hidden from doctor and appointment assignment queues.
                  </div>
                </div>
                {status === 'INACTIVE' && (
                  <CheckCircle2
                    size={16}
                    style={{ color: '#2563eb', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
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
            className="ui-btn ui-btn-primary branch-submit-btn"
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
            ) : branch ? (
              'Save Changes'
            ) : (
              'Create Branch'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
