import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

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

  useEffect(() => {
    if (variant) {
      setActualQuantity(String(variant.available_quantity ?? 0));
    } else {
      setActualQuantity('0');
    }
    setReason(ADJUSTMENT_REASONS[0]);
    setNotes('');
    setError('');
  }, [variant, isOpen]);

  const currentOnHand = variant?.available_quantity ?? 0;
  const parsedActual = parseInt(actualQuantity, 10);
  const variance = !isNaN(parsedActual) ? parsedActual - currentOnHand : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }
    if (isNaN(parsedActual) || parsedActual < 0) {
      setError('Actual quantity must be a non-negative number.');
      return;
    }
    if (variance === 0) {
      setError('No discrepancy detected. Actual counted quantity matches system balance.');
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
      <form id="stock-adjust-form" onSubmit={handleSubmit} className="ui-modal-form">
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
            <Field label="Actual Counted Stock (Units) *" hint="Count verified by clinic staff">
              <input
                type="number"
                min="0"
                className="ui-input font-bold text-slate-900 dark:text-slate-100"
                placeholder="0"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
                required
              />
            </Field>
          </Section>

          <Section title="Mandatory Audit Reason">
            <Field label="Reason Code *">
              <select
                className="ui-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
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
                onChange={(e) => setNotes(e.target.value)}
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
            disabled={loading || variance === 0}
          >
            {loading ? 'Adjusting...' : 'Confirm Stock Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
