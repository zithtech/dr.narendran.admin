import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LogOut,
  Stethoscope,
  UserCog,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import api from '../utils/api';

import { Avatar, cx } from './ui/primitives';

const NAV_ITEMS = [
  { name: 'Hospitals', path: '/', icon: Building2, slug: 'HOSPITALS' },
  { name: 'Branches', path: '/branches', icon: GitBranch, slug: 'BRANCHES' },
  { name: 'Doctors', path: '/doctors', icon: Stethoscope, slug: 'DOCTORS' },
  { name: 'Patients', path: '/patients', icon: HeartPulse, slug: 'PATIENTS' },
  { name: 'Linked Labs', path: '/labs', icon: FlaskConical, slug: 'LABS' },
  { name: 'Lab Services', path: '/lab-services', icon: FlaskConical, slug: 'LAB_SERVICES' },
  { name: 'Linked Medicals', path: '/linked-medicals', icon: Stethoscope, slug: 'LABS' },
  { name: 'Client Portals', path: '/client-portals', icon: ExternalLink, slug: 'USERS' },
  { name: 'User Accounts', path: '/users', icon: UserCog, slug: 'USERS' },
  { name: 'Roles & Permissions', path: '/roles', icon: Shield, slug: 'USERS' },
  { name: 'Prescription Templates', path: '/prescriptions', icon: FileText, slug: 'PRESCRIPTIONS' },
] as const;

const EXPANDED_KEY = 'adminRailExpanded';

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SidebarLayout() {
  const [isExpanded, setIsExpanded] = useState(readExpanded);
  const navigate = useNavigate();
  const location = useLocation();

  const currentUsername = localStorage.getItem('adminUsername') ?? 'Super Admin';
  const currentRole = localStorage.getItem('adminRole') ?? 'System Administrator';

  const [roleData, setRoleData] = useState<any>(null);

  useEffect(() => {
    if (currentRole) {
      api.get(`rbac/roles/${encodeURIComponent(currentRole)}`)
        .then(res => setRoleData(res.data))
        .catch(console.error);
    }
  }, [currentRole]);

  const allowedSlugs = roleData?.permissions?.filter((p: any) => p.can_read).map((p: any) => p.module_slug) || [];
  
  // Filter nav items: System Admin sees everything, others only see what they have permissions for
  const visibleNavItems = roleData?.is_system_role 
    ? NAV_ITEMS 
    : NAV_ITEMS.filter(item => allowedSlugs.includes(item.slug));

  const toggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPANDED_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable: preference just isn't remembered */
      }
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    void navigate('/login');
  };

  return (
    <div className="ui-shell">
      <aside className={cx('ui-rail', isExpanded && 'is-expanded')} aria-label="Main navigation">
        <div className="ui-rail-brand">
          <span className="ui-rail-logo">
            <HeartPulse size={15} strokeWidth={2.4} />
          </span>
          {isExpanded && (
            <span className="ui-rail-brand-text">
              <span className="ui-rail-brand-name">HMS Admin</span>
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
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
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
          <div className="ui-rail-user" title={`${currentUsername} · ${currentRole}`}>
            <Avatar name={currentUsername} size={32} />
            {isExpanded && (
              <span className="ui-rail-user-meta">
                <span className="ui-rail-user-name">{currentUsername}</span>
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
        <Outlet />
      </main>
    </div>
  );
}
