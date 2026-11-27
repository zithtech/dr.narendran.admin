import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';

import api from '../utils/api';
import { NAVIGATION_CATEGORIES } from '../components/navigation/navigationConfig';

export interface PermissionRecord {
  module_slug: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_manage?: boolean;
}

export type PermissionAction =
  | 'view'
  | 'read'
  | 'create'
  | 'update'
  | 'edit'
  | 'delete'
  | 'manage'
  | 'write';

export interface PermissionContextValue {
  roleName: string | null;
  isSystemAdmin: boolean;
  permissions: Record<string, PermissionRecord>;
  isLoading: boolean;
  canView: (moduleSlug: string, fallbackSlugs?: string[]) => boolean;
  canCreate: (moduleSlug: string, fallbackSlugs?: string[]) => boolean;
  canUpdate: (moduleSlug: string, fallbackSlugs?: string[]) => boolean;
  canDelete: (moduleSlug: string, fallbackSlugs?: string[]) => boolean;
  canManage: (moduleSlug: string, fallbackSlugs?: string[]) => boolean;
  hasPermission: (
    moduleSlug: string,
    action: PermissionAction,
    fallbackSlugs?: string[]
  ) => boolean;
  hasRole: (...roles: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

const CACHE_KEY = 'adminCachedPermissions';
const ROLE_KEY = 'adminRole';

function isSystemAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const upper = roleName.trim().toUpperCase();
  return [
    'ADMIN',
    'SUPER_ADMIN',
    'SUPER ADMIN',
    'ADMINISTRATOR',
    'SYSTEM ADMINISTRATOR',
  ].includes(upper);
}

export function isDoctorRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const upper = roleName.trim().toUpperCase();
  return (
    upper === 'DOCTOR' ||
    upper === 'PHYSICIAN' ||
    upper === 'CLINICIAN' ||
    upper.includes('DOCTOR')
  );
}

export function isPatientRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const upper = roleName.trim().toUpperCase();
  return upper === 'PATIENT' || upper.includes('PATIENT');
}

