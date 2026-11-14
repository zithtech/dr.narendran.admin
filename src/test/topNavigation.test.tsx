import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { MobileNavDrawer } from '../components/navigation/MobileNavDrawer';
import {
  filterNavigationByPermissions,
  findActiveNavigation,
  NAVIGATION_CATEGORIES,
} from '../components/navigation/navigationConfig';
import { SubNavbar } from '../components/navigation/SubNavbar';
import { TopNavbar } from '../components/navigation/TopNavbar';

describe('Top Navigation Restructuring', () => {
  it('defines the 6 required top-level navigation categories with correct modules', () => {
    const categoryKeys = NAVIGATION_CATEGORIES.map((c) => c.key);
    expect(categoryKeys).toEqual([
      'dashboard',
      'clinical',
      'network',
      'operations',
      'administration',
      'support',
    ]);

    // 1. Dashboard: Dashboard
    const dashboardCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'dashboard')!;
    expect(dashboardCat.name).toBe('Dashboard');
    expect(dashboardCat.modules.map((m) => m.name)).toEqual(['Dashboard']);

    // 2. Clinical: Doctors, Availability & Slots, Patients, Appointments, Today's Schedule, Ratings & Reviews
    const clinicalCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'clinical')!;
    expect(clinicalCat.name).toBe('Clinical');
    expect(clinicalCat.modules.map((m) => m.name)).toEqual([
      'Doctors',
      'Availability & Slots',
      'Patients',
      'Appointments',
      "Today's Schedule",
      'Ratings & Reviews',
    ]);

    // 3. Network: Hospitals, Branches, Linked Labs, Linked Medicals
    const networkCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'network')!;
    expect(networkCat.name).toBe('Network');
    expect(networkCat.modules.map((m) => m.name)).toEqual([
      'Hospitals',
      'Branches',
      'Linked Labs',
      'Linked Medicals',
    ]);

    // 4. Operations: Pharmacy, Medicine Inventory, Medicine Package, Prescription, Orders, Lab Services
    const operationsCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'operations')!;
    expect(operationsCat.name).toBe('Operations');
    expect(operationsCat.modules.map((m) => m.name)).toEqual([
      'Pharmacy',
      'Medicine Inventory',
      'Medicine Package',
      'Prescription',
      'Orders',
      'Lab Services',
    ]);

    // 5. Administration: Client Portals, User Accounts, Staff Management, Roles & Permissions
    const adminCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'administration')!;
    expect(adminCat.name).toBe('Administration');
    expect(adminCat.modules.map((m) => m.name)).toEqual([
      'Client Portals',
      'User Accounts',
      'Staff Management',
      'Roles & Permissions',
    ]);

    // 6. Support: Patient Support, Doctor Support
    const supportCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'support')!;
    expect(supportCat.name).toBe('Support');
    expect(supportCat.modules.map((m) => m.name)).toEqual([
      'Patient Support',
      'Doctor Support',
    ]);
  });

  it('correctly detects active category and module from URL pathname', () => {
    // Clinical: /appointments/today
    const resToday = findActiveNavigation('/appointments/today', NAVIGATION_CATEGORIES);
    expect(resToday.activeCategory?.name).toBe('Clinical');
    expect(resToday.activeModule?.name).toBe("Today's Schedule");

    // Network: /hospitals
    const resHosp = findActiveNavigation('/hospitals', NAVIGATION_CATEGORIES);
    expect(resHosp.activeCategory?.name).toBe('Network');
    expect(resHosp.activeModule?.name).toBe('Hospitals');

    // Operations: /inventory
    const resInv = findActiveNavigation('/inventory', NAVIGATION_CATEGORIES);
    expect(resInv.activeCategory?.name).toBe('Operations');
    expect(resInv.activeModule?.name).toBe('Medicine Inventory');

    // Operations: /medicine-packages (Medicine Package)
    const resMedPkg = findActiveNavigation('/medicine-packages', NAVIGATION_CATEGORIES);
    expect(resMedPkg.activeCategory?.name).toBe('Operations');
    expect(resMedPkg.activeModule?.name).toBe('Medicine Package');

    // Operations: /prescriptions (Prescription)
    const resRx = findActiveNavigation('/prescriptions', NAVIGATION_CATEGORIES);
    expect(resRx.activeCategory?.name).toBe('Operations');
    expect(resRx.activeModule?.name).toBe('Prescription');

    // Clinical: /availability (Availability & Slots)
    const resAvail = findActiveNavigation('/availability', NAVIGATION_CATEGORIES);
    expect(resAvail.activeCategory?.name).toBe('Clinical');
    expect(resAvail.activeModule?.name).toBe('Availability & Slots');

    // Administration: /client-portals (Client Portals)
    const resPortals = findActiveNavigation('/client-portals', NAVIGATION_CATEGORIES);
    expect(resPortals.activeCategory?.name).toBe('Administration');
    expect(resPortals.activeModule?.name).toBe('Client Portals');

    // Administration: /roles
    const resRoles = findActiveNavigation('/roles', NAVIGATION_CATEGORIES);
    expect(resRoles.activeCategory?.name).toBe('Administration');
    expect(resRoles.activeModule?.name).toBe('Roles & Permissions');

    // Support: /doctor-support
    const resDocSup = findActiveNavigation('/doctor-support', NAVIGATION_CATEGORIES);
    expect(resDocSup.activeCategory?.name).toBe('Support');
    expect(resDocSup.activeModule?.name).toBe('Doctor Support');
  });

  it('renders all main categories in the Top Navbar and highlights the active category', () => {
    const clinicalCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'clinical')!;
    const doctorsMod = clinicalCat.modules[0]!;
    const onSelectCategory = vi.fn();
    const onSelectModule = vi.fn();
    const onLogout = vi.fn();

    render(
      <MemoryRouter>
        <TopNavbar
          categories={NAVIGATION_CATEGORIES}
          activeCategory={clinicalCat}
          activeModule={doctorsMod}
          onSelectCategory={onSelectCategory}
          onSelectModule={onSelectModule}
          currentUsername="Dr Admin"
          currentRole="Super Administrator"
          userInitials="DA"
          onLogout={onLogout}
          isMobileMenuOpen={false}
          onToggleMobileMenu={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Verify Brand
    expect(screen.getByText('HMS Admin')).toBeInTheDocument();
    expect(screen.getByText('Dr Narendran')).toBeInTheDocument();

    // Verify all 6 Categories are rendered
    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clinical/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Network/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Operations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administration/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Support/i })).toBeInTheDocument();

    // Verify Clinical is highlighted as active page
    const clinicalBtn = screen.getByRole('button', { name: /Clinical/i });
    expect(clinicalBtn).toHaveAttribute('aria-current', 'page');
    expect(clinicalBtn.className).toContain('is-active');

    // Clicking a category calls onSelectCategory
    const networkBtn = screen.getByRole('button', { name: /Network/i });
    fireEvent.click(networkBtn);
    expect(onSelectCategory).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'network', name: 'Network' }),
    );

    // Verify user card and logout
    expect(screen.getByText('Dr Admin')).toBeInTheDocument();
    expect(screen.getByText('Super Administrator')).toBeInTheDocument();
    const logoutBtn = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });

  it('renders respective submodules in SubNavbar sidebar when a category is selected and highlights active module', () => {
    const clinicalCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'clinical')!;
    const appointmentsMod = clinicalCat.modules.find((m) => m.name === 'Appointments')!;
    const onSelectModule = vi.fn();

    render(
      <SubNavbar
        activeCategory={clinicalCat}
        activeModule={appointmentsMod}
        onSelectModule={onSelectModule}
      />,
    );

    // Category header in sidebar
    expect(screen.getByText('Clinical')).toBeInTheDocument();

    // Respective submodules
    expect(screen.getByRole('button', { name: /Doctors/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Patients/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Appointments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Today's Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ratings & Reviews/i })).toBeInTheDocument();

    // Appointments is active
    const apptBtn = screen.getByRole('button', { name: /Appointments/i });
    expect(apptBtn).toHaveAttribute('aria-current', 'page');
    expect(apptBtn.className).toContain('is-active');

    // Clicking module calls onSelectModule
    const patientsBtn = screen.getByRole('button', { name: /Patients/i });
    fireEvent.click(patientsBtn);
    expect(onSelectModule).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Patients', path: '/patients' }),
    );
  });

  it('renders mobile navigation drawer with categories and submodules', () => {
    const operationsCat = NAVIGATION_CATEGORIES.find((c) => c.key === 'operations')!;
    const inventoryMod = operationsCat.modules.find((m) => m.name === 'Medicine Inventory')!;
    const onClose = vi.fn();
    const onSelectModule = vi.fn();

    render(
      <MobileNavDrawer
        isOpen={true}
        onClose={onClose}
        categories={NAVIGATION_CATEGORIES}
        activeCategory={operationsCat}
        activeModule={inventoryMod}
        onSelectModule={onSelectModule}
        currentUsername="Dr Admin"
        currentRole="Administrator"
        userInitials="DA"
        onLogout={vi.fn()}
      />,
    );

    // Verify operations submodules are displayed
    expect(screen.getByRole('button', { name: /Pharmacy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Medicine Inventory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Medicine Package/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prescription/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lab Services/i })).toBeInTheDocument();

    // Clicking a module calls onSelectModule and onClose
    const ordersBtn = screen.getByRole('button', { name: /Orders/i });
    fireEvent.click(ordersBtn);
    expect(onSelectModule).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Orders', path: '/orders' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('filters navigation by RBAC permissions', () => {
    const filtered = filterNavigationByPermissions(
      NAVIGATION_CATEGORIES,
      ['DOCTORS', 'APPOINTMENTS', 'USERS', 'CLIENT_PORTALS'],
      false,
    );

    const keys = filtered.map((c) => c.key);
    // Dashboard (always), Clinical (Doctors, Appointments), Administration (Client Portals, User Accounts)
    expect(keys).toContain('dashboard');
    expect(keys).toContain('clinical');
    expect(keys).toContain('administration');
    // Network has no allowed slugs -> excluded
    expect(keys).not.toContain('network');

    const clinical = filtered.find((c) => c.key === 'clinical')!;
    const modNames = clinical.modules.map((m) => m.name);
    expect(modNames).toContain('Doctors');
    expect(modNames).toContain('Appointments');
    expect(modNames).not.toContain('Patients');
    expect(modNames).not.toContain('Availability & Slots');

    const admin = filtered.find((c) => c.key === 'administration')!;
    const adminModNames = admin.modules.map((m) => m.name);
    expect(adminModNames).toContain('Client Portals');
    expect(adminModNames).toContain('User Accounts');
    expect(adminModNames).not.toContain('Roles & Permissions');
  });
});

