import { AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';
import React, { useState } from 'react';
import { App } from 'antd';
import { ordersApi } from '../services/ordersApi';
import { VALID_STATUS_TRANSITIONS } from '../types/orders';
import { getErrorMessage } from '../../../utils/errors';

interface UpdateOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  onSuccess: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  processing: 'Processing (Confirm & Prepare)',
  packed: 'Packed (Ready for Dispatch)',
  out_for_delivery: 'Dispatched / Out for Delivery',
  delivered: 'Delivered (Mark as Completed)',
  cancelled: 'Cancel Order',
};

export const UpdateOrderStatusModal: React.FC<UpdateOrderStatusModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentStatus,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const normalizedCurrent = (currentStatus || '').toLowerCase().trim();
  const allowedTransitions = VALID_STATUS_TRANSITIONS[normalizedCurrent] || [];

  const [selectedStatus, setSelectedStatus] = useState<string>(allowedTransitions[0] || '');
  const [cancellationReason, setCancellationReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCancelling = selectedStatus === 'cancelled';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStatus) {
      setError('Please select a target status.');
      return;
    }

    if (isCancelling && cancellationReason.trim().length < 3) {
      setError('Cancellation reason is required (at least 3 characters).');
      return;
    }

    try {
      setSubmitting(true);
      await ordersApi.updateOrderStatus(orderId, {
        status: selectedStatus,
        cancellation_reason: isCancelling ? cancellationReason.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      void message.success(`Order ${orderNumber} transitioned to ${STATUS_LABELS[selectedStatus] || selectedStatus}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update order status.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Update Order Status
            </h3>
            <span className="text-xs text-slate-500">
              Order <span className="font-mono font-semibold text-indigo-600">{orderNumber}</span> · Current: <span className="font-semibold uppercase">{normalizedCurrent}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {allowedTransitions.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <CheckCircle size={36} className="mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="text-sm font-semibold">Terminal Order Status</p>
            <p className="mt-1 text-xs">
              Orders marked as <strong>{normalizedCurrent}</strong> cannot be transitioned to any other status.
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" className="ui-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Next Order Status <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {allowedTransitions.map((statusKey) => (
                  <label
                    key={statusKey}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                      selectedStatus === statusKey
                        ? statusKey === 'cancelled'
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                          : 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetStatus"
                      value={statusKey}
                      checked={selectedStatus === statusKey}
                      onChange={() => setSelectedStatus(statusKey)}
                      className="accent-indigo-600"
                    />
                    <div className="text-xs font-semibold">
                      {STATUS_LABELS[statusKey] || statusKey}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {isCancelling && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
                <label className="mb-1 block text-xs font-bold text-rose-900 dark:text-rose-200">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-800 dark:bg-slate-900 dark:text-slate-100"
                  rows={3}
                  placeholder="e.g., Patient requested cancellation, out of stock medicine, or address unserviceable..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                />
                <span className="mt-1 block text-[11px] text-rose-700 dark:text-rose-300">
                  Min 3 characters. Once cancelled, this order cannot be reopened.
                </span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Audit Notes / Dispatch Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                className="ui-input w-full"
                placeholder="e.g., Courier tracking ID, delivery partner name, packaging notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className="ui-btn ui-btn-subtle"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedStatus}
                className={`ui-btn ${
                  isCancelling ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'ui-btn-primary'
                }`}
              >
                {submitting && <RefreshCw size={14} className="animate-spin" />}
                {isCancelling ? 'Confirm Cancellation' : 'Update Status'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
