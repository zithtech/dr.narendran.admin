import { App } from 'antd';
import { FlaskConical, TestTube2 } from 'lucide-react';
import { useState } from 'react';

import LabServiceModal, { type LabService } from '../components/LabServiceModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<LabService>[] = [
  statusFacet<LabService>(),
  {
    id: 'category',
    label: 'Category',
    allLabel: 'All categories',
    value: (s) => s.category || s.service_category || 'Uncategorized',
  },
  addedFacet<LabService>(),
];

export default function LabServices() {
  const resource = useResource<LabService>('lab-services', 'lab-services');
  const { message } = App.useApp();
  const { canCreate, canUpdate } = usePermission();
  const isCreatable = canCreate('LAB_SERVICES');
  const isUpdatable = canUpdate('LAB_SERVICES');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);

  const openEditor = (s: LabService | null) => {
    if (s ? !isUpdatable : !isCreatable) return;
    setEditingService(s);
    setIsModalOpen(true);
  };

  const columns: Column<LabService>[] = [
    {
      id: 'name',
      header: 'Service Name',
      sort: (s) => s.name.toLowerCase(),
      cell: (s) => (
        <PrimaryCell
          name={s.name}
          {...(isUpdatable ? { onOpen: () => openEditor(s) } : {})}
        />
      ),
    },
    {
      id: 'service_code',
      header: 'Service Code',
      sort: (s) => s.service_code || '',
      cell: (s) =>
        s.service_code ? (
          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
            {s.service_code}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        ),
    },
    {
      id: 'service_category',
      header: 'Service Category',
      sort: (s) => (s.category || s.service_category || '').toLowerCase(),
      cell: (s) => {
        const cat = s.category || s.service_category;
        return cat ? (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
            {cat}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        );
      },
    },
    {
      id: 'sample_type',
      header: 'Sample Type',
      sort: (s) => (s.sample_type || '').toLowerCase(),
      cell: (s) =>
        s.sample_type ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <TestTube2 size={12.5} className="text-sky-600 shrink-0" />
            <span>{s.sample_type}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        ),
    },
    {
      id: 'service_price',
      header: 'Service Price',
      sort: (s) => Number(s.price ?? s.service_price ?? 0),
      cell: (s) => {
        const raw = s.price ?? s.service_price;
        const num = Number(raw);
        if (raw === null || raw === undefined || isNaN(num) || num <= 0) {
          return <span className="text-xs text-slate-400 font-medium">₹0.00</span>;
        }
        return (
          <span className="font-semibold text-slate-900 text-xs">
            ₹{num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      sort: (s) => s.status,
      cell: (s) => <StatusDot active={s.status === 'ACTIVE'} />,
    },
    {
      id: 'tenure',
      header: 'Added',
      sort: (s) => -new Date(s.created_at).getTime(),
      cell: (s) => tenure(s.created_at, 'New service'),
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (s) => new Date(s.updated_at || s.created_at).getTime(),
      cell: (s) =>
        s.updated_at && s.updated_at !== s.created_at ? (
          <ActivityCell label="Service updated" when={timeAgo(s.updated_at)} />
        ) : (
          <ActivityCell label="Service added" when={timeAgo(s.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="LAB_SERVICES"
        title="Lab Services"
        subtitle="Master list of all services/tests offered by linked labs."
        icon={FlaskConical}
        noun="service"
        nounPlural="services"
        resource={resource}
        searchPlaceholder="Search service name, code, category, sample…"
        searchFields={(s) => [
          s.name,
          s.service_code || '',
          s.category || s.service_category || '',
          s.sample_type || '',
        ]}
        facets={FACETS}
        dateOf={(s) => s.created_at}
        columns={columns}
        createLabel="Add Diagnostic Service"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(s) => api.delete(`lab-services/${s.id}`)}
        nameOf={(s) => s.name}
      />

      <LabServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={editingService}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingService ? 'Service updated' : 'Service created');
          void resource.refresh();
        }}
      />
    </>
  );
}
