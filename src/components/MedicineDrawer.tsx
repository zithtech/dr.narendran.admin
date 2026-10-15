import {
  ArrowRight,
  Barcode,
  Boxes,
  Clock,
  Edit2,
  Layers,
  Pill,
  Plus,
  Power,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { formatDate, timeAgo } from '../lib/format';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { isPercentageDiscount } from '../utils/pricing';
import { DetailList, Drawer } from './ui/Drawer';
import { Badge, StatusDot } from './ui/primitives';

interface MedicineDrawerProps {
  medicine: Medicine | null;
  onClose: () => void;
  onEdit: (medicine: Medicine) => void;
  onAddVariant?: (medicine: Medicine) => void;
  onStatusChange?: () => void;
}

export default function MedicineDrawer({
  medicine,
  onClose,
  onEdit,
  onAddVariant,
  onStatusChange,
}: MedicineDrawerProps) {
  const navigate = useNavigate();
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
      ? isPercentageDiscount(medicine.discount_type)
        ? `${medicine.discount_value}% OFF`
        : `₹${medicine.discount_value} OFF`
      : null;

  const stats = [
    {
      label: 'Strength Variants',
      value: (
        <span className="font-bold text-teal-600 dark:text-teal-400">
          {medicine.variants?.length ? `${medicine.variants.length} variant(s)` : '1 variant'}
        </span>
      ),
    },
    {
      label: 'Dosage Form',
      value: medicine.dosage_form ?? 'Tablet',
    },
    {
      label: 'Prescription Policy',
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
            Generic:{' '}
            <strong className="text-slate-700 dark:text-slate-300">{medicine.generic_name}</strong>
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
        {/* Linked Strength Variants Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-teal-600" />
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                Linked Strength Variants ({medicine.variants?.length ?? 0})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onAddVariant && (
                <button
                  type="button"
                  onClick={() => onAddVariant(medicine)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                >
                  <Plus size={13} /> Add Variant
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/inventory?search=${encodeURIComponent(medicine.medicine_name)}`);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Open in Medicine Inventory to manage physical stock and batches"
              >
                <Boxes size={13} /> Inventory <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {medicine.variants && medicine.variants.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200/60 dark:divide-slate-800 dark:border-slate-800">
              {medicine.variants.map((v) => (
                <div
                  key={v.id}
                  className="p-3 text-xs transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {v.strength} {v.strength_unit}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800">
                        {v.dosage_form}
                      </span>
                      {v.tablets_per_strip && (
                        <span className="text-[11px] text-slate-400">
                          ({v.tablets_per_strip} pcs/strip)
                        </span>
                      )}
                    </div>
                    <Badge tone={v.status === 'ACTIVE' ? 'green' : 'neutral'}>{v.status}</Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-[11px] text-slate-400">Available Stock: </span>
                      <strong
                        className={
                          v.available_quantity > 0
                            ? 'font-bold text-emerald-600'
                            : 'font-bold text-rose-500'
                        }
                      >
                        {v.available_quantity} units
                      </strong>
                      {v.tablets_per_strip && v.tablets_per_strip > 1 ? (
                        <span className="ml-1 text-[10px] text-slate-400">
                          ({Math.floor(v.available_quantity / v.tablets_per_strip)} strips)
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Selling Price: </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        ₹{Number(v.final_price ?? v.mrp ?? 0).toFixed(2)}
                      </span>
                      {v.mrp && Number(v.mrp) > Number(v.final_price ?? 0) ? (
                        <span className="ml-1 text-[10px] text-slate-400 line-through">
                          ₹{Number(v.mrp).toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {v.variant_code && (
                    <div className="mt-1 font-mono text-[10px] text-slate-400">
                      SKU: {v.variant_code}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No strength variants configured yet for this medicine.
              </p>
              {onAddVariant && (
                <button
                  type="button"
                  onClick={() => onAddVariant(medicine)}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                >
                  <Plus size={13} /> Add First Strength Variant
                </button>
              )}
            </div>
          )}
        </div>

        <DetailList
          title="Clinical & Formula"
          items={[
            { label: 'Medicine Name', value: medicine.medicine_name },
            { label: 'Generic Name', value: medicine.generic_name },
            { label: 'Dosage Form', value: medicine.dosage_form },
            {
              label: 'Default Strength',
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
                <span className="flex items-center gap-1.5 font-medium text-rose-600">
                  <ShieldAlert size={14} /> Prescription Required (Rx)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <ShieldCheck size={14} /> Over the Counter (OTC)
                </span>
              ),
            },
          ]}
        />

        <DetailList
          title="Master Pricing & Identifiers"
          items={[
            { label: 'Baseline MRP', value: formattedMrp },
            {
              label: 'Baseline Discount',
              value: discountBadge ?? 'No discount configured',
            },
            { label: 'Baseline Patient Price', value: formattedFinalPrice },
            {
              label: 'Medicine Code / SKU',
              value: medicine.medicine_code ? (
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold dark:bg-slate-800">
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
              value: <Badge tone={isActive ? 'green' : 'neutral'}>{medicine.status}</Badge>,
            },
            {
              label: 'Master Record ID',
              value: <span className="font-mono text-[11px] text-slate-500">{medicine.id}</span>,
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
