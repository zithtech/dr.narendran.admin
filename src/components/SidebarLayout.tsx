import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Building2, LogOut, User as UserIcon, List, Users, HeartPulse } from 'lucide-react';

export default function SidebarLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    navigate('/login');
  };

  const currentUsername = localStorage.getItem('adminUsername') || 'Super Admin';
  const currentRole = localStorage.getItem('adminRole') || 'System Administrator';

  const navItems = [
    { name: 'Hospitals', path: '/', icon: Building2 },
    { name: 'Branches', path: '/branches', icon: List },
    { name: 'Doctors', path: '/doctors', icon: Users },
    { name: 'Patients', path: '/patients', icon: HeartPulse },
    { name: 'User Accounts', path: '/users', icon: UserIcon },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: isExpanded ? '260px' : '80px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Logo Area */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #e5e7eb',
          minHeight: '73px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '4px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={24} style={{ color: '#ffffff', minWidth: '24px' }} strokeWidth={1.5} />
          </div>
          {isExpanded && <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#2563eb', whiteSpace: 'nowrap', overflow: 'hidden' }}>HMS Admin</span>}
        </div>

        {/* Toggle Button Row (Below Logo) */}
        <div style={{
          display: 'flex',
          justifyContent: isExpanded ? 'flex-end' : 'center',
          padding: '12px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#4b5563',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <List size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isExpanded ? '10px 12px 10px 12px' : '10px',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#4b5563',
                  border: 'none',
                  borderRadius: isActive ? '0 8px 8px 0' : '8px',
                  borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  marginLeft: isActive ? '-8px' : '0' // Pull left to attach border to edge
                }}
                onMouseOver={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseOut={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={20} style={{ minWidth: '20px' }} strokeWidth={1.5} />
                  {isExpanded && <span style={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.95rem' }}>{item.name}</span>}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Profile / Logout Section at Bottom */}
        <div style={{ padding: '24px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', minWidth: '36px',
              backgroundColor: '#eff6ff', color: '#2563eb',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserIcon size={18} strokeWidth={1.5} />
            </div>
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUsername}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{currentRole}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              gap: '12px',
              padding: '8px 12px',
              backgroundColor: 'white',
              color: '#ef4444',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              cursor: 'pointer',
              width: '100%',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <LogOut size={18} style={{ minWidth: '18px' }} strokeWidth={1.5} />
            {isExpanded && <span style={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.875rem' }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
