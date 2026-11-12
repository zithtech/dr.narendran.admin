import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';

import Login from './pages/Login';
import ClientLogin from './pages/ClientLogin';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import Branches from './pages/Branches';
import Doctors from './pages/Doctors';
import DoctorAvailabilityPage from './pages/DoctorAvailabilityPage';
import Users from './pages/Users';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import DoctorTodayAppointments from './pages/DoctorTodayAppointments';
import Pharmacy from './pages/Pharmacy';
import MedicineInventory from './pages/MedicineInventory';
import MedicinePackages from './pages/MedicinePackages';
import OrdersPage from './features/orders/pages/OrdersPage';
import PrescriptionsPage from './features/prescriptions/pages/PrescriptionsPage';
import Labs from './pages/Labs';
import LabServices from './pages/LabServices';
import LinkedMedicals from './pages/LinkedMedicals';
import ClientPortals from './pages/ClientPortals';
import Roles from './pages/Roles';
import StaffManagement from './pages/StaffManagement';
import SidebarLayout from './components/SidebarLayout';
import ClientPortalLayout, { ClientPermissionGate } from './components/ClientPortalLayout';
import LabClientLayout from './components/LabClientLayout';

import LabDashboardPage from './pages/client/LabDashboardPage';
import LabProfilePage from './pages/client/LabProfilePage';
import LabServicesPage from './pages/client/LabServicesPage';
import LabAccountPage from './pages/client/LabAccountPage';
import LabChangePasswordPage from './pages/client/LabChangePasswordPage';
import LabReportsPage from './pages/client/LabReportsPage';

import SupportCenterPage from './features/support/pages/SupportCenterPage';
import { ReviewsManagementPage } from './features/reviews/pages/ReviewsManagementPage';
import { ModuleRouteGuard } from './context/PermissionContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** Guard for Lab Client Portal routes with first-time password enforcement */
function LabClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('labClientToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  const userStr = localStorage.getItem('labClientUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.must_change_password && location.pathname !== '/client/change-password') {
        return <Navigate to="/client/change-password" replace />;
      }
    } catch { }
  }

  return <>{children}</>;
}

