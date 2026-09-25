import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface UserAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: UserAccount | null;
  onSave: () => void;
}

export default function UserModal({ isOpen, onClose, userAccount, onSave }: UserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR' | 'PATIENT'>('PATIENT');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userAccount) {
      setUsername(userAccount.username);
      setPassword(''); // Don't populate password on edit
      setRole(userAccount.role);
      setStatus(userAccount.status);
    } else {
      setUsername('');
      setPassword('');
      setRole('PATIENT');
      setStatus('ACTIVE');
    }
    setError('');
  }, [userAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount && !password) {
      setError('Password is required when creating a new user.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = userAccount
        ? `user-accounts/${userAccount.id}`
        : `user-accounts`;

      const method = userAccount ? 'PUT' : 'POST';

      await api({ method, url, data: {
          username,
          password: password || null,
          role,
          status
        } });



      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save user account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
            {userAccount ? 'Edit User Account' : 'New User Account'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Username <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="e.g. drsmith_23"
              style={inputStyle}
              autoComplete="off"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>
              Password {userAccount ? '(Leave blank to keep unchanged)' : <span style={{color: "red"}}>*</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!userAccount}
              placeholder={userAccount ? '••••••••' : 'Enter a strong password'}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'ADMIN' | 'DOCTOR' | 'PATIENT')}
                required
                style={inputStyle}
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                style={inputStyle}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : 'Save User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline styles
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' };
const headerStyle: React.CSSProperties = { padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
const saveBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: 'none', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
