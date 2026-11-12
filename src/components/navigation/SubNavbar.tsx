import { HeartPulse, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import { cx } from '../ui/primitives';
import type { NavCategory, NavModule } from './navigationConfig';

interface SubNavbarProps {
  activeCategory: NavCategory | null;
  activeModule: NavModule | null;
  onSelectModule: (module: NavModule) => void;
  currentUsername?: string;
  currentRole?: string;
  userInitials?: string;
  onLogout?: () => void;
}

export function SubNavbar({
  activeCategory,
  activeModule,
  onSelectModule,
  onLogout,
}: SubNavbarProps) {
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const handleBrandClick = () => {
    if (navigate) {
      void navigate('/');
    }
  };

  return (
    <aside className="ui-sidebar" aria-label="Main sidebar navigation">
      {/* 1. Top Sidebar Brand Area */}
      <div
        className="ui-sidebar-brand"
        onClick={handleBrandClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBrandClick();
          }
        }}
        title="HMS Admin - Dr Narendran"
      >
        <div className="ui-sidebar-brand-icon">
          <HeartPulse size={20} strokeWidth={2.4} />
        </div>
        <div className="ui-sidebar-brand-text">
          <span className="ui-sidebar-brand-name">HMS Admin</span>
          <span className="ui-sidebar-brand-sub">Dr Narendran</span>
        </div>
      </div>

      {/* 2. Section Label */}
      <div className="ui-sidebar-section-title">
        <span>{activeCategory?.name || 'MODULES'}</span>
      </div>

      {/* 3. Submodules Navigation List */}
      <nav className="ui-sidebar-nav-list">
        {activeCategory?.modules.map((mod) => {
          const isActive =
            activeModule?.path === mod.path ||
            Boolean(mod.aliases?.some((a) => a === activeModule?.path));
          const ModIcon = mod.icon;

          return (
            <button
              key={mod.path}
              type="button"
              className={cx('ui-sidebar-nav-item', isActive && 'is-active')}
              onClick={() => onSelectModule(mod)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="ui-sidebar-nav-icon">
                <ModIcon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span className="ui-sidebar-nav-label">{mod.name}</span>
              {isActive && <span className="ui-sidebar-active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* 4. Footer at the end of sidenav: Sign Out only */}
      <div className="ui-sidebar-footer">
        {onLogout && (
          <button
            type="button"
            className="ui-sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out of Admin Portal"
            aria-label="Sign out"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
