import {
  AlertCircle,
  Check,
  CheckCheck,
  Layers,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Shield,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

export interface Permission {
  module_slug: string;
  can_read: boolean;
  can_write?: boolean | undefined;
  can_create?: boolean | undefined;
  can_update?: boolean | undefined;
  can_delete: boolean;
  can_manage?: boolean | undefined;
}

export interface NormalizedPermission {
  module_slug: string;
  can_read: boolean;
  can_write: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

type GranularPermInput = Partial<Permission>;

function emptyModulePermission(moduleSlug: string): NormalizedPermission {
  return {
    module_slug: moduleSlug,
    can_read: false,
    can_write: false,
    can_create: false,
    can_update: false,
    can_delete: false,
    can_manage: false,
  };
}

function normalizeModulePermission(
  p: GranularPermInput | undefined,
  moduleSlug: string,
): NormalizedPermission {
  if (!p) return emptyModulePermission(moduleSlug);
  const canReadRaw = Boolean(p.can_read);
  const canWriteLegacy = Boolean(p.can_write);
  const canCreateRaw = p.can_create !== undefined ? Boolean(p.can_create) : canWriteLegacy;
  const canUpdateRaw = p.can_update !== undefined ? Boolean(p.can_update) : canWriteLegacy;
  const canDeleteRaw = Boolean(p.can_delete);
  const canManage =
    p.can_manage !== undefined
      ? Boolean(p.can_manage)
      : canReadRaw && canCreateRaw && canUpdateRaw && canDeleteRaw;

  const canRead = canManage || canReadRaw;
  const canCreate = canManage || canCreateRaw;
  const canUpdate = canManage || canUpdateRaw;
  const canDelete = canManage || canDeleteRaw;

  return {
    module_slug: moduleSlug || p.module_slug || '',
    can_read: canRead,
    can_write: canManage || canCreate || canUpdate,
    can_create: canCreate,
    can_update: canUpdate,
    can_delete: canDelete,
    can_manage: canManage,
  };
}

const MODULE_NOUNS: Record<string, { singular: string; plural: string }> = {
  HOSPITALS: { singular: 'hospital', plural: 'hospitals' },
  BRANCHES: { singular: 'branch', plural: 'branches' },
  DOCTORS: { singular: 'doctor', plural: 'doctors' },
  AVAILABILITY: { singular: 'availability slot', plural: 'availability slots' },
  APPOINTMENTS: { singular: 'appointment', plural: 'appointments' },
  TODAYS_SCHEDULE: { singular: 'schedule entry', plural: "today's schedule" },
  PATIENTS: { singular: 'patient', plural: 'patients' },
  PRESCRIPTIONS: { singular: 'prescription', plural: 'prescriptions' },
  PHARMACY: { singular: 'medicine', plural: 'medicines' },
  INVENTORY: { singular: 'inventory item', plural: 'inventory' },
  MEDICINE_PACKAGES: { singular: 'medicine package', plural: 'medicine packages' },
  ORDERS: { singular: 'order', plural: 'orders' },
  LABS: { singular: 'linked lab', plural: 'linked labs' },
  LAB_SERVICES: { singular: 'lab service', plural: 'lab services' },
  LINKED_MEDICALS: { singular: 'linked medical', plural: 'linked medicals' },
  CLIENT_PORTALS: { singular: 'client portal', plural: 'client portals' },
  USERS: { singular: 'user account', plural: 'user accounts' },
  STAFF: { singular: 'staff member', plural: 'staff members' },
  ROLES: { singular: 'role', plural: 'roles' },
  REVIEWS: { singular: 'review', plural: 'reviews' },
  PATIENT_SUPPORT: { singular: 'patient ticket', plural: 'patient support' },
  DOCTOR_SUPPORT: { singular: 'doctor ticket', plural: 'doctor support' },
  SUPPORT: { singular: 'support ticket', plural: 'support' },
};

function getModuleNouns(mod: ModuleDef): { singular: string; plural: string } {
  const mapped = MODULE_NOUNS[mod.slug.toUpperCase()];
  if (mapped) return mapped;
  const lower = mod.name.trim().toLowerCase();
  const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
  return { singular, plural: lower };
}

export interface Role {
  id?: string;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: Permission[];
}

export interface ModuleDef {
  slug: string;
  name: string;
  description: string;
  category?: string;
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: () => void;
}

const DEFAULT_CATEGORIES: Record<string, string> = {
  HOSPITALS: 'Facility Management',
  BRANCHES: 'Facility Management',
  DOCTORS: 'Clinical & Consultations',
  AVAILABILITY: 'Clinical & Consultations',
  APPOINTMENTS: 'Clinical & Consultations',
  TODAYS_SCHEDULE: 'Clinical & Consultations',
  PATIENTS: 'Clinical & Consultations',
  PRESCRIPTIONS: 'Clinical & Consultations',
  PHARMACY: 'Pharmacy & Inventory',
  INVENTORY: 'Pharmacy & Inventory',
  MEDICINE_PACKAGES: 'Pharmacy & Inventory',
  ORDERS: 'Pharmacy & Inventory',
  LABS: 'Laboratory & Diagnostics',
  LAB_SERVICES: 'Laboratory & Diagnostics',
  LINKED_MEDICALS: 'Laboratory & Diagnostics',
  CLIENT_PORTALS: 'Administration & Security',
  USERS: 'Administration & Security',
  STAFF: 'Administration & Security',
  ROLES: 'Administration & Security',
  REVIEWS: 'Support & Reviews',
  PATIENT_SUPPORT: 'Support & Reviews',
  DOCTOR_SUPPORT: 'Support & Reviews',
  SUPPORT: 'Support & Reviews',
};

export const INITIAL_MODULES: ModuleDef[] = [
  { slug: 'HOSPITALS', name: 'Hospitals', category: 'Facility Management', description: 'Manage hospitals and facilities' },
  { slug: 'BRANCHES', name: 'Hospital Branches', category: 'Facility Management', description: 'Manage hospital branch locations' },
  { slug: 'DOCTORS', name: 'Doctors', category: 'Clinical & Consultations', description: 'Manage doctor profiles and specialties' },
  { slug: 'AVAILABILITY', name: 'Availability & Slots', category: 'Clinical & Consultations', description: 'Configure weekly consultation hours and slots' },
  { slug: 'APPOINTMENTS', name: 'Appointments', category: 'Clinical & Consultations', description: 'Schedule and manage appointments' },
  { slug: 'TODAYS_SCHEDULE', name: "Today's Schedule", category: 'Clinical & Consultations', description: "Daily consultation queue and today's appointments" },
  { slug: 'PATIENTS', name: 'Patients', category: 'Clinical & Consultations', description: 'Manage patient records' },
  { slug: 'PRESCRIPTIONS', name: 'Prescriptions', category: 'Clinical & Consultations', description: 'Manage e-prescriptions and clinical records' },
  { slug: 'PHARMACY', name: 'Pharmacy', category: 'Pharmacy & Inventory', description: 'Medicines catalog and pricing' },
  { slug: 'INVENTORY', name: 'Medicine Inventory', category: 'Pharmacy & Inventory', description: 'Track medicine stock and expiry' },
  { slug: 'MEDICINE_PACKAGES', name: 'Medicine Packages', category: 'Pharmacy & Inventory', description: 'Manage medicine bundles and packages' },
  { slug: 'ORDERS', name: 'Pharmacy Orders', category: 'Pharmacy & Inventory', description: 'Fulfill medicine orders' },
  { slug: 'LABS', name: 'Linked Labs', category: 'Laboratory & Diagnostics', description: 'Manage diagnostic partner labs' },
  { slug: 'LAB_SERVICES', name: 'Lab Services', category: 'Laboratory & Diagnostics', description: 'Diagnostic test directory and pricing' },
  { slug: 'LINKED_MEDICALS', name: 'Linked Medicals', category: 'Laboratory & Diagnostics', description: 'Affiliated pharmacy stores' },
  { slug: 'CLIENT_PORTALS', name: 'Client Portals', category: 'Administration & Security', description: 'External portal credentials and access' },
  { slug: 'USERS', name: 'User Accounts', category: 'Administration & Security', description: 'Manage admin and staff accounts' },
  { slug: 'STAFF', name: 'Staff Management', category: 'Administration & Security', description: 'Hospital staff profiles and shifts' },
  { slug: 'ROLES', name: 'Roles & Permissions', category: 'Administration & Security', description: 'Role-based access control' },
  { slug: 'REVIEWS', name: 'Ratings & Reviews', category: 'Support & Reviews', description: 'Patient reviews and feedback' },
  { slug: 'PATIENT_SUPPORT', name: 'Patient Support', category: 'Support & Reviews', description: 'Patient support tickets and chat' },
  { slug: 'DOCTOR_SUPPORT', name: 'Doctor Support', category: 'Support & Reviews', description: 'Doctor inquiry and clinical support' },
];

export default function RoleModal({ isOpen, onClose, role, onSave }: RoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, NormalizedPermission>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState<ModuleDef[]>(INITIAL_MODULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('rbac/modules');
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : [];
        if (data.length > 0) {
          setModules(data);
        }
      } catch (err) {
        console.error('Failed to fetch RBAC modules', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (role) {
      setName(role.name || '');
      setDescription(role.description || '');
      const permMap: Record<string, NormalizedPermission> = {};
      role.permissions?.forEach((p) => {
        if (p?.module_slug) {
          permMap[p.module_slug] = normalizeModulePermission(p, p.module_slug);
        }
      });
      setPermissions(permMap);
    } else {
      setName('');
      setDescription('');
      setPermissions({});
    }
    setError('');
    setSearchQuery('');
    setSelectedCategory('ALL');
    setCollapsedModules({});
  }, [role, isOpen]);

  // Compute resolved modules with fallback categories
  const resolvedModules = useMemo(() => {
    return modules.map((m) => ({
      ...m,
      category: m.category || DEFAULT_CATEGORIES[m.slug] || 'General',
    }));
  }, [modules]);

  // Unique list of categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    resolvedModules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [resolvedModules]);

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedModules.filter((m) => {
      const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    });
  }, [resolvedModules, searchQuery, selectedCategory]);

  // Group filtered modules by category
  const groupedModules = useMemo(() => {
    const groups: Record<string, ModuleDef[]> = {};
    filteredModules.forEach((m) => {
      const cat = m.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [filteredModules]);

  const handleToggle = (
    moduleSlug: string,
    field: 'can_create' | 'can_read' | 'can_update' | 'can_delete' | 'can_manage',
  ) => {
    setPermissions((prev) => {
      const current = normalizeModulePermission(prev[moduleSlug], moduleSlug);

      if (field === 'can_manage') {
        const nextManage = !current.can_manage;
        return {
          ...prev,
          [moduleSlug]: {
            module_slug: moduleSlug,
            can_create: nextManage,
            can_read: nextManage,
            can_update: nextManage,
            can_delete: nextManage,
            can_manage: nextManage,
            can_write: nextManage,
          },
        };
      }

      const updated = {
        ...current,
        [field]: !current[field],
      };
      const allFour =
        updated.can_create && updated.can_read && updated.can_update && updated.can_delete;
      updated.can_manage = allFour;
      updated.can_write = updated.can_create || updated.can_update || allFour;

      return {
        ...prev,
        [moduleSlug]: updated,
      };
    });
  };

  const handleToggleModuleAll = (moduleSlug: string) => {
    setPermissions((prev) => {
      const current = normalizeModulePermission(prev[moduleSlug], moduleSlug);
      const nextAll = !(
        current.can_create &&
        current.can_read &&
        current.can_update &&
        current.can_delete &&
        current.can_manage
      );
      return {
        ...prev,
        [moduleSlug]: {
          module_slug: moduleSlug,
          can_create: nextAll,
          can_read: nextAll,
          can_update: nextAll,
          can_delete: nextAll,
          can_manage: nextAll,
          can_write: nextAll,
        },
      };
    });
  };

  const toggleCollapseModule = (moduleSlug: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleSlug]: !prev[moduleSlug],
    }));
  };

  // Quick batch actions for permissions
  const handleSelectAllRead = () => {
    setPermissions((prev) => {
      const next: Record<string, NormalizedPermission> = { ...prev };
      modules.forEach((m) => {
        const curr = normalizeModulePermission(next[m.slug], m.slug);
        const allFour = curr.can_create && true && curr.can_update && curr.can_delete;
        next[m.slug] = {
          ...curr,
          can_read: true,
          can_manage: allFour,
          can_write: curr.can_create || curr.can_update || allFour,
        };
      });
      return next;
    });
  };

  const handleGrantFullAccess = () => {
    const next: Record<string, NormalizedPermission> = {};
    modules.forEach((m) => {
      next[m.slug] = {
        module_slug: m.slug,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
        can_manage: true,
        can_write: true,
      };
    });
    setPermissions(next);
  };

  const handleClearAll = () => {
    setPermissions({});
  };

  // Category-specific batch actions
  const handleCategoryAction = (categoryName: string, action: 'read' | 'full' | 'clear') => {
    const categoryModules = resolvedModules.filter((m) => m.category === categoryName);
    setPermissions((prev) => {
      const next: Record<string, NormalizedPermission> = { ...prev };
      categoryModules.forEach((m) => {
        if (action === 'clear') {
          delete next[m.slug];
        } else if (action === 'read') {
          const curr = normalizeModulePermission(next[m.slug], m.slug);
          const allFour = curr.can_create && true && curr.can_update && curr.can_delete;
          next[m.slug] = {
            ...curr,
            can_read: true,
            can_manage: allFour,
            can_write: curr.can_create || curr.can_update || allFour,
          };
        } else if (action === 'full') {
          next[m.slug] = {
            module_slug: m.slug,
            can_create: true,
            can_read: true,
            can_update: true,
            can_delete: true,
            can_manage: true,
            can_write: true,
          };
        }
      });
      return next;
    });
  };

  const activePermissionsCount = useMemo(() => {
    let count = 0;
    Object.values(permissions).forEach((raw) => {
      const p = normalizeModulePermission(raw, raw.module_slug);
      if (p.can_create) count++;
      if (p.can_read) count++;
      if (p.can_update) count++;
      if (p.can_delete) count++;
      if (p.can_manage) count++;
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

      const payloadMap = new Map<string, NormalizedPermission>();
      modules.forEach((m) => {
        payloadMap.set(m.slug, normalizeModulePermission(permissions[m.slug], m.slug));
      });
      Object.values(permissions).forEach((p) => {
        if (p?.module_slug && !payloadMap.has(p.module_slug)) {
          payloadMap.set(p.module_slug, normalizeModulePermission(p, p.module_slug));
        }
      });

      await api({
        method,
        url,
        data: {
          name: name.trim(),
          description: description.trim(),
          permissions: Array.from(payloadMap.values()),
        },
      });

      window.dispatchEvent(new Event('admin-auth-changed'));
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
                : 'Define a custom staff role and configure create, read, update, delete, and manage permissions'}
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
            width: min(860px, 100vw) !important;
            max-width: 860px !important;
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
          .role-category-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #64748b;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .role-category-pill:hover {
            border-color: #cbd5e1;
            color: #334155;
          }
          .role-category-pill.active {
            background: #7c3aed;
            color: #ffffff;
            border-color: #7c3aed;
          }
          .role-category-group {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 12px;
          }
          .role-category-group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 14px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
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
              <span className="text-xs text-slate-500 ml-auto hidden sm:inline">
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
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex flex-wrap items-center gap-2">
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
                  title="Grant create, read, update, delete, and manage across all modules"
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

              {/* Module Count Indicator */}
              <div className="text-[11px] text-slate-500 font-medium">
                Showing {filteredModules.length} of {resolvedModules.length} modules
              </div>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules by name, keyword, or description..."
                  className="ui-input w-full pl-8 pr-8 text-xs h-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Pills Filter */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  className={`role-category-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('ALL')}
                >
                  All ({resolvedModules.length})
                </button>
                {categories.map((cat) => {
                  const count = resolvedModules.filter((m) => m.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`role-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permissions Matrix Table */}
            <div className="space-y-3 pt-1">
              {modules.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Loading application modules...
                </div>
              ) : filteredModules.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  No modules match your search &quot;{searchQuery}&quot;.
                </div>
              ) : (
                Object.entries(groupedModules).map(([categoryName, catModules]) => (
                  <div key={categoryName} className="role-category-group">
                    {/* Category Header */}
                    <div className="role-category-group-header">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{categoryName}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          {catModules.length} module{catModules.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors"
                          onClick={() => handleCategoryAction(categoryName, 'read')}
                          title={`Grant read to all ${categoryName} modules`}
                        >
                          Read Category
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors"
                          onClick={() => handleCategoryAction(categoryName, 'full')}
                          title={`Grant full access to all ${categoryName} modules`}
                        >
                          Full Category
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-medium text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                          onClick={() => handleCategoryAction(categoryName, 'clear')}
                          title={`Clear all permissions for ${categoryName}`}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* 5-Option Module Permission Cards */}
                    <div className="p-3 space-y-3 bg-slate-50/40">
                      {catModules.map((m) => {
                        const perm = normalizeModulePermission(permissions[m.slug], m.slug);
                        const nouns = getModuleNouns(m);
                        const selectedCount =
                          (perm.can_create ? 1 : 0) +
                          (perm.can_read ? 1 : 0) +
                          (perm.can_update ? 1 : 0) +
                          (perm.can_delete ? 1 : 0) +
                          (perm.can_manage ? 1 : 0);
                        const hasAny = selectedCount > 0;
                        const hasAll = selectedCount === 5;
                        const isCollapsed = Boolean(collapsedModules[m.slug]);

                        const actionItems: Array<{
                          field: 'can_create' | 'can_delete' | 'can_manage' | 'can_read' | 'can_update';
                          label: string;
                          sub: string;
                          checked: boolean;
                        }> = [
                          {
                            field: 'can_create',
                            label: 'Create',
                            sub: `Create ${nouns.plural}`,
                            checked: perm.can_create,
                          },
                          {
                            field: 'can_delete',
                            label: 'Delete',
                            sub: `Delete ${nouns.plural}`,
                            checked: perm.can_delete,
                          },
                          {
                            field: 'can_manage',
                            label: 'Manage',
                            sub: `Full ${nouns.singular} management`,
                            checked: perm.can_manage,
                          },
                          {
                            field: 'can_read',
                            label: 'Read',
                            sub: `View ${nouns.plural}`,
                            checked: perm.can_read,
                          },
                          {
                            field: 'can_update',
                            label: 'Update',
                            sub: `Edit ${nouns.plural}`,
                            checked: perm.can_update,
                          },
                        ];

                        return (
                          <div
                            key={m.slug}
                            className={`rounded-xl border transition-colors overflow-hidden bg-white ${
                              hasAny ? 'border-purple-200 shadow-2xs' : 'border-slate-200'
                            }`}
                          >
                            {/* Card Header matching screenshot layout */}
                            <div
                              className={`flex items-center justify-between px-4 py-2.5 border-b ${
                                hasAny
                                  ? 'bg-purple-50/35 border-purple-100'
                                  : 'bg-slate-50/70 border-slate-200/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModuleAll(m.slug)}
                                  className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                                    hasAll
                                      ? 'bg-purple-600 border-purple-600 text-white'
                                      : hasAny
                                        ? 'bg-purple-100 border-purple-400 text-purple-700'
                                        : 'border-slate-300 hover:border-slate-400 bg-white text-transparent'
                                  }`}
                                  title={
                                    hasAll
                                      ? `Clear all 5 permissions for ${m.name}`
                                      : `Grant all 5 permissions for ${m.name}`
                                  }
                                  aria-label={`Toggle all permissions for ${m.name}`}
                                >
                                  {hasAll ? (
                                    <Check size={11} strokeWidth={3} />
                                  ) : hasAny ? (
                                    <Minus size={11} strokeWidth={3} />
                                  ) : null}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleCollapseModule(m.slug)}
                                  className="w-4 h-4 rounded border border-slate-300 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                  title={isCollapsed ? `Expand ${m.name}` : `Collapse ${m.name}`}
                                  aria-label={isCollapsed ? `Expand ${m.name}` : `Collapse ${m.name}`}
                                >
                                  {isCollapsed ? <Plus size={11} /> : <Minus size={11} />}
                                </button>

                                <div
                                  className="min-w-0 cursor-pointer"
                                  onClick={() => toggleCollapseModule(m.slug)}
                                >
                                  <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                                    {m.name}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400 leading-tight mt-0.5">
                                    {m.slug.toLowerCase()}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                  hasAll
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : hasAny
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {selectedCount} / 5
                              </span>
                            </div>

                            {/* Card Body: 5 Granular Permission Options */}
                            {!isCollapsed && (
                              <div className="px-4 py-3">
                                <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-2.5">
                                  {m.name} Core
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {actionItems.map((item) => (
                                    <label
                                      key={item.field}
                                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer select-none transition-all ${
                                        item.checked
                                          ? 'border-purple-300 bg-purple-50/50 shadow-2xs'
                                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="role-perm-checkbox shrink-0"
                                        checked={item.checked}
                                        onChange={() => handleToggle(m.slug, item.field)}
                                        aria-label={`${item.label} permission for ${m.name}`}
                                      />
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-slate-800 leading-tight">
                                          {item.label}
                                        </div>
                                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                                          {item.sub}
                                        </div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
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