function loadCachedPermissions(): Record<string, PermissionRecord> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [roleName, setRoleName] = useState<string | null>(() =>
    localStorage.getItem(ROLE_KEY)
  );
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(() =>
    isSystemAdminRole(localStorage.getItem(ROLE_KEY))
  );
  const [permissions, setPermissions] = useState<Record<string, PermissionRecord>>(
    loadCachedPermissions
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRolePermissions = useCallback(async (currentRole: string | null) => {
    if (!currentRole) {
      setPermissions({});
      setIsSystemAdmin(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get(`rbac/roles/${encodeURIComponent(currentRole)}`);
      const rawData = res.data;
      const roleData =
        rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data && !Array.isArray(rawData.data)
          ? (rawData.data as any)
          : rawData;

      const isSys =
        Boolean(roleData?.is_system_role) ||
        isSystemAdminRole(roleData?.name || currentRole);

      setIsSystemAdmin(isSys);

      const permMap: Record<string, PermissionRecord> = {};
      const permsList: any[] = Array.isArray(roleData?.permissions)
        ? roleData.permissions
        : Array.isArray(rawData?.permissions)
          ? rawData.permissions
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];

      permsList.forEach((p: any) => {
        if (p?.module_slug) {
          const slug = String(p.module_slug).trim().toUpperCase();
          const canManageRaw =
            p.can_manage !== undefined && p.can_manage !== null
              ? Boolean(p.can_manage)
              : Boolean(
                  p.can_read &&
                    (p.can_create !== undefined && p.can_create !== null ? p.can_create : p.can_write) &&
                    (p.can_update !== undefined && p.can_update !== null ? p.can_update : p.can_write) &&
                    p.can_delete,
                );
          const canWriteLegacy = Boolean(p.can_write || canManageRaw);
          const canCreateVal = Boolean(
            canManageRaw ||
            (p.can_create !== undefined && p.can_create !== null
              ? p.can_create
              : canWriteLegacy)
          );
          const canUpdateVal = Boolean(
            canManageRaw ||
            (p.can_update !== undefined && p.can_update !== null
              ? p.can_update
              : canWriteLegacy)
          );
          const canDeleteVal = Boolean(canManageRaw || p.can_delete);
          const canReadVal = Boolean(canManageRaw || p.can_read);
          const canWrite = Boolean(canManageRaw || p.can_write || canCreateVal || canUpdateVal);

          permMap[slug] = {
            module_slug: slug,
            can_read: canReadVal,
            can_write: canWrite,
            can_delete: canDeleteVal,
            can_create: canCreateVal,
            can_update: canUpdateVal,
            can_manage: canManageRaw,
          };
        }
      });

      // If the role is a Doctor role and permissions dictionary is empty or unconfigured,
      // fallback to default doctor clinical consultation permissions so doctors are never locked out
      const upperRole = (currentRole || '').trim().toUpperCase();
      if (isDoctorRole(upperRole) && Object.keys(permMap).length === 0) {
        const defaultDoctorSlugs = [
          'APPOINTMENTS',
          'TODAYS_SCHEDULE',
          'AVAILABILITY',
          'DOCTORS',
          'PATIENTS',
          'PATIENT_TIMELINES',
          'MEDICAL_RECORDS',
          'PRESCRIPTIONS',
          'DOCTOR_SUPPORT',
          'CHAT',
          'SUPPORT',
          'CHAT',
          'REVIEWS',
        ];
        defaultDoctorSlugs.forEach((slug) => {
          permMap[slug] = {
            module_slug: slug,
            can_read: true,
            can_write: true,
            can_delete: false,
            can_create: true,
            can_update: true,
            can_manage: slug === 'AVAILABILITY' || slug === 'APPOINTMENTS' || slug === 'TODAYS_SCHEDULE',
          };
        });
      }

      // If the role is a Patient role and permissions dictionary is empty or unconfigured,
      // fallback to default patient support and chat permissions
      if (isPatientRole(upperRole) && Object.keys(permMap).length === 0) {
        const defaultPatientSlugs = [
          'CHAT',
          'SUPPORT',
          'PATIENT_SUPPORT',
          'REVIEWS',
        ];
        defaultPatientSlugs.forEach((slug) => {
          permMap[slug] = {
            module_slug: slug,
            can_read: true,
            can_write: true,
            can_delete: false,
            can_create: true,
            can_update: true,
            can_manage: false,
          };
        });
      }

      setPermissions(permMap);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(permMap));
      } catch {
        // quota exceeded or private mode
      }
    } catch (err) {
      console.error('Failed to load role permissions for:', currentRole, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    const current = localStorage.getItem(ROLE_KEY);
    setRoleName(current);
    await fetchRolePermissions(current);
  }, [fetchRolePermissions]);

  useEffect(() => {
    const current = localStorage.getItem(ROLE_KEY);
    setRoleName(current);
    void fetchRolePermissions(current);

    const handleAuthChange = () => {
      const updatedRole = localStorage.getItem(ROLE_KEY);
      setRoleName(updatedRole);
      void fetchRolePermissions(updatedRole);
    };

    window.addEventListener('admin-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('admin-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [fetchRolePermissions]);

  const evalRecord = (
    rec: PermissionRecord,
    field: 'can_read' | 'can_write' | 'can_delete' | 'can_create' | 'can_update' | 'can_manage'
  ): boolean => {
    if (rec.can_manage) return true;
    switch (field) {
      case 'can_create':
        return Boolean(rec.can_create !== undefined && rec.can_create !== null ? rec.can_create : rec.can_write);
      case 'can_update':
        return Boolean(rec.can_update !== undefined && rec.can_update !== null ? rec.can_update : rec.can_write);
      case 'can_delete':
        return Boolean(rec.can_delete);
      case 'can_manage':
        return Boolean(
          rec.can_manage ??
            (rec.can_read &&
              (rec.can_create ?? rec.can_write) &&
              (rec.can_update ?? rec.can_write) &&
              rec.can_delete),
        );
      case 'can_write':
        return Boolean(rec.can_write || rec.can_create || rec.can_update);
      case 'can_read':
        return Boolean(rec.can_read);
      default:
        return Boolean(rec[field]);
    }
  };

  const checkPerm = useCallback(
    (
      moduleSlug: string,
      field: 'can_read' | 'can_write' | 'can_delete' | 'can_create' | 'can_update' | 'can_manage',
      fallbackSlugs?: string[]
    ): boolean => {
      if (!moduleSlug) return false;

      const key = moduleSlug.toUpperCase();
      const direct = permissions[key];

      if (direct && evalRecord(direct, field)) {
        return true;
      }

      if (fallbackSlugs && fallbackSlugs.length > 0) {
        for (const fb of fallbackSlugs) {
          const fbKey = fb.toUpperCase();
          const fbPerm = permissions[fbKey];
          if (fbPerm && evalRecord(fbPerm, field)) {
            return true;
          }
        }
      }

      // If direct was present and explicitly evaluated to false, and no fallback granted it, deny
      if (direct) {
        return false;
      }

      if (isSystemAdmin) {
        // Prescription creation is a doctor privilege, not an admin task
        if (key === 'PRESCRIPTIONS' && field === 'can_create') {
          return false;
        }
        return true;
      }

      // Built-in doctor privilege fallback for unlisted clinical modules:
      if (isDoctorRole(roleName)) {
        const doctorAllowedModules = [
          'APPOINTMENTS',
          'TODAYS_SCHEDULE',
          'AVAILABILITY',
          'DOCTORS',
          'PATIENTS',
          'PATIENT_TIMELINES',
          'MEDICAL_RECORDS',
          'PRESCRIPTIONS',
          'LOCATIONS',
          'DOCTOR_SUPPORT',
          'CHAT',
          'SUPPORT',
          'CHAT',
          'REVIEWS',
        ];
        if (
          doctorAllowedModules.includes(key) ||
          fallbackSlugs?.some((fb) => doctorAllowedModules.includes(fb.toUpperCase()))
        ) {
          if (
            field === 'can_read' ||
            field === 'can_create' ||
            field === 'can_update' ||
            field === 'can_write'
          ) {
            return true;
          }
        }
      }

      // Built-in patient privilege fallback for patient portal / chat modules:
      if (isPatientRole(roleName)) {
        const patientAllowedModules = [
          'CHAT',
          'SUPPORT',
          'PATIENT_SUPPORT',
          'REVIEWS',
        ];
        if (
          patientAllowedModules.includes(key) ||
          fallbackSlugs?.some((fb) => patientAllowedModules.includes(fb.toUpperCase()))
        ) {
          if (
            field === 'can_read' ||
            field === 'can_create' ||
            field === 'can_update' ||
            field === 'can_write'
          ) {
            return true;
          }
        }
      }

      return false;
    },
    [isSystemAdmin, permissions, roleName]
  );

  const canView = useCallback(
    (moduleSlug: string, fallbackSlugs?: string[]): boolean => {
      return checkPerm(moduleSlug, 'can_read', fallbackSlugs);
    },
    [checkPerm]
  );

  const canCreate = useCallback(
    (moduleSlug: string, fallbackSlugs?: string[]): boolean => {
      return checkPerm(moduleSlug, 'can_create', fallbackSlugs);
    },
    [checkPerm]
  );

  const canUpdate = useCallback(
    (moduleSlug: string, fallbackSlugs?: string[]): boolean => {
      return checkPerm(moduleSlug, 'can_update', fallbackSlugs);
    },
    [checkPerm]
  );

  const canDelete = useCallback(
    (moduleSlug: string, fallbackSlugs?: string[]): boolean => {
      return checkPerm(moduleSlug, 'can_delete', fallbackSlugs);
    },
    [checkPerm]
  );

  const canManage = useCallback(
    (moduleSlug: string, fallbackSlugs?: string[]): boolean => {
      return checkPerm(moduleSlug, 'can_manage', fallbackSlugs);
    },
    [checkPerm]
  );

  const hasPermission = useCallback(
    (
      moduleSlug: string,
      action: PermissionAction,
      fallbackSlugs?: string[]
    ): boolean => {
      switch (action) {
        case 'view':
        case 'read':
          return canView(moduleSlug, fallbackSlugs);
        case 'create':
          return canCreate(moduleSlug, fallbackSlugs);
        case 'update':
        case 'edit':
          return canUpdate(moduleSlug, fallbackSlugs);
        case 'delete':
          return canDelete(moduleSlug, fallbackSlugs);
        case 'manage':
          return canManage(moduleSlug, fallbackSlugs);
        case 'write':
          return checkPerm(moduleSlug, 'can_write', fallbackSlugs);
        default:
          return false;
      }
    },
    [canView, canCreate, canUpdate, canDelete, canManage, checkPerm]
  );

  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!roleName) return false;
      const current = roleName.trim().toUpperCase();
      return roles.some((r) => r.trim().toUpperCase() === current);
    },
    [roleName]
  );

  const value = useMemo<PermissionContextValue>(
    () => ({
      roleName,
      isSystemAdmin,
      permissions,
      isLoading,
      canView,
      canCreate,
      canUpdate,
      canDelete,
      canManage,
      hasPermission,
      hasRole,
      refreshPermissions,
    }),
    [
      roleName,
      isSystemAdmin,
      permissions,
      isLoading,
      canView,
      canCreate,
      canUpdate,
      canDelete,
      canManage,
      hasPermission,
      hasRole,
      refreshPermissions,
    ]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    // Graceful fallback if called outside provider (e.g. unit tests or early mount)
    const role = localStorage.getItem(ROLE_KEY);
    const isSys = isSystemAdminRole(role);
    const allowDefault = role === null || isSys;
    return {
      roleName: role,
      isSystemAdmin: isSys,
      permissions: {},
      isLoading: false,
      canView: () => allowDefault,
      canCreate: () => allowDefault,
      canUpdate: () => allowDefault,
      canDelete: () => allowDefault,
      canManage: () => allowDefault,
      hasPermission: () => allowDefault,
      hasRole: (...roles: string[]) => Boolean(role && roles.some(r => r.toUpperCase() === role.toUpperCase())),
      refreshPermissions: async () => {},
    };
  }
  return ctx;
}

