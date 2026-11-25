import { Eye, Package, Pencil, Pill, Stethoscope, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { medicinePackagesApi } from '../api/medicinePackagesApi';
import CreateEditPackageModal from '../components/CreateEditPackageModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet } from '../components/ui/facets';
import { ActivityCell, Badge, cx } from '../components/ui/primitives';
import ViewPackageModal from '../components/ViewPackageModal';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { timeAgo } from '../lib/format';
import type { MedicinePackage } from '../types/pharmacy';

const FACETS: Facet<MedicinePackage>[] = [
  {
    id: 'doctor',
    label: 'Doctors',
    allLabel: 'All doctors',
    value: (p) =>
      p.doctor_name?.trim()
        ? `Dr. ${p.doctor_name.replace(/^Dr\.\s*/i, '').trim()}`
        : 'Clinic-wide',
  },
  {
    id: 'size',
    label: 'Package size',
    allLabel: 'All sizes',
    value: (p) => {
      const count = p.medicines?.length ?? 0;
      if (count <= 2) return '1–2 medicines';
      if (count <= 5) return '3–5 medicines';
      return '6+ medicines';
    },
    order: ['1–2 medicines', '3–5 medicines', '6+ medicines'],
  },
  {
    id: 'policy',
    label: 'Policy',
    allLabel: 'All types',
    value: (p) =>
      (p.medicines || []).some((m) => m.prescription_required) ? 'Contains Rx' : 'OTC Only',
    order: ['Contains Rx', 'OTC Only'],
  },
  addedFacet<MedicinePackage>(),
];

function packageEstimatedValue(pkg: MedicinePackage): number {
  return (pkg.medicines || []).reduce(
    (sum, m) => sum + (Number(m.final_price) || Number(m.mrp) || 0),
    0,
  );
}

export default function MedicinePackages() {
  const resource = useResource<MedicinePackage>('medicines/packages/all', 'medicine packages');
  const { canCreate, canUpdate } = usePermission();

  const isCreatable = canCreate('MEDICINE_PACKAGES');
  const isUpdatable = canUpdate('MEDICINE_PACKAGES');

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MedicinePackage | null>(null);

  // Looked up from live list so drawer reflects edits and clears on delete.
  const viewingPackage = viewingId
    ? (resource.items.find((p) => p.id === viewingId) ?? null)
    : null;

  const openDetails = (pkg: MedicinePackage) => setViewingId(pkg.id);

  const openEditor = (pkg: MedicinePackage | null) => {
    if (pkg ? !isUpdatable : !isCreatable) return;
    setEditingPackage(pkg);
    setIsCreateEditOpen(true);
  };

  const columns: Column<MedicinePackage>[] = [
    {
      id: 'name',
      header: 'Package',
      sort: (p) => p.name.toLowerCase(),
      cell: (p) => (
        <PrimaryCell
          name={p.name}
          sub={
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-mono font-semibold text-blue-600">
                #{p.id.slice(0, 8).toUpperCase()}
              </span>
              {p.doctor_name && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Stethoscope size={11} className="text-blue-500" />
                    Dr. {p.doctor_name.replace(/^Dr\.\s*/i, '')}
                  </span>
                </>
              )}
            </span>
          }
          onOpen={() => openDetails(p)}
        />
      ),
    },
    {
      id: 'description',
      header: 'Description',
      sort: (p) => (p.description ?? '').toLowerCase(),
      cell: (p) =>
        p.description ? (
          <div
            className="max-w-[260px] truncate text-xs text-slate-600"
            title={p.description}
          >
            {p.description}
          </div>
        ) : (
          <span className="ui-muted">No description</span>
        ),
    },
    {
      id: 'medicines',
      header: 'Included Medicines',
      sort: (p) => (p.medicines || []).length,
      cell: (p) => {
        const meds = p.medicines || [];
        const previewMeds = meds.slice(0, 2);
        const remaining = meds.length - previewMeds.length;

        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
            <Badge tone="blue">
              {meds.length} {meds.length === 1 ? 'medicine' : 'medicines'}
            </Badge>
            {previewMeds.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {m.medicine_name}
                {m.strength ? ` (${m.strength}${m.strength_unit ? ` ${m.strength_unit}` : ''})` : ''}
              </span>
            ))}
            {remaining > 0 && (
              <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'doctor',
      header: 'Doctor',
      sort: (p) => (p.doctor_name ?? '').toLowerCase(),
      cell: (p) =>
        p.doctor_name ? (
          <span className="font-medium text-slate-800">
            Dr. {p.doctor_name.replace(/^Dr\.\s*/i, '')}
          </span>
        ) : (
          <Badge tone="neutral">Clinic-wide</Badge>
        ),
    },
    {
      id: 'value',
      header: 'Est. Value',
      sort: (p) => packageEstimatedValue(p),
      cell: (p) => {
        const total = packageEstimatedValue(p);
        return total > 0 ? (
          <span className="font-semibold text-slate-800 tabular-nums">₹{total.toFixed(2)}</span>
        ) : (
          <span className="ui-muted">—</span>
        );
      },
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (p) => new Date(p.updated_at || p.created_at).getTime(),
      cell: (p) =>
        p.updated_at && p.updated_at !== p.created_at ? (
          <ActivityCell label="Package updated" when={timeAgo(p.updated_at)} />
        ) : (
          <ActivityCell label="Package added" when={timeAgo(p.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView<MedicinePackage>
        moduleSlug="MEDICINE_PACKAGES"
        title="Medicine Packages"
        subtitle="Group pharmacy medicines into reusable packages for fast prescribing and standardized treatment sets."
        icon={Package}
        noun="medicine package"
        nounPlural="medicine packages"
        resource={resource}
        searchPlaceholder="Search package, description, doctor, or medicine…"
        searchFields={(p) => [
          p.name,
          p.description,
          p.doctor_name,
          p.id,
          ...(p.medicines || []).flatMap((m) => [
            m.medicine_name,
            m.generic_name,
            m.manufacturer,
            m.therapeutic_category,
          ]),
        ]}
        facets={FACETS}
        dateOf={(p) => p.created_at}
        columns={columns}
        createLabel="Create Package"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(p) => medicinePackagesApi.delete(p.id)}
        deleteWarning="The original pharmacy medicines will not be deleted. This cannot be undone."
        nameOf={(p) => p.name}
        onRowClick={openDetails}
        activeId={viewingId}
        minTableWidth={880}
        renderMobileCard={(pkg, { isSel, toggleRow, onEdit, onDelete, isUpdateAllowed, isDeleteAllowed, showCheckCol }) => {
          const meds = pkg.medicines || [];
          const previewMeds = meds.slice(0, 3);
          const remaining = meds.length - previewMeds.length;
          const totalVal = packageEstimatedValue(pkg);
          const containsRx = meds.some((m) => m.prescription_required);

          return (
            <div
              key={pkg.id}
              onClick={() => openDetails(pkg)}
              className={cx(
                'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer',
                'bg-white hover:border-slate-300 hover:shadow-xs active:bg-slate-50/80',
                isSel ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200/80',
              )}
            >
              {/* Header: Checkbox, Name, ID, Badges */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${pkg.name}`}
                      checked={isSel}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRow();
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 leading-snug tracking-tight">
                        {pkg.name}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0">
                        #{pkg.id.slice(0, 8).toUpperCase()}
                      </span>
                      {containsRx ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Contains Rx
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          OTC Only
                        </span>
                      )}
                    </div>

                    {/* Doctor attribution or Clinic-wide */}
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 flex-wrap">
                      {pkg.doctor_name ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Stethoscope size={12} className="text-blue-500 shrink-0" />
                          Dr. {pkg.doctor_name.replace(/^Dr\.\s*/i, '')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          Clinic-wide
                        </span>
                      )}
                      <span>•</span>
                      <span className="text-slate-500">
                        {meds.length} {meds.length === 1 ? 'medicine' : 'medicines'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimated Value */}
                {totalVal > 0 && (
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Est. Value</span>
                    <span className="text-[14px] font-bold text-emerald-700 tabular-nums">
                      ₹{totalVal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description preview */}
              {pkg.description && (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                  {pkg.description}
                </p>
              )}

              {/* Included Medicines Chips Preview */}
              {meds.length > 0 && (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Pill size={11} className="text-blue-500" /> Included Medicines
                    </span>
                    <span className="text-[10.5px] text-slate-400">
                      {meds.length} total
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {previewMeds.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {m.medicine_name}
                        {m.strength ? ` (${m.strength}${m.strength_unit ? ` ${m.strength_unit}` : ''})` : ''}
                      </span>
                    ))}
                    {remaining > 0 && (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        +{remaining} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Card Footer: Timestamp & Actions */}
              <div
                className="flex items-center justify-between pt-2 mt-0.5 border-t border-slate-100 text-xs gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-slate-400 truncate">
                  {pkg.updated_at && pkg.updated_at !== pkg.created_at
                    ? `Updated ${timeAgo(pkg.updated_at)}`
                    : `Added ${timeAgo(pkg.created_at)}`}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDetails(pkg)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Eye size={12} className="text-slate-500" />
                    <span>View</span>
                  </button>

                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[11px] font-semibold text-blue-700 transition-colors cursor-pointer"
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  )}

                  {isDeleteAllowed && onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete()}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete package"
                      aria-label="Delete package"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      {/* View Package Drawer */}
      <ViewPackageModal
        pkg={viewingPackage}
        open={Boolean(viewingPackage)}
        onClose={() => setViewingId(null)}
        {...(isUpdatable
          ? {
              onEdit: (pkg: MedicinePackage) => {
                setViewingId(null);
                setEditingPackage(pkg);
                setIsCreateEditOpen(true);
              },
            }
          : {})}
      />

      {/* Create & Edit Package Drawer */}
      <CreateEditPackageModal
        open={isCreateEditOpen}
        editingPackage={editingPackage}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingPackage(null);
        }}
        onSuccess={() => {
          void resource.refresh();
        }}
      />
    </>
  );
}
