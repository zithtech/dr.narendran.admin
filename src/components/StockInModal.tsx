import { AlertCircle, ArrowRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, SwitchRow } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

export function validateStockInQuantity(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Quantity received is required.';
  if (/[^0-9]/.test(trimmed)) return 'Quantity must contain only numbers.';
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n <= 0) return 'Quantity must be greater than zero.';
  if (n > 1000000) return 'Quantity cannot exceed 1,000,000.';
  return undefined;
}

export function validateStockInUnitCost(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed);
  if (isNaN(n) || (trimmed.match(/\./g) || []).length > 1 || /[^0-9.-]/.test(trimmed)) {
    return 'Unit cost must be a valid number.';
  }
  if (n < 0) return 'Unit cost cannot be negative.';
  if (n > 999999.99) return 'Unit cost cannot exceed 999,999.99.';
  return undefined;
}

export function validateStockInReferenceNumber(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'Reference number cannot exceed 100 characters.';
  if (/[^a-zA-Z0-9\-_/#\s]/.test(trimmed)) {
    return 'Reference number contains invalid characters.';
  }
  return undefined;
}

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: MedicineStrength | null;
  onSuccess: () => void;
}

export default function StockInModal({ isOpen, onClose, variant, onSuccess }: StockInModalProps) {
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isOpeningStock, setIsOpeningStock] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQuantity('');
    setUnitCost(
      variant?.purchase_price !== null && variant?.purchase_price !== undefined
        ? String(variant.purchase_price)
        : '',
    );
    setReferenceNumber('');
    setIsOpeningStock(false);
    setNotes('');
    setError('');
    setErrors({});
    setTouched({});
  }, [variant, isOpen]);

  const currentOnHand = variant?.available_quantity ?? 0;
  const parsedQty = parseInt(quantity, 10) || 0;
  const newBalance = currentOnHand + parsedQty;

  const tabsPerStrip = variant?.tablets_per_strip;
  const newStrips = tabsPerStrip && tabsPerStrip > 0 ? Math.floor(newBalance / tabsPerStrip) : 0;
  const newLoose = tabsPerStrip && tabsPerStrip > 0 ? newBalance % tabsPerStrip : 0;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, '').slice(0, 8);
    setQuantity(sanitized);
    if (touched.quantity) {
      setErrors((prev) => ({ ...prev, quantity: validateStockInQuantity(sanitized) }));
    }
  };

  const handleUnitCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitized = e.target.value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    setUnitCost(sanitized);
    if (touched.unitCost) {
      setErrors((prev) => ({ ...prev, unitCost: validateStockInUnitCost(sanitized) }));
    }
  };

  const handleReferenceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\-_/#\s]/g, '').slice(0, 100);
    setReferenceNumber(sanitized);
    if (touched.referenceNumber) {
      setErrors((prev) => ({
        ...prev,
        referenceNumber: validateStockInReferenceNumber(sanitized),
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'quantity') err = validateStockInQuantity(quantity);
    else if (field === 'unitCost') err = validateStockInUnitCost(unitCost);
    else if (field === 'referenceNumber')
      err = validateStockInReferenceNumber(referenceNumber);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }

    const qtyErr = validateStockInQuantity(quantity);
    const costErr = validateStockInUnitCost(unitCost);
    const refErr = validateStockInReferenceNumber(referenceNumber);

    const newErrors: Record<string, string | undefined> = {
      quantity: qtyErr,
      unitCost: costErr,
      referenceNumber: refErr,
    };

    setErrors(newErrors);
    setTouched({
      quantity: true,
      unitCost: true,
      referenceNumber: true,
    });

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`inventory/${variant.id}/stock-in`, {
        quantity: parsedQty,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        reference_number: referenceNumber.trim() || undefined,
        is_opening_stock: isOpeningStock,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to record stock receipt.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title="Receive Stock / Stock-In"
      description={
        variant
          ? `${variant.medicine_name || 'Medicine'} • ${variant.strength} ${variant.strength_unit} (${variant.dosage_form})`
          : 'Record received inventory or verified opening balance.'
      }
      size="md"
    >
      <form id="stock-in-form" onSubmit={handleSubmit} noValidate className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          {/* Current vs Projected Balance Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">
                  Current Balance
                </div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {currentOnHand} units
                </div>
              </div>

              <ArrowRight size={18} className="text-slate-400" />

              <div>
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">
                  Projected Balance
                </div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {newBalance} units
                </div>
                {tabsPerStrip && tabsPerStrip > 0 && (
                  <div className="text-[11px] text-slate-500">
                    ({newStrips} strips + {newLoose} loose)
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">Added Qty</div>
                <Badge tone="green">+{parsedQty} units</Badge>
              </div>
            </div>
          </div>

          <Section title="Stock-In Quantity & Cost">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Quantity Received (Units) *">
                <input
                  type="text"
                  className="ui-input font-bold text-slate-900 dark:text-slate-100"
                  placeholder="e.g. 100"
                  value={quantity}
                  onChange={handleQuantityChange}
                  onBlur={() => handleBlur('quantity')}
                  style={{
                    borderColor: errors.quantity ? '#ef4444' : undefined,
                    boxShadow: errors.quantity ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.quantity && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.quantity}
                  </span>
                )}
              </Field>

              <Field label="Unit Purchase Cost (₹)">
                <input
                  type="text"
                  className="ui-input"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={handleUnitCostChange}
                  onBlur={() => handleBlur('unitCost')}
                  style={{
                    borderColor: errors.unitCost ? '#ef4444' : undefined,
                    boxShadow: errors.unitCost ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.unitCost && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertCircle size={12} className="shrink-0" />
                    {errors.unitCost}
                  </span>
                )}
              </Field>
            </div>
          </Section>

          <Section title="Reference & Verification">
            <Field label="Invoice / GRN / PO Number">
              <input
                type="text"
                className="ui-input font-mono"
                placeholder="e.g. INV-2026-9811"
                value={referenceNumber}
                onChange={handleReferenceNumberChange}
                onBlur={() => handleBlur('referenceNumber')}
                style={{
                  borderColor: errors.referenceNumber ? '#ef4444' : undefined,
                  boxShadow: errors.referenceNumber
                    ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                    : undefined,
                }}
              />
              {errors.referenceNumber && (
                <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                  <AlertCircle size={12} className="shrink-0" />
                  {errors.referenceNumber}
                </span>
              )}
            </Field>

            <Field label="Remarks / Storage Location">
              <textarea
                className="ui-textarea"
                rows={2}
                placeholder="Packaging condition, supplier name, or storage notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              />
            </Field>
          </Section>

          <SwitchRow
            title="Opening Stock Verification"
            description="Enable if this entry represents the initial audited physical count for this medicine."
            checked={isOpeningStock}
            onChange={setIsOpeningStock}
          />
        </div>

        <div className="ui-modal-foot">
          <button type="button" className="ui-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={loading}
          >
            {loading ? 'Recording...' : 'Confirm Stock-In'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
