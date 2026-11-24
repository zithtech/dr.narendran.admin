import {
  Building2,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  type LucideIcon,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';

import api from '../utils/api';
import { ClientMobileDrawer } from './client/ClientMobileDrawer';
import {
  type ClientNavCategory,
  type ClientNavModule,
  filterClientCategoriesByPermissions,
  findActiveClientNavigation,
  PARTNER_PORTAL_CATEGORIES,
} from './client/clientNavConfig';
import { ClientSidebar } from './client/ClientSidebar';
import { ClientTopNavbar } from './client/ClientTopNavbar';

export interface ClientPortalContextType {
  allowedSlugs: string[];
  isSystemRole: boolean;
  loading: boolean;
  currentRole: string;
  refreshPermissions: () => void;
}

export interface ClientNavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  slug?: string;
}

export interface ClientRolePermission {
  module_slug: string;
  can_read: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
}

export interface ClientRoleData {
  id?: string;
  name?: string;
  is_system_role?: boolean;
  permissions?: ClientRolePermission[];
}

export const CLIENT_NAV_ITEMS: readonly ClientNavItem[] = [
  { name: 'Overview', path: '/portal', icon: LayoutDashboard },
  { name: 'Linked Labs', path: '/portal/labs', icon: FlaskConical, slug: 'LABS' },
  { name: 'Lab Services', path: '/portal/lab-services', icon: FlaskConical, slug: 'LAB_SERVICES' },
  { name: 'Linked Medicals', path: '/portal/linked-medicals', icon: Stethoscope, slug: 'LABS' },
  { name: 'Hospitals', path: '/portal/hospitals', icon: Building2, slug: 'HOSPITALS' },
  { name: 'Branches', path: '/portal/branches', icon: GitBranch, slug: 'BRANCHES' },
  { name: 'Doctors', path: '/portal/doctors', icon: Stethoscope, slug: 'DOCTORS' },
  { name: 'Patients', path: '/portal/patients', icon: HeartPulse, slug: 'PATIENTS' },
  { name: 'Prescription Templates', path: '/portal/prescriptions', icon: FileText, slug: 'PRESCRIPTIONS' },
] as const;

