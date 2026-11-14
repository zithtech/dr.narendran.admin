import {
  AlertCircle,
  Check,
  FileText,
  FlaskConical,
  IndianRupee,
  Layers,
  Loader2,
  Pill,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import {
  calculateFinalPrice,
  normalizeDiscountType as normalizePricingDiscountType,
  validateDiscount,
} from '../utils/pricing';
import { Modal } from './ui/Modal';
import SearchableSelect, { type SearchableSelectOption } from './ui/SearchableSelect';

interface MedicineStrengthModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine?: Medicine | null;
  variant?: MedicineStrength | null;
  medicinesList?: Medicine[];
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

const DISCOUNT_TYPE_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: 'No Discount' },
  { value: 'PERCENTAGE', label: 'Percentage (%)', badgeTone: 'violet' },
  { value: 'FLAT', label: 'Flat Amount (₹)', badgeTone: 'violet' },
];

function normalizeDiscountType(raw?: string | null): '' | 'PERCENTAGE' | 'FLAT' {
  return normalizePricingDiscountType(raw) ?? '';
}

export default function MedicineStrengthModal({
  isOpen,
  onClose,
  medicine,
  variant,
  medicinesList = [],
  onSave,
}: MedicineStrengthModalProps) {
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [strength, setStrength] = useState('');
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [tabletsPerStrip, setTabletsPerStrip] = useState('10');
  const [mrp, setMrp] = useState('');
  const [discountType, setDiscountType] = useState<'' | 'PERCENTAGE' | 'FLAT'>('');
  const [discountValue, setDiscountValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [variantCode, setVariantCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [internalMedicines, setInternalMedicines] = useState<Medicine[]>([]);
  const effectiveMedicinesList = medicinesList.length > 0 ? medicinesList : internalMedicines;

  // Fallback fetching if parent did not supply medicinesList
  useEffect(() => {
    if (isOpen && !medicine && !variant && medicinesList.length === 0) {
      void (async () => {
        try {
          const res = await api.get<{ medicines?: Medicine[]; data?: Medicine[] } | Medicine[]>(
            'medicines',
            {
              params: { limit: 500, status: 'Active' },
            },
          );
          const data = res.data;
          if (Array.isArray(data)) {
            setInternalMedicines(data);
          } else if (Array.isArray(data?.medicines)) {
            setInternalMedicines(data.medicines);
          } else if (Array.isArray(data?.data)) {
            setInternalMedicines(data.data);
          }
        } catch {
          // Ignored
        }
      })();
    }
  }, [isOpen, medicine, variant, medicinesList.length]);

  useEffect(() => {
    if (variant) {
      setSelectedMedicineId(variant.medicine_id || medicine?.id || '');
      setStrength(variant.strength ?? '');
      setStrengthUnit(variant.strength_unit ?? 'mg');
      setDosageForm(variant.dosage_form ?? 'Tablet');
      setTabletsPerStrip(
        variant.tablets_per_strip !== null && variant.tablets_per_strip !== undefined
          ? String(variant.tablets_per_strip)
          : '10',
      );
      setMrp(variant.mrp !== null && variant.mrp !== undefined ? String(variant.mrp) : '');
      setDiscountType(normalizeDiscountType(variant.discount_type));
      setDiscountValue(
        variant.discount_value !== null && variant.discount_value !== undefined
          ? String(variant.discount_value)
          : '',
      );
      setPurchasePrice(
        variant.purchase_price !== null && variant.purchase_price !== undefined
          ? String(variant.purchase_price)
          : '',
      );
      setReorderLevel(String(variant.reorder_level ?? 10));
      setVariantCode(variant.variant_code ?? '');
      setBarcode(variant.barcode ?? '');
      setStatus(variant.status ?? 'ACTIVE');
      setNotes(variant.notes ?? '');
    } else {
      const initialMedId = medicine?.id || effectiveMedicinesList[0]?.id || '';
      const initialMed = medicine || effectiveMedicinesList.find((m) => m.id === initialMedId);

      setSelectedMedicineId(initialMedId);
      setStrength('');
      setStrengthUnit('mg');
      setDosageForm(initialMed?.dosage_form || 'Tablet');
      setTabletsPerStrip('10');
      setMrp(initialMed?.mrp ? String(initialMed.mrp) : '');
      setDiscountType(normalizeDiscountType(initialMed?.discount_type));
      setDiscountValue(initialMed?.discount_value ? String(initialMed.discount_value) : '');
      setPurchasePrice('');
      setReorderLevel('10');
      setVariantCode('');
      setBarcode('');
      setStatus('ACTIVE');
      setNotes('');
    }
    setError('');
  }, [variant, medicine, effectiveMedicinesList, isOpen]);

  const handleMedicineChange = (medId: string) => {
    setSelectedMedicineId(medId);
    const selected = effectiveMedicinesList.find((m) => m.id === medId);
    if (selected) {
      if (selected.dosage_form) setDosageForm(selected.dosage_form);
      if (selected.mrp) setMrp(String(selected.mrp));
      if (selected.discount_type) setDiscountType(normalizeDiscountType(selected.discount_type));
      if (selected.discount_value) setDiscountValue(String(selected.discount_value));
    }
  };

  // Memoized options for SearchableSelect
  const parentMedicineOptions = useMemo<SearchableSelectOption[]>(() => {
    return effectiveMedicinesList.map((m) => ({
      value: m.id,
      label: m.medicine_name,
      sublabel: m.generic_name ? m.generic_name : undefined,
      badge: m.dosage_form || undefined,
      badgeTone: 'violet' as const,
      icon: <Pill size={14} />,
      extraSearchTerms: [m.generic_name, m.medicine_code, m.therapeutic_category].filter(
        Boolean,
      ) as string[],
    }));
  }, [effectiveMedicinesList]);

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

  // Live calculation of final selling price
  const numMrp = parseFloat(mrp);
  const numDisc = parseFloat(discountValue);
  const calculatedFinalPrice: number | null = calculateFinalPrice(
    !isNaN(numMrp) ? numMrp : null,
    discountType || null,
    !isNaN(numDisc) ? numDisc : null,
  );

  const isTabletOrCapsule = ['Tablet', 'Capsule'].includes(dosageForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveMedicineId = variant?.medicine_id || medicine?.id || selectedMedicineId;

    if (!effectiveMedicineId) {
      setError('Please select a master medicine.');
      return;
    }
    if (!strength.trim()) {
      setError('Strength value is required (e.g. 500, 650, 120/5).');
      return;
    }

    const discountValidationError = validateDiscount(
      !isNaN(numMrp) ? numMrp : null,
      discountType || null,
      !isNaN(numDisc) ? numDisc : null,
    );
    if (discountValidationError) {
      setError(discountValidationError);
      return;
    }

    if (purchasePrice && parseFloat(purchasePrice) < 0) {
      setError('Purchase price cannot be negative.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      medicineId: effectiveMedicineId,
      strength: strength.trim(),
      strength_unit: strengthUnit.trim(),
      dosage_form: dosageForm.trim(),
      tablets_per_strip: isTabletOrCapsule ? parseInt(tabletsPerStrip, 10) || 10 : null,
      mrp: !isNaN(numMrp) ? numMrp : null,
      discount_type: discountType || null,
      discount_value: !isNaN(numDisc) ? numDisc : null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      reorder_level: parseInt(reorderLevel, 10) || 10,
      variant_code: variantCode.trim() || undefined,
      barcode: barcode.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    };

    try {
      if (variant) {
        await api.put(`medicine-strengths/${variant.id}`, payload);
      } else {
        await api.post('medicine-strengths', payload);
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save strength variant.'));
    } finally {
      setLoading(false);
    }
  };

  const activeMedicine =
    medicine ||
    effectiveMedicinesList.find((m) => m.id === selectedMedicineId) ||
    (variant?.medicine_name ? { medicine_name: variant.medicine_name } : null);

  const title = variant ? 'Edit Strength Variant' : 'Add Strength & Packaging Variant';
  const description = activeMedicine
    ? `Configuring formulation for ${activeMedicine.medicine_name}`
    : 'Add a strength variant to the clinic pharmacy catalog';

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="medicine-variant-drawer-modal"
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
            <Layers size={19} style={{ display: 'block', margin: 'auto' }} />
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
              {title}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{description}</div>
          </div>
        </div>
      }
    >
      <form
        id="medicine-strength-form"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .medicine-variant-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .medicine-variant-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .medicine-variant-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .variant-section-card {
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
          .variant-section-card:hover {
            border-color: #cbd5e1;
          }
          .variant-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .variant-section-badge {
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
          .variant-section-badge svg {
            display: block;
            margin: auto;
          }
          .variant-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .variant-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .medicine-variant-drawer-modal .ui-input,
          .medicine-variant-drawer-modal .ui-textarea {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .medicine-variant-drawer-modal .ui-textarea {
            height: auto;
            padding: 8px 12px;
          }
          .medicine-variant-drawer-modal .ui-input:focus,
          .medicine-variant-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .variant-status-btn {
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
          .variant-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .variant-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .variant-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .variant-radio-circle {
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
          .variant-status-btn.is-active .variant-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .variant-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .medicine-variant-drawer-modal .ui-modal-foot {
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

          {/* Section 1: Parent Medicine & Basic Formulation */}
          <div className="variant-section-card">
            <div className="variant-section-header">
              <div className="variant-section-badge">
                <Pill size={14} />
              </div>
              <span className="variant-section-tag">Parent Medicine & Formulation</span>
              <span className="variant-section-subtitle hidden sm:inline">
                Catalog reference and dosage form
              </span>
            </div>

            <div className="space-y-3.5">
              {/* If creating variant and master medicine is not preselected, allow searchable selection */}
              {!medicine && !variant && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Master Medicine <span className="font-bold text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={selectedMedicineId}
                    onChange={(val) => handleMedicineChange(val)}
                    options={parentMedicineOptions}
                    placeholder="Search and select master medicine..."
                    searchPlaceholder="Search by name, generic name, or code..."
                    required
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Select the master clinical record to link this strength variant under
                  </span>
                </div>
              )}

              {/* Read-only Medicine context banner when editing or preselected */}
              {(variant || medicine) && (
                <div className="flex items-center justify-between rounded-xl border border-purple-200/70 bg-purple-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#eff6ff',
                        border: '1px solid #dbeafe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Pill size={16} style={{ display: 'block', margin: 'auto' }} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-purple-700 uppercase">
                        Parent Medicine
                      </span>
                      <div className="text-sm font-bold text-slate-900">
                        {variant?.medicine_name || activeMedicine?.medicine_name || 'Medicine'}
                      </div>
                    </div>
                  </div>
                  {variant?.medicine_id && (
                    <span className="rounded-md border border-purple-200 bg-purple-100/70 px-2 py-1 text-xs font-semibold text-purple-800">
                      Master ID: {variant.medicine_id.slice(0, 8)}…
                    </span>
                  )}
                </div>
              )}

              {/* Dosage Form Selection */}
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
            </div>
          </div>

          {/* Section 2: Strength, Packaging & Stock Alert */}
          <div className="variant-section-card">
            <div className="variant-section-header">
              <div className="variant-section-badge">
                <FlaskConical size={14} />
              </div>
              <span className="variant-section-tag">Strength & Packaging</span>
              <span className="variant-section-subtitle hidden sm:inline">
                Strength value, unit, strip size, and minimum stock
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Strength Value <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="ui-input w-full"
                  placeholder="e.g. 500, 650, 120/5"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  required
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Potency amount of active ingredient
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Strength Unit <span className="font-bold text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={strengthUnit}
                  onChange={(val) => setStrengthUnit(val)}
                  options={strengthUnitOptions}
                  placeholder="Select unit..."
                  searchPlaceholder="Search unit (e.g. mg, ml)..."
                />
              </div>

              <div>
                {isTabletOrCapsule ? (
                  <>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                      Tablets / Units per Strip <span className="font-bold text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="ui-input w-full"
                      value={tabletsPerStrip}
                      onChange={(e) => setTabletsPerStrip(e.target.value)}
                      required
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Standard blister or strip packaging quantity
                    </span>
                  </>
                ) : (
                  <>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                      Dispensing Unit
                    </label>
                    <input
                      type="text"
                      className="ui-input w-full bg-slate-100 text-slate-600"
                      value={dosageForm}
                      disabled
                    />
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Dispensed by single unit package
                    </span>
                  </>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Reorder Threshold <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="ui-input w-full font-bold"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  required
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Triggers low stock alert when inventory falls below this count
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Pricing & Identifiers */}
          <div className="variant-section-card">
            <div className="variant-section-header">
              <div className="variant-section-badge">
                <IndianRupee size={14} />
              </div>
              <span className="variant-section-tag">Pricing & Identifiers</span>
              <span className="variant-section-subtitle hidden sm:inline">
                MRP, discount policy, cost rate, and barcodes
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    MRP (₹) <span className="text-[11px] font-normal text-slate-500">(Max Retail Price)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ui-input w-full font-medium"
                    placeholder="0.00"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Discount Type
                  </label>
                  <SearchableSelect
                    value={discountType}
                    onChange={(val) => setDiscountType(val as '' | 'PERCENTAGE' | 'FLAT')}
                    options={DISCOUNT_TYPE_OPTIONS}
                    placeholder="Select discount..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ui-input w-full"
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10%' : 'e.g. 5.00'}
                    disabled={!discountType}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Calculated Selling Price (₹)
                  </label>
                  <div className="flex h-[38px] items-center rounded-lg border border-purple-200 bg-purple-50/60 px-3 font-bold text-purple-900">
                    {calculatedFinalPrice !== null
                      ? `₹ ${calculatedFinalPrice.toFixed(2)}`
                      : '— (Set MRP)'}
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Effective billing price after applying discount
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Default Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ui-input w-full"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Estimated distributor procurement cost per unit
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    SKU / Variant Code
                  </label>
                  <input
                    type="text"
                    className="ui-input w-full"
                    placeholder="e.g. MED-PARA-650-T15"
                    value={variantCode}
                    onChange={(e) => setVariantCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                    Barcode / EAN
                  </label>
                  <input
                    type="text"
                    className="ui-input w-full"
                    placeholder="Scan or enter barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Status & Clinical Notes */}
          <div className="variant-section-card">
            <div className="variant-section-header">
              <div className="variant-section-badge">
                <FileText size={14} />
              </div>
              <span className="variant-section-tag">Operational Status & Notes</span>
              <span className="variant-section-subtitle hidden sm:inline">
                Inventory availability and dispensing notes
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Variant Availability <span className="font-bold text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={`variant-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                    onClick={() => setStatus('ACTIVE')}
                  >
                    <div className="variant-radio-circle">
                      {status === 'ACTIVE' && <div className="variant-radio-inner" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Active for Dispensing
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Available for prescription selection, stock orders, and billing.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`variant-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                    onClick={() => setStatus('INACTIVE')}
                  >
                    <div className="variant-radio-circle">
                      {status === 'INACTIVE' && <div className="variant-radio-inner" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Inactive / Suspended
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          Disabled
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Paused from new stock transactions and prescription selection.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Dispensing & Packaging Notes
                </label>
                <textarea
                  className="ui-textarea w-full"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Blister pack of 10 tablets. Keep away from direct heat."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div className="ui-modal-foot">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{variant ? 'Save Changes' : 'Create Strength Variant'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
