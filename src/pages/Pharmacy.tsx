import { App } from 'antd';
import { Download, FileSpreadsheet, Pill, Plus, Power } from 'lucide-react';
import { useState } from 'react';

import MedicineDrawer from '../components/MedicineDrawer';
import MedicineModal from '../components/MedicineModal';
import MedicineStrengthModal from '../components/MedicineStrengthModal';
import PharmacyImportModal from '../components/PharmacyImportModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
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
    setEditingMedicine(medicine);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (medicine: Medicine) => {
    const nextStatus = medicine.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`medicines/${medicine.id}`, { status: nextStatus });
      message.success(`Medicine "${medicine.medicine_name}" marked as ${nextStatus}.`);
      void resource.refresh();
    } catch {
      message.error('Failed to update medicine status.');
    }
  };

  const handleDelete = async (medicineToDelete: Medicine) => {
    try {
      await api.delete(`medicines/${medicineToDelete.id}`);
      message.success(`Deactivated "${medicineToDelete.medicine_name}".`);
      if (viewingId === medicineToDelete.id) {
        setViewingId(null);
      }
      void resource.refresh();
    } catch {
      message.error('Failed to deactivate medicine record.');
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
        createLabel="Add Medicine"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={handleDelete}
        onRowClick={openDetails}
        nameOf={(m) => m.medicine_name}
        activeId={viewingId}
        extraActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ui-btn"
              onClick={downloadSampleTemplate}
              title="Download standard Excel import template"
            >
              <Download size={14} /> Download Template
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => setIsImportModalOpen(true)}
            >
              <FileSpreadsheet size={15} /> Upload Excel
            </button>
          </div>
        }
        rowActions={(m) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="ui-btn ui-btn-xs flex cursor-pointer items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900"
              onClick={(e) => {
                e.stopPropagation();
                setVariantMedicine(m);
              }}
              title={`Add strength variant for ${m.medicine_name}`}
              aria-label={`Add strength variant for ${m.medicine_name}`}
            >
              <Plus size={12} /> Variant
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
