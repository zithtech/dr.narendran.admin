import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';

import Login from './pages/Login';
import ClientLogin from './pages/ClientLogin';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import Branches from './pages/Branches';
import Doctors from './pages/Doctors';
import Users from './pages/Users';
import Patients from './pages/Patients';
import Pharmacy from './pages/Pharmacy';
import MedicineInventory from './pages/MedicineInventory';
import OrdersPage from './features/orders/pages/OrdersPage';
import { PrescriptionTemplatesPage } from './features/prescriptions/pages/PrescriptionTemplatesPage';
import Labs from './pages/Labs';
import LabServices from './pages/LabServices';
import LinkedMedicals from './pages/LinkedMedicals';
import ClientPortals from './pages/ClientPortals';
import Roles from './pages/Roles';
import SidebarLayout from './components/SidebarLayout';
import ClientPortalLayout, { ClientPermissionGate } from './components/ClientPortalLayout';
import LabClientLayout from './components/LabClientLayout';

import LabDashboardPage from './pages/client/LabDashboardPage';
import LabProfilePage from './pages/client/LabProfilePage';
import LabServicesPage from './pages/client/LabServicesPage';
import LabAccountPage from './pages/client/LabAccountPage';
import LabChangePasswordPage from './pages/client/LabChangePasswordPage';
import LabReportsPage from './pages/client/LabReportsPage';

/** Guard for Hospital Admin Portal routes */import SupportCenterPage from './features/support/pages/SupportCenterPage';

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/inventory" element={<MedicineInventory />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/lab-services" element={<LabServices />} />
          <Route path="/linked-medicals" element={<LinkedMedicals />} />
          <Route path="/client-portals" element={<ClientPortals />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/prescriptions" element={<PrescriptionTemplatesPage />} />
          <Route path="/support" element={<SupportCenterPage />} />
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

