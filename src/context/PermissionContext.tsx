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
          const canRead = canManageRaw || Boolean(p.can_read);
          const canCreateVal =
            canManageRaw ||
            (p.can_create !== undefined && p.can_create !== null
              ? Boolean(p.can_create)
              : Boolean(p.can_write));
          const canUpdateVal =
            canManageRaw ||
            (p.can_update !== undefined && p.can_update !== null
              ? Boolean(p.can_update)
              : Boolean(p.can_write));
          const canDeleteVal = canManageRaw || Boolean(p.can_delete);
          const canWrite = canManageRaw || canCreateVal || canUpdateVal || Boolean(p.can_write);

          permMap[slug] = {
            module_slug: slug,
            can_read: canRead,
            can_write: canWrite,
            can_delete: canDeleteVal,
            can_create: canCreateVal,
            can_update: canUpdateVal,
            can_manage: canManageRaw,
          };
        }
      });

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
        return rec.can_create ?? rec.can_write ?? false;
      case 'can_update':
        return rec.can_update ?? rec.can_write ?? false;
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

      if (direct) {
        return evalRecord(direct, field);
      }

      if (fallbackSlugs && fallbackSlugs.length > 0) {
        for (const fb of fallbackSlugs) {
          const fbKey = fb.toUpperCase();
          const fbPerm = permissions[fbKey];
          if (fbPerm) {
            return evalRecord(fbPerm, field);
          }
        }
      }

      if (isSystemAdmin) {
        // Prescription creation is a doctor privilege, not an admin task
        if (key === 'PRESCRIPTIONS' && field === 'can_create') {
          return false;
        }
        return true;
      }

      return false;
    },
    [isSystemAdmin, permissions]
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
    return {
      roleName: role,
      isSystemAdmin: isSys,
      permissions: {},
      isLoading: false,
      canView: () => isSys,
      canCreate: () => isSys,
      canUpdate: () => isSys,
      canDelete: () => isSys,
      canManage: () => isSys,
      hasPermission: () => isSys,
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
