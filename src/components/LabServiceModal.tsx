import {
  Activity,
  AlertCircle,
  Check,
  FileText,
  FlaskConical,
  IndianRupee,
  Loader2,
  ShieldCheck,
  Tag,
  TestTube2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';
import SearchableSelect, { type SearchableSelectOption } from './ui/SearchableSelect';

export interface LabService {
  id: string;
  name: string;
  service_code?: string | null;
  category?: string | null;
  service_category?: string | null;
  description?: string | null;
  sample_type?: string | null;
  price?: number | string | null;
  service_price?: number | string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export function validateLabServiceName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Diagnostic service name is required.';
  if (trimmed.length < 2) return 'Diagnostic service name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Diagnostic service name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,/+\-&()'%]/i.test(trimmed)) {
    return 'Diagnostic service name contains invalid characters.';
  }
  return undefined;
}

export function validateServiceCode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 2) return 'Service code must be at least 2 characters if provided.';
  if (trimmed.length > 50) return 'Service code cannot exceed 50 characters.';
  if (!/^[A-Za-z0-9_\-\s./]+$/.test(trimmed)) {
    return 'Service code can only contain letters, numbers, hyphens, underscores, and slashes.';
  }
  return undefined;
}

export function validateServiceCategory(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 2) return 'Service category must be at least 2 characters if provided.';
  if (trimmed.length > 100) return 'Service category cannot exceed 100 characters.';
  if (!/^[a-zA-Z0-9\s/()\-&,.'+]+$/.test(trimmed)) {
    return 'Service category contains invalid characters.';
  }
  return undefined;
}

export function validateSampleType(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 2) return 'Sample type must be at least 2 characters if provided.';
  if (trimmed.length > 100) return 'Sample type cannot exceed 100 characters.';
  if (!/^[a-zA-Z0-9\s/()\-&,.'+]+$/.test(trimmed)) {
    return 'Sample type contains invalid characters.';
  }
  return undefined;
}

export function validateDescription(val: string): string | undefined {
  if (!val) return undefined;
  if (val.length > 2000) return 'Description cannot exceed 2000 characters.';
  return undefined;
}

export function validateServicePrice(val: string | number): string | undefined {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return 'Please enter a valid price.';
  if (num < 0) return 'Please enter a valid non-negative price.';
  if (num > 999999.99) return 'Price cannot exceed ₹999,999.99.';
  if (typeof val === 'string' && val.includes('.')) {
    const decimals = val.split('.')[1];
    if (decimals && decimals.length > 2) {
      return 'Service price cannot have more than 2 decimal places.';
    }
  }
  return undefined;
}

export function validateServiceStatus(val: string): string | undefined {
  if (!val || (val !== 'ACTIVE' && val !== 'INACTIVE')) {
    return 'Service catalog status must be either ACTIVE or INACTIVE.';
  }
  return undefined;
}

export const COMMON_SERVICE_CATEGORIES: SearchableSelectOption[] = [
  { value: 'Hematology', label: 'Hematology', sublabel: 'Blood count, smear, coagulation tests', badge: 'CBC/Blood' },
  { value: 'Biochemistry', label: 'Biochemistry', sublabel: 'LFT, KFT, lipid, glucose, enzymes', badge: 'Metabolic' },
  { value: 'Microbiology', label: 'Microbiology', sublabel: 'Bacterial/fungal cultures & sensitivity', badge: 'Cultures' },
  { value: 'Immunology & Serology', label: 'Immunology & Serology', sublabel: 'Antibodies, viral serology, allergy', badge: 'Immuno' },
  { value: 'Pathology', label: 'Pathology', sublabel: 'Tissue examination, biopsies, histology', badge: 'Biopsy' },
  { value: 'Clinical Pathology', label: 'Clinical Pathology', sublabel: 'Urinalysis, stool, semen, body fluids', badge: 'Fluids' },
  { value: 'Molecular Biology', label: 'Molecular Biology', sublabel: 'RT-PCR, genetic & DNA/RNA diagnostics', badge: 'PCR' },
  { value: 'Radiology & Imaging', label: 'Radiology & Imaging', sublabel: 'X-ray, ultrasound, CT, MRI scans', badge: 'Imaging' },
  { value: 'Cytology & Histopathology', label: 'Cytology & Histopathology', sublabel: 'Pap smear, FNAC, cell morphology', badge: 'Cytology' },
  { value: 'Urinalysis', label: 'Urinalysis', sublabel: 'Urine routine, microscopy, test strips', badge: 'Urine' },
  { value: 'Endocrinology', label: 'Endocrinology', sublabel: 'Thyroid (T3/T4/TSH), fertility, hormones', badge: 'Hormones' },
  { value: 'General Diagnostic', label: 'General Diagnostic', sublabel: 'General wellness & routine screenings', badge: 'General' },
];

