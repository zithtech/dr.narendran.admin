import { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import {
  calculateFinalPrice,
  normalizeDiscountType as normalizePricingDiscountType,
  validateDiscount,
} from '../utils/pricing';
import { Field, Modal, Section, SwitchRow } from './ui/Modal';
import { Alert } from './ui/primitives';

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
    : 'Add a strength variant to the clinic pharmacy catalog.';

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={title}
      description={description}
      size="lg"
    >
      <form id="medicine-strength-form" onSubmit={handleSubmit} className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          {/* Master Medicine Selection (for new variants) */}
          {!medicine && !variant && (
            <Section title="Parent Medicine">
              <Field label="Select Master Medicine *" hint="Select existing medicine from catalog">
                <select
                  className="ui-select font-medium"
                  value={selectedMedicineId}
                  onChange={(e) => handleMedicineChange(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    -- Select Master Medicine --
                  </option>
                  {effectiveMedicinesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.medicine_name} {m.generic_name ? `• ${m.generic_name}` : ''}{' '}
                      {m.dosage_form ? `(${m.dosage_form})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </Section>
          )}

          {/* Read-only Medicine context banner when editing */}
          {variant && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Parent Medicine
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {variant.medicine_name || activeMedicine?.medicine_name || 'Medicine'}
                </div>
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Master ID: {variant.medicine_id.slice(0, 8)}…
              </span>
            </div>
          )}

          <Section title="Formulation & Dosage">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Strength *" hint="e.g. 500, 650, 120/5">
                <input
                  type="text"
                  className="ui-input"
                  placeholder="500"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  required
                />
              </Field>

              <Field label="Strength Unit *">
                <select
                  className="ui-select"
                  value={strengthUnit}
                  onChange={(e) => setStrengthUnit(e.target.value)}
                >
                  {COMMON_STRENGTH_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Dosage Form *">
                <select
                  className="ui-select"
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                >
                  {COMMON_DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Packaging & Identification">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {isTabletOrCapsule ? (
                <Field label="Tablets per Strip *" hint="Units per blister pack">
                  <input
                    type="number"
                    min="1"
                    className="ui-input"
                    value={tabletsPerStrip}
                    onChange={(e) => setTabletsPerStrip(e.target.value)}
                    required
                  />
                </Field>
              ) : (
                <Field label="Packaging Unit" hint="Dispensing unit">
                  <input
                    type="text"
                    className="ui-input bg-slate-100 dark:bg-slate-800"
                    value={dosageForm}
                    disabled
                  />
                </Field>
              )}

              <Field label="SKU / Variant Code">
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. MED-PARA-650-T15"
                  value={variantCode}
                  onChange={(e) => setVariantCode(e.target.value)}
                />
              </Field>

              <Field label="Barcode / EAN">
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Scan or enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Commercial Pricing & Low-Stock Alert">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="MRP (₹)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ui-input font-medium"
                  placeholder="0.00"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                />
              </Field>

              <Field label="Discount Type">
                <select
                  className="ui-select"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                >
                  <option value="">No Discount</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </Field>

              <Field label="Discount Value">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ui-input"
                  placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10%' : 'e.g. 5.00'}
                  disabled={!discountType}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Final Selling Price (₹)" hint="Calculated selling rate">
                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-bold text-emerald-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-emerald-400">
                  {calculatedFinalPrice !== null ? `₹ ${calculatedFinalPrice.toFixed(2)}` : '—'}
                </div>
              </Field>

              <Field label="Default Purchase Cost (₹)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ui-input"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </Field>

              <Field label="Reorder Threshold" hint="Triggers low-stock alert">
                <input
                  type="number"
                  min="0"
                  className="ui-input font-bold"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <SwitchRow
            title="Formulation Active"
            description="Active variants are available for doctor prescription selection and stock operations."
            checked={status === 'ACTIVE'}
            onChange={(checked) => setStatus(checked ? 'ACTIVE' : 'INACTIVE')}
          />
        </div>

        <div className="ui-modal-foot">
          <button type="button" className="ui-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={loading}>
            {loading ? 'Saving...' : variant ? 'Save Changes' : 'Create Strength Variant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
