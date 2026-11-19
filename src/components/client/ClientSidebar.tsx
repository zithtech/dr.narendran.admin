import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  LogOut,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { cx } from '../ui/primitives';
import type { ClientNavCategory, ClientNavModule } from './clientNavConfig';

interface ClientSidebarProps {
  categories: ClientNavCategory[];
  activeCategory: ClientNavCategory | null;
  activeModule: ClientNavModule | null;
  onSelectModule: (module: ClientNavModule) => void;
  brandName?: string;
  brandSub?: string;
  brandHomePath?: string;
  onLogout: () => void;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  categories,
  activeModule,
  onSelectModule,
  brandName = 'Client Portal',
  brandSub = 'Diagnostic Partner',
  brandHomePath = '/client/dashboard',
  onLogout,
}) => {
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleBrandClick = () => {
    void navigate(brandHomePath);
  };

  return (
    <aside className="ui-sidebar" aria-label="Client Portal sidebar navigation">
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
        title={`${brandName} - ${brandSub}`}
      >
        <div
          className="ui-sidebar-brand-icon"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.28)',
          }}
        >
          <FlaskConical size={18} strokeWidth={2.4} />
        </div>
        <div className="ui-sidebar-brand-text">
          <span className="ui-sidebar-brand-name" title={brandName}>
            {brandName}
          </span>
          <span className="ui-sidebar-brand-sub" title={brandSub}>
            {brandSub}
          </span>
        </div>
      </div>

      {/* 2. Grouped Expandable/Collapsible Navigation Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-2">
        {categories.map((category) => {
          const isCollapsed = Boolean(collapsedSections[category.key]);
          const hasActiveModule = category.modules.some(
            (m) =>
              activeModule?.path === m.path ||
              Boolean(m.aliases?.some((a) => a === activeModule?.path)),
          );

          return (
            <div key={category.key} className="space-y-0.5">
              {/* Section Header with Expand/Collapse Toggle */}
              <button
                type="button"
                onClick={() => toggleSection(category.key)}
                className="w-full flex items-center justify-between px-3 py-1 text-left text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-600 uppercase transition-colors group cursor-pointer"
                aria-expanded={!isCollapsed}
                title={`Toggle ${category.name} section`}
                aria-label={`Toggle ${category.name} section`}
              >
                <span className={cx(hasActiveModule && 'text-sky-700 font-extrabold')}>
                  {category.name}
                </span>
                <span className="text-slate-400 group-hover:text-slate-600 transition-transform">
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </span>
              </button>

              {/* Submodules Navigation List */}
              {!isCollapsed && (
                <nav className="ui-sidebar-nav-list" aria-label={`${category.name} submodules`}>
                  {category.modules.map((mod) => {
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
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Footer with Sign Out Button */}
      <div className="ui-sidebar-footer">
        <button
          type="button"
          className="ui-sidebar-logout-btn"
          onClick={onLogout}
          title="Sign out of Client Portal"
          aria-label="Sign out of Client Portal"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
