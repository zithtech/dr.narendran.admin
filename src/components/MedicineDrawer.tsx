import {
  Barcode,
  Clock,
  Edit2,
  Pill,
  Power,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import { formatDate, timeAgo } from '../lib/format';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { DetailList, Drawer } from './ui/Drawer';
import { Badge, StatusDot } from './ui/primitives';

interface MedicineDrawerProps {
  medicine: Medicine | null;
  onClose: () => void;
  onEdit: (medicine: Medicine) => void;
  onStatusChange?: () => void;
}

export default function MedicineDrawer({
  medicine,
  onClose,
  onEdit,
  onStatusChange,
}: MedicineDrawerProps) {
  const [togglingStatus, setTogglingStatus] = useState(false);

  if (!medicine) return null;

  const isActive = medicine.status === 'Active';

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const nextStatus = isActive ? 'Inactive' : 'Active';
      await api.put(`medicines/${medicine.id}`, { status: nextStatus });
      onStatusChange?.();
      onClose();
    } catch {
      // Handled globally
    } finally {
      setTogglingStatus(false);
    }
  };

  const formattedMrp =
    medicine.mrp !== null && medicine.mrp !== undefined
      ? `₹${Number(medicine.mrp).toFixed(2)}`
      : '—';

  const formattedFinalPrice =
    medicine.final_price !== null && medicine.final_price !== undefined
      ? `₹${Number(medicine.final_price).toFixed(2)}`
      : formattedMrp;

  const discountBadge =
    medicine.discount_type && medicine.discount_value
      ? medicine.discount_type === 'Percentage'
        ? `${medicine.discount_value}% OFF`
        : `₹${medicine.discount_value} OFF`
      : null;

  const stats = [
    {
      label: 'Selling Price',
      value: (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formattedFinalPrice}
        </span>
      ),
    },
    {
      label: 'Dosage Form',
      value: medicine.dosage_form ?? 'Tablet',
    },
    {
      label: 'Prescription',
      value: medicine.prescription_required ? (
        <Badge tone="red">Rx Required</Badge>
      ) : (
        <Badge tone="green">OTC</Badge>
      ),
    },
  ];

  const hero = (
    <div className="flex items-start gap-3.5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
        <Pill size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {medicine.medicine_name}
          </h2>
          <StatusDot active={isActive} label={medicine.status} />
        </div>
        {medicine.generic_name && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Generic: <strong className="text-slate-700 dark:text-slate-300">{medicine.generic_name}</strong>
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {medicine.strength && (
            <Badge tone="blue">
              {medicine.strength} {medicine.strength_unit ?? ''}
            </Badge>
          )}
          {medicine.therapeutic_category && (
            <Badge tone="neutral">{medicine.therapeutic_category}</Badge>
          )}
          {discountBadge && <Badge tone="amber">{discountBadge}</Badge>}
        </div>
      </div>
    </div>
  );

  return (
    <Drawer
      open={Boolean(medicine)}
      onClose={onClose}
      label="Medicine Master Record"
      hero={hero}
      stats={stats}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            className="ui-btn"
            onClick={() => {
              void handleToggleStatus();
            }}
            disabled={togglingStatus}
          >
            <Power size={14} />
            {togglingStatus
              ? 'Updating...'
              : isActive
                ? 'Deactivate Medicine'
                : 'Activate Medicine'}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => {
              onClose();
              onEdit(medicine);
            }}
          >
            <Edit2 size={14} /> Edit Medicine
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <DetailList
          title="Clinical & Formula"
          items={[
            { label: 'Medicine Name', value: medicine.medicine_name },
            { label: 'Generic Name', value: medicine.generic_name },
            { label: 'Dosage Form', value: medicine.dosage_form },
            {
              label: 'Strength',
              value: medicine.strength
                ? `${medicine.strength} ${medicine.strength_unit ?? ''}`.trim()
                : null,
            },
            { label: 'Therapeutic Category', value: medicine.therapeutic_category },
            { label: 'Sub Category', value: medicine.sub_category },
            { label: 'Manufacturer', value: medicine.manufacturer },
            {
              label: 'Prescription Policy',
              value: medicine.prescription_required ? (
                <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <ShieldAlert size={14} /> Prescription Required (Rx)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <ShieldCheck size={14} /> Over the Counter (OTC)
                </span>
              ),
            },
          ]}
        />

        <DetailList
          title="Pricing & Codes"
          items={[
            { label: 'MRP (Maximum Retail Price)', value: formattedMrp },
            {
              label: 'Discount',
              value: discountBadge ?? 'No discount configured',
            },
            { label: 'Final Patient Price', value: formattedFinalPrice },
            {
              label: 'Medicine Code / SKU',
              value: medicine.medicine_code ? (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {medicine.medicine_code}
                </span>
              ) : null,
            },
            {
              label: 'Barcode / EAN',
              value: medicine.barcode ? (
                <span className="flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300">
                  <Barcode size={14} /> {medicine.barcode}
                </span>
              ) : null,
            },
          ]}
        />

        <DetailList
          title="Prescription Suggestions"
          items={[
            {
              label: 'Default Frequency',
              value: medicine.frequency ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock size={14} className="text-teal-600" /> {medicine.frequency}
                </span>
              ) : null,
            },
            {
              label: 'Default Duration',
              value: medicine.duration,
            },
            {
              label: 'Instructions & Notes',
              value: medicine.description,
            },
          ]}
        />

        <DetailList
          title="System Metadata"
          items={[
            {
              label: 'Status',
              value: (
                <Badge tone={isActive ? 'green' : 'neutral'}>
                  {medicine.status}
                </Badge>
              ),
            },
            {
              label: 'Master Record ID',
              value: (
                <span className="font-mono text-[11px] text-slate-500">
                  {medicine.id}
                </span>
              ),
            },
            {
              label: 'Created At',
              value: medicine.created_at ? formatDate(medicine.created_at) : '—',
            },
            {
              label: 'Last Updated',
              value: medicine.updated_at ? `${timeAgo(medicine.updated_at)}` : '—',
            },
          ]}
        />
      </div>
    </Drawer>
  );
}
