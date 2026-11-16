import { AlertCircle, ArrowRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

export function validateStockOutQuantity(
  val: string,
  maxOnHand: number,
  isReturn: boolean,
): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return 'Quantity is required.';
  if (/[^0-9]/.test(trimmed)) return 'Quantity must contain only numbers.';
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n <= 0) return 'Quantity must be greater than zero.';
  if (!isReturn && n > maxOnHand) {
    return `Cannot issue ${n} units. Maximum stock on hand is ${maxOnHand} units.`;
  }
  if (n > 1000000) return 'Quantity cannot exceed 1,000,000.';
  return undefined;
}

export function validateStockOutReferenceNumber(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) return 'Reference number cannot exceed 100 characters.';
  if (/[^a-zA-Z0-9\-_/#\s]/.test(trimmed)) {
    return 'Reference number contains invalid characters.';
  }
  return undefined;
}

export function validateStockOutReason(val: string, isReasonRequired: boolean): string | undefined {
  const trimmed = val.trim();
  if (isReasonRequired) {
    if (!trimmed) return 'A specific reason is required for this operation.';
    if (trimmed.length < 3) return 'Reason must be at least 3 characters.';
    if (trimmed.length > 200) return 'Reason cannot exceed 200 characters.';
  }
  return undefined;
}

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: MedicineStrength | null;
  mode?: 'DISPENSE' | 'DAMAGED' | 'EXPIRED' | 'RETURN';
  onSuccess: () => void;
}

