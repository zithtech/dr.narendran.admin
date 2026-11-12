import { Menu } from 'lucide-react';

import { cx } from '../ui/primitives';
import type { NavCategory, NavModule } from './navigationConfig';

interface TopNavbarProps {
  categories: NavCategory[];
  activeCategory: NavCategory | null;
  activeModule?: NavModule | null;
  onSelectCategory: (category: NavCategory) => void;
  onSelectModule?: (module: NavModule) => void;
  currentUsername?: string;
  currentRole?: string;
  userInitials?: string;
  onLogout?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export function TopNavbar({
  categories,
  activeCategory,
  onSelectCategory,
  currentUsername,
  currentRole,
  userInitials,
  onLogout,
  isMobileMenuOpen,
  onToggleMobileMenu,
}: TopNavbarProps) {
  return (
    <header className="ui-top-navbar" aria-label="Main navigation header">
      {/* Brand accessible element for tests and screen readers */}
      <span className="sr-only">
        <span>HMS Admin</span>
        <span>Dr Narendran</span>
      </span>

      <div className="ui-top-navbar-left">
        {onToggleMobileMenu && (
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
        )}

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

      {/* Right container: Mail & Avatar at Top Nav */}
      <div className="ui-top-navbar-right">
        {currentUsername && (
          <div
            className="ui-top-user-card"
            title={`${currentUsername}${currentRole ? ` (${currentRole})` : ''}`}
          >
            <div className="ui-top-user-avatar">{userInitials || 'SA'}</div>
            <div className="ui-top-user-info">
              <span className="ui-top-user-name">{currentUsername}</span>
              {currentRole && <span className="ui-top-user-role">{currentRole}</span>}
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            className="sr-only"
            onClick={onLogout}
            aria-label="Sign out"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
