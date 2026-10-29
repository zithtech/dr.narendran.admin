import {
  AlertCircle,
  Clock,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  Pill,
  RefreshCw,
  ShoppingBag,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { App } from 'antd';
import { ordersApi } from '../services/ordersApi';
import type { OrderDetails } from '../types/orders';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { UpdateOrderStatusModal } from './UpdateOrderStatusModal';
import { getErrorMessage } from '../../../utils/errors';

interface OrderDetailsDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const { message } = App.useApp();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const fetchDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrderById(id);
      setOrder(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load order details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      void fetchDetails(orderId);
    } else {
      setOrder(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`${label} copied to clipboard`);
  };

  const isTerminalStatus =
    order?.status === 'delivered' || order?.status === 'cancelled';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {order ? order.order_number : 'Order Details'}
                </h2>
                {order && <OrderStatusBadge status={order.status} />}
                {order && <PaymentStatusBadge status={order.payment_status} />}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {order?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.id, 'Order ID')}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Copy internal order ID"
                  >
                    <span>ID: {order.id.slice(0, 13)}…</span>
                    <Copy size={11} />
                  </button>
                )}
                {order?.created_at && (
                  <span>· {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order && !isTerminalStatus && (
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="ui-btn ui-btn-primary ui-btn-xs"
              >
                Update Status
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <RefreshCw size={26} className="mx-auto mb-2 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold">Loading full order record...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={18} className="mb-1 text-rose-600" />
              <p>{error}</p>
              <button
                type="button"
                className="ui-btn ui-btn-xs mt-3 bg-rose-600 text-white"
                onClick={() => orderId && void fetchDetails(orderId)}
              >
                Retry
              </button>
            </div>
          ) : order ? (
            <>
              {/* Cancellation Banner if Cancelled */}
              {order.status === 'cancelled' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-start gap-2.5">
                    <XCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Order Cancelled
                      </h4>
                      <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Reason:</strong> {order.cancellation_reason || 'No specific cancellation reason provided.'}
                      </p>
                      {order.updated_at && (
                        <p className="mt-1 text-[11px] text-rose-600/80">
                          Cancelled on {new Date(order.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Information Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <User size={14} className="text-indigo-600" />
                  <span>Patient Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Patient Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.patient?.name || 'Walk-in / Unregistered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.patient?.phone || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {order.patient?.email || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Gender & Blood Group</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {order.patient?.gender || '—'} · {order.patient?.blood_group || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Information Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Truck size={14} className="text-teal-600" />
                  <span>Delivery & Fulfillment</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Method</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.delivery?.delivery_method || 'Standard Home Delivery'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">Destination Address</span>
                    <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                      <div>
                        <p className="font-medium leading-relaxed">
                          {order.delivery?.delivery_address?.full_address || 'No address provided'}
                        </p>
                        {(order.delivery?.delivery_address?.city || order.delivery?.delivery_address?.pincode) && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {[order.delivery.delivery_address.city, order.delivery.delivery_address.state, order.delivery.delivery_address.pincode].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescription Reference Card (if applicable) */}
              {order.prescription && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    <FileText size={14} className="text-sky-600" />
                    <span>Prescription Reference</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Prescribed by {order.prescription.doctor?.name || 'Doctor'}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {order.prescription.doctor?.specialization || 'Consultant'} · Date:{' '}
                        {order.prescription.prescription_date || 'N/A'}
                      </p>
                    </div>
                    {order.prescription.prescription_url && (
                      <a
                        href={order.prescription.prescription_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ui-btn ui-btn-xs bg-white text-sky-700 hover:bg-sky-50 dark:bg-slate-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                      >
                        View Prescription
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Ordered Medicines Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                <div className="flex items-center justify-between bg-slate-50/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <Pill size={14} className="text-indigo-600" />
                    <span>Ordered Items ({order.medicines?.length || 0})</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
                    <thead className="bg-slate-50/80 font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Medicine & Strength</th>
                        <th className="px-4 py-2.5">Dosage / Instructions</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Price</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {!order.medicines || order.medicines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No individual medicine lines recorded.
                          </td>
                        </tr>
                      ) : (
                        order.medicines.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              <div>{m.name}</div>
                              {m.strength && (
                                <span className="text-[11px] text-slate-400">{m.strength}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              <div>{m.dosage_instruction || 'As directed'}</div>
                              {m.duration && (
                                <span className="text-[11px] text-slate-400">For {m.duration}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {m.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-mono">
                              {formatCurrency(m.unit_price)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono">
                              {formatCurrency(m.total_price)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pricing & Billing Breakdown */}
                <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Medicines Subtotal</span>
                      <span className="font-mono">{formatCurrency(order.pricing?.medicine_cost || order.pricing?.subtotal)}</span>
                    </div>
                    {Boolean(order.pricing?.discounts) && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span className="font-mono">- {formatCurrency(order.pricing.discounts)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery Charges</span>
                      <span className="font-mono">{formatCurrency(order.pricing?.delivery_charge)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100 text-sm">
                      <span>Grand Total</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(order.pricing?.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <CreditCard size={14} className="text-emerald-600" />
                    <span>Payment Information</span>
                  </div>
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Method</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.payment?.payment_method || 'Online Payment (Cashfree Gateway)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Transaction ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {order.payment?.cf_payment_id || order.payment?.cf_order_id || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank Reference</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {order.payment?.bank_reference || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Timestamp</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {order.payment?.payment_time
                        ? new Date(order.payment.payment_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Audit Timeline */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Clock size={14} className="text-indigo-600" />
                  <span>Status History & Audit Trail</span>
                </div>
                <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:top-2 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {!order.status_timeline || order.status_timeline.length === 0 ? (
                    <div className="text-xs text-slate-400">No status timeline logged.</div>
                  ) : (
                    order.status_timeline.map((entry, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 dark:border-slate-950" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {entry.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {entry.date ? `${new Date(entry.date).toLocaleDateString('en-IN')} · ` : ''}
                            {entry.time || ''}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                            {entry.notes}
                          </p>
                        )}
                        {entry.admin_name && (
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            Updated by: {entry.admin_name}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Status Update Modal */}
      {order && (
        <UpdateOrderStatusModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          orderId={order.id}
          orderNumber={order.order_number}
          currentStatus={order.status}
          onSuccess={() => {
            void fetchDetails(order.id);
            onOrderUpdated?.();
          }}
        />
      )}
    </>
  );
};