/**
 * Conditionally render action buttons, controls, or sections based on user role permissions.
 */
export function PermissionGate({
  module,
  action,
  allowedRoles,
  fallbackSlugs,
  fallback = null,
  children,
}: {
  module: string;
  action: PermissionAction;
  allowedRoles?: string[];
  fallbackSlugs?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasPermission, hasRole } = usePermission();
  const permAllowed = hasPermission(module, action, fallbackSlugs);
  const roleAllowed = allowedRoles && allowedRoles.length > 0 ? hasRole(...allowedRoles) : true;
  if (!permAllowed || !roleAllowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

/**
 * Access restricted screen shown when a user lacks View permissions for a route.
 */
export function AccessDenied({
  moduleName,
  onNavigateHome,
}: {
  moduleName?: string;
  onNavigateHome?: () => void;
}) {
  const navigate = useNavigate();
  const { canView } = usePermission();

  const firstAccessible = useMemo(() => {
    return NAVIGATION_CATEGORIES.flatMap((c) => c.modules).find(
      (item) => item.slug === 'DASHBOARD' || canView(item.slug, item.fallbackSlugs),
    );
  }, [canView]);

  const handleReturn = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (firstAccessible) {
      void navigate(firstAccessible.path);
    } else {
      void navigate('/login');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '62vh',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          color: '#dc2626',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 20px rgba(220, 38, 38, 0.15)',
        }}
      >
        <ShieldAlert size={34} strokeWidth={2.2} />
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        Access Restricted
      </h2>
      <p
        style={{
          fontSize: 14,
          color: '#64748b',
          maxWidth: 480,
          margin: '0 0 24px',
          lineHeight: 1.55,
        }}
      >
        Your role does not have permission to view{' '}
        {moduleName ? (
          <strong style={{ color: '#0f172a' }}>{moduleName}</strong>
        ) : (
          'this module'
        )}
        . If you require access to perform your duties, please contact your hospital administrator.
      </p>
      <button
        type="button"
        className="ui-btn ui-btn-primary ui-btn-pill"
        onClick={handleReturn}
        style={{
          padding: '8px 22px',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {firstAccessible ? `Go to ${firstAccessible.name}` : 'Return to Login'}
      </button>
    </div>
  );
}

/**
 * Route guard component: enforces View permission on child route.
 */
export function ModuleRouteGuard({
  module,
  title,
  fallbackSlugs,
  children,
}: {
  module: string;
  title: string;
  fallbackSlugs?: string[];
  children: React.ReactNode;
}) {
  const { canView, isLoading } = usePermission();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          gap: 12,
        }}
      >
        <Loader2 size={26} className="is-spinning" style={{ color: '#7c3aed' }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>Checking authorization...</span>
      </div>
    );
  }

  const hasAccess = canView(module, fallbackSlugs);
  if (!hasAccess) {
    return <AccessDenied moduleName={title} />;
  }

  return <>{children}</>;
}
