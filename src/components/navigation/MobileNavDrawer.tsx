import { HeartPulse, LogOut, X } from 'lucide-react';
import React from 'react';

import { cx } from '../ui/primitives';
import type { NavCategory, NavModule } from './navigationConfig';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: NavCategory[];
  activeCategory: NavCategory | null;
  activeModule: NavModule | null;
  onSelectModule: (module: NavModule) => void;
  currentUsername?: string;
  currentRole?: string;
  userInitials?: string;
  onLogout: () => void;
}

/**
 * Sub Pages Drawer (opened from Hamburger menu):
 * Shows only the sub pages of the current active category
 * since the category titles are already displayed in the top navbar.
 */
export function MobileNavDrawer({
  isOpen,
  onClose,
  activeCategory,
  activeModule,
  onSelectModule,
  onLogout,
}: MobileNavDrawerProps) {
  if (!isOpen) return null;

  const handleModuleClick = (mod: NavModule) => {
    onSelectModule(mod);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="ui-mobile-drawer-overlay"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        className="ui-mobile-drawer"
        role="dialog"
        aria-label={`${activeCategory?.name || 'Navigation'} Menu`}
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="ui-mobile-drawer-header">
          <div className="ui-sidebar-brand" style={{ padding: 0, height: 'auto', minHeight: 'unset' }}>
            <div className="ui-sidebar-brand-icon">
              <HeartPulse size={18} strokeWidth={2.4} />
            </div>
            <div className="ui-sidebar-brand-text">
              <span className="ui-sidebar-brand-name">HMS Admin</span>
              <span className="ui-sidebar-brand-sub">Dr Narendran</span>
            </div>
          </div>
          <button
            type="button"
            className="ui-mobile-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Label */}
        <div className="ui-sidebar-section-title">
          <span>{activeCategory?.name || 'MODULES'}</span>
        </div>

        {/* Sub Pages Navigation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          <nav className="ui-sidebar-nav-list" aria-label="Submodules">
            {activeCategory?.modules && activeCategory.modules.length > 0 ? (
              activeCategory.modules.map((mod) => {
                const isActive =
                  activeModule?.path === mod.path ||
                  Boolean(mod.aliases?.some((a) => a === activeModule?.path));
                const ModIcon = mod.icon;

                return (
                  <button
                    key={mod.path}
                    type="button"
                    className={cx('ui-sidebar-nav-item', isActive && 'is-active')}
                    onClick={() => handleModuleClick(mod)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="ui-sidebar-nav-icon">
                      <ModIcon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                    <span className="ui-sidebar-nav-label">{mod.name}</span>
                    {isActive && <span className="ui-sidebar-active-indicator" />}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '16px 14px', fontSize: 12, color: '#94a3b8' }}>
                No sub pages available for this category.
              </div>
            )}
          </nav>
        </div>

        {/* Drawer Footer with Sign Out */}
        <div className="ui-sidebar-footer">
          {onLogout && (
            <button
              type="button"
              className="ui-sidebar-logout-btn"
              onClick={onLogout}
              title="Sign out of administrative account"
              aria-label="Sign out"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const SubPagesDrawer = MobileNavDrawer;
