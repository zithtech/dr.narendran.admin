import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Doctors from './pages/Doctors';
import Users from './pages/Users';
import Patients from './pages/Patients';
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
          <Route path="/users" element={<Users />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
