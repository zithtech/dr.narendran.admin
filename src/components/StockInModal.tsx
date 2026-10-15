import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { MedicineStrength } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, SwitchRow } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

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
  }, [variant, isOpen]);

  const currentOnHand = variant?.available_quantity ?? 0;
  const parsedQty = parseInt(quantity, 10) || 0;
  const newBalance = currentOnHand + parsedQty;

  const tabsPerStrip = variant?.tablets_per_strip;
  const newStrips = tabsPerStrip && tabsPerStrip > 0 ? Math.floor(newBalance / tabsPerStrip) : 0;
  const newLoose = tabsPerStrip && tabsPerStrip > 0 ? newBalance % tabsPerStrip : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id) {
      setError('No medicine variant selected.');
      return;
    }
    if (parsedQty <= 0) {
      setError('Quantity received must be a positive integer.');
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
      <form id="stock-in-form" onSubmit={handleSubmit} className="ui-modal-form">
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
              <Field
                label="Quantity Received (Units) *"
                hint={tabsPerStrip ? `1 strip = ${tabsPerStrip} units` : 'Smallest dispensing unit'}
              >
                <input
                  type="number"
                  min="1"
                  className="ui-input font-bold text-slate-900 dark:text-slate-100"
                  placeholder="e.g. 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>

              <Field label="Unit Purchase Cost (₹)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="ui-input"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
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
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </Field>

            <Field label="Remarks / Storage Location">
              <textarea
                className="ui-textarea"
                rows={2}
                placeholder="Packaging condition, supplier name, or storage notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
            disabled={loading || parsedQty <= 0}
          >
            {loading ? 'Recording...' : 'Confirm Stock-In'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
