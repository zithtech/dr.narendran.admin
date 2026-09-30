import { App } from 'antd';
import { UserCog } from 'lucide-react';
import { useState } from 'react';

import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, type BadgeTone, StatusDot } from '../components/ui/primitives';
import UserModal, { type UserAccount } from '../components/UserModal';
import { useResource } from '../hooks/useResource';
import { formatDate, timeAgo, titleCase } from '../lib/format';
import api from '../utils/api';

const ROLE_TONE: Record<UserAccount['role'], BadgeTone> = {
  ADMIN: 'violet',
  DOCTOR: 'blue',
  PATIENT: 'green',
};

const FACETS: Facet<UserAccount>[] = [
  {
    id: 'role',
    label: 'Roles',
    allLabel: 'All roles',
    value: (u) => u.role,
    optionLabel: titleCase,
    order: ['ADMIN', 'DOCTOR', 'PATIENT'],
  },
  statusFacet<UserAccount>(),
  addedFacet<UserAccount>(),
];

export default function Users() {
  const resource = useResource<UserAccount>('user-accounts', 'user accounts');
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const openEditor = (user: UserAccount | null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const columns: Column<UserAccount>[] = [
    {
      id: 'username',
      header: 'Account',
      sort: (u) => u.username.toLowerCase(),
      cell: (u) => (
        <PrimaryCell
          name={u.username}
          sub={`${titleCase(u.role)} login`}
          onOpen={() => openEditor(u)}
        />
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sort: (u) => u.role,
      cell: (u) => <Badge tone={ROLE_TONE[u.role] ?? 'neutral'}>{titleCase(u.role)}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      sort: (u) => u.status,
      cell: (u) => <StatusDot active={u.status === 'ACTIVE'} />,
    },
    {
      id: 'created',
      header: 'Created',
      sort: (u) => new Date(u.created_at).getTime(),
      cell: (u) => formatDate(u.created_at),
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (u) => new Date(u.updated_at || u.created_at).getTime(),
      cell: (u) =>
        u.updated_at && u.updated_at !== u.created_at ? (
          <ActivityCell label="Account updated" when={timeAgo(u.updated_at)} />
        ) : (
          <ActivityCell label="Account created" when={timeAgo(u.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        title="User Accounts"
        subtitle="Login credentials and roles for the apps."
        icon={UserCog}
        noun="user account"
        nounPlural="user accounts"
        resource={resource}
        searchPlaceholder="Search username, role…"
        searchFields={(u) => [u.username, u.role]}
        facets={FACETS}
        dateOf={(u) => u.created_at}
        dateLabel="Created"
        columns={columns}
        createLabel="New account"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(u) => api.delete(`user-accounts/${u.id}`)}
        nameOf={(u) => u.username}
        deleteWarning="Doctors or patients linked to it will lose app access."
      />

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userAccount={editingUser}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingUser ? 'Account updated' : 'Account created');
          void resource.refresh();
        }}
      />
    </>
  );
}
