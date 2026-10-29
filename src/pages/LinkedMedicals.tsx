import { App } from 'antd';
import { MapPin, Phone, Stethoscope } from 'lucide-react';
import { useState } from 'react';

import LinkedMedicalModal, { type LinkedMedical } from '../components/LinkedMedicalModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { formatDate } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<LinkedMedical>[] = [
  statusFacet<LinkedMedical>(),
  addedFacet<LinkedMedical>(),
];

export default function LinkedMedicals() {
  const resource = useResource<LinkedMedical>('linked-medicals', 'linked medicals');
  const { message, modal } = App.useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedical, setEditingMedical] = useState<LinkedMedical | null>(null);

  const openEditor = (m: LinkedMedical | null) => {
    setEditingMedical(m);
    setIsModalOpen(true);
  };

  const deleteMedical = (m: LinkedMedical): Promise<void> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: `Delete ${m.name}?`,
        content: 'Are you sure you want to delete this linked medical? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          try {
            await api.delete(`linked-medicals/${m.id}`);
            void message.success('Linked medical deleted');
            void resource.refresh();
            resolve();
          } catch (err: any) {
            void message.error(err.response?.data?.error || 'Failed to delete linked medical');
            resolve();
          }
        },
        onCancel: () => resolve(),
      });
    });
  };

  const columns: Column<LinkedMedical>[] = [
    {
      id: 'name',
      header: 'Pharmacy / Medical Name',
      sort: (m) => m.name.toLowerCase(),
      cell: (m) => (
        <PrimaryCell
          name={m.name}
          onOpen={() => openEditor(m)}
        />
      ),
    },
    {
      id: 'contact',
      header: 'Contact details',
      cell: (m) => (
        <div className="flex flex-col gap-1 text-sm text-gray-500">
          {m.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span>{m.phone}</span>
            </div>
          )}
          {m.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{m.city}{m.state ? `, ${m.state}` : ''}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (m) => m.status,
      cell: (m) => <StatusDot active={m.status === 'ACTIVE'} />,
    },
    {
      id: 'added',
      header: 'Added on',
      sort: (m) => new Date(m.created_at).getTime(),
      cell: (m) => <span className="text-gray-500">{formatDate(m.created_at)}</span>,
    },
  ];

  return (
    <>
      <DataView
        title="Linked Medicals"
        subtitle="Manage pharmacies and medical shops connected to the platform."
        icon={Stethoscope}
        noun="medical"
        nounPlural="medicals"
        resource={resource}
        searchPlaceholder="Search pharmacy name..."
        searchFields={(m) => [m.name, m.city || '', m.phone || '']}
        facets={FACETS}
        dateOf={(m) => m.created_at}
        columns={columns}
        createLabel="New linked medical"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={deleteMedical}
        nameOf={(m) => m.name}
      />

      <LinkedMedicalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        medical={editingMedical}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingMedical ? 'Linked medical updated' : 'Linked medical created');
          void resource.refresh();
        }}
      />
    </>
  );
}
