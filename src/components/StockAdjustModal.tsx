import { AlertCircle, ArrowRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

export function validateStockAdjustActualQuantity(
  val: string,
  currentOnHand: number,
): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Actual counted stock is required.';
  if (/[^0-9]/.test(trimmed)) return 'Actual quantity must contain only numbers.';
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n < 0) return 'Actual quantity cannot be negative.';
  if (n === currentOnHand) {
    return 'Actual counted quantity matches system balance. No adjustment needed.';
  }
  if (n > 10000000) return 'Actual quantity cannot exceed 10,000,000.';
  return undefined;
}

export function validateStockAdjustReason(val?: string): string | undefined {
  const trimmed = (val || '').trim();
  if (!trimmed) return 'A reason for stock adjustment is required.';
  if (trimmed.length < 3) return 'Reason must be at least 3 characters.';
  if (trimmed.length > 200) return 'Reason cannot exceed 200 characters.';
  return undefined;
}

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: MedicineStrength | null;
  onSuccess: () => void;
}

const ADJUSTMENT_REASONS = [
  'PHYSICAL_COUNT_RECONCILIATION',
  'DAMAGED_GOODS_WRITE_OFF',
  'EXPIRED_STOCK_DISPOSAL',
  'THEFT_OR_INVENTORY_LOSS',
  'DATA_ENTRY_CORRECTION',
  'INTERNAL_CLINIC_CONSUMPTION',
  'OTHER',
];

export default function StockAdjustModal({
  isOpen,
  onClose,
  variant,
  onSuccess,
}: StockAdjustModalProps) {
  const [actualQuantity, setActualQuantity] = useState('');
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (variant) {
      setActualQuantity(String(variant.available_quantity ?? 0));
    } else {
      setActualQuantity('0');
    }
    setReason(ADJUSTMENT_REASONS[0]);
    setNotes('');
    setError('');
    setErrors({});
    setTouched({});
  }, [variant, isOpen]);

  const currentOnHand = variant?.available_quantity ?? 0;
  const parsedActual = parseInt(actualQuantity, 10);
  const variance = !isNaN(parsedActual) ? parsedActual - currentOnHand : 0;

  const handleActualQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, '').slice(0, 8);
    setActualQuantity(sanitized);
    if (touched.actualQuantity) {
      setErrors((prev) => ({
        ...prev,
        actualQuantity: validateStockAdjustActualQuantity(sanitized, currentOnHand),
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'actualQuantity')
      err = validateStockAdjustActualQuantity(actualQuantity, currentOnHand);
    else if (field === 'reason') err = validateStockAdjustReason(reason);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }

    const qtyErr = validateStockAdjustActualQuantity(actualQuantity, currentOnHand);
    const reasonErr = validateStockAdjustReason(reason);

    const newErrors: Record<string, string | undefined> = {
      actualQuantity: qtyErr,
      reason: reasonErr,
    };

    setErrors(newErrors);
    setTouched({
      actualQuantity: true,
      reason: true,
    });

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`inventory/${variant.id}/adjust`, {
        actual_quantity: parsedActual,
        reason,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to record stock adjustment.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title="Stock Audit & Physical Count Adjustment"
      description={
        variant
          ? `${variant.medicine_name || 'Medicine'} • ${variant.strength} ${variant.strength_unit} (${variant.dosage_form})`
          : 'Reconcile recorded inventory with verified physical count.'
      }
      size="md"
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} noValidate className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">
                  Current Balance
                </div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {currentOnHand} units
                </div>
              </div>

              <ArrowRight size={18} className="text-slate-400" />

              <div>
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">
                  New Verified Count
                </div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {!isNaN(parsedActual) ? parsedActual : '—'} units
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">Variance</div>
                <div>
                  {variance > 0 ? (
                    <Badge tone="green">+{variance} units</Badge>
                  ) : variance < 0 ? (
                    <Badge tone="red">{variance} units</Badge>
                  ) : (
                    <Badge tone="neutral">0 (No change)</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Section title="Counted Quantity">
            <Field label="Actual Counted Stock (Units) *">
              <input
                type="text"
                className="ui-input font-bold text-slate-900 dark:text-slate-100"
                placeholder="0"
                value={actualQuantity}
                onChange={handleActualQuantityChange}
                onBlur={() => handleBlur('actualQuantity')}
                style={{
                  borderColor: errors.actualQuantity ? '#ef4444' : undefined,
                  boxShadow: errors.actualQuantity
                    ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                    : undefined,
                }}
              />
              {errors.actualQuantity && (
                <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                  <AlertCircle size={12} className="shrink-0" />
                  {errors.actualQuantity}
                </span>
              )}
            </Field>
          </Section>

          <Section title="Mandatory Audit Reason">
            <Field label="Reason Code *">
              <select
                className="ui-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Audit Explanation / Notes">
              <textarea
                className="ui-textarea"
                rows={2}
                placeholder="Provide additional details or supervisor sign-off..."
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
              />
            </Field>
          </Section>
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
            {loading ? 'Adjusting...' : 'Confirm Stock Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
