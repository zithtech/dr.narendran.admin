import { App } from 'antd';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';

export interface Permission {
  module_slug: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export interface Role {
  id?: string;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: Permission[];
}

interface ModuleDef {
  slug: string;
  name: string;
  description: string;
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: () => void;
}

export default function RoleModal({ isOpen, onClose, role, onSave }: RoleModalProps) {
  const { message } = App.useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<ModuleDef[]>([]);

  useEffect(() => {
    api.get('rbac/modules').then(r => setModules(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      const permMap: Record<string, Permission> = {};
      role.permissions.forEach(p => permMap[p.module_slug] = p);
      setPermissions(permMap);
    } else {
      setName('');
      setDescription('');
      setPermissions({});
    }
  }, [role, isOpen]);

  const handleToggle = (moduleSlug: string, field: keyof Permission) => {
    setPermissions(prev => {
      const current = prev[moduleSlug] || { module_slug: moduleSlug, can_read: false, can_write: false, can_delete: false };
      return {
        ...prev,
        [moduleSlug]: { ...current, [field]: !current[field] }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const url = role ? `rbac/roles/${encodeURIComponent(role.name)}` : `rbac/roles`;
      const method = role ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name,
          description,
          permissions: Object.values(permissions),
        },
      });

      onSave();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to save role.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={role ? 'Edit Role' : 'New Role'}
      description="Define role access and permissions across modules."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="ui-modal-form">
        <div className="ui-modal-body">
          <Section title="Role Information">
            <Field label="Role Name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!role}
                required
                placeholder="e.g. Lab Technician"
              />
            </Field>
            <Field label="Description">
              <input
                className="ui-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the role"
              />
            </Field>
          </Section>

          <Section title="Module Permissions">
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Module</th>
                    <th className="px-4 py-2 font-medium text-center">Read</th>
                    <th className="px-4 py-2 font-medium text-center">Write</th>
                    <th className="px-4 py-2 font-medium text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modules.map((m) => {
                    const perm = permissions[m.slug] || { can_read: false, can_write: false, can_delete: false };
                    return (
                      <tr key={m.slug} className="hover:bg-muted/50">
                        <td className="px-4 py-3">{m.name}</td>
                        <td className="px-4 py-3 text-center">
                          <input type="checkbox" checked={perm.can_read} onChange={() => handleToggle(m.slug, 'can_read')} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input type="checkbox" checked={perm.can_write} onChange={() => handleToggle(m.slug, 'can_write')} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input type="checkbox" checked={perm.can_delete} onChange={() => handleToggle(m.slug, 'can_delete')} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : role ? 'Save changes' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