export default function ClientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentEmail = localStorage.getItem('clientPortalUser') ?? 'Client Partner';
  const currentRole = localStorage.getItem('clientPortalRole') ?? 'Client';

  const [roleData, setRoleData] = useState<ClientRoleData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(currentRole));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  const portalJson = localStorage.getItem('clientPortalData');
  const portal = portalJson ? (JSON.parse(portalJson) as { company_name?: string; name?: string }) : null;
  const labJson = localStorage.getItem('labClientLab');
  const lab = labJson ? (JSON.parse(labJson) as { name?: string }) : null;
  const brandSub = portal?.company_name?.trim() || portal?.name?.trim() || lab?.name?.trim() || 'raj lab';
  const brandName = 'Client Portal';

  const refreshPermissions = useCallback(() => {
    if (!currentRole) return;
    api
      .get<ClientRoleData>(`rbac/roles/${encodeURIComponent(currentRole)}`)
      .then((res) => {
        if (res.data) setRoleData(res.data);
      })
      .catch((err: unknown) => {
        console.error('Failed to refresh permissions for client:', err);
      });
  }, [currentRole]);

  useEffect(() => {
    let ignore = false;
    if (!currentRole) {
      return;
    }

    const loadRole = async () => {
      try {
        const res = await api.get<ClientRoleData>(`rbac/roles/${encodeURIComponent(currentRole)}`);
        if (!ignore && res.data) {
          setRoleData(res.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load role permissions for client:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadRole();

    const handleFocus = () => {
      void loadRole();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      ignore = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentRole]);

  const isSystemRole = Boolean(roleData?.is_system_role);
  const allowedSlugs: string[] = useMemo(() => {
    if (isSystemRole) return [];
    return (
      roleData?.permissions
        ?.filter((p) => p.can_read)
        ?.map((p) => p.module_slug) ?? []
    );
  }, [roleData, isSystemRole]);

  // Dynamically filter categories & modules based on assigned permissions
  const visibleCategories = useMemo(() => {
    return filterClientCategoriesByPermissions(
      PARTNER_PORTAL_CATEGORIES,
      allowedSlugs,
      isSystemRole,
    );
  }, [allowedSlugs, isSystemRole]);

  const { activeCategory: matchedCategory, activeModule } = useMemo(
    () => findActiveClientNavigation(location.pathname, visibleCategories),
    [location.pathname, visibleCategories],
  );

  const currentCategory = useMemo(() => {
    if (selectedCategoryKey) {
      const found = visibleCategories.find((c) => c.key === selectedCategoryKey);
      if (found) return found;
    }
    return matchedCategory;
  }, [selectedCategoryKey, visibleCategories, matchedCategory]);

  const userInitials = useMemo(() => {
    return (
      (currentEmail || 'CP')
        .replace(/[._-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CP'
    );
  }, [currentEmail]);

  const handleSelectCategory = (category: ClientNavCategory) => {
    setSelectedCategoryKey(category.key);
    const hasCurrentModule = category.modules.some((m) => m.path === location.pathname);
    if (!hasCurrentModule && category.modules.length > 0 && category.modules[0]) {
      void navigate(category.modules[0].path);
    }
  };

  const handleSelectModule = (mod: ClientNavModule) => {
    const parentCategory = visibleCategories.find((cat) =>
      cat.modules.some((m) => m.path === mod.path),
    );
    if (parentCategory) {
      setSelectedCategoryKey(parentCategory.key);
    }
    void navigate(mod.path);
  };

  const handleLogout = () => {
    localStorage.removeItem('clientPortalToken');
    localStorage.removeItem('clientPortalUser');
    localStorage.removeItem('clientPortalRole');
    localStorage.removeItem('clientPortalKey');
    void navigate('/client/login');
  };

  const contextValue: ClientPortalContextType = {
    allowedSlugs,
    isSystemRole,
    loading,
    currentRole,
    refreshPermissions,
  };

  return (
    <div className="ui-app-layout">
      {/* 1. Left Full-Height Sidebar matching Admin Web App */}
      <ClientSidebar
        categories={visibleCategories}
        activeCategory={currentCategory}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        brandName={brandName}
        brandSub={brandSub}
        brandHomePath="/portal"
        onLogout={handleLogout}
      />

      {/* 2. Right Main Column: TopNavbar on Top + Content Below */}
      <div className="ui-app-right-column">
        <ClientTopNavbar
          categories={visibleCategories}
          activeCategory={currentCategory}
          activeModule={activeModule}
          onSelectCategory={handleSelectCategory}
          currentUsername={currentEmail}
          currentRole={currentRole}
          userInitials={userInitials}
          onLogout={handleLogout}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="ui-main">
          <Outlet context={contextValue} />
        </main>
      </div>

      {/* 3. Mobile Responsive Drawer */}
      <ClientMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={visibleCategories}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        currentUsername={currentEmail}
        currentRole={currentRole}
        userInitials={userInitials}
        brandName={brandName}
        brandSub={brandSub}
        onLogout={handleLogout}
      />
    </div>
  );
}

/** Route guard to enforce that clients can only access pages they have permissions for */
export function ClientPermissionGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const context = useOutletContext<ClientPortalContextType>();
  const navigate = useNavigate();

  if (context?.loading) {
    return (
      <div
        className="ui-page"
        style={{ padding: '60px 24px', alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="ui-muted text-sm">Verifying permissions…</span>
      </div>
    );
  }

  const isAllowed = context?.isSystemRole || context?.allowedSlugs?.includes(slug);

  if (!isAllowed) {
    return (
      <div
        className="ui-page"
        style={{ padding: '60px 24px', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            padding: 32,
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid var(--ui-border)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#fef3c7',
              color: '#d97706',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: '0 0 8px 0',
              color: '#0f172a',
            }}
          >
            Access Restricted
          </h2>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            Your account ({context?.currentRole || 'Client'}) does not currently have permission to access this module.
            Whenever the Hospital Administrator grants access to this page, it will automatically appear in your sidebar.
          </p>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => {
              void navigate('/portal');
            }}
          >
            Return to Overview
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
