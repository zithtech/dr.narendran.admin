import {
  AlertCircle,
  Award,
  Building2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type {
  AllianceCategory,
  AllianceDoctor,
  AllianceDoctorInput,
  AllianceSpecialization,
} from '../types/allianceDoctor';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';
import { Alert } from './ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

const GENDER_OPTIONS: SearchableSelectOption[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

interface AllianceDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: AllianceDoctor | null;
  onSave: () => void;
}

export function validateAllianceDoctorName(val: string): string | undefined {
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

export function validateAllianceDoctorPhone(val: string, label = 'Mobile number'): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[a-zA-Z]/.test(val)) {
    return `Letters are not allowed in ${label.toLowerCase()}.`;
  }
  if (/[^0-9+\s-]/.test(val)) {
    return `Special characters are not allowed in ${label.toLowerCase()}.`;
  }
  const digits = val.replace(/\D/g, '');
  if (digits.length < 7) {
    return `${label} must be at least 7 digits.`;
  }
  if (digits.length > 15) {
    return `${label} cannot exceed 15 digits.`;
  }
  return undefined;
}

export function validateAllianceDoctorEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address (e.g. doctor@example.com).';
  }
  if (trimmed.length > 150) {
    return 'Email address cannot exceed 150 characters.';
  }
  return undefined;
}

export function validateAllianceDoctorExperience(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[^0-9]/.test(trimmed)) {
    return 'Experience must contain only numbers.';
  }
  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 0) {
    return 'Experience cannot be negative.';
  }
  if (num > 70) {
    return 'Experience cannot exceed 70 years.';
  }
  return undefined;
}

export function validateAllianceDoctorPincode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (/[^0-9]/.test(trimmed)) {
    return 'Pincode must contain only numbers.';
  }
  if (trimmed.length < 4 || trimmed.length > 10) {
    return 'Pincode must be between 4 and 10 digits.';
  }
  return undefined;
}

