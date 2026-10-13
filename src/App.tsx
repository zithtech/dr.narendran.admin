import React from 'react';
import { BrowserRouter, Navigate,Route, Routes } from 'react-router';

import SidebarLayout from './components/SidebarLayout';
import { PrescriptionTemplatesPage } from './features/prescriptions/pages/PrescriptionTemplatesPage';
import Branches from './pages/Branches';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Login from './pages/Login';
import Patients from './pages/Patients';
import Pharmacy from './pages/Pharmacy';
import Users from './pages/Users';

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
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/users" element={<Users />} />
          <Route path="/prescriptions" element={<PrescriptionTemplatesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
