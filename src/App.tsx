import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Doctors from './pages/Doctors';
import Users from './pages/Users';
import Patients from './pages/Patients';
import { PrescriptionTemplatesPage } from './features/prescriptions/pages/PrescriptionTemplatesPage';
import Labs from './pages/Labs';
import LabServices from './pages/LabServices';
import LinkedMedicals from './pages/LinkedMedicals';
import ClientPortals from './pages/ClientPortals';
import Roles from './pages/Roles';
import SidebarLayout from './components/SidebarLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected routes wrapped in SidebarLayout */}
        <Route element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/lab-services" element={<LabServices />} />
          <Route path="/linked-medicals" element={<LinkedMedicals />} />
          <Route path="/client-portals" element={<ClientPortals />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/prescriptions" element={<PrescriptionTemplatesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
