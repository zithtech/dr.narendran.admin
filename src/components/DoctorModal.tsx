import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Hospital } from './HospitalModal';
import { type Branch } from './BranchModal';
import { type UserAccount } from './UserModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface Doctor {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name?: string;
  branch_id: string | null;
  branch_name?: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSave: () => void;
}

export default function DoctorModal({ isOpen, onClose, doctor, onSave }: DoctorModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [hRes, bRes, uRes] = await Promise.all([
            api.get('hospitals'),
            api.get('branches'),
            api.get('user-accounts')
          ]);
          setHospitals(hRes.data);
          setBranches(bRes.data);
          const allUsers: UserAccount[] = uRes.data;
          setUsers(allUsers.filter(u => u.role === 'DOCTOR' && u.status === 'ACTIVE'));
        } catch (err) {
          console.error('Failed to fetch required data for doctor modal', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setHospitalId(doctor.hospital_id);
      setBranchId(doctor.branch_id || '');
      setUserAccountId(doctor.user_account_id || '');
      setPhone(doctor.phone || '');
      setEmail(doctor.email || '');
      setSpecialization(doctor.specialization || '');
      setStatus(doctor.status);
    } else {
      setName('');
      setHospitalId('');
      setBranchId('');
      setUserAccountId('');
      setPhone('');
      setEmail('');
      setSpecialization('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [doctor, isOpen]);

  if (!isOpen) return null;

  // Filter branches by selected hospital
  const availableBranches = branches.filter(b => b.hospital_id === hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hospitalId === '') {
      setError('Please select a hospital.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = doctor
        ? `doctors/${doctor.id}`
        : `doctors`;

      const method = doctor ? 'PUT' : 'POST';

      await api({ method, url, data: {
          hospital_id: hospitalId,
          branch_id: branchId === '' ? null : branchId,
          user_account_id: userAccountId === '' ? null : userAccountId,
          name,
          phone,
          email,
          specialization,
          status
        } });



      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save doctor.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
            {doctor ? 'Edit Doctor' : 'New Doctor'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Full Name <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Dr. Jane Smith"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Hospital <span style={{ color: 'red' }}>*</span></label>
              <select
                value={hospitalId}
                onChange={e => {
                  setHospitalId(e.target.value);
                  setBranchId(''); // Reset branch when hospital changes
                }}
                required
                style={inputStyle}
              >
                <option value="" disabled>Select Hospital...</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Branch</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                disabled={hospitalId === ''}
                style={inputStyle}
              >
                <option value="">No specific branch</option>
                {availableBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiologist"
                style={inputStyle}
              />
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

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Linked User Account</label>
            <select
              value={userAccountId}
              onChange={e => setUserAccountId(e.target.value)}
              style={inputStyle}
            >
              <option value="">No account linked</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username} (Doctor)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline styles
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' };
const headerStyle: React.CSSProperties = { padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
const saveBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: 'none', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
