import { Calendar, History, Loader2, RefreshCw, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { formatDate, timeAgo } from '../lib/format';
import type { MedicineStrength, StockHistoryItem } from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';
import { Alert, Badge, type BadgeTone } from './ui/primitives';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: MedicineStrength | null;
}

export default function StockHistoryModal({ isOpen, onClose, variant }: StockHistoryModalProps) {
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!variant?.id) return;
    setLoading(true);
    setError('');

    try {
      const params: Record<string, any> = { page, limit: 15 };
      if (typeFilter) params.transaction_type = typeFilter;

      const res = await api.get<{
        items: StockHistoryItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`inventory/${variant.id}/history`, { params });

      setHistory(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load stock history.'));
    } finally {
      setLoading(false);
    }
  }, [variant?.id, page, typeFilter]);

  useEffect(() => {
    if (isOpen && variant) {
      fetchHistory();
    } else {
      setHistory([]);
      setPage(1);
      setTypeFilter('');
    }
  }, [isOpen, variant, fetchHistory]);

  const getBadgeTone = (type: string): BadgeTone => {
    switch (type) {
      case 'STOCK_IN':
      case 'OPENING_STOCK':
      case 'RETURN':
        return 'green';
      case 'STOCK_OUT':
      case 'DISPENSE':
        return 'amber';
      case 'DAMAGED':
      case 'EXPIRED':
        return 'red';
      case 'ADJUSTMENT':
        return 'blue';
      default:
        return 'neutral';
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title="Stock Movement Audit Trail"
      description={
        variant
          ? `${variant.medicine_name || 'Medicine'} • ${variant.strength} ${variant.strength_unit} (${variant.dosage_form}) • Current: ${variant.available_quantity} units`
          : 'Chronological audit ledger of all inventory transactions.'
      }
      size="xl"
    >
      <div className="ui-modal-body space-y-4">
        {error && <Alert>{error}</Alert>}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Event:</span>
            <select
              className="ui-select h-8 py-1 text-xs"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Transactions</option>
              <option value="STOCK_IN">Stock In (Receipts)</option>
              <option value="OPENING_STOCK">Opening Stock</option>
              <option value="STOCK_OUT">Stock Out (Dispensing)</option>
              <option value="ADJUSTMENT">Physical Audit Adjustment</option>
              <option value="RETURN">Patient Return</option>
              <option value="DAMAGED">Damaged Goods</option>
              <option value="EXPIRED">Expired Stock</option>
            </select>
          </div>

          <button
            type="button"
            className="ui-btn ui-btn-subtle flex h-8 items-center gap-1.5 px-2.5 text-xs"
            onClick={fetchHistory}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh Log
          </button>
        </div>

        {/* History Table */}
        {loading && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 size={24} className="mb-2 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading movement records...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <History size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No stock movements recorded
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Transactions will automatically appear here when stock is received, dispensed, or
              audited.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                <tr>
                  <th className="px-3.5 py-2.5">Date & Time</th>
                  <th className="px-3.5 py-2.5">Transaction</th>
                  <th className="px-3.5 py-2.5 text-right">Change</th>
                  <th className="px-3.5 py-2.5 text-right">Balance</th>
                  <th className="px-3.5 py-2.5">Reference / Reason</th>
                  <th className="px-3.5 py-2.5">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/60 dark:bg-slate-950">
                {history.map((item) => {
                  const isPositive = item.quantity_change > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(item.created_at)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar size={11} /> {timeAgo(item.created_at)}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Badge tone={getBadgeTone(item.transaction_type)}>
                          {item.transaction_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {isPositive ? `+${item.quantity_change}` : item.quantity_change}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">{item.quantity_before}</span>
                        <span className="mx-1 font-mono text-slate-400">→</span>
                        <strong className="font-bold text-slate-900 dark:text-slate-100">
                          {item.quantity_after}
                        </strong>
                      </td>

                      <td className="max-w-xs px-3.5 py-2.5">
                        {item.reference_number && (
                          <div className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            #{item.reference_number}
                          </div>
                        )}
                        {item.reason && (
                          <div
                            className="truncate text-slate-700 dark:text-slate-300"
                            title={item.reason}
                          >
                            {item.reason}
                          </div>
                        )}
                        {item.notes && (
                          <div className="truncate text-[11px] text-slate-400" title={item.notes}>
                            {item.notes}
                          </div>
                        )}
                        {!item.reference_number && !item.reason && !item.notes && (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User size={13} className="text-slate-400" />
                          <span>
                            {item.performer_name || item.performer_email || 'System Staff'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Showing page {page} of {totalPages} ({totalItems} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-subtle h-8 px-2.5 text-xs"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-subtle h-8 px-2.5 text-xs"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ui-modal-foot">
        <button type="button" className="ui-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
