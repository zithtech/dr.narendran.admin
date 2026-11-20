import { Check, ChevronDown, Compass, LogOut, Menu } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { cx } from '../ui/primitives';
import type { ClientNavCategory, ClientNavModule } from './clientNavConfig';

interface ClientTopNavbarProps {
  categories: ClientNavCategory[];
  activeCategory: ClientNavCategory | null;
  activeModule?: ClientNavModule | null;
  onSelectCategory: (category: ClientNavCategory) => void;
  onSelectModule?: (module: ClientNavModule) => void;
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
  activeModule,
  onSelectCategory,
  onSelectModule,
  currentUsername,
  currentRole,
  userInitials,
  onLogout,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Current title & icon
  const currentTitle = activeModule?.name || activeCategory?.name || 'Client Portal';
  const CurrentIcon = activeModule?.icon || activeCategory?.icon || Compass;

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

        {/* 1. Mobile Dropdown Navigation */}
        <div className="ui-top-navbar-mobile-nav" ref={dropdownRef}>
          <button
            type="button"
            className="ui-top-mobile-dropdown-btn"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            aria-label={`Current page: ${currentTitle}. Select page from dropdown menu`}
            data-testid="client-mobile-nav-dropdown-trigger"
          >
            <CurrentIcon size={15} className="text-teal-600 shrink-0" />
            <span className="ui-top-mobile-dropdown-label truncate">{currentTitle}</span>
            <ChevronDown
              size={14}
              className={cx(
                'text-slate-400 transition-transform duration-200 shrink-0',
                isDropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown Menu List */}
          {isDropdownOpen && (
            <div
              className="ui-top-mobile-dropdown-menu"
              role="listbox"
              aria-label="Client Portal navigation pages"
              data-testid="client-mobile-nav-dropdown-menu"
            >
              {categories.map((category) => {
                const CategoryIcon = category.icon;
                const isCatActive = activeCategory?.key === category.key;

                return (
                  <div key={category.key} className="ui-top-mobile-dropdown-group">
                    <div className="ui-top-mobile-dropdown-group-header">
                      <CategoryIcon size={12} className="text-slate-400 shrink-0" />
                      <span>{category.name}</span>
                    </div>

                    {category.modules.length > 0 ? (
                      category.modules.map((mod) => {
                        const ModIcon = mod.icon;
                        const isModActive =
                          activeModule?.path === mod.path ||
                          Boolean(mod.aliases?.some((a) => a === activeModule?.path));

                        return (
                          <button
                            key={mod.path}
                            type="button"
                            role="option"
                            aria-selected={isModActive}
                            className={cx(
                              'ui-top-mobile-dropdown-item',
                              isModActive && 'is-active',
                            )}
                            onClick={() => {
                              onSelectCategory(category);
                              if (onSelectModule) {
                                onSelectModule(mod);
                              } else if (navigate) {
                                void navigate(mod.path);
                              }
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ModIcon
                                size={14}
                                className={isModActive ? 'text-teal-600' : 'text-slate-400'}
                              />
                              <span className="truncate">{mod.name}</span>
                            </div>
                            {isModActive && (
                              <Check size={14} className="text-teal-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <button
                        type="button"
                        role="option"
                        aria-selected={isCatActive}
                        className={cx(
                          'ui-top-mobile-dropdown-item',
                          isCatActive && 'is-active',
                        )}
                        onClick={() => {
                          onSelectCategory(category);
                          if (navigate) {
                            void navigate(category.defaultPath);
                          }
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon
                            size={14}
                            className={isCatActive ? 'text-teal-600' : 'text-slate-400'}
                          />
                          <span className="truncate">{category.name}</span>
                        </div>
                        {isCatActive && (
                          <Check size={14} className="text-teal-600 shrink-0 ml-2" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Desktop Horizontal Category Navigation Tabs */}
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
