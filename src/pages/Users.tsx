import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserCircle } from 'lucide-react';
import UserModal, { type UserAccount } from '../components/UserModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Users() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('user-accounts');

      const data = response.data;
      setUsers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load user accounts.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserAccount) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user account? This may affect linked doctors or patients.')) return;
    try {
      await api.delete(`user-accounts/${id}`);

      fetchUsers();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete user account.'));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN': return { backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'DOCTOR': return { backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
      case 'PATIENT': return { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
      default: return badgeStyle;
    }
  };

  return (
    <div style={pageStyle}>
      <div style={pipelineHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCircle size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>User Accounts</span>
          <span style={{ color: '#d1d5db', marginLeft: '4px', marginRight: '4px' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage login credentials and roles.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search username, role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={handleCreate} style={newBtnStyle}>
            <Plus size={18} /> New User Account
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>USERNAME</th>
              <th style={thStyle}>ROLE</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>CREATED AT</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={loadingStyle}>Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} style={loadingStyle}>No user accounts found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={userNameStyle}>{user.username}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badgeStyle, ...getRoleBadgeStyle(user.role) }}>{user.role}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      ...badgeStyle,
                      backgroundColor: user.status === 'ACTIVE' ? '#ecfdf5' : '#f3f4f6',
                      color: user.status === 'ACTIVE' ? '#065f46' : '#4b5563',
                      borderColor: user.status === 'ACTIVE' ? '#a7f3d0' : '#e5e7eb'
                    }}>
                      {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={actionWrapperStyle}>
                      <button onClick={() => handleEdit(user)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} style={iconBtnStyle} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userAccount={editingUser}
        onSave={() => {
          setIsModalOpen(false);
          fetchUsers();
        }}
      />
    </div>
  );
}

// Inline styles
const pageStyle: React.CSSProperties = { minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' };
const pipelineHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', width: '320px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '6px 12px 6px 32px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', outline: 'none' };
const newBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
const errorStyle: React.CSSProperties = { margin: '16px 24px 0', padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px' };
const tableWrapperStyle: React.CSSProperties = { margin: '24px', backgroundColor: 'white', borderRadius: '0px', border: '1px solid #e5e7eb', overflow: 'auto', flex: 1 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' };
const trStyle: React.CSSProperties = { borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', transition: 'background-color 0.15s' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: '0.875rem', color: '#374151', verticalAlign: 'middle' };
const userNameStyle: React.CSSProperties = { fontWeight: 500, color: '#111827' };
const badgeStyle: React.CSSProperties = { padding: '2px 8px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #e5e7eb' };
const actionWrapperStyle: React.CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0px' };
const loadingStyle: React.CSSProperties = { padding: '48px', textAlign: 'center', color: '#6b7280' };
