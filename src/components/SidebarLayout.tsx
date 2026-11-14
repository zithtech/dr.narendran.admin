import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { usePermission } from '../context/PermissionContext';
import { MobileNavDrawer } from './navigation/MobileNavDrawer';
import {
  filterNavigationByPermissions,
  findActiveNavigation,
  NAVIGATION_CATEGORIES,
  type NavCategory,
  type NavModule,
} from './navigation/navigationConfig';
import { SubNavbar } from './navigation/SubNavbar';
import { TopNavbar } from './navigation/TopNavbar';

export default function SidebarLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUsername =
    localStorage.getItem('adminUsername') ||
    localStorage.getItem('adminEmail') ||
    'Super Admin';
  const { canView, isSystemAdmin, permissions, roleName } = usePermission();
  const currentRole = roleName || localStorage.getItem('adminRole') || 'System Administrator';

  const userInitials = useMemo(() => {
    const parts = (currentUsername || 'SA')
      .trim()
      .split(/[\s@._]+/)
      .filter(Boolean);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    return (first ? first.slice(0, 2) : 'SA').toUpperCase();
  }, [currentUsername]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  const allowedSlugs = useMemo(
    () => Object.keys(permissions).filter((slug) => canView(slug)),
    [permissions, canView],
  );

  // Filtered categories based on RBAC permissions
  const visibleCategories = useMemo(
    () => filterNavigationByPermissions(NAVIGATION_CATEGORIES, allowedSlugs, isSystemAdmin),
    [allowedSlugs, isSystemAdmin],
  );

  // Determine active category and active module based on current URL path
  const { activeCategory: matchedCategory, activeModule } = useMemo(
    () => findActiveNavigation(location.pathname, visibleCategories),
    [location.pathname, visibleCategories],
  );

  // If user explicitly clicked a category, use it; otherwise use category matching current URL
  const currentCategory = useMemo(() => {
    if (selectedCategoryKey) {
      const found = visibleCategories.find((c) => c.key === selectedCategoryKey);
      if (found) return found;
    }
    return matchedCategory;
  }, [selectedCategoryKey, visibleCategories, matchedCategory]);

  // Sync selectedCategoryKey when route changes outside manual selection
  useEffect(() => {
    if (matchedCategory && matchedCategory.key !== selectedCategoryKey) {
      setSelectedCategoryKey(matchedCategory.key);
    }
  }, [matchedCategory]);

  const handleSelectCategory = (category: NavCategory) => {
    setSelectedCategoryKey(category.key);

    // If currently on a path in this category, stay on it; otherwise navigate to first module
    const hasCurrentModule = category.modules.some(
      (m) =>
        m.path === location.pathname || m.aliases?.some((a) => a === location.pathname),
    );

    if (!hasCurrentModule && category.modules.length > 0 && category.modules[0]) {
      void navigate(category.modules[0].path);
    }
  };

  const handleSelectModule = (mod: NavModule) => {
    const parentCategory = visibleCategories.find((cat) =>
      cat.modules.some((m) => m.path === mod.path),
    );
    if (parentCategory) {
      setSelectedCategoryKey(parentCategory.key);
    }
    void navigate(mod.path);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUserId');
    localStorage.removeItem('adminCachedPermissions');
    window.dispatchEvent(new Event('admin-auth-changed'));
    void navigate('/login');
  };

  return (
    <div className="ui-app-layout">
      {/* 1. Left Full-Height Sidebar with Brand Header at Top and User Profile + Sign Out at Bottom */}
      <SubNavbar
        activeCategory={currentCategory}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        currentUsername={currentUsername}
        currentRole={currentRole}
        userInitials={userInitials}
        onLogout={handleLogout}
      />

      {/* 2. Right Main Column: TopNavbar on Top + Content Below */}
      <div className="ui-app-right-column">
        <TopNavbar
          categories={visibleCategories}
          activeCategory={currentCategory}
          activeModule={activeModule}
          onSelectCategory={handleSelectCategory}
          onSelectModule={handleSelectModule}
          currentUsername={currentUsername}
          currentRole={currentRole}
          userInitials={userInitials}
          onLogout={handleLogout}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="ui-main">
          <Outlet />
        </main>
      </div>

      {/* 3. Mobile Responsive Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={visibleCategories}
        activeCategory={currentCategory}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        currentUsername={currentUsername}
        currentRole={currentRole}
        userInitials={userInitials}
        onLogout={handleLogout}
      />
    </div>
  );
}
