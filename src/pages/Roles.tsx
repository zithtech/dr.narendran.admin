import { App } from 'antd';
import { Shield } from 'lucide-react';
import { useState } from 'react';

import RoleModal, { type Role } from '../components/RoleModal';
import { type Column, DataView, PrimaryCell } from '../components/ui/DataView';
import { useResource } from '../hooks/useResource';
import api from '../utils/api';

export default function Roles() {
  const rawResource = useResource<Role>('rbac/roles', 'rbac/roles');
  const resource = {
    ...rawResource,
    items: rawResource.items.map(r => ({ ...r, id: r.name }))
  };

  const { message, modal } = App.useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const openEditor = (r: Role | null) => {
    setEditingRole(r);
    setIsModalOpen(true);
  };

  const deleteRole = (r: Role): Promise<void> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: `Delete Role: ${r.name}`,
        content: 'Are you sure you want to delete this role?',
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          try {
            await api.delete(`rbac/roles/${encodeURIComponent(r.name)}`);
            void message.success('Role deleted');
            void resource.refresh();
            resolve();
          } catch (err: any) {
            void message.error(err.response?.data?.error || 'Failed to delete role');
            resolve();
          }
        },
        onCancel: () => resolve(),
      });
    });
  };

  const columns: Column<Role>[] = [
    {
      id: 'name',
      header: 'Role Name',
      sort: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <PrimaryCell
          name={r.name}
          sub={r.description}
          onOpen={() => openEditor(r)}
        />
      ),
    },
    {
      id: 'type',
      header: 'Type',
      sort: (r) => r.is_system_role ? 1 : 0,
      cell: (r) => (
        <span className={`px-2 py-1 text-xs rounded-full ${r.is_system_role ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {r.is_system_role ? 'System' : 'Custom'}
        </span>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.permissions.length} modules accessible
        </span>
      ),
    },
  ];

  return (
    <>
      <DataView
        title="Roles & Permissions"
        subtitle="Manage dynamic roles and access control across modules."
        icon={Shield}
        noun="role"
        nounPlural="roles"
        resource={resource}
        searchPlaceholder="Search roles..."
        searchFields={(r) => [r.name]}
        facets={[]}
        dateOf={(r) => r.name}
        columns={columns}
        createLabel="New role"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={deleteRole}
        nameOf={(r) => r.name}
      />

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={editingRole}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingRole ? 'Role updated' : 'Role created');
          void resource.refresh();
        }}
      />
    </>
  );
}
