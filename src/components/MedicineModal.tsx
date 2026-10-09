/* eslint-disable react-hooks/set-state-in-effect */
import { AlertCircle, Info, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { searchMedicinesWithAi } from '../services/aiMedicineService';
import type { AIMedicineSuggestion, DiscountType, Medicine, MedicineStatus } from '../types/pharmacy';
import { mapAiMedicineToFormData } from '../utils/aiMedicineMapper';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, SwitchRow } from './ui/Modal';
import { Alert } from './ui/primitives';

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

export default function MedicineModal({
  isOpen,
  onClose,
  medicine,
  onSave,
}: MedicineModalProps) {
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
      setDiscountType(medicine.discount_type ?? '');
      setDiscountValue(
        medicine.discount_value !== null && medicine.discount_value !== undefined
          ? String(medicine.discount_value)
          : ''
      );
      setFinalPrice(
        medicine.final_price !== null && medicine.final_price !== undefined
          ? String(medicine.final_price)
          : ''
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

  // Recalculate final price when MRP, discount type, or discount value change
  const handleMrpOrDiscountChange = (
    newMrp: string,
    newDiscType: DiscountType | '',
    newDiscVal: string
  ) => {
    const parsedMrp = parseFloat(newMrp);
    const parsedDisc = parseFloat(newDiscVal);

    if (isNaN(parsedMrp) || parsedMrp <= 0) {
      setFinalPrice('');
      return;
    }

    if (!newDiscType || isNaN(parsedDisc) || parsedDisc <= 0) {
      setFinalPrice(parsedMrp.toFixed(2));
      return;
    }

    let calculated = parsedMrp;
    if (newDiscType === 'Percentage') {
      calculated = parsedMrp - (parsedMrp * parsedDisc) / 100;
    } else if (newDiscType === 'Fixed Amount') {
      calculated = parsedMrp - parsedDisc;
    }

    setFinalPrice(Math.max(calculated, 0).toFixed(2));
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
      setAiError('Unable to retrieve medicine suggestions. Please try again or enter the details manually.');
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
      onClose={onClose}
      variant="drawer"
      size="xl"
      title={medicine ? 'Edit Medicine' : 'Add New Medicine'}
      description={
        medicine
          ? `Editing master record for ${medicine.medicine_name}`
          : 'Add a new medicine record to the clinical database.'
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <Section title="Basic Information">
            {/* Medicine Name with Request AI button */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="medicine-name-input"
                  className="ui-field-label text-xs font-semibold text-slate-800 m-0 cursor-pointer"
                >
                  Medicine Name <em className="text-rose-500 font-bold">*</em>
                </label>
                {!medicine && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRequestAi();
                    }}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50/90 hover:bg-teal-100 hover:text-teal-800 border border-teal-200/80 rounded-lg shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Search and auto-fill medicine details with AI"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-teal-600" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-teal-600" />
                        <span>Research Medicine using AI</span>
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
              <span className="ui-field-hint">Brand or trade name as dispensed</span>

              {/* AI Validation / Error notification */}
              {aiError && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiError('')}
                    className="text-rose-500 hover:text-rose-800 p-0.5"
                    aria-label="Dismiss error"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* AI Empty result message */}
              {aiEmptyNotice && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Info size={14} className="text-amber-600 shrink-0" />
                    <span>No relevant medicines found. You can enter details manually.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiEmptyNotice(false)}
                    className="text-amber-500 hover:text-amber-800 p-0.5"
                    aria-label="Dismiss notice"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* AI-assisted populated notice banner */}
              {isAiAssisted && (
                <div className="mt-2 p-2.5 rounded-lg bg-teal-50/80 border border-teal-200 text-teal-900 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-teal-600 shrink-0" />
                    <span>
                      <strong>AI-assisted details populated</strong> &bull; please review before saving.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiAssisted(false)}
                    className="text-teal-600 hover:text-teal-800 p-0.5"
                    title="Dismiss"
                    aria-label="Dismiss notice"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* AI Suggestions Dropdown Popover */}
              {showSuggestions && aiSuggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto"
                >
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-teal-600" />
                      AI Medicine Suggestions ({aiSuggestions.length})
                    </span>
                    <span className="text-[11px] text-slate-400">Click a formulation to auto-fill</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {aiSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectAiSuggestion(item)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-teal-50/70 focus:bg-teal-50/90 transition-colors group flex flex-col gap-1 cursor-pointer border border-transparent hover:border-teal-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs group-hover:text-teal-900">
                            {item.medicineName}
                          </span>
                          {item.prescriptionRequired ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Rx Required
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              OTC
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                          {item.genericName && (
                            <span className="font-medium text-slate-700">{item.genericName}</span>
                          )}
                          {item.genericName && (item.strength ?? item.dosageForm) && <span>&bull;</span>}
                          {item.strength && (
                            <span>
                              {item.strength} {item.strengthUnit}
                            </span>
                          )}
                          {item.dosageForm && <span>&bull; {item.dosageForm}</span>}
                          {item.manufacturer && <span className="text-slate-400">({item.manufacturer})</span>}
                          {item.mrp !== null && item.mrp !== undefined && (
                            <span className="text-slate-600 font-semibold">&bull; ₹{Number(item.mrp).toFixed(2)}</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                            {item.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="ui-grid-2">
              <Field label="Generic / Chemical Name" hint="Active pharmaceutical ingredient">
                <input
                  className="ui-input"
                  type="text"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="e.g. Paracetamol, Amoxicillin + Clavulanic Acid"
                />
              </Field>

              <Field label="Dosage Form">
                <input
                  className="ui-input"
                  list="dosage-forms"
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  placeholder="e.g. Tablet, Capsule, Syrup"
                />
                <datalist id="dosage-forms">
                  {COMMON_DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="ui-grid-2">
              <Field label="Strength (Value)">
                <input
                  className="ui-input"
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 500, 10, 250"
                />
              </Field>

              <Field label="Strength Unit">
                <input
                  className="ui-input"
                  list="strength-units"
                  value={strengthUnit}
                  onChange={(e) => setStrengthUnit(e.target.value)}
                  placeholder="e.g. mg, mcg, ml, IU"
                />
                <datalist id="strength-units">
                  {COMMON_STRENGTH_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
            </div>
          </Section>

          <Section title="Classification & Manufacturer">
            <div className="ui-grid-2">
              <Field label="Therapeutic Category">
                <input
                  className="ui-input"
                  list="therapeutic-categories"
                  value={therapeuticCategory}
                  onChange={(e) => setTherapeuticCategory(e.target.value)}
                  placeholder="e.g. Analgesics, Antibiotics"
                />
                <datalist id="therapeutic-categories">
                  {COMMON_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field label="Sub Category">
                <input
                  className="ui-input"
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="e.g. Pain Relief, NSAIDs"
                />
              </Field>
            </div>

            <div className="ui-grid-2">
              <Field label="Manufacturer / Company">
                <input
                  className="ui-input"
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Cipla, Sun Pharma, Dr. Reddy's"
                />
              </Field>

              <Field label="Medicine Code / SKU">
                <input
                  className="ui-input"
                  type="text"
                  value={medicineCode}
                  onChange={(e) => setMedicineCode(e.target.value)}
                  placeholder="e.g. MED-PARA-500"
                />
              </Field>
            </div>

            <SwitchRow
              checked={prescriptionRequired}
              onChange={setPrescriptionRequired}
              title="Prescription Required (Rx)"
              description="Requires a valid doctor's prescription for patient orders."
            />
          </Section>

          <Section title="Pricing & Inventory">
            <div className="ui-grid-2">
              <Field label="MRP (₹)" hint="Maximum Retail Price">
                <input
                  className="ui-input"
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
              </Field>

              <Field label="Barcode / EAN">
                <input
                  className="ui-input"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                />
              </Field>
            </div>

            <div className="ui-grid-3">
              <Field label="Discount Type">
                <select
                  className="ui-select"
                  value={discountType}
                  onChange={(e) => {
                    const newType = e.target.value as DiscountType | '';
                    setDiscountType(newType);
                    handleMrpOrDiscountChange(mrp, newType, discountValue);
                  }}
                >
                  <option value="">No Discount</option>
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Fixed Amount">Fixed Amount (₹)</option>
                </select>
              </Field>

              <Field label="Discount Value">
                <input
                  className="ui-input"
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
              </Field>

              <Field label="Final Price (₹)" hint="Effective selling price">
                <input
                  className="ui-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </Section>

          <Section title="Prescription Defaults & Instructions">
            <div className="ui-grid-2">
              <Field label="Default Frequency" hint="Suggested dosage schedule">
                <input
                  className="ui-input"
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g. 1-0-1, 1-1-1, Once daily"
                />
              </Field>

              <Field label="Default Duration" hint="Suggested treatment length">
                <input
                  className="ui-input"
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 5 days, 14 days, 1 month"
                />
              </Field>
            </div>

            <Field label="Description & Usage Notes">
              <textarea
                className="ui-textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Take after meals with a glass of water. Store in a cool dry place."
              />
            </Field>

            <SwitchRow
              checked={status === 'Active'}
              onChange={(active) => setStatus(active ? 'Active' : 'Inactive')}
              title="Active in Clinical Master"
              description="Make this medicine available for prescription selection and pharmacy order flows."
            />
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn" disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving...' : medicine ? 'Save Changes' : 'Create Medicine'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
