import { App } from 'antd';
import { Download, FileSpreadsheet, Pencil, Pill, Plus, Power } from 'lucide-react';
import { useState } from 'react';

import MedicineDrawer from '../components/MedicineDrawer';
import MedicineModal from '../components/MedicineModal';
import MedicineStrengthModal from '../components/MedicineStrengthModal';
import PharmacyImportModal from '../components/PharmacyImportModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, cx, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { usePermission } from '../context/PermissionContext';
import { timeAgo } from '../lib/format';
import { formatDosageStrengthSummary, type Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { downloadSampleTemplate } from '../utils/excelTemplate';

const FACETS: Facet<Medicine>[] = [
  {
    id: 'category',
    label: 'Category',
    allLabel: 'All Categories',
    value: (m) =>
      m.therapeutic_category?.trim() ? m.therapeutic_category.trim() : 'General / Other',
  },
  {
    id: 'dosageForm',
    label: 'Dosage Form',
    allLabel: 'All Dosage Forms',
    value: (m) => {
      if (m.variants && m.variants.length > 0) {
        return m.variants[0]?.dosage_form?.trim() || 'Unspecified';
      }
      return m.dosage_form?.trim() ? m.dosage_form.trim() : 'Unspecified';
    },
  },
  {
    id: 'prescription',
    label: 'Prescription',
    allLabel: 'All Types',
    value: (m) => (m.prescription_required ? 'Rx Required' : 'Over The Counter'),
    order: ['Rx Required', 'Over The Counter'],
  },
  statusFacet<Medicine>(),
  addedFacet<Medicine>(),
];

export default function Pharmacy() {
  const resource = useResource<Medicine>('medicines', 'medicines');
  const { message } = App.useApp();
  const { canCreate, canUpdate } = usePermission();

  const isPharmCreatable = canCreate('PHARMACY');
  const isPharmUpdatable = canUpdate('PHARMACY');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [variantMedicine, setVariantMedicine] = useState<Medicine | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Looked up from the live list so changes immediately reflect in the drawer
  const viewingMedicine = viewingId
    ? (resource.items.find((m) => m.id === viewingId) ?? null)
    : null;

  const openDetails = (medicine: Medicine) => setViewingId(medicine.id);

  const openEditor = (medicine: Medicine | null) => {
    if (medicine ? !isPharmUpdatable : !isPharmCreatable) return;
    setEditingMedicine(medicine);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (medicine: Medicine) => {
    if (!isPharmUpdatable) return;
    const nextStatus = medicine.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`medicines/${medicine.id}`, { status: nextStatus });
      message.success(`Medicine "${medicine.medicine_name}" marked as ${nextStatus}.`);
      void resource.refresh();
    } catch {
      message.error('Failed to update medicine status.');
    }
  };

  const columns: Column<Medicine>[] = [
    {
      id: 'name',
      header: 'Medicine Name',
      sort: (m) => m.medicine_name.toLowerCase(),
      cell: (m) => (
        <PrimaryCell
          name={m.medicine_name}
          sub={
            m.generic_name ? (
              <span className="text-[11px] text-slate-500">
                Generic: <strong>{m.generic_name}</strong>
              </span>
            ) : m.medicine_code ? (
              <span className="font-mono text-[11px] text-slate-400">Code: {m.medicine_code}</span>
            ) : null
          }
          onOpen={() => openDetails(m)}
        />
      ),
    },
    {
      id: 'dosageFormAndStrengths',
      header: 'Dosage Forms & Strengths',
      cell: (m) => {
        const summary = formatDosageStrengthSummary(m.variants, m.dosage_form, m.strength);
        return (
          <div className="flex max-w-sm flex-col gap-1.5 py-0.5">
            {summary.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.form}:
                </span>
                {item.strengths.length > 0 ? (
                  item.strengths.map((str, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-block rounded-md border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300"
                    >
                      {str}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400">Standard</span>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Therapeutic Category',
      cell: (m) =>
        m.therapeutic_category ? (
          <Badge tone="blue">{m.therapeutic_category}</Badge>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    // {
    //   id: 'manufacturer',
    //   header: 'Manufacturer',
    //   cell: (m) => (
    //     <span className="text-xs text-slate-700 dark:text-slate-300">
    //       {m.manufacturer ?? <span className="ui-muted">—</span>}
    //     </span>
    //   ),
    // },
    {
      id: 'variants',
      header: 'Variants',
      cell: (m) => {
        const count = m.variants?.length ?? (m.strength ? 1 : 0);
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {count} {count === 1 ? 'variant' : 'variants'}
          </span>
        );
      },
    },
    {
      id: 'prescription',
      header: 'Policy',
      cell: (m) =>
        m.prescription_required ? <Badge tone="red">Rx</Badge> : <Badge tone="green">OTC</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (m) => <StatusDot active={m.status === 'Active'} label={m.status ?? 'Active'} />,
    },
    {
      id: 'updated',
      header: 'Last Updated',
      cell: (m) => (
        <ActivityCell
          label={m.frequency ? `${m.frequency}` : 'Updated'}
          when={m.updated_at ? timeAgo(m.updated_at) : timeAgo(m.created_at)}
        />
      ),
    },
  ];

  return (
    <>
      <DataView<Medicine>
        moduleSlug="PHARMACY"
        title="Pharmacy Management"
        subtitle="Master medicine repository for clinical prescriptions, inventory catalogs, and patient orders."
        icon={Pill}
        noun="medicine"
        nounPlural="medicines"
        resource={resource}
        searchPlaceholder="Search medicine name, generic name, code, manufacturer, category..."
        searchFields={(m) => [
          m.medicine_name,
          m.generic_name,
          m.medicine_code,
          m.manufacturer,
          m.therapeutic_category,
          m.dosage_form,
          ...(m.variants?.flatMap((v) => [
            v.dosage_form,
            v.strength,
            v.strength_unit,
            v.variant_code,
            v.barcode,
          ]) ?? []),
        ]}
        facets={FACETS}
        dateOf={(m) => m.created_at}
        columns={columns}
        minTableWidth={880}
        createLabel="Add Medicine"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onRowClick={openDetails}
        nameOf={(m) => m.medicine_name}
        activeId={viewingId}
        renderMobileCard={(m, { isSel, toggleRow, onEdit, isUpdateAllowed, showCheckCol }) => {
          const summary = formatDosageStrengthSummary(m.variants, m.dosage_form, m.strength);
          const variantCount = m.variants?.length ?? (m.strength ? 1 : 0);
          const isActive = m.status === 'Active';

          return (
            <div
              key={m.id}
              onClick={() => openDetails(m)}
              className={cx(
                'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer',
                'bg-white hover:border-slate-300 hover:shadow-xs',
                isSel ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200/80',
              )}
            >
              {/* Header: Medicine Name, Generic, Status, Rx/OTC, Checkbox */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.medicine_name}`}
                      checked={isSel}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRow();
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 leading-snug tracking-tight">
                        {m.medicine_name}
                      </span>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0',
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200',
                        )}
                      >
                        <span
                          className={cx(
                            'w-1.5 h-1.5 rounded-full',
                            isActive ? 'bg-emerald-500' : 'bg-slate-400',
                          )}
                        />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      {m.prescription_required ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Rx
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          OTC
                        </span>
                      )}
                    </div>

                    {m.generic_name && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Generic: <span className="font-medium text-slate-700">{m.generic_name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dosage Forms & Strengths */}
              {summary.length > 0 && (
                <div className="flex flex-col gap-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>Dosage & Strengths</span>
                    <span className="text-[10.5px] text-slate-400">
                      {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {summary.map((item, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-700 text-[11.5px]">{item.form}:</span>
                        {item.strengths.length > 0 ? (
                          item.strengths.map((str, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-block rounded-md border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
                            >
                              {str}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category, Manufacturer & Pricing Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {m.therapeutic_category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                    {m.therapeutic_category}
                  </span>
                )}
                {m.manufacturer && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-slate-600 bg-slate-100 border border-slate-200/80">
                    {m.manufacturer}
                  </span>
                )}
                {m.final_price !== null && m.final_price !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 ml-auto">
                    ₹{Number(m.final_price).toFixed(2)}
                    {m.mrp && Number(m.mrp) > Number(m.final_price) && (
                      <span className="line-through text-slate-400 font-normal text-[10px]">
                        ₹{Number(m.mrp).toFixed(2)}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Card Footer: Timestamp and Touch Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400">
                  {m.updated_at ? `Updated ${timeAgo(m.updated_at)}` : `Added ${timeAgo(m.created_at)}`}
                </span>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isPharmCreatable && (
                    <button
                      type="button"
                      onClick={() => setVariantMedicine(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer min-h-[32px]"
                      title={`Add strength variant for ${m.medicine_name}`}
                      aria-label={`Add strength variant for ${m.medicine_name}`}
                    >
                      <Plus size={12} /> Variant
                    </button>
                  )}
                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      aria-label={`Edit ${m.medicine_name}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title={`Edit ${m.medicine_name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {isPharmUpdatable && (
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(m)}
                      aria-label={isActive ? `Deactivate ${m.medicine_name}` : `Activate ${m.medicine_name}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title={isActive ? 'Deactivate Medicine' : 'Activate Medicine'}
                    >
                      <Power
                        size={14}
                        className={isActive ? 'text-emerald-600' : 'text-slate-400'}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }}
        extraActions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              onClick={downloadSampleTemplate}
              title="Download standard Excel import template"
            >
              <Download size={13} className="text-slate-500" />
              <span>Download Template</span>
            </button>
            {isPharmCreatable && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                onClick={() => setIsImportModalOpen(true)}
                title="Import medicine records from Excel"
              >
                <FileSpreadsheet size={13} />
                <span>Upload Excel</span>
              </button>
            )}
          </div>
        }
        rowActions={(m) => (
          <div className="flex items-center gap-1.5">
            {isPharmCreatable && (
              <button
                type="button"
                className="ui-btn ui-btn-xs flex cursor-pointer items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900"
                onClick={(e) => {
                  e.stopPropagation();
                  setVariantMedicine(m);
                }}
                title={`Add strength variant for ${m.medicine_name}`}
                aria-label={`Add strength variant for ${m.medicine_name}`}
              >
                <Plus size={12} /> Variant
              </button>
            )}
            {isPharmUpdatable && (
              <>
                <button
                  type="button"
                  className="ui-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor(m);
                  }}
                  title={`Edit ${m.medicine_name}`}
                  aria-label={`Edit ${m.medicine_name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="ui-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleStatus(m);
                  }}
                  title={m.status === 'Active' ? 'Deactivate Medicine' : 'Activate Medicine'}
                  aria-label={m.status === 'Active' ? 'Deactivate Medicine' : 'Activate Medicine'}
                >
                  <Power
                    size={14}
                    className={m.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}
                  />
                </button>
              </>
            )}
          </div>
        )}
      />

      <MedicineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        medicine={editingMedicine}
        onSave={() => {
          message.success(
            editingMedicine
              ? 'Medicine record updated successfully.'
              : 'New medicine created successfully.',
          );
          void resource.refresh();
        }}
      />

      <MedicineDrawer
        medicine={viewingMedicine}
        onClose={() => setViewingId(null)}
        onEdit={openEditor}
        onAddVariant={(med) => setVariantMedicine(med)}
        onStatusChange={() => {
          void resource.refresh();
        }}
      />

      <MedicineStrengthModal
        isOpen={Boolean(variantMedicine)}
        medicine={variantMedicine}
        onClose={() => setVariantMedicine(null)}
        onSave={() => {
          message.success('Variant created successfully.');
          setVariantMedicine(null);
          void resource.refresh();
        }}
      />

      <PharmacyImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          message.success('Medicine catalog refreshed with imported records.');
          void resource.refresh();
        }}
      />
    </>
  );
}
