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
  pkg: MedicinePackage | null | undefined;
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
      className="responsive-package-drawer"
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pr-6 sm:pr-8">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-snug truncate">
                {pkg.name}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 sm:gap-2 mt-0.5 font-normal flex-wrap">
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
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {medicines.length} item(s) grouped under this package
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 sm:flex-initial">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(pkg);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[32px] px-3.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Pencil size={13} /> Edit Package
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[32px] px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={scrollRef}
        className="package-modal-scroll flex flex-col gap-3.5 sm:gap-4"
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
          @media (max-width: 640px) {
            .responsive-package-drawer .ant-drawer-content-wrapper {
              width: 100vw !important;
              max-width: 100vw !important;
            }
            .responsive-package-drawer .ant-drawer-header {
              padding: 12px 16px !important;
            }
            .responsive-package-drawer .ant-drawer-body {
              padding: 14px 14px 28px 14px !important;
            }
            .responsive-package-drawer .ant-drawer-footer {
              padding: 12px 14px !important;
            }
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

          {/* Desktop Table View (sm+) */}
          <div className="hidden sm:block overflow-x-auto">
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

          {/* Mobile Medicine Cards View (<sm) */}
          <div className="sm:hidden flex flex-col gap-2.5 p-3 divide-y divide-slate-100">
            {medicines.map((m, idx) => {
              const strengthDisplay = [m.strength, m.strength_unit].filter(Boolean).join(' ');
              const categoryDisplay = [m.therapeutic_category, m.sub_category].filter(Boolean).join(' · ');
              return (
                <div key={m.id || idx} className={idx > 0 ? 'pt-2.5 flex flex-col gap-2' : 'flex flex-col gap-2'}>
                  {/* Medicine Name, Rx badge, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{m.medicine_name}</span>
                        {m.prescription_required ? (
                          <Badge tone="amber">Rx</Badge>
                        ) : (
                          <Badge tone="green">OTC</Badge>
                        )}
                      </div>
                      {m.generic_name && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Generic: {m.generic_name}
                        </div>
                      )}
                      {m.medicine_code && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Code: {m.medicine_code}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <StatusPill
                        active={m.status !== 'Inactive'}
                        label={m.status || 'Active'}
                      />
                    </div>
                  </div>

                  {/* Form, Strength, Brand */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-md border border-slate-100">
                    <span className="font-semibold text-slate-800">{m.dosage_form || 'Tablet'}</span>
                    {strengthDisplay && (
                      <span className="text-blue-600 font-medium">({strengthDisplay})</span>
                    )}
                    {m.manufacturer && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 truncate">{m.manufacturer}</span>
                      </>
                    )}
                  </div>

                  {/* Price & Category */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[11px] text-slate-500 truncate max-w-[170px]">
                      {categoryDisplay || 'General'}
                    </span>
                    <div className="shrink-0 text-right">
                      {m.final_price != null ? (
                        <span className="font-bold text-slate-900">
                          ₹{Number(m.final_price).toFixed(2)}
                          {m.mrp != null && Number(m.mrp) > Number(m.final_price) && (
                            <span className="text-[10px] text-slate-400 line-through ml-1">
                              ₹{Number(m.mrp).toFixed(2)}
                            </span>
                          )}
                        </span>
                      ) : m.mrp != null ? (
                        <span className="font-bold text-slate-900">₹{Number(m.mrp).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export const ViewPackageDrawer = ViewPackageModal;
