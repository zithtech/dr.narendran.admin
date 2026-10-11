import { App } from 'antd';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { type Column, DataView, PrimaryCell } from '../components/ui/DataView';
import { StatusDot } from '../components/ui/primitives';
import ClientPortalModal, { type ClientPortalUser } from '../components/ClientPortalModal';
import { useResource } from '../hooks/useResource';
import { formatDate } from '../lib/format';
import api from '../utils/api';

export default function ClientPortals() {
  const resource = useResource<ClientPortalUser>('client-portals', 'client portals');
  const { message, modal } = App.useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientPortalUser | null>(null);

  const openEditor = (u: ClientPortalUser | null) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const deletePortalUser = (u: ClientPortalUser) => {
    modal.confirm({
      title: `Revoke Portal Access: ${u.email}`,
      content: 'Are you sure you want to delete this credential? The user will immediately lose access to the portal.',
      okText: 'Revoke Access',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`client-portals/${u.id}`);
          void message.success('Portal access revoked');
          void resource.refresh();
        } catch (err: any) {
          void message.error(err.response?.data?.error || 'Failed to delete credential');
        }
      },
    });
  };

  const columns: Column<ClientPortalUser>[] = [
    {
      id: 'email',
      header: 'Email / Credential',
      sort: (u) => u.email.toLowerCase(),
      cell: (u) => (
        <PrimaryCell
          name={u.email}
          subtitle={`Portal Role: ${u.role}`}
          onOpen={() => openEditor(u)}
        />
      ),
    },
    {
      id: 'role',
      header: 'Assigned Role',
      sort: (u) => u.role,
      cell: (u) => (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
          {u.role}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (u) => u.status,
      cell: (u) => <StatusDot active={u.status === 'ACTIVE'} />,
    },
    {
      id: 'created',
      header: 'Created On',
      sort: (u) => new Date(u.created_at).getTime(),
      cell: (u) => formatDate(u.created_at),
    },
  ];

  return (
    <>
      <DataView
        title="Client Portals"
        subtitle="Manage credentials and email invites for external roles like Lab Admins."
        icon={ExternalLink}
        noun="portal access"
        nounPlural="portal credentials"
        resource={resource}
        searchPlaceholder="Search email or role..."
        searchFields={(u) => [u.email, u.role]}
        facets={[]}
        dateOf={(u) => u.created_at}
        columns={columns}
        createLabel="New portal access"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={deletePortalUser}
        nameOf={(u) => u.email}
      />

      <ClientPortalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        onSave={() => {
          setIsModalOpen(false);
          void resource.refresh();
        }}
      />
    </>
  );
}
