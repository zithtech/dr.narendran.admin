import { App, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  Calendar,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Truck,
  User,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import { getErrorMessage } from '../../../utils/errors';
import { usePermission } from '../../../context/PermissionContext';
import { ordersApi } from '../services/ordersApi';
import type {
  DeliveryMethodType,
  OrderDeliveryInfo,
  UpdateDeliveryPayload,
} from '../types/orders';

interface OrderDeliveryManagerProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  delivery: OrderDeliveryInfo | null | undefined;
  onUpdated: () => void;
}

export function normalizeDeliveryMethod(method?: string | null): DeliveryMethodType | null {
  if (!method) return null;
  const lower = method.toLowerCase().trim();
  if (
    lower.includes('courier') ||
    lower.includes('third_party') ||
    lower.includes('third-party') ||
    lower.includes('awb') ||
    lower.includes('logistics')
  ) {
    return 'courier';
  }
  if (
    lower.includes('pharmacy') ||
    lower.includes('rider') ||
    lower.includes('in_house') ||
    lower.includes('internal') ||
    lower.includes('delivery_boy')
  ) {
    return 'pharmacy_delivery';
  }
  return null;
}

const URL_REGEX = /^(https?:\/\/)([\w.-]+)+(:\d+)?(\/[\w/.~#%+-]*)?(\?[^\s#]*)?(#.*)?$/i;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export const OrderDeliveryManager: React.FC<OrderDeliveryManagerProps> = ({
  orderId,
  orderNumber: _orderNumber,
  orderStatus,
  delivery,
  onUpdated,
}) => {
  const { message } = App.useApp();
  const { canUpdate } = usePermission();
  const isOrderUpdatable = canUpdate('ORDERS');

  // Extraction with nested and flat fallbacks using nullish coalescing
  const savedMethod = normalizeDeliveryMethod(delivery?.delivery_method);

  const savedCourierName =
    delivery?.courier_name ??
    delivery?.courier?.courier_name ??
    delivery?.courier_details?.courier_name ??
    '';

  const savedTrackingNumber =
    delivery?.tracking_number ??
    delivery?.courier?.tracking_number ??
    delivery?.courier_details?.tracking_number ??
    '';

  const savedTrackingUrl =
    delivery?.tracking_url ??
    delivery?.courier?.tracking_url ??
    delivery?.courier_details?.tracking_url ??
    '';

  const savedCourierPhone =
    delivery?.courier_phone ??
    delivery?.courier?.courier_phone ??
    delivery?.courier_details?.courier_phone ??
    '';

  const savedRiderName =
    delivery?.delivery_person_name ??
    delivery?.delivery_person?.delivery_person_name ??
    delivery?.pharmacy_delivery?.delivery_person_name ??
    '';

  const savedRiderPhone =
    delivery?.delivery_person_phone ??
    delivery?.delivery_person?.delivery_person_phone ??
    delivery?.pharmacy_delivery?.delivery_person_phone ??
    '';

  const savedEta = delivery?.estimated_delivery_time ?? '';
  const savedDelayRemarks = delivery?.delay_remarks ?? '';

  // Mode state: If no method is configured yet, open in setup mode if order is active
  const [isEditing, setIsEditing] = useState(false);

  // Form fields state initialized from props
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethodType>(
    savedMethod ?? 'courier'
  );
  const [courierName, setCourierName] = useState(savedCourierName);
  const [trackingNumber, setTrackingNumber] = useState(savedTrackingNumber);
  const [trackingUrl, setTrackingUrl] = useState(savedTrackingUrl);
  const [courierPhone, setCourierPhone] = useState(savedCourierPhone);

  const [riderName, setRiderName] = useState(savedRiderName);
  const [riderPhone, setRiderPhone] = useState(savedRiderPhone);

  const [etaDate, setEtaDate] = useState<Dayjs | null>(
    savedEta ? dayjs(savedEta) : null
  );
  const [delayRemarks, setDelayRemarks] = useState(savedDelayRemarks);

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`${label} copied to clipboard`);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (selectedMethod === 'courier') {
      if (!courierName.trim()) {
        errors.courierName = 'Courier company name is required.';
      }
      if (!trackingNumber.trim()) {
        errors.trackingNumber = 'Tracking / AWB number is required.';
      }
      if (trackingUrl.trim() && !URL_REGEX.test(trackingUrl.trim())) {
        errors.trackingUrl = 'Tracking URL must be a valid http:// or https:// URL.';
      }
      if (courierPhone.trim()) {
        const cleaned = courierPhone.trim().replace(/[\s-]/g, '');
        if (cleaned.length < 10 || !/^\+?\d{10,13}$/.test(cleaned)) {
          errors.courierPhone = 'Please enter a valid courier contact number (min 10 digits).';
        }
      }
    } else if (selectedMethod === 'pharmacy_delivery') {
      if (!riderName.trim()) {
        errors.riderName = 'Delivery person name is required.';
      }
      const cleaned = riderPhone.trim().replace(/[\s-]/g, '');
      if (!cleaned) {
        errors.riderPhone = 'Delivery person phone number is required.';
      } else if (!PHONE_REGEX.test(cleaned)) {
        errors.riderPhone = 'Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setApiError(null);

    if (!validate()) {
      void message.error('Please fix validation errors before saving.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: UpdateDeliveryPayload = {
        delivery_method: selectedMethod,
        estimated_delivery_time: etaDate ? etaDate.toISOString() : null,
        delay_remarks: delayRemarks.trim() ? delayRemarks.trim() : null,
      };

      if (selectedMethod === 'courier') {
        payload.courier_name = courierName.trim();
        payload.tracking_number = trackingNumber.trim();
        payload.tracking_url = trackingUrl.trim() ? trackingUrl.trim() : null;
        payload.courier_phone = courierPhone.trim() ? courierPhone.trim() : null;
        // Reset rider fields to avoid stale values
        payload.delivery_person_name = null;
        payload.delivery_person_phone = null;
      } else {
        payload.delivery_person_name = riderName.trim();
        payload.delivery_person_phone = riderPhone.trim().replace(/[\s-]/g, '');
        // Reset courier fields to avoid stale values
        payload.courier_name = null;
        payload.tracking_number = null;
        payload.tracking_url = null;
        payload.courier_phone = null;
      }

      await ordersApi.updateDelivery(orderId, payload);
      void message.success('Delivery details updated successfully.');
      setIsEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to update delivery details.');
      setApiError(msg);
      void message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave();
  };

  const handleCancel = () => {
    setSelectedMethod(savedMethod ?? 'courier');
    setCourierName(savedCourierName);
    setTrackingNumber(savedTrackingNumber);
    setTrackingUrl(savedTrackingUrl);
    setCourierPhone(savedCourierPhone);
    setRiderName(savedRiderName);
    setRiderPhone(savedRiderPhone);
    setEtaDate(savedEta ? dayjs(savedEta) : null);
    setDelayRemarks(savedDelayRemarks);
    setFormErrors({});
    setApiError(null);
    setIsEditing(false);
  };

  const isTerminalStatus =
    orderStatus === 'delivered' || orderStatus === 'cancelled';

  // Format saved ETA display
  const renderEtaDisplay = () => {
    if (!savedEta) {
      return (
        <span className="text-slate-400 italic">
          ETA not set yet
        </span>
      );
    }
    const d = dayjs(savedEta);
    if (!d.isValid()) {
      return <span className="text-slate-600 dark:text-slate-300">{savedEta}</span>;
    }
    const isPast = d.isBefore(dayjs()) && orderStatus !== 'delivered';
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {d.format('DD MMM YYYY, hh:mm A')}
        </span>
        {isPast ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <Clock size={10} /> Overdue
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Clock size={10} /> Scheduled
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Truck size={15} className="text-teal-600" />
          <span>Delivery & Fulfillment</span>
        </div>
        {!isEditing && !isTerminalStatus && isOrderUpdatable && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit3 size={12} className="text-indigo-600" />
            <span>{savedMethod ? 'Edit Details' : 'Configure Delivery'}</span>
          </button>
        )}
      </div>

      {/* Destination Address (Always visible) */}
      <div className="space-y-1 text-xs">
        <span className="text-slate-400 block text-[11px]">Destination Address</span>
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <div>
            <p className="font-medium leading-relaxed">
              {delivery?.delivery_address?.full_address ?? 'No address provided'}
            </p>
            {Boolean(delivery?.delivery_address?.city ?? delivery?.delivery_address?.pincode) && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {[
                  delivery?.delivery_address?.city,
                  delivery?.delivery_address?.state,
                  delivery?.delivery_address?.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* View Mode */}
      {!isEditing ? (
        <div className="space-y-3.5 text-xs">
          {/* Method Indicator */}
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/40">
            <span className="text-slate-500 font-medium">Assigned Method</span>
            {savedMethod === 'courier' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                <Truck size={12} />
                <span>Third-party Courier</span>
              </span>
            ) : savedMethod === 'pharmacy_delivery' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                <Bike size={12} />
                <span>Pharmacy Delivery</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                <AlertTriangle size={12} />
                <span>Not Assigned</span>
              </span>
            )}
          </div>

          {/* Courier Details View */}
          {savedMethod === 'courier' && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-2 dark:border-blue-950 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-200">
                  <Truck size={14} className="text-blue-600" />
                  <span>{savedCourierName ? savedCourierName : 'Courier Partner'}</span>
                </div>
                {savedCourierPhone ? (
                  <a
                    href={`tel:${savedCourierPhone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline dark:text-blue-300"
                  >
                    <Phone size={11} />
                    <span>{savedCourierPhone}</span>
                  </a>
                ) : null}
              </div>

              {savedTrackingNumber ? (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100/60 dark:border-blue-900/40">
                  <span className="text-slate-500">AWB / Tracking #</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {savedTrackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(savedTrackingNumber, 'Tracking number')}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Copy Tracking #"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ) : null}

              {savedTrackingUrl ? (
                <div className="pt-1">
                  <a
                    href={savedTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    <span>Track on Courier Portal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : null}
            </div>
          )}

          {/* Pharmacy Delivery Details View */}
          {savedMethod === 'pharmacy_delivery' && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 space-y-2 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
                  <Bike size={14} className="text-emerald-600" />
                  <span>{savedRiderName ? savedRiderName : 'Pharmacy Rider'}</span>
                </div>
                {savedRiderPhone ? (
                  <a
                    href={`tel:${savedRiderPhone}`}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    <Phone size={12} />
                    <span>{savedRiderPhone}</span>
                  </a>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500">
                Direct in-house pharmacy staff delivery. Contact rider for real-time dispatch status.
              </p>
            </div>
          )}

          {/* No Delivery Method Notice */}
          {!savedMethod && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Delivery Method Not Assigned</p>
                  <p className="mt-0.5 text-[11px]">
                    Assign a courier partner or internal pharmacy delivery person before dispatching this package.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ETA & Delay Section View */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Estimated Delivery (ETA)</span>
              {renderEtaDisplay()}
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Delay Remarks</span>
              <span className="text-slate-700 dark:text-slate-300">
                {savedDelayRemarks ? savedDelayRemarks : <span className="text-slate-400 italic">None recorded</span>}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form noValidate onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {/* API Error Notification */}
          {apiError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Method Selection (2 Options) */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Delivery Method <span className="text-rose-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('courier');
                  setFormErrors({});
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer ${selectedMethod === 'courier'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                  }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Truck size={15} className="text-indigo-600" />
                  <span>Third-party Courier</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  External courier partner (e.g. Blue Dart, Delhivery)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('pharmacy_delivery');
                  setFormErrors({});
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer ${selectedMethod === 'pharmacy_delivery'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                  }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Bike size={15} className="text-emerald-600" />
                  <span>Pharmacy Delivery</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Internal staff / pharmacy rider
                </span>
              </button>
            </div>
          </div>

          {/* Conditional Form: Third-party Courier */}
          {selectedMethod === 'courier' && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-3 dark:border-indigo-950 dark:bg-indigo-950/20">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <Truck size={14} className="text-indigo-600" />
                <span>Third-party Courier Details</span>
              </div>

              {/* Courier Company Name */}
              <div>
                <label htmlFor="order-courier-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Courier Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="order-courier-name"
                  type="text"
                  className={`ui-input w-full ${formErrors.courierName ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="e.g. Blue Dart, Delhivery, DTDC, FedEx"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.courierName ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.courierName}</span>
                ) : null}
              </div>

              {/* Tracking / AWB Number */}
              <div>
                <label htmlFor="order-tracking-number" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tracking / AWB Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="order-tracking-number"
                  type="text"
                  className={`ui-input w-full font-mono ${formErrors.trackingNumber ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="e.g. AWB9841284910"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.trackingNumber ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.trackingNumber}</span>
                ) : null}
              </div>

              {/* Tracking URL */}
              <div>
                <label htmlFor="order-tracking-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tracking URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="order-tracking-url"
                  type="url"
                  className={`ui-input w-full ${formErrors.trackingUrl ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="https://track.bluedart.com/?awb=AWB9841284910"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.trackingUrl ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.trackingUrl}</span>
                ) : null}
              </div>

              {/* Courier Contact Number */}
              <div>
                <label htmlFor="order-courier-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Courier Contact Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="order-courier-phone"
                  type="tel"
                  className={`ui-input w-full ${formErrors.courierPhone ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="e.g. 1800 209 1234 or 9876543210"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.courierPhone ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.courierPhone}</span>
                ) : null}
              </div>
            </div>
          )}

          {/* Conditional Form: Pharmacy Delivery */}
          {selectedMethod === 'pharmacy_delivery' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 space-y-3 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <User size={14} className="text-emerald-600" />
                <span>Pharmacy Delivery Person Details</span>
              </div>

              {/* Delivery Person Name */}
              <div>
                <label htmlFor="order-rider-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Person Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="order-rider-name"
                  type="text"
                  className={`ui-input w-full ${formErrors.riderName ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="e.g. Ramesh Kumar"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.riderName ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.riderName}</span>
                ) : null}
              </div>

              {/* Delivery Person Phone Number */}
              <div>
                <label htmlFor="order-rider-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Person Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="order-rider-phone"
                  type="tel"
                  maxLength={10}
                  className={`ui-input w-full ${formErrors.riderPhone ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  placeholder="10-digit mobile number, e.g. 9876543210"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isSubmitting}
                />
                {formErrors.riderPhone ? (
                  <span className="mt-1 block text-[11px] text-rose-600">{formErrors.riderPhone}</span>
                ) : null}
              </div>
            </div>
          )}

          {/* ETA & Delay Remarks Form Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Calendar size={14} className="text-indigo-600" />
              <span>Estimated Delivery (ETA) & Remarks</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="order-eta-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Delivery Date & Time
                </label>
                <DatePicker
                  id="order-eta-date"
                  showTime={{ format: 'hh:mm A' }}
                  format="YYYY-MM-DD hh:mm A"
                  value={etaDate}
                  onChange={(val) => setEtaDate(val)}
                  className="w-full"
                  placeholder="Select delivery ETA"
                  disabled={isSubmitting}
                />
                {/* Preset shortcuts */}
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEtaDate(dayjs().add(2, 'hour'))}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    +2h
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtaDate(dayjs().add(1, 'day').hour(17).minute(0))}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Tomorrow 5 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtaDate(dayjs().add(2, 'day').hour(17).minute(0))}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    +2 Days
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="order-delay-remarks" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delay Remarks / Dispatch Notes
                </label>
                <textarea
                  id="order-delay-remarks"
                  rows={2}
                  className="ui-input w-full text-xs"
                  placeholder="e.g. Heavy rain delay, stock replenishment, special route..."
                  value={delayRemarks}
                  onChange={(e) => setDelayRemarks(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="ui-btn ui-btn-xs"
              disabled={isSubmitting}
            >
              <X size={13} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="ui-btn ui-btn-primary ui-btn-xs inline-flex items-center gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Delivery Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};