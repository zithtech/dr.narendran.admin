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

export function validateMedicineName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Medicine name is required.';
  if (trimmed.length < 2) return 'Medicine name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Medicine name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&\-+/()]/i.test(trimmed)) {
    return 'Medicine name contains invalid characters.';
  }
  return undefined;
}

export function validateGenericName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 150) return 'Generic name cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&\-+/()]/i.test(trimmed)) {
    return 'Generic name contains invalid characters.';
  }
  return undefined;
}

export function validateStrength(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 50) return 'Strength cannot exceed 50 characters.';
  if (/[^0-9a-zA-Z\s.,/+\-]/i.test(trimmed)) {
    return 'Strength contains invalid characters.';
  }
  return undefined;
}

export function validateSubCategory(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'Sub category cannot exceed 100 characters.';
  if (/[0-9]/.test(val)) return 'Numbers are not allowed in sub category.';
  if (/[^a-zA-Z\s\-/]/.test(val)) {
    return 'Sub category can only contain letters, spaces, hyphens, and slashes.';
  }
  return undefined;
}

export function validateManufacturer(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 150) return 'Manufacturer cannot exceed 150 characters.';
  if (/[^a-zA-Z0-9\s.,'&-]/i.test(trimmed)) {
    return 'Manufacturer contains invalid characters.';
  }
  return undefined;
}

export function validateMedicineCode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 50) return 'Medicine code cannot exceed 50 characters.';
  if (/[^a-zA-Z0-9-_]/.test(trimmed)) {
    return 'Medicine code can only contain letters, numbers, hyphens, and underscores.';
  }
  return undefined;
}

export function validateBarcode(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 50) return 'Barcode cannot exceed 50 characters.';
  if (/[^a-zA-Z0-9-]/.test(trimmed)) {
    return 'Barcode can only contain letters, numbers, and hyphens.';
  }
  return undefined;
}

export function validateMrp(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed);
  if (isNaN(n) || (trimmed.match(/\./g) || []).length > 1 || /[^0-9.-]/.test(trimmed)) {
    return 'MRP must be a valid number.';
  }
  if (n < 0) return 'MRP cannot be negative.';
  if (n > 999999.99) return 'MRP cannot exceed 999,999.99.';
  return undefined;
}

export function validateDiscountValue(
  val: string,
  discountType: string,
  mrpVal?: string,
): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed);
  if (isNaN(n) || (trimmed.match(/\./g) || []).length > 1 || /[^0-9.-]/.test(trimmed)) {
    return 'Discount value must be a valid number.';
  }
  if (n < 0) return 'Discount value cannot be negative.';
  if (discountType === 'Percentage' || discountType === 'PERCENTAGE') {
    if (n > 100) return 'Percentage discount cannot exceed 100%.';
  }
  if (
    (discountType === 'Fixed Amount' || discountType === 'FLAT' || discountType === 'Fixed') &&
    mrpVal
  ) {
    const m = parseFloat(mrpVal);
    if (!isNaN(m) && n > m) return 'Fixed discount cannot exceed MRP.';
  }
  return undefined;
}

export function validateFinalPrice(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed);
  if (isNaN(n) || (trimmed.match(/\./g) || []).length > 1 || /[^0-9.-]/.test(trimmed)) {
    return 'Final price must be a valid number.';
  }
  if (n < 0) return 'Final price cannot be negative.';
  if (n > 999999.99) return 'Final price cannot exceed 999,999.99.';
  return undefined;
}

export function validateFrequency(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'Frequency cannot exceed 100 characters.';
  if (/[^a-zA-Z0-9\s\-/+,]/.test(val)) return 'Frequency contains invalid characters.';
  return undefined;
}

export function validateDuration(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'Duration cannot exceed 100 characters.';
  if (/[^a-zA-Z0-9\s\-]/.test(val)) return 'Duration contains invalid characters.';
  return undefined;
}

interface MedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  onSave: (savedMedicine?: Medicine) => void;
  initialMedicineName?: string | undefined;
  zIndex?: number | undefined;
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

