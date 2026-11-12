import {
  AlertCircle,
  Check,
  FileText,
  FlaskConical,
  IndianRupee,
  Info,
  Loader2,
  Pill,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { searchMedicinesWithAi } from '../services/aiMedicineService';
import type {
  AIMedicineSuggestion,
  DiscountType,
  Medicine,
  MedicineStatus,
} from '../types/pharmacy';
import { mapAiMedicineToFormData } from '../utils/aiMedicineMapper';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { calculateFinalPrice, validateDiscount } from '../utils/pricing';
import { Modal } from './ui/Modal';
import SearchableSelect, { type SearchableSelectOption } from './ui/SearchableSelect';

interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  onSave: () => void;
}

const COMMON_DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Ointment',
  'Cream',
  'Gel',
  'Drops',
  'Inhaler',
  'Lotion',
  'Powder',
  'Spray',
  'Solution',
  'Suppository',
];

const COMMON_STRENGTH_UNITS = ['mg', 'g', 'mcg', 'ml', 'IU', '%', 'mg/ml', 'mg/5ml'];

const COMMON_CATEGORIES = [
  'Analgesics / Antipyretic',
  'Antibiotics & Antivirals',
  'Antidiabetic',
  'Cardiovascular & Blood Pressure',
  'Gastrointestinal & Antacids',
  'Respiratory & Allergy',
  'Dermatological',
  'Neurological & Psychiatric',
  'Vitamins, Minerals & Supplements',
  'Ophthalmological / Eye Care',
  'ENT & Oral Care',
  'Orthopedic & Anti-inflammatory',
  'General / Other',
];

const DISCOUNT_TYPE_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'No Discount' },
  { value: 'Percentage', label: 'Percentage (%)', badgeTone: 'violet' },
  { value: 'Fixed Amount', label: 'Fixed Amount (₹)', badgeTone: 'violet' },
];

function normalizeMasterDiscountType(raw?: string | null): DiscountType | '' {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (s.includes('PERCENT')) return 'Percentage';
  if (s.includes('FIXED') || s.includes('FLAT') || s.includes('AMOUNT')) return 'Fixed Amount';
  return '';
}

