import { App } from 'antd';
import { Building2 } from 'lucide-react';
import { useState } from 'react';

import HospitalModal, { type Hospital } from '../components/HospitalModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Hospital>[] = [
  statusFacet<Hospital>(),
  {
    id: 'contact',
    label: 'Contact details',
    allLabel: 'Any contact info',
    value: (h) => (h.email && h.phone ? 'complete' : h.email || h.phone ? 'partial' : 'missing'),
    optionLabel: (v) =>
      ({ complete: 'Email & phone', partial: 'Email or phone', missing: 'No contact info' })[v] ??
      v,
    order: ['complete', 'partial', 'missing'],
  },
  addedFacet<Hospital>(),
];

export default function Dashboard() {
  const resource = useResource<Hospital>('hospitals', 'hospitals');
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  const openEditor = (hospital: Hospital | null) => {
    setEditingHospital(hospital);
    setIsModalOpen(true);
  };

  const columns: Column<Hospital>[] = [
    {
      id: 'name',
      header: 'Hospital',
      sort: (h) => h.name.toLowerCase(),
      cell: (h) => (
        <PrimaryCell
          name={h.name}
          sub={h.email || h.phone || <span className="ui-muted">No contact info</span>}
          onOpen={() => openEditor(h)}
        />
      ),
    },
    {
      id: 'code',
      header: 'Code',
      sort: (h) => h.hospital_code,
      cell: (h) => (
        <Badge tone="green" mono>
          {h.hospital_code}
        </Badge>
      ),
    },
    {
      id: 'address',
      header: 'Address',
      cell: (h) =>
        h.address ? (
          <span
            style={{
              display: 'block',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={h.address}
          >
            {h.address}
          </span>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'tenure',
      header: 'Member for',
      sort: (h) => -new Date(h.created_at).getTime(),
      cell: (h) => tenure(h.created_at, 'New hospital'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (h) => h.status,
      cell: (h) => <StatusDot active={h.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (h) => new Date(h.updated_at ?? h.created_at).getTime(),
      cell: (h) =>
        h.updated_at && h.updated_at !== h.created_at ? (
          <ActivityCell label="Profile updated" when={timeAgo(h.updated_at)} />
        ) : (
          <ActivityCell label="Hospital added" when={timeAgo(h.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        title="Hospitals"
        subtitle="Every hospital registered on the platform."
        icon={Building2}
        noun="hospital"
        nounPlural="hospitals"
        resource={resource}
        searchPlaceholder="Search name, code, email, phone…"
        searchFields={(h) => [h.name, h.hospital_code, h.email, h.phone, h.address]}
        facets={FACETS}
        dateOf={(h) => h.created_at}
        columns={columns}
        createLabel="New hospital"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(h) => api.delete(`hospitals/${h.id}`)}
        nameOf={(h) => h.name}
        deleteWarning="Branches, doctors and patients linked to it may be affected."
      />

      <HospitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hospital={editingHospital}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingHospital ? 'Hospital updated' : 'Hospital created');
          void resource.refresh();
        }}
      />
    </>
  );
}
