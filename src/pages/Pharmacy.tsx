import { App } from 'antd';
import { Download, FileSpreadsheet, Pill, Power } from 'lucide-react';
import { useState } from 'react';

import MedicineDrawer from '../components/MedicineDrawer';
import MedicineModal from '../components/MedicineModal';
import PharmacyImportModal from '../components/PharmacyImportModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { timeAgo } from '../lib/format';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { downloadSampleTemplate } from '../utils/excelTemplate';

const FACETS: Facet<Medicine>[] = [
  {
    id: 'category',
    label: 'Category',
    allLabel: 'All Categories',
    value: (m) => (m.therapeutic_category?.trim() ? m.therapeutic_category.trim() : 'General / Other'),
  },
  {
    id: 'dosageForm',
    label: 'Dosage Form',
    allLabel: 'All Dosage Forms',
    value: (m) => (m.dosage_form?.trim() ? m.dosage_form.trim() : 'Unspecified'),
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
      message.success(
        `Medicine "${medicine.medicine_name}" marked as ${nextStatus}.`
      );
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
              <span className="text-[11px] font-mono text-slate-400">
                Code: {m.medicine_code}
              </span>
            ) : null
          }
          onOpen={() => openDetails(m)}
        />
      ),
    },
    {
      id: 'strengthAndForm',
      header: 'Dosage Form & Strength',
      cell: (m) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {m.dosage_form ?? 'Tablet'}
          </div>
          <div className="ui-cell-sub">
            {m.strength ? `${m.strength} ${m.strength_unit ?? ''}`.trim() : '—'}
          </div>
        </div>
      ),
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
    {
      id: 'manufacturer',
      header: 'Manufacturer',
      cell: (m) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {m.manufacturer ?? <span className="ui-muted">—</span>}
        </span>
      ),
    },
    {
      id: 'price',
      header: 'MRP / Price',
      sort: (m) => m.final_price ?? m.mrp ?? 0,
      cell: (m) => {
        const mrp = m.mrp !== null && m.mrp !== undefined ? `₹${Number(m.mrp).toFixed(2)}` : null;
        const finalPrice =
          m.final_price !== null && m.final_price !== undefined
            ? `₹${Number(m.final_price).toFixed(2)}`
            : mrp;

        if (!mrp && !finalPrice) return <span className="ui-muted">—</span>;

        return (
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {finalPrice}
            </div>
            {m.discount_type && m.discount_value ? (
              <div className="text-[10px] text-emerald-600 font-semibold">
                {m.discount_type === 'Percentage'
                  ? `${m.discount_value}% OFF`
                  : `₹${m.discount_value} OFF`}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'prescription',
      header: 'Policy',
      cell: (m) =>
        m.prescription_required ? (
          <Badge tone="red">Rx</Badge>
        ) : (
          <Badge tone="green">OTC</Badge>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (m) => (
        <StatusDot
          active={m.status === 'Active'}
          label={m.status ?? 'Active'}
        />
      ),
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
              : 'New medicine created successfully.'
          );
          void resource.refresh();
        }}
      />

      <MedicineDrawer
        medicine={viewingMedicine}
        onClose={() => setViewingId(null)}
        onEdit={openEditor}
        onStatusChange={() => {
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
