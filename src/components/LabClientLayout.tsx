import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { ClientMobileDrawer } from './client/ClientMobileDrawer';
import {
  type ClientNavCategory,
  type ClientNavModule,
  findActiveClientNavigation,
  LAB_CLIENT_CATEGORIES,
} from './client/clientNavConfig';
import { ClientSidebar } from './client/ClientSidebar';
import { ClientTopNavbar } from './client/ClientTopNavbar';

export default function LabClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const userJson = localStorage.getItem('labClientUser');
  const labJson = localStorage.getItem('labClientLab');

  const user = userJson ? (JSON.parse(userJson) as { username?: string; role?: string }) : null;
  const lab = labJson ? (JSON.parse(labJson) as { name?: string }) : null;

  const username = user?.username ?? 'Lab User';
  const roleName = user?.role ?? 'Lab Admin';
  const labName = lab?.name ?? 'Diagnostic Laboratory';

  const userInitials = useMemo(() => {
    return (
      (username || 'LU')
        .replace(/[._-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'LU'
    );
  }, [username]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  // Determine active category and active module based on current URL path
  const { activeCategory: matchedCategory, activeModule } = useMemo(
    () => findActiveClientNavigation(location.pathname, LAB_CLIENT_CATEGORIES),
    [location.pathname],
  );

  // If user clicked category, use it; otherwise use matching category
  const currentCategory = useMemo(() => {
    if (selectedCategoryKey) {
      const found = LAB_CLIENT_CATEGORIES.find((c) => c.key === selectedCategoryKey);
      if (found) return found;
    }
    return matchedCategory;
  }, [selectedCategoryKey, matchedCategory]);

  const handleSelectCategory = (category: ClientNavCategory) => {
    setSelectedCategoryKey(category.key);
    const hasCurrentModule = category.modules.some((m) => m.path === location.pathname);
    if (!hasCurrentModule && category.modules.length > 0 && category.modules[0]) {
      void navigate(category.modules[0].path);
    }
  };

  const handleSelectModule = (mod: ClientNavModule) => {
    const parentCategory = LAB_CLIENT_CATEGORIES.find((cat) =>
      cat.modules.some((m) => m.path === mod.path),
    );
    if (parentCategory) {
      setSelectedCategoryKey(parentCategory.key);
    }
    void navigate(mod.path);
  };

  const handleLogout = () => {
    localStorage.removeItem('labClientToken');
    localStorage.removeItem('labClientUser');
    localStorage.removeItem('labClientLab');
    void navigate('/client/login');
  };

  return (
    <div className="ui-app-layout">
      {/* 1. Left Full-Height Sidebar matching Admin Web App */}
      <ClientSidebar
        categories={LAB_CLIENT_CATEGORIES}
        activeCategory={currentCategory}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        brandName="Client Portal"
        brandSub={labName}
        brandHomePath="/client/dashboard"
        onLogout={handleLogout}
      />

      {/* 2. Right Main Column: TopNavbar on Top + Content Below */}
      <div className="ui-app-right-column">
        <ClientTopNavbar
          categories={LAB_CLIENT_CATEGORIES}
          activeCategory={currentCategory}
          activeModule={activeModule}
          onSelectCategory={handleSelectCategory}
          currentUsername={username}
          currentRole={roleName}
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
      <ClientMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={LAB_CLIENT_CATEGORIES}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        currentUsername={username}
        currentRole={roleName}
        userInitials={userInitials}
        brandName="Client Portal"
        brandSub={labName}
        onLogout={handleLogout}
      />
    </div>
  );
}
