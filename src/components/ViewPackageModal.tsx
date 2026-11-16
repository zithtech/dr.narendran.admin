import { Drawer } from 'antd';
import {
  Calendar,
  Package,
  Pencil,
  Pill,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { MedicinePackage } from '../types/pharmacy';
import { StatusPill } from './ui/CommonTable';
import { Badge } from './ui/primitives';

interface ViewPackageModalProps {
  pkg: MedicinePackage | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (pkg: MedicinePackage) => void;
}

export default function ViewPackageModal({
  pkg,
  open,
  onClose,
  onEdit,
}: ViewPackageModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, pkg]);

  if (!pkg) return null;

  const medicines = pkg.medicines || [];

  // Calculate pricing summaries
  const totalMrp = medicines.reduce((acc, m) => acc + (Number(m.mrp) || 0), 0);
  const totalFinalPrice = medicines.reduce((acc, m) => acc + (Number(m.final_price) || Number(m.mrp) || 0), 0);

  const formattedCreatedDate = pkg.created_at
    ? new Date(pkg.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1080px, 94vw)"
      destroyOnHidden
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '20px 24px 36px 24px',
          background: '#f8fafc',
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Package size={18} />
            </div>
            <div>
              <div className="text-[16px] font-bold text-slate-900 leading-snug">
                {pkg.name}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-normal">
                <span className="font-mono font-semibold text-blue-600">
                  #{pkg.id.slice(0, 8).toUpperCase()}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formattedCreatedDate}
                </span>
                {pkg.doctor_name && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                      <Stethoscope size={12} /> Dr. {pkg.doctor_name.replace(/^Dr\.\s*/i, '')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge tone="blue">
            {medicines.length} {medicines.length === 1 ? 'Medicine' : 'Medicines'}
          </Badge>
        </div>
      }
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {medicines.length} item(s) grouped under this package
          </div>
          <div className="flex gap-2.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(pkg);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Pencil size={13} /> Edit Package
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={scrollRef}
        className="package-modal-scroll flex flex-col gap-4"
        style={{
          maxHeight: 'calc(85vh - 70px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <style>{`
          .package-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .package-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        {/* Description Callout */}
        <div className="bg-white border border-slate-200/90 rounded-lg px-4 py-3 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Package Description
          </div>
          <div className={`text-xs leading-relaxed ${pkg.description ? 'text-slate-800' : 'text-slate-400 italic'}`}>
            {pkg.description || 'No description provided for this package.'}
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="px-3.5 py-2.5 rounded-lg border border-blue-100 bg-blue-50/70">
            <div className="text-[11px] font-semibold uppercase text-blue-700">
              Total Medicines
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
              {medicines.length}
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-lg border border-emerald-100 bg-emerald-50/70">
            <div className="text-[11px] font-semibold uppercase text-emerald-700">
              Package Final Value
            </div>
            <div className="text-lg font-bold text-emerald-950 mt-0.5 tabular-nums">
              {totalFinalPrice > 0 ? `₹${totalFinalPrice.toFixed(2)}` : '—'}
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[11px] font-semibold uppercase text-slate-500">
              Total MRP
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
              {totalMrp > 0 ? `₹${totalMrp.toFixed(2)}` : '—'}
            </div>
          </div>
        </div>

        {/* Included Medicines Table */}
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-blue-600" />
              <span className="text-xs font-bold text-slate-900">
                Included Medicines ({medicines.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Linked directly from the Pharmacy module
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2 w-9">#</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Medicine Name</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Brand / Manufacturer</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Category</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Form & Strength</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Price (₹)</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Rx / OTC</th>
                  <th className="px-3.5 py-2 whitespace-nowrap text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {medicines.map((m, idx) => {
                  const strengthDisplay = [m.strength, m.strength_unit].filter(Boolean).join(' ');
                  const categoryDisplay = [m.therapeutic_category, m.sub_category].filter(Boolean).join(' · ');
                  return (
                    <tr
                      key={m.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-3.5 py-2 text-slate-400 align-middle tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2 align-middle">
                        <div className="font-semibold text-slate-900">{m.medicine_name}</div>
                        {m.generic_name && (
                          <div className="text-[11px] text-slate-500">
                            Generic: {m.generic_name}
                          </div>
                        )}
                        {m.medicine_code && (
                          <div className="text-[10.5px] text-slate-400 font-mono">
                            Code: {m.medicine_code}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-slate-700">
                        {m.manufacturer || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-slate-600">
                        {categoryDisplay || <span className="text-slate-400">General</span>}
                      </td>
                      <td className="px-3.5 py-2 align-middle">
                        <div className="font-semibold text-slate-800">
                          {m.dosage_form || 'Tablet'}
                        </div>
                        {strengthDisplay && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            {strengthDisplay}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle tabular-nums">
                        {m.final_price != null ? (
                          <div>
                            <span className="font-semibold text-slate-900">
                              ₹{Number(m.final_price).toFixed(2)}
                            </span>
                            {m.mrp != null && Number(m.mrp) > Number(m.final_price) && (
                              <span className="text-[11px] text-slate-400 line-through ml-1.5">
                                ₹{Number(m.mrp).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : m.mrp != null ? (
                          <span className="font-semibold text-slate-900">
                            ₹{Number(m.mrp).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle">
                        {m.prescription_required ? (
                          <Badge tone="amber">Rx Required</Badge>
                        ) : (
                          <Badge tone="green">OTC</Badge>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-center">
                        <StatusPill
                          active={m.status !== 'Inactive'}
                          label={m.status || 'Active'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export const ViewPackageDrawer = ViewPackageModal;