export const COMMON_SAMPLE_TYPES: SearchableSelectOption[] = [
  { value: 'Whole Blood (EDTA)', label: 'Whole Blood (EDTA)', sublabel: 'Lavender top tube for CBC, ESR, HbA1c', badge: 'EDTA' },
  { value: 'Serum', label: 'Serum', sublabel: 'Red/Gold top clot tube for Biochemistry/Serology', badge: 'Clot' },
  { value: 'Plasma', label: 'Plasma', sublabel: 'Grey/Blue top tube (Fluoride/Sodium Citrate)', badge: 'Citrate' },
  { value: 'Urine (Random / 24-hr)', label: 'Urine (Random / 24-hr)', sublabel: 'Clean catch midstream / sterile container', badge: 'Urine' },
  { value: 'Sputum', label: 'Sputum', sublabel: 'Deep early morning sterile specimen for AFB/Gram', badge: 'Resp' },
  { value: 'Stool', label: 'Stool', sublabel: 'Sterile specimen for occult blood & routine microscopy', badge: 'Fecal' },
  { value: 'Swab (Nasal / Throat)', label: 'Swab (Nasal / Throat)', sublabel: 'Sterile viral/bacterial transport swab', badge: 'Swab' },
  { value: 'Tissue / Biopsy', label: 'Tissue / Biopsy', sublabel: 'Formalin container for histology', badge: 'Surgical' },
  { value: 'CSF (Cerebrospinal Fluid)', label: 'CSF (Cerebrospinal Fluid)', sublabel: 'Lumbar puncture fluid in sterile vials', badge: 'CSF' },
  { value: 'Synovial Fluid', label: 'Synovial Fluid', sublabel: 'Aspirated joint fluid for crystals & cytology', badge: 'Joint' },
  { value: 'Saliva', label: 'Saliva', sublabel: 'Oral fluid specimen', badge: 'Oral' },
  { value: 'Body Fluid (Pleural/Ascitic)', label: 'Body Fluid (Pleural/Ascitic)', sublabel: 'Pleural, peritoneal, or pericardial fluid', badge: 'Exudate' },
  { value: 'Not Applicable', label: 'Not Applicable', sublabel: 'Non-specimen / imaging examination', badge: 'N/A' },
];

interface LabServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: LabService | null;
  onSave: () => void;
}

