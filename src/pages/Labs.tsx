import { App } from 'antd';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';

import LabModal, { type Lab } from '../components/LabModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Lab>[] = [
  statusFacet<Lab>(),
  addedFacet<Lab>(),
];

export default function Labs() {
  const resource = useResource<Lab>('labs', 'labs');
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);

  const openEditor = (lab: Lab | null) => {
    setEditingLab(lab);
    setIsModalOpen(true);
  };

  const columns: Column<Lab>[] = [
    {
      id: 'name',
      header: 'Lab',
      sort: (l) => l.name.toLowerCase(),
      cell: (l) => (
        <PrimaryCell
          name={l.name}
          sub={l.phone || <span className="ui-muted">No phone</span>}
          onOpen={() => openEditor(l)}
        />
      ),
    },
    {
      id: 'location',
      header: 'Location',
      sort: (l) => (l.city ?? '').toLowerCase(),
      cell: (l) => {
        const addressParts = [l.city, l.state].filter(Boolean).join(', ');
        return (
          <div>
            <div style={{ color: 'var(--ui-text)' }}>
              {l.address_line_1 || <span className="ui-muted">No address provided</span>}
            </div>
            {addressParts && <div className="ui-cell-sub">{addressParts}</div>}
          </div>
        );
      },
    },
    {
      id: 'services',
      header: 'Services',
      sort: (l) => l.services?.length || 0,
      cell: (l) => {
        if (!l.services || l.services.length === 0) return <span className="ui-muted">—</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
            {l.services.map((s: any) => (
              <span key={s.id} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--ui-border)', borderRadius: '4px' }}>
                {s.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'tenure',
      header: 'Added',
      sort: (l) => -new Date(l.created_at).getTime(),
      cell: (l) => tenure(l.created_at, 'New lab'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (l) => l.status,
      cell: (l) => <StatusDot active={l.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (l) => new Date(l.updated_at || l.created_at).getTime(),
      cell: (l) =>
        l.updated_at && l.updated_at !== l.created_at ? (
          <ActivityCell label="Lab updated" when={timeAgo(l.updated_at)} />
        ) : (
          <ActivityCell label="Lab added" when={timeAgo(l.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        title="Linked Labs"
        subtitle="Recommended laboratories for patients."
        icon={FlaskConical}
        noun="lab"
        nounPlural="labs"
        resource={resource}
        searchPlaceholder="Search lab name, phone, city…"
        searchFields={(l) => [l.name, l.phone, l.address_line_1, l.city, l.state, l.pincode]}
        facets={FACETS}
        dateOf={(l) => l.created_at}
        columns={columns}
        createLabel="New lab"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(l) => api.delete(`labs/${l.id}`)}
        nameOf={(l) => l.name}
      />

      <LabModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lab={editingLab}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingLab ? 'Lab updated' : 'Lab created');
          void resource.refresh();
        }}
      />
    </>
  );
}