export default function MedicineModal({
  isOpen,
  onClose,
  medicine,
  onSave,
  initialMedicineName,
  zIndex,
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

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
      setMedicineName(medicine.medicine_name || '');
      setGenericName(medicine.generic_name || '');
      setDosageForm(medicine.dosage_form || 'Tablet');
      setStrength(medicine.strength || '');
      setStrengthUnit(medicine.strength_unit || 'mg');
      setTherapeuticCategory(medicine.therapeutic_category || '');
      setSubCategory(medicine.sub_category || '');
      setManufacturer(medicine.manufacturer || '');
      setPrescriptionRequired(medicine.prescription_required ?? false);
      setStatus(medicine.status || 'Active');
      setMedicineCode(medicine.medicine_code || '');
      setBarcode(medicine.barcode || '');
      setMrp(medicine.mrp !== null && medicine.mrp !== undefined ? String(medicine.mrp) : '');
      const normalizedDiscType = normalizeMasterDiscountType(medicine.discount_type);
      setDiscountType(normalizedDiscType);
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
      setFrequency(medicine.frequency || '');
      setDuration(medicine.duration || '');
      setDescription(medicine.description || '');
    } else {
      setMedicineName(initialMedicineName?.trim() ?? '');
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
    setErrors({});
    setTouched({});
    setAiError('');
    setAiEmptyNotice(false);
    setShowSuggestions(false);
    setIsAiAssisted(false);
  }, [medicine, isOpen, initialMedicineName]);

  // Close AI suggestion dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSuggestions]);

  // Memoized options for SearchableSelect
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
    setErrors({});
    setTouched({});
  };

  // Real-time input handlers
  const handleMedicineNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,'&\-+/()]/g, '').slice(0, 150);
    setMedicineName(sanitized);
    setAiError('');
    setAiEmptyNotice(false);
    if (touched.medicineName) {
      setErrors((prev) => ({ ...prev, medicineName: validateMedicineName(sanitized) }));
    }
  };

  const handleGenericNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,'&\-+/()]/g, '').slice(0, 150);
    setGenericName(sanitized);
    if (touched.genericName) {
      setErrors((prev) => ({ ...prev, genericName: validateGenericName(sanitized) }));
    }
  };

  const handleStrengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9a-zA-Z\s.,/+\-]/g, '').slice(0, 50);
    setStrength(sanitized);
    if (touched.strength) {
      setErrors((prev) => ({ ...prev, strength: validateStrength(sanitized) }));
    }
  };

  const handleSubCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s\-/]/g, '').slice(0, 100);
    setSubCategory(sanitized);
    if (touched.subCategory) {
      setErrors((prev) => ({ ...prev, subCategory: validateSubCategory(sanitized) }));
    }
  };

  const handleManufacturerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,'&-]/g, '').slice(0, 150);
    setManufacturer(sanitized);
    if (touched.manufacturer) {
      setErrors((prev) => ({ ...prev, manufacturer: validateManufacturer(sanitized) }));
    }
  };

  const handleMedicineCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 50);
    setMedicineCode(sanitized);
    if (touched.medicineCode) {
      setErrors((prev) => ({ ...prev, medicineCode: validateMedicineCode(sanitized) }));
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50);
    setBarcode(sanitized);
    if (touched.barcode) {
      setErrors((prev) => ({ ...prev, barcode: validateBarcode(sanitized) }));
    }
  };

  const handleMrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitized = e.target.value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    setMrp(sanitized);
    handleMrpOrDiscountChange(sanitized, discountType, discountValue);
    if (touched.mrp) {
      setErrors((prev) => ({ ...prev, mrp: validateMrp(sanitized) }));
    }
    if (touched.discountValue) {
      setErrors((prev) => ({
        ...prev,
        discountValue: validateDiscountValue(discountValue, discountType, sanitized),
      }));
    }
  };

  const handleDiscountValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitized = e.target.value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    setDiscountValue(sanitized);
    handleMrpOrDiscountChange(mrp, discountType, sanitized);
    if (touched.discountValue) {
      setErrors((prev) => ({
        ...prev,
        discountValue: validateDiscountValue(sanitized, discountType, mrp),
      }));
    }
  };

  const handleFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitized = e.target.value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    setFinalPrice(sanitized);
    if (touched.finalPrice) {
      setErrors((prev) => ({ ...prev, finalPrice: validateFinalPrice(sanitized) }));
    }
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s\-/+,]/g, '').slice(0, 100);
    setFrequency(sanitized);
    if (touched.frequency) {
      setErrors((prev) => ({ ...prev, frequency: validateFrequency(sanitized) }));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s\-]/g, '').slice(0, 100);
    setDuration(sanitized);
    if (touched.duration) {
      setErrors((prev) => ({ ...prev, duration: validateDuration(sanitized) }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'medicineName') err = validateMedicineName(medicineName);
    else if (field === 'genericName') err = validateGenericName(genericName);
    else if (field === 'strength') err = validateStrength(strength);
    else if (field === 'subCategory') err = validateSubCategory(subCategory);
    else if (field === 'manufacturer') err = validateManufacturer(manufacturer);
    else if (field === 'medicineCode') err = validateMedicineCode(medicineCode);
    else if (field === 'barcode') err = validateBarcode(barcode);
    else if (field === 'mrp') err = validateMrp(mrp);
    else if (field === 'discountValue')
      err = validateDiscountValue(discountValue, discountType, mrp);
    else if (field === 'finalPrice') err = validateFinalPrice(finalPrice);
    else if (field === 'frequency') err = validateFrequency(frequency);
    else if (field === 'duration') err = validateDuration(duration);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateMedicineName(medicineName);
    const genericErr = validateGenericName(genericName);
    const strengthErr = validateStrength(strength);
    const subCatErr = validateSubCategory(subCategory);
    const mfgErr = validateManufacturer(manufacturer);
    const codeErr = validateMedicineCode(medicineCode);
    const barcodeErr = validateBarcode(barcode);
    const mrpErr = validateMrp(mrp);
    const discErr = validateDiscountValue(discountValue, discountType, mrp);
    const finalPriceErr = validateFinalPrice(finalPrice);
    const freqErr = validateFrequency(frequency);
    const durErr = validateDuration(duration);

    const discountValidationError = validateDiscount(
      mrp ? parseFloat(mrp) : null,
      discountType || null,
      discountValue ? parseFloat(discountValue) : null,
    );

    const newErrors: Record<string, string | undefined> = {
      medicineName: nameErr,
      genericName: genericErr,
      strength: strengthErr,
      subCategory: subCatErr,
      manufacturer: mfgErr,
      medicineCode: codeErr,
      barcode: barcodeErr,
      mrp: mrpErr,
      discountValue: discErr || discountValidationError || undefined,
      finalPrice: finalPriceErr,
      frequency: freqErr,
      duration: durErr,
    };

    setErrors(newErrors);
    setTouched({
      medicineName: true,
      genericName: true,
      strength: true,
      subCategory: true,
      manufacturer: true,
      medicineCode: true,
      barcode: true,
      mrp: true,
      discountValue: true,
      finalPrice: true,
      frequency: true,
      duration: true,
    });

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setError('Please correct the highlighted fields before saving.');
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
      let savedMedicine: Medicine | undefined;
      if (medicine) {
        const res = await api.put<Medicine>(`medicines/${medicine.id}`, payload);
        savedMedicine = res?.data;
      } else {
        const res = await api.post<Medicine>('medicines', payload);
        savedMedicine = res?.data;
      }
      onSave(savedMedicine);
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
      zIndex={zIndex}
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
        noValidate
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
                  onChange={handleMedicineNameChange}
                  onBlur={() => handleBlur('medicineName')}
                  placeholder="e.g. Paracetamol 500mg, Augmentin 625 Duo"
                  style={{
                    borderColor: errors.medicineName ? '#ef4444' : undefined,
                    boxShadow: errors.medicineName
                      ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                      : undefined,
                  }}
                />
                {errors.medicineName && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.medicineName}
                  </span>
                )}

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
                        <strong>AI details populated</strong> &bull; please review formulation and
                        pricing before saving.
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
                <label
                  htmlFor="medicine-generic-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Generic / Chemical Name
                </label>
                <input
                  id="medicine-generic-input"
                  className="ui-input w-full"
                  type="text"
                  value={genericName}
                  onChange={handleGenericNameChange}
                  onBlur={() => handleBlur('genericName')}
                  placeholder="e.g. Paracetamol, Amoxicillin + Clavulanic Acid"
                  style={{
                    borderColor: errors.genericName ? '#ef4444' : undefined,
                    boxShadow: errors.genericName
                      ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                      : undefined,
                  }}
                />
                {errors.genericName && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.genericName}
                  </span>
                )}
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
                <label
                  htmlFor="medicine-strength-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Strength Value
                </label>
                <input
                  id="medicine-strength-input"
                  className="ui-input w-full"
                  type="text"
                  value={strength}
                  onChange={handleStrengthChange}
                  onBlur={() => handleBlur('strength')}
                  placeholder="e.g. 500, 625, 10"
                  style={{
                    borderColor: errors.strength ? '#ef4444' : undefined,
                    boxShadow: errors.strength ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.strength && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.strength}
                  </span>
                )}
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
                  <label
                    htmlFor="medicine-subcategory-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Sub Category
                  </label>
                  <input
                    id="medicine-subcategory-input"
                    className="ui-input w-full"
                    type="text"
                    value={subCategory}
                    onChange={handleSubCategoryChange}
                    onBlur={() => handleBlur('subCategory')}
                    placeholder="e.g. Pain Relief, NSAIDs"
                    style={{
                      borderColor: errors.subCategory ? '#ef4444' : undefined,
                      boxShadow: errors.subCategory
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.subCategory && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.subCategory}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="medicine-manufacturer-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Manufacturer / Pharma Company
                  </label>
                  <input
                    id="medicine-manufacturer-input"
                    className="ui-input w-full"
                    type="text"
                    value={manufacturer}
                    onChange={handleManufacturerChange}
                    onBlur={() => handleBlur('manufacturer')}
                    placeholder="e.g. Cipla, Sun Pharma, Dr. Reddy's"
                    style={{
                      borderColor: errors.manufacturer ? '#ef4444' : undefined,
                      boxShadow: errors.manufacturer
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.manufacturer && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.manufacturer}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medicine-code-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Medicine Code / SKU
                  </label>
                  <input
                    id="medicine-code-input"
                    className="ui-input w-full"
                    type="text"
                    value={medicineCode}
                    onChange={handleMedicineCodeChange}
                    onBlur={() => handleBlur('medicineCode')}
                    placeholder="e.g. MED-PARA-500"
                    style={{
                      borderColor: errors.medicineCode ? '#ef4444' : undefined,
                      boxShadow: errors.medicineCode
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.medicineCode && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.medicineCode}
                    </span>
                  )}
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
                  <label
                    htmlFor="medicine-mrp-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    MRP (₹)
                  </label>
                  <input
                    id="medicine-mrp-input"
                    className="ui-input w-full font-medium"
                    type="text"
                    value={mrp}
                    onChange={handleMrpChange}
                    onBlur={() => handleBlur('mrp')}
                    placeholder="0.00"
                    style={{
                      borderColor: errors.mrp ? '#ef4444' : undefined,
                      boxShadow: errors.mrp ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.mrp && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.mrp}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medicine-barcode-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Barcode / EAN
                  </label>
                  <input
                    id="medicine-barcode-input"
                    className="ui-input w-full"
                    type="text"
                    value={barcode}
                    onChange={handleBarcodeChange}
                    onBlur={() => handleBlur('barcode')}
                    placeholder="e.g. 8901234567890"
                    style={{
                      borderColor: errors.barcode ? '#ef4444' : undefined,
                      boxShadow: errors.barcode ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {errors.barcode && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.barcode}
                    </span>
                  )}
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
                      if (touched.discountValue) {
                        setErrors((prev) => ({
                          ...prev,
                          discountValue: validateDiscountValue(discountValue, newType, mrp),
                        }));
                      }
                    }}
                    options={DISCOUNT_TYPE_OPTIONS}
                    placeholder="Select discount..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="medicine-discount-value-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Discount Value
                  </label>
                  <input
                    id="medicine-discount-value-input"
                    className="ui-input w-full"
                    type="text"
                    value={discountValue}
                    onChange={handleDiscountValueChange}
                    onBlur={() => handleBlur('discountValue')}
                    disabled={!discountType}
                    placeholder={discountType === 'Percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                    style={{
                      borderColor: errors.discountValue ? '#ef4444' : undefined,
                      boxShadow: errors.discountValue
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.discountValue && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.discountValue}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medicine-final-price-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Final Price (₹)
                  </label>
                  <input
                    id="medicine-final-price-input"
                    className="ui-input w-full font-bold text-emerald-700"
                    type="text"
                    value={finalPrice}
                    onChange={handleFinalPriceChange}
                    onBlur={() => handleBlur('finalPrice')}
                    placeholder="0.00"
                    style={{
                      borderColor: errors.finalPrice ? '#ef4444' : undefined,
                      boxShadow: errors.finalPrice
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.finalPrice && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.finalPrice}
                    </span>
                  )}
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
                  <label
                    htmlFor="medicine-frequency-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Default Frequency
                  </label>
                  <input
                    id="medicine-frequency-input"
                    className="ui-input w-full"
                    type="text"
                    value={frequency}
                    onChange={handleFrequencyChange}
                    onBlur={() => handleBlur('frequency')}
                    placeholder="e.g. 1-0-1, 1-1-1, Once daily"
                    style={{
                      borderColor: errors.frequency ? '#ef4444' : undefined,
                      boxShadow: errors.frequency
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.frequency && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.frequency}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="medicine-duration-input"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Default Duration
                  </label>
                  <input
                    id="medicine-duration-input"
                    className="ui-input w-full"
                    type="text"
                    value={duration}
                    onChange={handleDurationChange}
                    onBlur={() => handleBlur('duration')}
                    placeholder="e.g. 5 days, 14 days, 1 month"
                    style={{
                      borderColor: errors.duration ? '#ef4444' : undefined,
                      boxShadow: errors.duration
                        ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                        : undefined,
                    }}
                  />
                  {errors.duration && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.duration}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="medicine-description-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800"
                >
                  Clinical Description & Usage Notes
                </label>
                <textarea
                  id="medicine-description-input"
                  className="ui-textarea w-full"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
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