export default function MedicineModal({ isOpen, onClose, medicine, onSave }: MedicineModalProps) {
  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [strength, setStrength] = useState('');
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [therapeuticCategory, setTherapeuticCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [status, setStatus] = useState<MedicineStatus>('Active');
  const [medicineCode, setMedicineCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [mrp, setMrp] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType | ''>('');
  const [discountValue, setDiscountValue] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI-Assisted Search state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIMedicineSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiEmptyNotice, setAiEmptyNotice] = useState(false);
  const [isAiAssisted, setIsAiAssisted] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (medicine) {
      setMedicineName(medicine.medicine_name ?? '');
      setGenericName(medicine.generic_name ?? '');
      setDosageForm(medicine.dosage_form ?? 'Tablet');
      setStrength(medicine.strength ?? '');
      setStrengthUnit(medicine.strength_unit ?? 'mg');
      setTherapeuticCategory(medicine.therapeutic_category ?? '');
      setSubCategory(medicine.sub_category ?? '');
      setManufacturer(medicine.manufacturer ?? '');
      setPrescriptionRequired(Boolean(medicine.prescription_required));
      setStatus(medicine.status ?? 'Active');
      setMedicineCode(medicine.medicine_code ?? '');
      setBarcode(medicine.barcode ?? '');
      setMrp(medicine.mrp !== null && medicine.mrp !== undefined ? String(medicine.mrp) : '');
      setDiscountType(normalizeMasterDiscountType(medicine.discount_type));
      setDiscountValue(
        medicine.discount_value !== null && medicine.discount_value !== undefined
          ? String(medicine.discount_value)
          : '',
      );
      setFinalPrice(
        medicine.final_price !== null && medicine.final_price !== undefined
          ? String(medicine.final_price)
          : '',
      );
      setFrequency(medicine.frequency ?? '');
      setDuration(medicine.duration ?? '');
      setDescription(medicine.description ?? '');
    } else {
      setMedicineName('');
      setGenericName('');
      setDosageForm('Tablet');
      setStrength('');
      setStrengthUnit('mg');
      setTherapeuticCategory('');
      setSubCategory('');
      setManufacturer('');
      setPrescriptionRequired(false);
      setStatus('Active');
      setMedicineCode('');
      setBarcode('');
      setMrp('');
      setDiscountType('');
      setDiscountValue('');
      setFinalPrice('');
      setFrequency('');
      setDuration('');
      setDescription('');
    }
    setError('');
    setAiLoading(false);
    setAiSuggestions([]);
    setShowSuggestions(false);
    setAiError('');
    setAiEmptyNotice(false);
    setIsAiAssisted(false);
  }, [medicine, isOpen]);

  // Handle clicking outside the AI suggestions dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Options memoization for SearchableSelect
  const dosageFormOptions = useMemo<SearchableSelectOption[]>(() => {
    const forms = [...COMMON_DOSAGE_FORMS];
    if (dosageForm && !forms.includes(dosageForm)) {
      forms.unshift(dosageForm);
    }
    return forms.map((f) => ({ value: f, label: f }));
  }, [dosageForm]);

  const strengthUnitOptions = useMemo<SearchableSelectOption[]>(() => {
    const units = [...COMMON_STRENGTH_UNITS];
    if (strengthUnit && !units.includes(strengthUnit)) {
      units.unshift(strengthUnit);
    }
    return units.map((u) => ({ value: u, label: u }));
  }, [strengthUnit]);

  const categoryOptions = useMemo<SearchableSelectOption[]>(() => {
    const categories = [...COMMON_CATEGORIES];
    if (therapeuticCategory && !categories.includes(therapeuticCategory)) {
      categories.unshift(therapeuticCategory);
    }
    return categories.map((c) => ({ value: c, label: c }));
  }, [therapeuticCategory]);

  // Recalculate final price when MRP, discount type, or discount value change
  const handleMrpOrDiscountChange = (
    newMrp: string,
    newDiscType: DiscountType | '',
    newDiscVal: string,
  ) => {
    const parsedMrp = parseFloat(newMrp);
    const parsedDisc = parseFloat(newDiscVal);

    if (isNaN(parsedMrp) || parsedMrp <= 0) {
      setFinalPrice('');
      return;
    }

    const calculated = calculateFinalPrice(
      parsedMrp,
      newDiscType || null,
      !isNaN(parsedDisc) ? parsedDisc : null,
    );

    setFinalPrice(calculated !== null ? calculated.toFixed(2) : '');
  };

  const handleRequestAi = async () => {
    const trimmed = medicineName.trim();
    if (!trimmed) {
      setAiError('Enter a medicine name before requesting AI suggestions.');
      setAiEmptyNotice(false);
      setShowSuggestions(false);
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiEmptyNotice(false);
    setShowSuggestions(false);

    try {
      const results = await searchMedicinesWithAi(trimmed);
      if (!results || results.length === 0) {
        setAiEmptyNotice(true);
        setAiSuggestions([]);
        setShowSuggestions(false);
      } else {
        setAiSuggestions(results);
        setShowSuggestions(true);
        setAiEmptyNotice(false);
      }
    } catch {
      setAiError(
        'Unable to retrieve medicine suggestions. Please try again or enter the details manually.',
      );
      setAiSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectAiSuggestion = (item: AIMedicineSuggestion) => {
    const mapped = mapAiMedicineToFormData(item);

    setMedicineName(mapped.medicineName);
    setGenericName(mapped.genericName);
    setDosageForm(mapped.dosageForm);
    setStrength(mapped.strength);
    setStrengthUnit(mapped.strengthUnit);
    setTherapeuticCategory(mapped.therapeuticCategory);
    setSubCategory(mapped.subCategory);
    setManufacturer(mapped.manufacturer);
    setPrescriptionRequired(mapped.prescriptionRequired);
    setStatus(mapped.status);
    setMedicineCode(mapped.medicineCode);
    setBarcode(mapped.barcode);
    setMrp(mapped.mrp);
    setDiscountType(mapped.discountType);
    setDiscountValue(mapped.discountValue);
    setFinalPrice(mapped.finalPrice);
    setFrequency(mapped.frequency);
    setDuration(mapped.duration);
    setDescription(mapped.description);

    setShowSuggestions(false);
    setIsAiAssisted(true);
    setAiError('');
    setAiEmptyNotice(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!medicineName.trim()) {
      setError('Medicine name is required.');
      return;
    }

    const discountValidationError = validateDiscount(
      mrp ? parseFloat(mrp) : null,
      discountType || null,
      discountValue ? parseFloat(discountValue) : null,
    );
    if (discountValidationError) {
      setError(discountValidationError);
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      medicineName: medicineName.trim(),
      genericName: genericName.trim() ? genericName.trim() : null,
      dosageForm: dosageForm.trim() ? dosageForm.trim() : null,
      strength: strength.trim() ? strength.trim() : null,
      strengthUnit: strengthUnit.trim() ? strengthUnit.trim() : null,
      therapeuticCategory: therapeuticCategory.trim() ? therapeuticCategory.trim() : null,
      subCategory: subCategory.trim() ? subCategory.trim() : null,
      manufacturer: manufacturer.trim() ? manufacturer.trim() : null,
      prescriptionRequired,
      status,
      medicineCode: medicineCode.trim() ? medicineCode.trim() : null,
      barcode: barcode.trim() ? barcode.trim() : null,
      mrp: mrp ? parseFloat(mrp) : null,
      discountType: discountType ? discountType : null,
      discountValue: discountValue ? parseFloat(discountValue) : null,
      finalPrice: finalPrice ? parseFloat(finalPrice) : null,
      frequency: frequency.trim() ? frequency.trim() : null,
      duration: duration.trim() ? duration.trim() : null,
      description: description.trim() ? description.trim() : null,
    };

    try {
      if (medicine) {
        await api.put(`medicines/${medicine.id}`, payload);
      } else {
        await api.post('medicines', payload);
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save medicine.'));
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
      className="medicine-drawer-modal"
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
            <Pill size={19} style={{ display: 'block', margin: 'auto' }} />
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
              {medicine ? 'Edit Medicine' : 'Create New Medicine'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {medicine
                ? `Editing master record for ${medicine.medicine_name}${medicine.medicine_code ? ` · ${medicine.medicine_code}` : ''}`
                : 'Add a new medicine record to the clinical database'}
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
          .medicine-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .medicine-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .medicine-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .med-section-card {
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
          .med-section-card:hover {
            border-color: #cbd5e1;
          }
          .med-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .med-section-badge {
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
          .med-section-badge svg {
            display: block;
            margin: auto;
          }
          .med-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .med-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .medicine-drawer-modal .ui-input,
          .medicine-drawer-modal .ui-textarea {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .medicine-drawer-modal .ui-textarea {
            height: auto;
            padding: 8px 12px;
          }
          .medicine-drawer-modal .ui-input:focus,
          .medicine-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .med-status-btn {
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
          .med-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .med-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .med-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .med-radio-circle {
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
          .med-status-btn.is-active .med-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .med-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .medicine-drawer-modal .ui-modal-foot {
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

          {/* Section 1: Basic Information & AI Research */}
          <div className="med-section-card">
            <div className="med-section-header">
              <div className="med-section-badge">
                <Pill size={14} />
              </div>
              <span className="med-section-tag">Basic Information</span>
              <span className="med-section-subtitle hidden sm:inline">
                Trade name and active chemical ingredient
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Medicine Name with AI research trigger */}
              <div className="relative">
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="medicine-name-input"
                    className="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Medicine Name <span className="font-bold text-rose-500">*</span>
                  </label>
                  {!medicine && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleRequestAi();
                      }}
                      disabled={aiLoading}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/90 px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-2xs transition-all hover:bg-purple-100 hover:text-purple-800 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Search and auto-fill medicine details using AI"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-purple-600" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="text-purple-600" />
                          <span>Research Medicine with AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  id="medicine-name-input"
                  className="ui-input w-full"
                  type="text"
                  value={medicineName}
                  onChange={(e) => {
                    setMedicineName(e.target.value);
                    setAiError('');
                    setAiEmptyNotice(false);
                  }}
                  required
                  placeholder="e.g. Paracetamol 500mg, Augmentin 625 Duo"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Brand or commercial trade name as dispensed
                </span>

                {/* AI Error Alert */}
                {aiError && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0 text-rose-600" />
                      <span>{aiError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiError('')}
                      className="p-0.5 text-rose-500 hover:text-rose-800 cursor-pointer"
                      aria-label="Dismiss error"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* AI Empty Notice */}
                {aiEmptyNotice && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5">
                      <Info size={14} className="shrink-0 text-amber-600" />
                      <span>No matching medicines found. You can enter details manually below.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiEmptyNotice(false)}
                      className="p-0.5 text-amber-500 hover:text-amber-800 cursor-pointer"
                      aria-label="Dismiss notice"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* AI-populated Notification */}
                {isAiAssisted && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/80 p-2.5 text-xs text-purple-900">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="shrink-0 text-purple-600" />
                      <span>
                        <strong>AI details populated</strong> &bull; please review formulation and pricing before saving.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiAssisted(false)}
                      className="p-0.5 text-purple-600 hover:text-purple-800 cursor-pointer"
                      title="Dismiss"
                      aria-label="Dismiss notice"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* AI Suggestions Popover Dropdown */}
                {showSuggestions && aiSuggestions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-72 divide-y divide-slate-100 overflow-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Sparkles size={13} className="text-purple-600" />
                        AI Medicine Formulations ({aiSuggestions.length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Click a suggestion to auto-fill
                      </span>
                    </div>
                    <div className="space-y-0.5 p-1">
                      {aiSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAiSuggestion(item)}
                          className="group flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-transparent p-2.5 text-left transition-colors hover:border-purple-200 hover:bg-purple-50/70 focus:bg-purple-50/90"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-purple-900">
                              {item.medicineName}
                            </span>
                            {item.prescriptionRequired ? (
                              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                Rx Required
                              </span>
                            ) : (
                              <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                OTC
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            {item.genericName && (
                              <span className="font-medium text-slate-700">{item.genericName}</span>
                            )}
                            {item.genericName && (item.strength ?? item.dosageForm) && (
                              <span>&bull;</span>
                            )}
                            {item.strength && (
                              <span>
                                {item.strength} {item.strengthUnit}
                              </span>
                            )}
                            {item.dosageForm && <span>&bull; {item.dosageForm}</span>}
                            {item.manufacturer && (
                              <span className="text-slate-400">({item.manufacturer})</span>
                            )}
                            {item.mrp !== null && item.mrp !== undefined && (
                              <span className="font-semibold text-slate-700">
                                &bull; ₹{Number(item.mrp).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="line-clamp-1 text-[10px] text-slate-500 italic">
                              {item.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Generic Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Generic / Chemical Name
                </label>
                <input
                  className="ui-input w-full"
                  type="text"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="e.g. Paracetamol, Amoxicillin + Clavulanic Acid"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Active pharmaceutical ingredient (API)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Formulation & Dosage */}
          <div className="med-section-card">
            <div className="med-section-header">
              <div className="med-section-badge">
                <FlaskConical size={14} />
              </div>
              <span className="med-section-tag">Formulation & Dosage</span>
              <span className="med-section-subtitle hidden sm:inline">
                Form, strength value, and measurement unit
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Dosage Form <span className="font-bold text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={dosageForm}
                  onChange={(val) => setDosageForm(val)}
                  options={dosageFormOptions}
                  placeholder="Select dosage form..."
                  searchPlaceholder="Search forms (e.g. Tablet, Syrup)..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Strength Value
                </label>
                <input
                  className="ui-input w-full"
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 500, 625, 10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Strength Unit
                </label>
                <SearchableSelect
                  value={strengthUnit}
                  onChange={(val) => setStrengthUnit(val)}
                  options={strengthUnitOptions}
                  placeholder="Select unit..."
                  searchPlaceholder="Search unit (e.g. mg, ml)..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Classification & Manufacturer */}
          <div className="med-section-card">
            <div className="med-section-header">
              <div className="med-section-badge">
                <Tag size={14} />
              </div>
              <span className="med-section-tag">Classification & Manufacturer</span>
              <span className="med-section-subtitle hidden sm:inline">
                Therapeutic category, pharma manufacturer, and Rx status
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Therapeutic Category
                  </label>
                  <SearchableSelect
                    value={therapeuticCategory}
                    onChange={(val) => setTherapeuticCategory(val)}
                    options={categoryOptions}
                    placeholder="Select category..."
                    searchPlaceholder="Search categories..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Sub Category
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="e.g. Pain Relief, NSAIDs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Manufacturer / Pharma Company
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Cipla, Sun Pharma, Dr. Reddy's"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Medicine Code / SKU
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={medicineCode}
                    onChange={(e) => setMedicineCode(e.target.value)}
                    placeholder="e.g. MED-PARA-500"
                  />
                </div>
              </div>

              {/* Prescription Requirement Switch Card */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: prescriptionRequired ? '#eff6ff' : '#f1f5f9',
                      color: prescriptionRequired ? '#2563eb' : '#64748b',
                      border: prescriptionRequired ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={17} style={{ display: 'block', margin: 'auto' }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      Prescription Required (Rx Schedule)
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          prescriptionRequired
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {prescriptionRequired ? 'Mandatory Rx' : 'OTC Allowed'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {prescriptionRequired
                        ? 'Requires a registered doctor prescription before patient orders can be completed.'
                        : 'Over-the-counter medicine. Can be dispensed without medical prescription.'}
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={prescriptionRequired}
                    onChange={(e) => setPrescriptionRequired(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Master Pricing Defaults */}
          <div className="med-section-card">
            <div className="med-section-header">
              <div className="med-section-badge">
                <IndianRupee size={14} />
              </div>
              <span className="med-section-tag">
                {medicine ? 'Master Pricing Defaults' : 'Initial Variant Formulation & Pricing'}
              </span>
              <span className="med-section-subtitle hidden sm:inline">
                MRP, standard discounts, and effective selling price
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    MRP (₹) <span className="text-[11px] font-normal text-slate-500">(Max Retail Price)</span>
                  </label>
                  <input
                    className="ui-input w-full font-medium"
                    type="number"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={(e) => {
                      setMrp(e.target.value);
                      handleMrpOrDiscountChange(e.target.value, discountType, discountValue);
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Barcode / EAN
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 8901234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Discount Type
                  </label>
                  <SearchableSelect
                    value={discountType}
                    onChange={(val) => {
                      const newType = val as DiscountType | '';
                      setDiscountType(newType);
                      handleMrpOrDiscountChange(mrp, newType, discountValue);
                    }}
                    options={DISCOUNT_TYPE_OPTIONS}
                    placeholder="Select discount..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Discount Value
                  </label>
                  <input
                    className="ui-input w-full"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={(e) => {
                      setDiscountValue(e.target.value);
                      handleMrpOrDiscountChange(mrp, discountType, e.target.value);
                    }}
                    disabled={!discountType}
                    placeholder={discountType === 'Percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Final Price (₹) <span className="text-[11px] font-normal text-slate-500">(Effective rate)</span>
                  </label>
                  <input
                    className="ui-input w-full font-bold text-emerald-700"
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Clinical Instructions & Master Status */}
          <div className="med-section-card">
            <div className="med-section-header">
              <div className="med-section-badge">
                <FileText size={14} />
              </div>
              <span className="med-section-tag">Prescription Instructions & Status</span>
              <span className="med-section-subtitle hidden sm:inline">
                Default schedules and catalog availability
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Default Frequency
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. 1-0-1, 1-1-1, Once daily"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Suggested dosage schedule for prescription orders
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Default Duration
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 5 days, 14 days, 1 month"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Suggested treatment length
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Clinical Description & Usage Notes
                </label>
                <textarea
                  className="ui-textarea w-full"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Take after meals with a glass of water. Store in a cool dry place away from sunlight."
                />
              </div>

              {/* Master Status Selection Cards */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Master Catalog Status <span className="font-bold text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={`med-status-btn ${status === 'Active' ? 'is-active' : ''}`}
                    onClick={() => setStatus('Active')}
                  >
                    <div className="med-radio-circle">
                      {status === 'Active' && <div className="med-radio-inner" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Active in Catalog
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          Live
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Available for prescription selection, stock tracking, and pharmacy sales.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`med-status-btn ${status === 'Inactive' ? 'is-active' : ''}`}
                    onClick={() => setStatus('Inactive')}
                  >
                    <div className="med-radio-circle">
                      {status === 'Inactive' && <div className="med-radio-inner" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Inactive / Suspended
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          Disabled
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Temporarily hidden from prescribing doctors and new order creation.
                      </div>
                    </div>
                  </button>
                </div>
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
                <span>{medicine ? 'Save Changes' : 'Create Medicine'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
