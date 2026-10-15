import { App } from 'antd';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';

import LabServiceModal, { type LabService } from '../components/LabServiceModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<LabService>[] = [
  statusFacet<LabService>(),
  addedFacet<LabService>(),
];

export default function LabServices() {
  const resource = useResource<LabService>('lab-services', 'lab-services');
  const { message } = App.useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);

  const openEditor = (s: LabService | null) => {
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
          onOpen={() => openEditor(s)}
        />
      ),
    },
    {
      id: 'tenure',
      header: 'Added',
      sort: (s) => -new Date(s.created_at).getTime(),
      cell: (s) => tenure(s.created_at, 'New service'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (s) => s.status,
      cell: (s) => <StatusDot active={s.status === 'ACTIVE'} />,
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
        title="Lab Services"
        subtitle="Master list of all services/tests offered by linked labs."
        icon={FlaskConical}
        noun="service"
        nounPlural="services"
        resource={resource}
        searchPlaceholder="Search service name…"
        searchFields={(s) => [s.name]}
        facets={FACETS}
        dateOf={(s) => s.created_at}
        columns={columns}
        createLabel="New service"
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
