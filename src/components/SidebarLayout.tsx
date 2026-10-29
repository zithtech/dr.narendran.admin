import {
  Boxes,
  LifeBuoy,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LogOut,
  Pill,
  ShoppingBag,
  Stethoscope,
  UserCog,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import api from '../utils/api';

import { cx } from './ui/primitives';

const NAV_ITEMS = [
  { name: 'Hospitals', path: '/', icon: Building2, slug: 'HOSPITALS' },
  { name: 'Branches', path: '/branches', icon: GitBranch, slug: 'BRANCHES' },
  { name: 'Doctors', path: '/doctors', icon: Stethoscope, slug: 'DOCTORS' },
  { name: 'Patients', path: '/patients', icon: HeartPulse, slug: 'PATIENTS' },
  { name: 'Pharmacy', path: '/pharmacy', icon: Pill, slug: 'PRESCRIPTIONS' },
  { name: 'Medicine Inventory', path: '/inventory', icon: Boxes, slug: 'PRESCRIPTIONS' },
  { name: 'Linked Labs', path: '/labs', icon: FlaskConical, slug: 'LABS' },
  { name: 'Lab Services', path: '/lab-services', icon: FlaskConical, slug: 'LAB_SERVICES' },
  { name: 'Linked Medicals', path: '/linked-medicals', icon: Stethoscope, slug: 'LABS' },
  { name: 'Orders', path: '/orders', icon: ShoppingBag, slug: 'ORDERS' },
  { name: 'User Accounts', path: '/users', icon: UserCog, slug: 'USERS' },
  { name: 'Roles & Permissions', path: '/roles', icon: Shield, slug: 'USERS' },
  { name: 'Prescription Templates', path: '/prescriptions', icon: FileText, slug: 'PRESCRIPTIONS' },
  { name: 'Support Center', path: '/support', icon: LifeBuoy, slug: 'SUPPORT' },
] as const;

const EXPANDED_KEY = 'adminRailExpanded';

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return true; // Default expanded for modern layout
  }
}

export default function SidebarLayout() {
  const [isExpanded, setIsExpanded] = useState(readExpanded);
  const navigate = useNavigate();
  const location = useLocation();

  const currentUsername = localStorage.getItem('adminUsername') ?? 'Super Admin';
  const currentRole = localStorage.getItem('adminRole') ?? 'System Administrator';

  const userInitials = (currentUsername || 'SA')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

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
        /* storage unavailable */
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
          <div className="ui-rail-brand-main" onClick={!isExpanded ? toggle : undefined} role={!isExpanded ? 'button' : undefined}>
            <span className="ui-rail-logo">
              <HeartPulse size={16} strokeWidth={2.4} />
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
            className="ui-rail-collapse-btn"
            onClick={toggle}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {isExpanded && <div className="ui-rail-category">MAIN</div>}

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

        {/* Footer with ACCOUNT section and User Card matching Image 2 */}
        {/* Footer with logged-in user card */}
        <div className="ui-rail-footer">
          {/* User Card */}
          <div
            className={cx('ui-rail-user-card', !isExpanded && 'is-collapsed')}
            title={`${currentUsername} · ${currentRole}`}
          >
            <div className="ui-rail-user-avatar" onClick={!isExpanded ? toggle : undefined}>
              {userInitials}
            </div>
            {isExpanded && (
              <>
                <div className="ui-rail-user-info" onClick={toggle}>
                  <span className="ui-rail-user-name">{currentUsername}</span>
                  <span className="ui-rail-user-sub">{currentRole}</span>
                </div>
                <button
                  type="button"
                  className="ui-rail-user-logout-btn"
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                </button>
              </>
            )}
          </div>

          {!isExpanded && (
            <button
              type="button"
              className="ui-rail-item ui-rail-logout-collapsed"
              onClick={handleLogout}
              data-tip="Log out"
              aria-label="Log out"
            >
              <LogOut size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </aside>

      <main className="ui-main">
        <Outlet />
      </main>
    </div>
  );
}
