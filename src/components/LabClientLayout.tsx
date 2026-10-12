import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { Avatar, cx } from './ui/primitives';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const LAB_NAV_ITEMS: readonly NavItem[] = [
  { name: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
  { name: 'Test Reports', path: '/client/reports', icon: FileText },
  { name: 'Lab Profile', path: '/client/profile', icon: Building2 },
  { name: 'Services / Tests', path: '/client/services', icon: FlaskConical },
  { name: 'My Account', path: '/client/account', icon: User },
  { name: 'Change Password', path: '/client/change-password', icon: KeyRound },
] as const;

const EXPANDED_KEY = 'labClientRailExpanded';

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function LabClientLayout() {
  const [isExpanded, setIsExpanded] = useState(readExpanded);
  const navigate = useNavigate();
  const location = useLocation();

  const userJson = localStorage.getItem('labClientUser');
  const labJson = localStorage.getItem('labClientLab');

  const user = userJson ? JSON.parse(userJson) : null;
  const lab = labJson ? JSON.parse(labJson) : null;

  const username = user?.username || 'Lab User';
  const labName = lab?.name || 'Diagnostic Laboratory';

  const toggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPANDED_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('labClientToken');
    localStorage.removeItem('labClientUser');
    localStorage.removeItem('labClientLab');
    void navigate('/client/login');
  };

  return (
    <div className="ui-shell">
      <aside
        className={cx('ui-rail', isExpanded && 'is-expanded')}
        aria-label="Lab Client Portal Navigation"
      >
        {/* Brand Header */}
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
              <span className="ui-rail-brand-sub" title={labName}>
                {labName}
              </span>
            </span>
          )}
        </div>

        {/* Rail Toggle Button */}
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

        {/* Sidebar Navigation Items */}
        <nav className="ui-rail-nav">
          {LAB_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
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

        {/* Footer with User Meta & Logout */}
        <div className="ui-rail-footer">
          <div className="ui-rail-user" title={`${username} · ${labName}`}>
            <Avatar name={username} size={32} />
            {isExpanded && (
              <span className="ui-rail-user-meta">
                <span className="ui-rail-user-name" title={username}>
                  {username}
                </span>
                <span className="ui-rail-user-role" title={labName}>
                  {labName}
                </span>
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

      {/* Main Work Area */}
      <main className="ui-main" style={{ overflowY: 'auto', height: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
