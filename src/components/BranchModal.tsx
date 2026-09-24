import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Hospital } from './HospitalModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface Branch {
  id: string;
  hospital_id: string;
  hospital_name?: string; // from the join
  branch_code: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSave: () => void;
}

export default function BranchModal({ isOpen, onClose, branch, onSave }: BranchModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch hospitals for the dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchHospitals = async () => {
        try {
          const response = await api.get('hospitals');
          setHospitals(response.data);
        } catch (err) {
          console.error('Failed to fetch hospitals for branch modal', err);
        }
      };
      fetchHospitals();
    }
  }, [isOpen]);

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setHospitalId(branch.hospital_id);
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setStatus(branch.status);
    } else {
      setName('');
      setHospitalId('');
      setAddress('');
      setPhone('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [branch, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hospitalId === '') {
      setError('Please select a hospital.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = branch
        ? `branches/${branch.id}`
        : `branches`;

      const method = branch ? 'PUT' : 'POST';

      await api({ method, url, data: {
          hospital_id: hospitalId,
          name,
          address,
          phone,
          status
        } });



      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save branch.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
            {branch ? 'Edit Branch' : 'New Branch'}
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
            <label style={labelStyle}>Parent Hospital <span style={{ color: 'red' }}>*</span></label>
            <select
              value={hospitalId}
              onChange={e => setHospitalId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="" disabled>Select a hospital...</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.hospital_code})</option>
              ))}
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Branch Name <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Apollo South"
              style={inputStyle}
            />
          </div>

          {branch && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Branch Code</label>
              <input
                type="text"
                value={branch.branch_code}
                disabled
                style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
              />
            </div>
          )}

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

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={3}
              placeholder="Optional"
              style={{ ...inputStyle, resize: 'vertical' }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : 'Save Branch'}
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