export default function StockOutModal({
  isOpen,
  onClose,
  variant,
  mode = 'DISPENSE',
  onSuccess,
}: StockOutModalProps) {
  const [operationType, setOperationType] = useState<'DISPENSE' | 'DAMAGED' | 'EXPIRED' | 'RETURN'>(
    mode,
  );
  const [quantity, setQuantity] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOperationType(mode);
    setQuantity('');
    setReferenceNumber('');
    setReason('');
    setNotes('');
    setError('');
    setErrors({});
    setTouched({});
  }, [mode, variant, isOpen]);

  const currentOnHand = variant?.available_quantity ?? 0;
  const parsedQty = parseInt(quantity, 10) || 0;
  const isReturn = operationType === 'RETURN';
  const newBalance = isReturn ? currentOnHand + parsedQty : currentOnHand - parsedQty;

  const tabsPerStrip = variant?.tablets_per_strip;
  const newStrips =
    tabsPerStrip && tabsPerStrip > 0 && newBalance >= 0 ? Math.floor(newBalance / tabsPerStrip) : 0;
  const newLoose =
    tabsPerStrip && tabsPerStrip > 0 && newBalance >= 0 ? newBalance % tabsPerStrip : 0;

  const isReasonRequired =
    operationType === 'DAMAGED' || operationType === 'EXPIRED' || operationType === 'RETURN';

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, '').slice(0, 8);
    setQuantity(sanitized);
    if (touched.quantity) {
      setErrors((prev) => ({
        ...prev,
        quantity: validateStockOutQuantity(sanitized, currentOnHand, isReturn),
      }));
    }
  };

  const handleReferenceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\-_/#\s]/g, '').slice(0, 100);
    setReferenceNumber(sanitized);
    if (touched.referenceNumber) {
      setErrors((prev) => ({
        ...prev,
        referenceNumber: validateStockOutReferenceNumber(sanitized),
      }));
    }
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.slice(0, 200);
    setReason(raw);
    if (touched.reason) {
      setErrors((prev) => ({
        ...prev,
        reason: validateStockOutReason(raw, isReasonRequired),
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err: string | undefined;
    if (field === 'quantity')
      err = validateStockOutQuantity(quantity, currentOnHand, isReturn);
    else if (field === 'referenceNumber')
      err = validateStockOutReferenceNumber(referenceNumber);
    else if (field === 'reason') err = validateStockOutReason(reason, isReasonRequired);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }

    const qtyErr = validateStockOutQuantity(quantity, currentOnHand, isReturn);
    const refErr = validateStockOutReferenceNumber(referenceNumber);
    const reasonErr = validateStockOutReason(reason, isReasonRequired);

    const newErrors: Record<string, string | undefined> = {
      quantity: qtyErr,
      referenceNumber: refErr,
      reason: reasonErr,
    };

    setErrors(newErrors);
    setTouched({
      quantity: true,
      referenceNumber: true,
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
      if (operationType === 'DISPENSE') {
        await api.post(`inventory/${variant.id}/stock-out`, {
          quantity: parsedQty,
          reference_number: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else if (operationType === 'DAMAGED' || operationType === 'EXPIRED') {
        await api.post(`inventory/${variant.id}/damaged`, {
          quantity: parsedQty,
          reason: operationType,
          notes: (reason + (notes ? ` - ${notes}` : '')).trim() || undefined,
        });
      } else if (operationType === 'RETURN') {
        await api.post(`inventory/${variant.id}/return`, {
          quantity: parsedQty,
          reference_number: referenceNumber.trim() || undefined,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to process stock operation.'));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (operationType) {
      case 'DISPENSE':
        return 'Issue / Dispense Stock';
      case 'DAMAGED':
        return 'Write-off Damaged Stock';
      case 'EXPIRED':
        return 'Dispose Expired Stock';
      case 'RETURN':
        return 'Process Customer/Patient Return';
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={getTitle()}
      description={
        variant
          ? `${variant.medicine_name || 'Medicine'} • ${variant.strength} ${variant.strength_unit} (${variant.dosage_form})`
          : 'Record stock deduction, write-off, or return.'
      }
      size="md"
    >
      <form id="stock-out-form" onSubmit={handleSubmit} noValidate className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          {/* Operation Selector */}
          <Section title="Operation Category">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { type: 'DISPENSE', label: 'Dispense / Issue' },
                { type: 'DAMAGED', label: 'Damaged' },
                { type: 'EXPIRED', label: 'Expired' },
                { type: 'RETURN', label: 'Return' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    const nextType = opt.type as any;
                    setOperationType(nextType);
                    setErrors({});
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    operationType === opt.type
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

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
                  New Balance
                </div>
                <div
                  className={`text-base font-bold ${
                    newBalance < 0
                      ? 'text-rose-600'
                      : isReturn
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {newBalance} units
                </div>
                {tabsPerStrip && tabsPerStrip > 0 && newBalance >= 0 && (
                  <div className="text-[11px] text-slate-500">
                    ({newStrips} strips + {newLoose} loose)
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-[11px] tracking-wider text-slate-400 uppercase">Change</div>
                {isReturn ? (
                  <Badge tone="green">+{parsedQty} units</Badge>
                ) : (
                  <Badge tone="red">-{parsedQty} units</Badge>
                )}
              </div>
            </div>
          </div>

          <Section title="Quantity & Reference">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Quantity (Units) *">
                <input
                  type="text"
                  className="ui-input font-bold text-slate-900 dark:text-slate-100"
                  placeholder="e.g. 10"
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

              <Field label="Prescription / Reference #">
                <input
                  type="text"
                  className="ui-input font-mono"
                  placeholder="e.g. RX-2026-081"
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
            </div>
          </Section>

          {isReasonRequired && (
            <Field label="Specific Reason *">
              <input
                type="text"
                className="ui-input"
                placeholder={
                  operationType === 'DAMAGED'
                    ? 'e.g. Bottle seal broken during transit'
                    : operationType === 'EXPIRED'
                      ? 'e.g. Batch expired on 2026-09-30'
                      : 'e.g. Unopened blister strip returned by patient'
                }
                value={reason}
                onChange={handleReasonChange}
                onBlur={() => handleBlur('reason')}
                style={{
                  borderColor: errors.reason ? '#ef4444' : undefined,
                  boxShadow: errors.reason ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                }}
              />
              {errors.reason && (
                <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                  <AlertCircle size={12} className="shrink-0" />
                  {errors.reason}
                </span>
              )}
            </Field>
          )}

          <Field label="Additional Notes / Remarks">
            <textarea
              className="ui-textarea"
              rows={2}
              placeholder="Provide any additional clinical or administrative context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
            />
          </Field>
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
            {loading ? 'Processing...' : 'Confirm Operation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
