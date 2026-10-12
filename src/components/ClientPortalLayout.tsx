import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';

import api from '../utils/api';
import { Avatar, cx } from './ui/primitives';

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

const CLIENT_EXPANDED_KEY = 'clientRailExpanded';

function readExpanded(): boolean {
  try {
    return localStorage.getItem(CLIENT_EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
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
  const [isExpanded, setIsExpanded] = useState(readExpanded);
  const navigate = useNavigate();
  const location = useLocation();

  const currentEmail = localStorage.getItem('clientPortalUser') || 'Client Partner';
  const currentRole = localStorage.getItem('clientPortalRole') || 'Client';

  const [roleData, setRoleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = () => {
    if (!currentRole) {
      setLoading(false);
      return;
    }
    api
      .get(`rbac/roles/${encodeURIComponent(currentRole)}`)
      .then((res) => {
        setRoleData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load role permissions for client:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRole();

    // Re-verify whenever client returns to this browser tab so any
    // admin permission changes immediately reflect in the sidebar!
    const handleFocus = () => {
      fetchRole();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentRole]);

  const isSystemRole = Boolean(roleData?.is_system_role);
  const allowedSlugs: string[] = useMemo(() => {
    if (isSystemRole) return [];
    return (
      roleData?.permissions
        ?.filter((p: any) => p.can_read)
        ?.map((p: any) => p.module_slug) || []
    );
  }, [roleData, isSystemRole]);

  // Dynamically filter navigation items based on assigned permissions
  const visibleNavItems = useMemo(() => {
    if (loading && !roleData) {
      // While initial fetch is running, show Overview default
      return CLIENT_NAV_ITEMS.filter((item) => !item.slug);
    }
    if (isSystemRole) {
      return CLIENT_NAV_ITEMS;
    }
    return CLIENT_NAV_ITEMS.filter((item) => {
      if (!item.slug) return true; // Overview is always accessible
      return allowedSlugs.includes(item.slug);
    });
  }, [loading, roleData, isSystemRole, allowedSlugs]);

  const toggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLIENT_EXPANDED_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
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
    refreshPermissions: fetchRole,
  };

  return (
    <div className="ui-shell">
      <aside
        className={cx('ui-rail', isExpanded && 'is-expanded')}
        aria-label="Client Portal navigation"
      >
        <div className="ui-rail-brand">
          <span
            className="ui-rail-logo"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              color: '#ffffff',
            }}
          >
            <FlaskConical size={16} strokeWidth={2.4} />
          </span>
          {isExpanded && (
            <span className="ui-rail-brand-text">
              <span className="ui-rail-brand-name">Client Portal</span>
              <span className="ui-rail-brand-sub">Dr Narendran</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="ui-rail-item ui-rail-toggle"
          onClick={toggle}
          data-tip="Expand"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          {isExpanded && <span className="ui-rail-item-label">Collapse</span>}
        </button>

        <div className="ui-rail-divider" />

        <nav className="ui-rail-nav">
          {visibleNavItems.map((item) => {
            const isActive =
              item.path === '/portal'
                ? location.pathname === '/portal'
                : location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.path}
                className={cx('ui-rail-item', isActive && 'is-active')}
                onClick={() => {
                  void navigate(item.path);
                }}
                data-tip={item.name}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2.1 : 1.8} />
                {isExpanded && <span className="ui-rail-item-label">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className="ui-rail-footer">
          <div className="ui-rail-user" title={`${currentEmail} · ${currentRole}`}>
            <Avatar name={currentEmail} size={32} />
            {isExpanded && (
              <span className="ui-rail-user-meta">
                <span className="ui-rail-user-name" title={currentEmail}>
                  {currentEmail}
                </span>
                <span className="ui-rail-user-role">{currentRole}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            className="ui-rail-item"
            onClick={handleLogout}
            data-tip="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={1.8} />
            {isExpanded && <span className="ui-rail-item-label">Log out</span>}
          </button>
        </div>
      </aside>

      <main className="ui-main">
        <Outlet context={contextValue} />
      </main>
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
            onClick={() => void navigate('/portal')}
          >
            Return to Overview
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