export default function AllianceDoctorModal({
  isOpen,
  onClose,
  doctor,
  onSave,
}: AllianceDoctorModalProps) {
  // A. Doctor Information
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [gender, setGender] = useState('MALE');

  // B. Contact Information
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobileNumber, setAlternateMobileNumber] = useState('');
  const [email, setEmail] = useState('');

  // C. Address Information
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');

  // D. Other Information
  const [hospitalClinicName, setHospitalClinicName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Dynamic Categories & Specializations state
  const [categoriesList, setCategoriesList] = useState<AllianceCategory[]>([]);
  const [specializationsList, setSpecializationsList] = useState<AllianceSpecialization[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Inline custom category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);

  // Inline custom specialization creation state
  const [isAddingSpecialization, setIsAddingSpecialization] = useState(false);
  const [newSpecializationName, setNewSpecializationName] = useState('');
  const [addingSpecializationLoading, setAddingSpecializationLoading] = useState(false);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [catRes, specRes] = await Promise.allSettled([
        api.get<{ data: AllianceCategory[] }>('alliances/categories'),
        api.get<{ data: AllianceSpecialization[] }>('alliances/specializations'),
      ]);
      if (catRes.status === 'fulfilled' && catRes.value.data?.data) {
        setCategoriesList(catRes.value.data.data);
      }
      if (specRes.status === 'fulfilled' && specRes.value.data?.data) {
        setSpecializationsList(specRes.value.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAddNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setAddingCategoryLoading(true);
    try {
      const res = await api.post<{ data: AllianceCategory }>('alliances/categories', {
        name: trimmed,
      });
      const created = res.data.data;
      setCategoriesList((prev) => {
        if (prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      setCategory(created.name);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch {
      // If endpoint failed or already exists, still adopt entered text
      setCategory(trimmed);
      setIsAddingCategory(false);
    } finally {
      setAddingCategoryLoading(false);
    }
  };

  const handleAddNewSpecialization = async () => {
    const trimmed = newSpecializationName.trim();
    if (!trimmed) return;
    setAddingSpecializationLoading(true);
    try {
      const res = await api.post<{ data: AllianceSpecialization }>('alliances/specializations', {
        name: trimmed,
      });
      const created = res.data.data;
      setSpecializationsList((prev) => {
        if (prev.some((s) => s.name.toLowerCase() === created.name.toLowerCase())) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSpecialization(created.name);
      setNewSpecializationName('');
      setIsAddingSpecialization(false);
    } catch {
      // If endpoint failed or already exists, still adopt entered text
      setSpecialization(trimmed);
      setIsAddingSpecialization(false);
    } finally {
      setAddingSpecializationLoading(false);
    }
  };

  const categoryOptions: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = categoriesList.map((c) => ({
      value: c.name,
      label: c.name,
    }));
    if (category && !list.some((o) => o.value.toLowerCase() === category.toLowerCase())) {
      list.unshift({ value: category, label: category, badge: 'Custom', badgeTone: 'blue' });
    }
    return list;
  }, [categoriesList, category]);

  const specializationOptions: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = specializationsList.map((s) => ({
      value: s.name,
      label: s.name,
    }));
    if (specialization && !list.some((o) => o.value.toLowerCase() === specialization.toLowerCase())) {
      list.unshift({ value: specialization, label: specialization, badge: 'Custom', badgeTone: 'blue' });
    }
    return list;
  }, [specializationsList, specialization]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setErrors({});
      setTouched({});
      setIsAddingCategory(false);
      setIsAddingSpecialization(false);
      setNewCategoryName('');
      setNewSpecializationName('');
      void fetchOptions();

      if (doctor) {
        setName(doctor.name || '');
        setCategory(doctor.category || '');
        setSpecialization(doctor.specialization || '');
        setQualification(doctor.qualification || '');
        setExperience(
          doctor.experience_years !== null && doctor.experience_years !== undefined
            ? String(doctor.experience_years)
            : '',
        );
        setGender(doctor.gender || 'MALE');

        setMobileNumber(doctor.mobile_number || '');
        setAlternateMobileNumber(doctor.alternate_mobile_number || '');
        setEmail(doctor.email || '');

        setAddressLine1(doctor.address_line_1 || '');
        setAddressLine2(doctor.address_line_2 || '');
        setCity(doctor.city || '');
        setDistrict(doctor.district || '');
        setState(doctor.state || '');
        setCountry(doctor.country || 'India');
        setPincode(doctor.pincode || '');

        setHospitalClinicName(doctor.hospital_clinic_name || '');
        setRegistrationNumber(doctor.registration_number || '');
        setDescription(doctor.description || '');
        setStatus(doctor.status || 'ACTIVE');
      } else {
        setName('');
        setCategory('');
        setSpecialization('');
        setQualification('');
        setExperience('');
        setGender('MALE');

        setMobileNumber('');
        setAlternateMobileNumber('');
        setEmail('');

        setAddressLine1('');
        setAddressLine2('');
        setCity('');
        setDistrict('');
        setState('');
        setCountry('India');
        setPincode('');

        setHospitalClinicName('');
        setRegistrationNumber('');
        setDescription('');
        setStatus('ACTIVE');
      }
    }
  }, [isOpen, doctor]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'name') err = validateAllianceDoctorName(name);
    else if (field === 'mobileNumber') err = validateAllianceDoctorPhone(mobileNumber, 'Mobile number');
    else if (field === 'alternateMobileNumber')
      err = validateAllianceDoctorPhone(alternateMobileNumber, 'Alternate mobile number');
    else if (field === 'email') err = validateAllianceDoctorEmail(email);
    else if (field === 'experience') err = validateAllianceDoctorExperience(experience);
    else if (field === 'pincode') err = validateAllianceDoctorPincode(pincode);

    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateAllianceDoctorName(name);
    const mobileErr = validateAllianceDoctorPhone(mobileNumber, 'Mobile number');
    const altMobileErr = validateAllianceDoctorPhone(alternateMobileNumber, 'Alternate mobile number');
    const emailErr = validateAllianceDoctorEmail(email);
    const expErr = validateAllianceDoctorExperience(experience);
    const pinErr = validateAllianceDoctorPincode(pincode);

    const newErrors = {
      name: nameErr,
      mobileNumber: mobileErr,
      alternateMobileNumber: altMobileErr,
      email: emailErr,
      experience: expErr,
      pincode: pinErr,
    };
    setErrors(newErrors);
    setTouched({
      name: true,
      mobileNumber: true,
      alternateMobileNumber: true,
      email: true,
      experience: true,
      pincode: true,
    });

    if (Object.values(newErrors).some(Boolean)) {
      setError('Please review and correct the errors highlighted below.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: AllianceDoctorInput = {
      name: name.trim(),
      category: category.trim() || null,
      specialization: specialization.trim() || null,
      qualification: qualification.trim() || null,
      experience_years: experience.trim() ? parseInt(experience.trim(), 10) : null,
      gender: gender || null,
      mobile_number: mobileNumber.trim() || null,
      alternate_mobile_number: alternateMobileNumber.trim() || null,
      email: email.trim() || null,
      address_line_1: addressLine1.trim() || null,
      address_line_2: addressLine2.trim() || null,
      city: city.trim() || null,
      district: district.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
      pincode: pincode.trim() || null,
      hospital_clinic_name: hospitalClinicName.trim() || null,
      registration_number: registrationNumber.trim() || null,
      description: description.trim() || null,
      status,
    };

    try {
      if (doctor) {
        await api.put(`alliances/doctors/${doctor.id}`, payload);
      } else {
        await api.post('alliances/doctors', payload);
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save alliance doctor.'));
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
      className="alliance-doctor-drawer-modal"
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
            <Stethoscope size={20} />
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
              {doctor ? 'Edit Alliance Doctor' : 'Add Alliance Doctor'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {doctor
                ? `Editing alliance profile for ${doctor.name}`
                : 'Register a partner or alliance doctor into the network'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .alliance-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          }
          .alliance-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
          }
          .alliance-section-badge {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background: #eff6ff;
            color: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .alliance-section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .alliance-field-label {
            font-size: 12px;
            font-weight: 600;
            color: #334155;
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 5px;
          }
          .alliance-input-error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15) !important;
          }
          .alliance-error-text {
            font-size: 11.5px;
            color: #ef4444;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `}</style>

        <div className="ui-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert>{error}</Alert>
            </div>
          )}

          {/* Section A: Doctor Information */}
          <div className="alliance-section-card">
            <div className="alliance-section-header">
              <div className="alliance-section-badge">
                <User size={14} />
              </div>
              <span className="alliance-section-title">A. Doctor Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doctor Name */}
              <div className="md:col-span-2">
                <label className="alliance-field-label" htmlFor="alliance-doc-name">
                  <span>Doctor Name</span>
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
                    id="alliance-doc-name"
                    type="text"
                    className={`ui-input ${errors.name ? 'alliance-input-error' : ''}`}
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s.-]/g, '').slice(0, 100);
                      setName(val);
                      if (touched.name) {
                        setErrors((prev) => ({ ...prev, name: validateAllianceDoctorName(val) }));
                      }
                    }}
                    onBlur={() => handleBlur('name')}
                    required
                  />
                </div>
                {errors.name && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* Category (Dropdown with custom add option) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="alliance-field-label !mb-0" htmlFor="alliance-doc-category">
                    <span>Category</span>
                  </label>
                  {!isAddingCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(true);
                        setNewCategoryName('');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={11} strokeWidth={2.5} />
                      <span>Add New</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      className="ui-input !h-9 text-xs"
                      placeholder="Enter new category name…"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value.slice(0, 150))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAddNewCategory();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={addingCategoryLoading || !newCategoryName.trim()}
                      onClick={handleAddNewCategory}
                      className="px-3 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {addingCategoryLoading ? 'Saving…' : 'Add'}
                    </button>
                  </div>
                ) : (
                  <SearchableSelect
                    id="alliance-doc-category"
                    options={categoryOptions}
                    value={category}
                    onChange={(val) => setCategory(val)}
                    placeholder="Select doctor category…"
                    searchPlaceholder="Search categories…"
                    clearable
                    onClear={() => setCategory('')}
                    loading={loadingOptions}
                  />
                )}
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select doctor category or click Add New to customize
                </span>
              </div>

              {/* Specialization (Dropdown with custom add option) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="alliance-field-label !mb-0" htmlFor="alliance-doc-specialization">
                    <span>Specialization</span>
                  </label>
                  {!isAddingSpecialization ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSpecialization(true);
                        setNewSpecializationName('');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={11} strokeWidth={2.5} />
                      <span>Add New</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingSpecialization(false)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {isAddingSpecialization ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      className="ui-input !h-9 text-xs"
                      placeholder="Enter new specialization name…"
                      value={newSpecializationName}
                      onChange={(e) => setNewSpecializationName(e.target.value.slice(0, 150))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAddNewSpecialization();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={addingSpecializationLoading || !newSpecializationName.trim()}
                      onClick={handleAddNewSpecialization}
                      className="px-3 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {addingSpecializationLoading ? 'Saving…' : 'Add'}
                    </button>
                  </div>
                ) : (
                  <SearchableSelect
                    id="alliance-doc-specialization"
                    options={specializationOptions}
                    value={specialization}
                    onChange={(val) => setSpecialization(val)}
                    placeholder="Select doctor specialization…"
                    searchPlaceholder="Search specializations…"
                    clearable
                    onClear={() => setSpecialization('')}
                    loading={loadingOptions}
                  />
                )}
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select doctor specialization or click Add New to customize
                </span>
              </div>

              {/* Qualification */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-qualification">
                  <span>Qualification</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap
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
                    id="alliance-doc-qualification"
                    type="text"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. MBBS, MD, DM"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value.slice(0, 255))}
                  />
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-experience">
                  <span>Experience (Years)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Award
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: errors.experience ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="alliance-doc-experience"
                    type="number"
                    min="0"
                    max="70"
                    className={`ui-input ${errors.experience ? 'alliance-input-error' : ''}`}
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. 15"
                    value={experience}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                      setExperience(val);
                      if (touched.experience) {
                        setErrors((prev) => ({
                          ...prev,
                          experience: validateAllianceDoctorExperience(val),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('experience')}
                  />
                </div>
                {errors.experience && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.experience}</span>
                  </div>
                )}
              </div>

              {/* Gender */}
              <div className="md:col-span-2">
                <label className="alliance-field-label">
                  <span>Gender</span>
                </label>
                <SearchableSelect
                  options={GENDER_OPTIONS}
                  value={gender}
                  onChange={(val) => setGender(val || 'MALE')}
                  placeholder="Select Gender"
                />
              </div>
            </div>
          </div>

          {/* Section B: Contact Information */}
          <div className="alliance-section-card">
            <div className="alliance-section-header">
              <div className="alliance-section-badge">
                <Phone size={14} />
              </div>
              <span className="alliance-section-title">B. Contact Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile Number */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-mobile">
                  <span>Mobile Number</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: errors.mobileNumber ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="alliance-doc-mobile"
                    type="tel"
                    className={`ui-input ${errors.mobileNumber ? 'alliance-input-error' : ''}`}
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. +91 98765 43210"
                    value={mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
                      setMobileNumber(val);
                      if (touched.mobileNumber) {
                        setErrors((prev) => ({
                          ...prev,
                          mobileNumber: validateAllianceDoctorPhone(val, 'Mobile number'),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('mobileNumber')}
                  />
                </div>
                {errors.mobileNumber && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.mobileNumber}</span>
                  </div>
                )}
              </div>

              {/* Alternate Mobile Number */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-alt-mobile">
                  <span>Alternate Mobile Number</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={15}
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: errors.alternateMobileNumber ? '#ef4444' : '#94a3b8',
                    }}
                  />
                  <input
                    id="alliance-doc-alt-mobile"
                    type="tel"
                    className={`ui-input ${errors.alternateMobileNumber ? 'alliance-input-error' : ''}`}
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. +91 91234 56789"
                    value={alternateMobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+\s-]/g, '').slice(0, 16);
                      setAlternateMobileNumber(val);
                      if (touched.alternateMobileNumber) {
                        setErrors((prev) => ({
                          ...prev,
                          alternateMobileNumber: validateAllianceDoctorPhone(
                            val,
                            'Alternate mobile number',
                          ),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('alternateMobileNumber')}
                  />
                </div>
                {errors.alternateMobileNumber && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.alternateMobileNumber}</span>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div className="md:col-span-2">
                <label className="alliance-field-label" htmlFor="alliance-doc-email">
                  <span>Email Address</span>
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
                    id="alliance-doc-email"
                    type="email"
                    className={`ui-input ${errors.email ? 'alliance-input-error' : ''}`}
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. doctor@hospital.com"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 150);
                      setEmail(val);
                      if (touched.email) {
                        setErrors((prev) => ({ ...prev, email: validateAllianceDoctorEmail(val) }));
                      }
                    }}
                    onBlur={() => handleBlur('email')}
                  />
                </div>
                {errors.email && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Address Information */}
          <div className="alliance-section-card">
            <div className="alliance-section-header">
              <div className="alliance-section-badge">
                <MapPin size={14} />
              </div>
              <span className="alliance-section-title">C. Address Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="alliance-field-label" htmlFor="alliance-doc-addr1">
                  <span>Address Line 1</span>
                </label>
                <input
                  id="alliance-doc-addr1"
                  type="text"
                  className="ui-input"
                  placeholder="House / Flat No., Building, Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value.slice(0, 255))}
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="alliance-field-label" htmlFor="alliance-doc-addr2">
                  <span>Address Line 2</span>
                </label>
                <input
                  id="alliance-doc-addr2"
                  type="text"
                  className="ui-input"
                  placeholder="Area, Landmark, Locality"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value.slice(0, 255))}
                />
              </div>

              {/* City */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-city">
                  <span>City</span>
                </label>
                <input
                  id="alliance-doc-city"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={(e) => setCity(e.target.value.slice(0, 100))}
                />
              </div>

              {/* District */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-district">
                  <span>District</span>
                </label>
                <input
                  id="alliance-doc-district"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Chennai"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value.slice(0, 100))}
                />
              </div>

              {/* State */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-state">
                  <span>State</span>
                </label>
                <input
                  id="alliance-doc-state"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Tamil Nadu"
                  value={state}
                  onChange={(e) => setState(e.target.value.slice(0, 100))}
                />
              </div>

              {/* Country */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-country">
                  <span>Country</span>
                </label>
                <input
                  id="alliance-doc-country"
                  type="text"
                  className="ui-input"
                  placeholder="e.g. India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.slice(0, 100))}
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-pincode">
                  <span>Pincode</span>
                </label>
                <input
                  id="alliance-doc-pincode"
                  type="text"
                  className={`ui-input ${errors.pincode ? 'alliance-input-error' : ''}`}
                  placeholder="e.g. 600001"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    setPincode(val);
                    if (touched.pincode) {
                      setErrors((prev) => ({
                        ...prev,
                        pincode: validateAllianceDoctorPincode(val),
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('pincode')}
                />
                {errors.pincode && (
                  <div className="alliance-error-text">
                    <AlertCircle size={12} />
                    <span>{errors.pincode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section D: Other Information */}
          <div className="alliance-section-card">
            <div className="alliance-section-header">
              <div className="alliance-section-badge">
                <Building2 size={14} />
              </div>
              <span className="alliance-section-title">D. Other Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hospital / Clinic Name */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-hospital">
                  <span>Hospital / Clinic Name</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2
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
                    id="alliance-doc-hospital"
                    type="text"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. Apollo Hospital, City Clinic"
                    value={hospitalClinicName}
                    onChange={(e) => setHospitalClinicName(e.target.value.slice(0, 255))}
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label className="alliance-field-label" htmlFor="alliance-doc-regno">
                  <span>Registration Number</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck
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
                    id="alliance-doc-regno"
                    type="text"
                    className="ui-input"
                    style={{ paddingLeft: 34 }}
                    placeholder="e.g. MCI-2015-87654"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.slice(0, 100))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="alliance-field-label" htmlFor="alliance-doc-desc">
                  <span>Description / Notes</span>
                </label>
                <textarea
                  id="alliance-doc-desc"
                  className="ui-input"
                  style={{ minHeight: 76, padding: '8px 12px', resize: 'vertical' }}
                  placeholder="Enter notes, bio, or alliance agreement details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                />
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      Doctor Alliance Status
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {status === 'ACTIVE'
                        ? 'Doctor is currently Active and eligible for referrals/consultations.'
                        : 'Doctor is Inactive and temporarily suspended from alliances.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatus((prev) => (prev === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}
                    className={`ui-btn ui-btn-sm ${status === 'ACTIVE' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
                    style={{
                      background: status === 'ACTIVE' ? '#16a34a' : undefined,
                      borderColor: status === 'ACTIVE' ? '#16a34a' : undefined,
                      color: status === 'ACTIVE' ? '#ffffff' : undefined,
                      fontWeight: 600,
                    }}
                  >
                    {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div
          className="ui-modal-foot"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 22px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              borderColor: '#1d4ed8',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
              fontWeight: 600,
            }}
          >
            {loading ? 'Saving...' : doctor ? 'Save Changes' : 'Create Alliance Doctor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