/** Guard for External Client / Partner Portal routes (legacy) */
function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('clientPortalToken') || localStorage.getItem('labClientToken');
  if (!token) {
    return <Navigate to="/client/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Portal Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Client Portal Authentication (Unique Dedicated URLs) */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/portal/login" element={<ClientLogin />} />
        <Route path="/client-login" element={<ClientLogin />} />

        {/* Dedicated Lab Client Portal Routes */}
        <Route
          path="/client"
          element={
            <LabClientProtectedRoute>
              <LabClientLayout />
            </LabClientProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<LabDashboardPage />} />
          <Route path="reports" element={<LabReportsPage />} />
          <Route path="profile" element={<LabProfilePage />} />
          <Route path="services" element={<LabServicesPage />} />
          <Route path="account" element={<LabAccountPage />} />
          <Route path="change-password" element={<LabChangePasswordPage />} />
        </Route>

        {/* Protected Admin Portal routes wrapped in SidebarLayout */}
        <Route
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <ModuleRouteGuard module="HOSPITALS" title="Hospitals">
                <Dashboard />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/branches"
            element={
              <ModuleRouteGuard module="BRANCHES" title="Hospital Branches">
                <Branches />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/doctors"
            element={
              <ModuleRouteGuard module="DOCTORS" title="Doctors">
                <Doctors />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/availability"
            element={
              <ModuleRouteGuard module="AVAILABILITY" title="Availability & Slots">
                <DoctorAvailabilityPage />
              </ModuleRouteGuard>
            }
          />
          <Route path="/doctor-availability" element={<Navigate to="/availability" replace />} />
          <Route
            path="/patients"
            element={
              <ModuleRouteGuard module="PATIENTS" title="Patients">
                <Patients />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/appointments"
            element={
              <ModuleRouteGuard module="APPOINTMENTS" title="Appointments">
                <Appointments />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/appointments/today"
            element={
              <ModuleRouteGuard module="TODAYS_SCHEDULE" title="Today's Schedule">
                <DoctorTodayAppointments />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <ModuleRouteGuard module="PHARMACY" title="Pharmacy">
                <Pharmacy />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <ModuleRouteGuard module="INVENTORY" title="Medicine Inventory">
                <MedicineInventory />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/medicine-packages"
            element={
              <ModuleRouteGuard module="MEDICINE_PACKAGES" title="Medicine Packages">
                <MedicinePackages />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/packages"
            element={
              <ModuleRouteGuard module="MEDICINE_PACKAGES" title="Medicine Packages">
                <MedicinePackages />
              </ModuleRouteGuard>
            }
          />
          <Route path="/medicine-package" element={<Navigate to="/medicine-packages" replace />} />
          <Route
            path="/orders"
            element={
              <ModuleRouteGuard module="ORDERS" title="Pharmacy Orders">
                <OrdersPage />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/labs"
            element={
              <ModuleRouteGuard module="LABS" title="Linked Labs">
                <Labs />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/lab-services"
            element={
              <ModuleRouteGuard module="LAB_SERVICES" title="Lab Services">
                <LabServices />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/linked-medicals"
            element={
              <ModuleRouteGuard module="LINKED_MEDICALS" title="Linked Medicals">
                <LinkedMedicals />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/client-portals"
            element={
              <ModuleRouteGuard module="CLIENT_PORTALS" title="Client Portals">
                <ClientPortals />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/users"
            element={
              <ModuleRouteGuard module="USERS" title="User Accounts">
                <Users />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/staff"
            element={
              <ModuleRouteGuard module="STAFF" title="Staff Management">
                <StaffManagement />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/roles"
            element={
              <ModuleRouteGuard module="ROLES" title="Roles & Permissions">
                <Roles />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <ModuleRouteGuard module="PRESCRIPTIONS" title="Prescriptions">
                <PrescriptionsPage />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/reviews"
            element={
              <ModuleRouteGuard module="REVIEWS" title="Ratings & Reviews">
                <ReviewsManagementPage />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/support"
            element={
              <ModuleRouteGuard module="PATIENT_SUPPORT" title="Patient Support" fallbackSlugs={['SUPPORT']}>
                <SupportCenterPage defaultUserType="PATIENT" />
              </ModuleRouteGuard>
            }
          />
          <Route
            path="/doctor-support"
            element={
              <ModuleRouteGuard module="DOCTOR_SUPPORT" title="Doctor Support" fallbackSlugs={['SUPPORT']}>
                <SupportCenterPage defaultUserType="DOCTOR" />
              </ModuleRouteGuard>
            }
          />
        </Route>

        {/* Legacy /portal fallback */}
        <Route
          path="/portal"
          element={
            <ClientProtectedRoute>
              <ClientPortalLayout />
            </ClientProtectedRoute>
          }
        >
          <Route index element={<ClientDashboard />} />
          <Route
            path="labs"
            element={
              <ClientPermissionGate slug="LABS">
                <Labs />
              </ClientPermissionGate>
            }
          />
          <Route
            path="lab-services"
            element={
              <ClientPermissionGate slug="LAB_SERVICES">
                <LabServices />
              </ClientPermissionGate>
            }
          />
          <Route
            path="linked-medicals"
            element={
              <ClientPermissionGate slug="LABS">
                <LinkedMedicals />
              </ClientPermissionGate>
            }
          />
        </Route>

        {/* Legacy /portal fallback */}
        <Route
          path="/portal"
          element={
            <ClientProtectedRoute>
              <ClientPortalLayout />
            </ClientProtectedRoute>
          }
        >
          <Route index element={<ClientDashboard />} />
          <Route
            path="labs"
            element={
              <ClientPermissionGate slug="LABS">
                <Labs />
              </ClientPermissionGate>
            }
          />
          <Route
            path="lab-services"
            element={
              <ClientPermissionGate slug="LAB_SERVICES">
                <LabServices />
              </ClientPermissionGate>
            }
          />
          <Route
            path="linked-medicals"
            element={
              <ClientPermissionGate slug="LABS">
                <LinkedMedicals />
              </ClientPermissionGate>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

