import {
  AlertCircle,
  Check,
  CheckCheck,
  Layers,
  Loader2,
  RotateCcw,
  Shield,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState<ModuleDef[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('rbac/modules');
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : [];
        setModules(data);
      } catch (err) {
        console.error('Failed to fetch RBAC modules', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (role) {
      setName(role.name || '');
      setDescription(role.description || '');
      const permMap: Record<string, Permission> = {};
      role.permissions?.forEach((p) => {
        permMap[p.module_slug] = p;
      });
      setPermissions(permMap);
    } else {
      setName('');
      setDescription('');
      setPermissions({});
    }
    setError('');
  }, [role, isOpen]);

  const handleToggle = (moduleSlug: string, field: keyof Permission) => {
    setPermissions((prev) => {
      const current = prev[moduleSlug] || {
        module_slug: moduleSlug,
        can_read: false,
        can_write: false,
        can_delete: false,
      };
      return {
        ...prev,
        [moduleSlug]: { ...current, [field]: !current[field] },
      };
    });
  };

  // Quick batch actions for permissions
  const handleSelectAllRead = () => {
    setPermissions((prev) => {
      const next: Record<string, Permission> = { ...prev };
      modules.forEach((m) => {
        const curr = next[m.slug] || {
          module_slug: m.slug,
          can_read: false,
          can_write: false,
          can_delete: false,
        };
        next[m.slug] = { ...curr, can_read: true };
      });
      return next;
    });
  };

  const handleGrantFullAccess = () => {
    const next: Record<string, Permission> = {};
    modules.forEach((m) => {
      next[m.slug] = {
        module_slug: m.slug,
        can_read: true,
        can_write: true,
        can_delete: true,
      };
    });
    setPermissions(next);
  };

  const handleClearAll = () => {
    setPermissions({});
  };

  const activePermissionsCount = useMemo(() => {
    let count = 0;
    Object.values(permissions).forEach((p) => {
      if (p.can_read) count++;
      if (p.can_write) count++;
      if (p.can_delete) count++;
    });
    return count;
  }, [permissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = role ? `rbac/roles/${encodeURIComponent(role.name)}` : `rbac/roles`;
      const method = role ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name: name.trim(),
          description: description.trim(),
          permissions: Object.values(permissions),
        },
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save role permissions.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="role-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            <Shield size={19} style={{ display: 'block', margin: 'auto' }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {role ? 'Edit Role & Permissions' : 'Create Role & Permissions'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {role
                ? `Configuring access control for ${role.name}`
                : 'Define a custom staff role and configure read, write, and delete permissions'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .role-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .role-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .role-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .role-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .role-section-card:hover {
            border-color: #cbd5e1;
          }
          .role-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .role-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #dbeafe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .role-section-badge svg {
            display: block;
            margin: auto;
          }
          .role-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .role-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .role-drawer-modal .ui-input,
          .role-drawer-modal .ui-textarea {
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .role-drawer-modal .ui-input {
            height: 38px;
          }
          .role-drawer-modal .ui-textarea {
            padding: 8px 12px;
          }
          .role-drawer-modal .ui-input:focus,
          .role-drawer-modal .ui-textarea:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .role-perm-checkbox {
            width: 17px;
            height: 17px;
            border-radius: 5px;
            border: 1.5px solid #cbd5e1;
            accent-color: #2563eb;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .role-quick-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #475569;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .role-quick-btn:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #1e293b;
          }
          .role-drawer-modal .ui-modal-foot {
            padding: 14px 24px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Role Identity & Overview */}
          <div className="role-section-card">
            <div className="role-section-header">
              <div className="role-section-badge">
                <Shield size={14} />
              </div>
              <span className="role-section-tag">Role Identity</span>
              <span className="role-section-subtitle hidden sm:inline">
                Designation title and operational description
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="role-name-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Role Name <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="role-name-input"
                  className="ui-input w-full disabled:bg-slate-100 disabled:text-slate-500"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={Boolean(role)}
                  required
                  placeholder="e.g. Lab Technician, Front Desk Executive, Pharmacist"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  {role
                    ? 'Role identifier is locked to preserve assigned staff relations'
                    : 'Unique system identifier used for staff assignment'}
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                  Role Description
                </label>
                <textarea
                  className="ui-textarea w-full"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Manages clinical sample reception, test verification, and laboratory reports"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Module Permission Matrix */}
          <div className="role-section-card">
            <div className="role-section-header">
              <div className="role-section-badge">
                <Layers size={14} />
              </div>
              <span className="role-section-tag">Module Permission Matrix</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {activePermissionsCount} active grant{activePermissionsCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Select:</span>
              <button
                type="button"
                className="role-quick-btn"
                onClick={handleSelectAllRead}
                title="Grant read access across all modules"
              >
                <Check size={12} className="text-purple-600" />
                <span>All Read</span>
              </button>
              <button
                type="button"
                className="role-quick-btn"
                onClick={handleGrantFullAccess}
                title="Grant read, write, and delete across all modules"
              >
                <CheckCheck size={12} className="text-purple-600" />
                <span>Full Access</span>
              </button>
              <button
                type="button"
                className="role-quick-btn"
                onClick={handleClearAll}
                title="Clear all permissions"
              >
                <RotateCcw size={12} className="text-slate-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Permissions Table with Rounded Checkboxes */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="px-4 py-2.5">System Module</th>
                    <th className="px-3 py-2.5 text-center">Read</th>
                    <th className="px-3 py-2.5 text-center">Write</th>
                    <th className="px-3 py-2.5 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        Loading modules...
                      </td>
                    </tr>
                  ) : (
                    modules.map((m) => {
                      const perm = permissions[m.slug] || {
                        module_slug: m.slug,
                        can_read: false,
                        can_write: false,
                        can_delete: false,
                      };
                      const hasAny = perm.can_read || perm.can_write || perm.can_delete;
                      return (
                        <tr
                          key={m.slug}
                          className={`transition-colors ${
                            hasAny ? 'bg-purple-50/20 hover:bg-purple-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{m.name}</div>
                            {m.description && (
                              <div className="text-[11px] text-slate-400">{m.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="role-perm-checkbox"
                              checked={perm.can_read}
                              onChange={() => handleToggle(m.slug, 'can_read')}
                              aria-label={`Read permission for ${m.name}`}
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="role-perm-checkbox"
                              checked={perm.can_write}
                              onChange={() => handleToggle(m.slug, 'can_write')}
                              aria-label={`Write permission for ${m.name}`}
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              className="role-perm-checkbox"
                              checked={perm.can_delete}
                              onChange={() => handleToggle(m.slug, 'can_delete')}
                              aria-label={`Delete permission for ${m.name}`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div className="ui-modal-foot">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{role ? 'Save Changes' : 'Create Role'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
