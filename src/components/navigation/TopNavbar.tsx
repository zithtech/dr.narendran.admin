import { Check, ChevronDown, Compass, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

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
  activeModule,
  onSelectCategory,
  onSelectModule,
  currentUsername,
  currentRole,
  userInitials,
  onLogout,
  isMobileMenuOpen,
  onToggleMobileMenu,
}: TopNavbarProps) {
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

  // Compute active page title and icon
  const currentTitle = activeModule?.name || activeCategory?.name || 'Dashboard';
  const CurrentIcon = activeModule?.icon || activeCategory?.icon || Compass;

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

        {/* 1. Mobile Dropdown Navigation (Visible on mobile/tablet <= 768px) */}
        <div className="ui-top-navbar-mobile-nav" ref={dropdownRef}>
          <button
            type="button"
            className="ui-top-mobile-dropdown-btn"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            aria-label={`Current page: ${currentTitle}. Select page from dropdown menu`}
            data-testid="mobile-nav-dropdown-trigger"
          >
            <CurrentIcon size={15} className="text-blue-600 shrink-0" />
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
              aria-label="Application navigation pages"
              data-testid="mobile-nav-dropdown-menu"
            >
              {categories.map((category) => {
                const CategoryIcon = category.icon;
                const isCatActive = activeCategory?.key === category.key;

                return (
                  <div key={category.key} className="ui-top-mobile-dropdown-group">
                    {/* Category Label */}
                    <div className="ui-top-mobile-dropdown-group-header">
                      <CategoryIcon size={12} className="text-slate-400 shrink-0" />
                      <span>{category.name}</span>
                    </div>

                    {/* Modules under Category */}
                    {category.modules.length > 0 ? (
                      category.modules.map((mod) => {
                        const ModIcon = mod.icon;
                        const isModActive =
                          activeModule?.path === mod.path ||
                          activeModule?.slug === mod.slug ||
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
                                className={isModActive ? 'text-blue-600' : 'text-slate-400'}
                              />
                              <span className="truncate">{mod.name}</span>
                            </div>
                            {isModActive && (
                              <Check size={14} className="text-blue-600 shrink-0 ml-2" />
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
                            className={isCatActive ? 'text-blue-600' : 'text-slate-400'}
                          />
                          <span className="truncate">{category.name}</span>
                        </div>
                        {isCatActive && (
                          <Check size={14} className="text-blue-600 shrink-0 ml-2" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Desktop Horizontal Category Navigation Tabs (Hidden on mobile via CSS) */}
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
            onClick={() => {
              if (currentRole?.toUpperCase() === 'DOCTOR' && navigate) {
                void navigate('/doctor/profile');
              }
            }}
            style={{ cursor: currentRole?.toUpperCase() === 'DOCTOR' ? 'pointer' : undefined }}
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
