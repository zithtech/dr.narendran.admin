import { App } from 'antd';
import { GitBranch } from 'lucide-react';
import { useState } from 'react';

import BranchModal, { type Branch } from '../components/BranchModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Branch>[] = [
  {
    id: 'hospital',
    label: 'Hospitals',
    allLabel: 'All hospitals',
    value: (b) => b.hospital_name || 'Unknown hospital',
  },
  statusFacet<Branch>(),
  addedFacet<Branch>(),
];

export default function Branches() {
  const resource = useResource<Branch>('branches', 'branches');
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const openEditor = (branch: Branch | null) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const columns: Column<Branch>[] = [
    {
      id: 'name',
      header: 'Branch',
      sort: (b) => b.name.toLowerCase(),
      cell: (b) => (
        <PrimaryCell
          name={b.name}
          sub={b.phone || <span className="ui-muted">No phone</span>}
          onOpen={() => openEditor(b)}
        />
      ),
    },
    {
      id: 'hospital',
      header: 'Hospital',
      sort: (b) => (b.hospital_name ?? '').toLowerCase(),
      cell: (b) => (
        <span style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
          {b.hospital_name || 'Unknown'}
        </span>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      sort: (b) => b.branch_code,
      cell: (b) => (
        <Badge tone="green" mono>
          {b.branch_code}
        </Badge>
      ),
    },
    {
      id: 'tenure',
      header: 'Member for',
      sort: (b) => -new Date(b.created_at).getTime(),
      cell: (b) => tenure(b.created_at, 'New branch'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (b) => b.status,
      cell: (b) => <StatusDot active={b.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (b) => new Date(b.updated_at || b.created_at).getTime(),
      cell: (b) =>
        b.updated_at && b.updated_at !== b.created_at ? (
          <ActivityCell label="Branch updated" when={timeAgo(b.updated_at)} />
        ) : (
          <ActivityCell label="Branch added" when={timeAgo(b.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        title="Branches"
        subtitle="Hospital branches and their locations."
        icon={GitBranch}
        noun="branch"
        nounPlural="branches"
        resource={resource}
        searchPlaceholder="Search branch, code, hospital…"
        searchFields={(b) => [b.name, b.branch_code, b.hospital_name, b.phone, b.address]}
        facets={FACETS}
        dateOf={(b) => b.created_at}
        columns={columns}
        createLabel="New branch"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(b) => api.delete(`branches/${b.id}`)}
        nameOf={(b) => b.name}
      />

      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branch={editingBranch}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingBranch ? 'Branch updated' : 'Branch created');
          void resource.refresh();
        }}
      />
    </>
  );
}
