import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

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

  useEffect(() => {
    setOperationType(mode);
    setQuantity('');
    setReferenceNumber('');
    setReason('');
    setNotes('');
    setError('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }
    if (parsedQty <= 0) {
      setError('Quantity must be a positive integer.');
      return;
    }
    if (!isReturn && parsedQty > currentOnHand) {
      setError(`Cannot issue ${parsedQty} units. Maximum stock on hand is ${currentOnHand} units.`);
      return;
    }
    if (
      (operationType === 'DAMAGED' || operationType === 'EXPIRED' || operationType === 'RETURN') &&
      !reason.trim()
    ) {
      setError('A specific reason is required for this operation.');
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
      <form id="stock-out-form" onSubmit={handleSubmit} className="ui-modal-form">
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
                  onClick={() => setOperationType(opt.type as any)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
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
              <Field label="Quantity (Units) *" hint={`Max available: ${currentOnHand} units`}>
                <input
                  type="number"
                  min="1"
                  max={!isReturn ? currentOnHand : undefined}
                  className="ui-input font-bold text-slate-900 dark:text-slate-100"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>

              <Field label="Prescription / Reference #">
                <input
                  type="text"
                  className="ui-input font-mono"
                  placeholder="e.g. RX-2026-081"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {(operationType === 'DAMAGED' ||
            operationType === 'EXPIRED' ||
            operationType === 'RETURN') && (
            <Field label="Specific Reason *" hint="Mandatory audit reason">
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
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="Additional Notes / Remarks">
            <textarea
              className="ui-textarea"
              rows={2}
              placeholder="Provide any additional clinical or administrative context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            disabled={loading || parsedQty <= 0 || (!isReturn && parsedQty > currentOnHand)}
          >
            {loading ? 'Processing...' : 'Confirm Operation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