export default function LabServiceModal({
  isOpen,
  onClose,
  service,
  onSave,
}: LabServiceModalProps) {
  const [name, setName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [price, setPrice] = useState<string>('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customSampleMode, setCustomSampleMode] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setServiceCode(service.service_code || '');
      const catVal = service.category || service.service_category || '';
      setCategory(catVal);
      setDescription(service.description || '');
      setSampleType(service.sample_type || '');
      setPrice(
        service.price !== null && service.price !== undefined
          ? String(service.price)
          : service.service_price !== null && service.service_price !== undefined
            ? String(service.service_price)
            : '',
      );
      setStatus(service.status || 'ACTIVE');
    } else {
      setName('');
      setServiceCode('');
      setCategory('');
      setDescription('');
      setSampleType('');
      setPrice('');
      setStatus('ACTIVE');
    }
    setCustomCategoryMode(false);
    setCustomSampleMode(false);
    setTouched({});
    setError('');
  }, [service, isOpen]);

  const categoryOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts = [...COMMON_SERVICE_CATEGORIES];
    if (category && !opts.some((o) => o.value.toLowerCase() === category.toLowerCase())) {
      opts.unshift({
        value: category,
        label: category,
        sublabel: 'Custom category',
        badge: 'Custom',
      });
    }
    return opts;
  }, [category]);

  const sampleTypeOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts = [...COMMON_SAMPLE_TYPES];
    if (sampleType && !opts.some((o) => o.value.toLowerCase() === sampleType.toLowerCase())) {
      opts.unshift({
        value: sampleType,
        label: sampleType,
        sublabel: 'Custom specimen',
        badge: 'Custom',
      });
    }
    return opts;
  }, [sampleType]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,/+\-&()'%]/g, '');
    setName(sanitized);
    if (touched['name']) {
      setTouched((prev) => ({ ...prev, name: true }));
    }
  };

  const handleServiceCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    const sanitized = raw.replace(/[^A-Z0-9_\-\s./]/g, '');
    setServiceCode(sanitized);
    if (touched['service_code']) {
      setTouched((prev) => ({ ...prev, service_code: true }));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setPrice(raw);
    }
    if (touched['price']) {
      setTouched((prev) => ({ ...prev, price: true }));
    }
  };

  const nameError = touched['name'] ? validateLabServiceName(name) : undefined;
  const serviceCodeError = touched['service_code'] ? validateServiceCode(serviceCode) : undefined;
  const categoryError = touched['category'] ? validateServiceCategory(category) : undefined;
  const sampleTypeError = touched['sample_type'] ? validateSampleType(sampleType) : undefined;
  const priceError = touched['price'] ? validateServicePrice(price) : undefined;
  const descriptionError = touched['description'] ? validateDescription(description) : undefined;
  const statusError = touched['status'] ? validateServiceStatus(status) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidation = validateLabServiceName(name);
    const codeValidation = validateServiceCode(serviceCode);
    const categoryValidation = validateServiceCategory(category);
    const sampleValidation = validateSampleType(sampleType);
    const priceValidation = validateServicePrice(price);
    const descValidation = validateDescription(description);
    const statusValidation = validateServiceStatus(status);

    if (
      nameValidation ||
      codeValidation ||
      categoryValidation ||
      sampleValidation ||
      priceValidation ||
      descValidation ||
      statusValidation
    ) {
      setTouched({
        name: true,
        service_code: true,
        category: true,
        sample_type: true,
        price: true,
        description: true,
        status: true,
      });

      if (nameValidation) {
        document.getElementById('service-name-input')?.focus();
      } else if (codeValidation) {
        document.getElementById('service-code-input')?.focus();
      } else if (categoryValidation) {
        document.getElementById('service-category-input')?.focus();
      } else if (sampleValidation) {
        document.getElementById('sample-type-input')?.focus();
      } else if (priceValidation) {
        document.getElementById('service-price-input')?.focus();
      } else if (descValidation) {
        document.getElementById('service-description-input')?.focus();
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = service ? `lab-services/${service.id}` : `lab-services`;
      const method = service ? 'PUT' : 'POST';
      const payload: Record<string, unknown> = {
        name: name.trim(),
        status,
        ...(serviceCode.trim() ? { service_code: serviceCode.trim().toUpperCase() } : {}),
        ...(category.trim() ? { category: category.trim(), service_category: category.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(sampleType.trim() ? { sample_type: sampleType.trim() } : {}),
        ...(price !== ''
          ? {
              price: isNaN(parseFloat(price)) ? 0 : parseFloat(price),
              service_price: isNaN(parseFloat(price)) ? 0 : parseFloat(price),
            }
          : {}),
      };

      await api({
        method,
        url,
        data: payload,
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save diagnostic service.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="md"
      className="service-drawer-modal"
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
            <Activity size={19} style={{ display: 'block', margin: 'auto' }} />
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
              {service ? 'Edit Diagnostic Service' : 'Create Diagnostic Service'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {service
                ? `Editing master catalog test: ${service.name}`
                : 'Add a new laboratory test or clinical investigation to the master catalog'}
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
          .service-drawer-modal {
            width: min(680px, 100vw) !important;
            max-width: 680px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .service-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .service-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 16px;
            overflow-y: auto;
          }
          .service-section-card {
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
          .service-section-card:hover {
            border-color: #cbd5e1;
          }
          .service-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .service-section-badge {
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
          .service-section-badge svg {
            display: block;
            margin: auto;
          }
          .service-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .service-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .service-drawer-modal .ui-input,
          .service-drawer-modal .ui-textarea {
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 8px 12px;
            transition: all 0.15s ease;
            background: #ffffff;
            color: #0f172a;
          }
          .service-drawer-modal .ui-input {
            height: 38px;
          }
          .service-drawer-modal .price-input-field {
            padding-left: 36px !important;
          }
          .service-drawer-modal .code-input-field {
            padding-right: 32px !important;
          }
          .service-drawer-modal .ui-input:focus,
          .service-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .service-drawer-modal .ui-input.has-error,
          .service-drawer-modal .ui-textarea.has-error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
          }
          .service-status-btn {
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
          .service-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .service-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .service-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .service-radio-circle {
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
          .service-status-btn.is-active .service-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .service-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .service-drawer-modal .ui-modal-foot {
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

          {/* Section 1: Diagnostic Service Details */}
          <div className="service-section-card">
            <div className="service-section-header">
              <div className="service-section-badge">
                <FlaskConical size={14} />
              </div>
              <span className="service-section-tag">Service Specification</span>
              <span className="service-section-subtitle hidden sm:inline">
                Test name, clinical code & category
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Field 1: Diagnostic Service / Test Name */}
              <div>
                <label
                  htmlFor="service-name-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Diagnostic Service / Test Name <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="service-name-input"
                  className={`ui-input w-full ${nameError ? 'has-error' : ''}`}
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  placeholder="e.g. Complete Blood Count (CBC), Lipid Profile, Thyroid Panel"
                />
                {nameError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-rose-600" />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>

              {/* Grid: Service Code & Service Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 2: Service Code */}
                <div>
                  <label
                    htmlFor="service-code-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Service Code
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="service-code-input"
                      className={`ui-input code-input-field w-full uppercase font-mono tracking-wide ${
                        serviceCodeError ? 'has-error' : ''
                      }`}
                      style={{ paddingRight: '32px' }}
                      type="text"
                      value={serviceCode}
                      onChange={handleServiceCodeChange}
                      onBlur={() => setTouched((prev) => ({ ...prev, service_code: true }))}
                      placeholder="e.g. CBC-001, LFT-02"
                      maxLength={50}
                    />
                    <Tag
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
                    />
                  </div>
                  {serviceCodeError && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>{serviceCodeError}</span>
                    </div>
                  )}
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Alphanumeric identifier or billing test code
                  </span>
                </div>

                {/* Field 3: Service Category (SearchableSelect) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="service-category-input"
                      className="block text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      Service Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomCategoryMode((prev) => !prev)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {customCategoryMode ? 'Select from list' : '+ Custom Category'}
                    </button>
                  </div>
                  {customCategoryMode ? (
                    <input
                      id="service-category-input"
                      aria-label="Service Category"
                      className={`ui-input w-full ${categoryError ? 'has-error' : ''}`}
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, category: true }))}
                      placeholder="Type custom service category..."
                    />
                  ) : (
                    <SearchableSelect
                      id="service-category-input"
                      aria-label="Service Category"
                      value={category}
                      onChange={(val) => {
                        setCategory(val);
                        setTouched((prev) => ({ ...prev, category: true }));
                      }}
                      options={categoryOptions}
                      placeholder="Select service category..."
                      searchPlaceholder="Search category (e.g. Hematology, Biochemistry)..."
                      clearable
                      onClear={() => {
                        setCategory('');
                        setTouched((prev) => ({ ...prev, category: true }));
                      }}
                      accentTone="blue"
                    />
                  )}
                  {categoryError && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>{categoryError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Details, Sample & Price */}
          <div className="service-section-card">
            <div className="service-section-header">
              <div className="service-section-badge">
                <TestTube2 size={14} />
              </div>
              <span className="service-section-tag">Clinical Specifications & Pricing</span>
              <span className="service-section-subtitle hidden sm:inline">
                Specimen type, tariff rate & guidelines
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Grid: Sample Type & Service Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 5: Sample Type (SearchableSelect) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="sample-type-input"
                      className="block text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      Sample Type
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomSampleMode((prev) => !prev)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {customSampleMode ? 'Select from list' : '+ Custom Specimen'}
                    </button>
                  </div>
                  {customSampleMode ? (
                    <input
                      id="sample-type-input"
                      aria-label="Sample Type"
                      className={`ui-input w-full ${sampleTypeError ? 'has-error' : ''}`}
                      type="text"
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, sample_type: true }))}
                      placeholder="Type custom specimen..."
                    />
                  ) : (
                    <SearchableSelect
                      id="sample-type-input"
                      aria-label="Sample Type"
                      value={sampleType}
                      onChange={(val) => {
                        setSampleType(val);
                        setTouched((prev) => ({ ...prev, sample_type: true }));
                      }}
                      options={sampleTypeOptions}
                      placeholder="Select sample type..."
                      searchPlaceholder="Search specimen (e.g. Whole Blood, Serum, Urine)..."
                      clearable
                      onClear={() => {
                        setSampleType('');
                        setTouched((prev) => ({ ...prev, sample_type: true }));
                      }}
                      accentTone="blue"
                    />
                  )}
                  {sampleTypeError && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>{sampleTypeError}</span>
                    </div>
                  )}
                </div>

                {/* Field 6: Service Price */}
                <div>
                  <label
                    htmlFor="service-price-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Service Price (₹)
                  </label>
                  <div className="relative flex items-center">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400 z-10">
                      <IndianRupee size={14} />
                    </div>
                    <input
                      id="service-price-input"
                      className={`ui-input price-input-field w-full font-medium ${priceError ? 'has-error' : ''}`}
                      style={{ paddingLeft: '36px' }}
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={handlePriceChange}
                      onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                      placeholder="0.00"
                    />
                  </div>
                  {priceError && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>{priceError}</span>
                    </div>
                  )}
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Standard lab billing charge / tariff
                  </span>
                </div>
              </div>

              {/* Field 4: Description */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="service-description-input"
                    className="block text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Description
                  </label>
                  <span
                    className={`text-[11px] flex items-center gap-1 ${
                      description.length > 2000 ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <FileText size={11} /> {description.length}/2000
                  </span>
                </div>
                <textarea
                  id="service-description-input"
                  className={`ui-textarea w-full ${descriptionError ? 'has-error' : ''}`}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                  placeholder="Provide test overview, clinical indications, methodology, or preparation guidelines (e.g. 10-12 hours fasting required)..."
                />
                {descriptionError && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-rose-600" />
                    <span>{descriptionError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Catalog Availability & Status (Field 7: Service Catalog Status) */}
          <div className="service-section-card">
            <div className="service-section-header">
              <div className="service-section-badge">
                <ShieldCheck size={14} />
              </div>
              <span className="service-section-tag">Catalog Availability & Status</span>
              <span className="service-section-subtitle hidden sm:inline">
                Referral prescription visibility
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                Service Catalog Status <span className="font-bold text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`service-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => {
                    setStatus('ACTIVE');
                    setTouched((prev) => ({ ...prev, status: true }));
                  }}
                >
                  <div className="service-radio-circle">
                    {status === 'ACTIVE' && <div className="service-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Active in Catalog
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Live
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Available for doctor prescriptions, linked lab attachments, and orders.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`service-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => {
                    setStatus('INACTIVE');
                    setTouched((prev) => ({ ...prev, status: true }));
                  }}
                >
                  <div className="service-radio-circle">
                    {status === 'INACTIVE' && <div className="service-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Inactive / Suspended
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Disabled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Temporarily paused. Hidden from doctor test requisition dropdowns.
                    </div>
                  </div>
                </button>
              </div>
              {statusError && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertCircle size={13} className="shrink-0 text-rose-600" />
                  <span>{statusError}</span>
                </div>
              )}
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
                <span>{service ? 'Save Changes' : 'Create Diagnostic Service'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
