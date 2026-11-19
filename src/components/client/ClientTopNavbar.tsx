import { LogOut, Menu } from 'lucide-react';
import React from 'react';

import { cx } from '../ui/primitives';
import type { ClientNavCategory, ClientNavModule } from './clientNavConfig';

interface ClientTopNavbarProps {
  categories: ClientNavCategory[];
  activeCategory: ClientNavCategory | null;
  activeModule?: ClientNavModule | null;
  onSelectCategory: (category: ClientNavCategory) => void;
  currentUsername: string;
  currentRole: string;
  userInitials: string;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const ClientTopNavbar: React.FC<ClientTopNavbarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  currentUsername,
  currentRole,
  userInitials,
  onLogout,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  return (
    <header className="ui-top-navbar" aria-label="Client Portal navigation header">
      <span className="sr-only">Client Portal</span>

      <div className="ui-top-navbar-left">
        <button
          type="button"
          className="ui-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          title="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        {/* Horizontal Category Navigation Tabs */}
        <nav className="ui-top-navbar-categories" aria-label="Navigation Tabs">
          {categories.map((category) => {
            const isCategoryActive = activeCategory?.key === category.key;
            const CategoryIcon = category.icon;

            return (
              <button
                key={category.key}
                type="button"
                className={cx('ui-top-category-btn', isCategoryActive && 'is-active')}
                onClick={() => onSelectCategory(category)}
                aria-current={isCategoryActive ? 'page' : undefined}
                title={category.name}
              >
                <CategoryIcon size={17} strokeWidth={isCategoryActive ? 2.2 : 1.8} />
                <span className="ui-top-category-label">{category.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right container: User Profile Card & Sign Out */}
      <div className="ui-top-navbar-right">
        <div
          className="ui-top-user-card"
          title={`${currentUsername} (${currentRole})`}
        >
          <div
            className="ui-top-user-avatar"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.25)',
            }}
          >
            {userInitials}
          </div>
          <div className="ui-top-user-info">
            <span className="ui-top-user-name" title={currentUsername}>
              {currentUsername}
            </span>
            <span className="ui-top-user-role" title={currentRole}>
              {currentRole}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ui-top-logout-btn"
          onClick={onLogout}
          title="Sign out of Client Portal"
          aria-label="Sign out of Client Portal"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
