import { FlaskConical, LogOut, X } from 'lucide-react';
import React from 'react';

import { cx } from '../ui/primitives';
import type { ClientNavCategory, ClientNavModule } from './clientNavConfig';

interface ClientMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ClientNavCategory[];
  activeModule: ClientNavModule | null;
  onSelectModule: (module: ClientNavModule) => void;
  currentUsername: string;
  currentRole: string;
  userInitials: string;
  brandName?: string;
  brandSub?: string;
  brandLogoUrl?: string;
  onLogout: () => void;
}

export const ClientMobileDrawer: React.FC<ClientMobileDrawerProps> = ({
  isOpen,
  onClose,
  categories,
  activeModule,
  onSelectModule,
  currentUsername,
  currentRole,
  userInitials,
  brandName = 'Client Portal',
  brandSub = 'raj lab',
  onLogout,
}) => {
  if (!isOpen) return null;

  const handleModuleClick = (mod: ClientNavModule) => {
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
        aria-label="Client Portal Navigation Menu"
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="ui-mobile-drawer-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.28)',
              }}
            >
              <FlaskConical size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 leading-tight truncate">
                {brandName}
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate">
                {brandSub}
              </div>
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

        {/* Drawer Content: Sections & Navigation Items */}
        <div className="ui-mobile-drawer-content">
          {categories.map((category) => (
            <div key={category.key} className="space-y-1 mb-3">
              <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {category.name}
              </div>
              <div className="space-y-0.5">
                {category.modules.map((mod) => {
                  const isActive =
                    activeModule?.path === mod.path ||
                    Boolean(mod.aliases?.some((a) => a === activeModule?.path));
                  const ModIcon = mod.icon;

                  return (
                    <button
                      key={mod.path}
                      type="button"
                      className={cx(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                        isActive
                          ? 'bg-sky-50 text-sky-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )}
                      onClick={() => handleModuleClick(mod)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <ModIcon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className="flex-1 truncate">{mod.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer: User Profile Card & Sign Out */}
        <div className="ui-mobile-drawer-footer">
          <div className="flex items-center gap-2 px-1 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              }}
            >
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {currentUsername}
              </div>
              <div className="text-[10.5px] text-slate-500 truncate">{currentRole}</div>
            </div>
          </div>

          <button
            type="button"
            className="ui-sidebar-logout-btn"
            onClick={() => {
              onLogout();
              onClose();
            }}
            title="Sign out of Client Portal"
            aria-label="Sign out of Client Portal"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
