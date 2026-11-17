import { HeartPulse, LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import brandLogoImg from '../../assets/brand-logo.png';
import { cx } from '../ui/primitives';
import { getMediaProxyUrl } from '../../utils/mediaProxy';
import type { NavCategory, NavModule } from './navigationConfig';

interface SubNavbarProps {
  activeCategory: NavCategory | null;
  activeModule: NavModule | null;
  onSelectModule: (module: NavModule) => void;
  currentUsername?: string;
  currentRole?: string;
  userInitials?: string;
  onLogout?: () => void;
  brandFirstName?: string;
  brandLastName?: string;
  brandLogoUrl?: string;
}

export function SubNavbar({
  activeCategory,
  activeModule,
  onSelectModule,
  onLogout,
  brandFirstName,
  brandLastName,
  brandLogoUrl,
}: SubNavbarProps) {
  const navigate = useNavigate();

  const [logoError, setLogoError] = useState<boolean>(false);

  const firstName =
    brandFirstName && brandFirstName.trim()
      ? brandFirstName.trim()
      : localStorage.getItem('adminFirstName') || 'HMS Admin';

  const lastName =
    brandLastName && brandLastName.trim()
      ? brandLastName.trim()
      : localStorage.getItem('adminLastName') || 'Hospital';

  const logoUrl =
    brandLogoUrl !== undefined
      ? brandLogoUrl
      : localStorage.getItem('adminLogoUrl') || '';

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  const proxiedLogo = useMemo(() => getMediaProxyUrl(logoUrl), [logoUrl]);

  const activeDisplayLogo =
    proxiedLogo && !logoError && !proxiedLogo.includes('logo-1794840935856-hms.jpg')
      ? proxiedLogo
      : brandLogoImg;

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
        title={`${firstName} - ${lastName}`}
      >
        {activeDisplayLogo ? (
          <img
            src={activeDisplayLogo}
            alt="Hospital Logo"
            className="w-12 h-12 object-contain shrink-0"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="ui-sidebar-brand-icon">
            <HeartPulse size={20} strokeWidth={2.4} />
          </div>
        )}
        <div className="ui-sidebar-brand-text">
          <span className="ui-sidebar-brand-name" title={firstName}>
            {firstName}
          </span>
          <span className="ui-sidebar-brand-sub" title={lastName}>
            {lastName}
          </span>
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
