import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface Hospital {
  id: string;
  name: string;
  hospital_code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

interface HospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  hospital: Hospital | null;
}

export default function HospitalModal({ isOpen, onClose, onSave, hospital }: HospitalModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (hospital) {
        setName(hospital.name);
        setAddress(hospital.address || '');
        setPhone(hospital.phone || '');
        setEmail(hospital.email || '');
        setStatus(hospital.status);
      } else {
        setName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setStatus('ACTIVE');
      }
      setError('');
    }
  }, [isOpen, hospital]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = hospital
      ? `hospitals/${hospital.id}`
      : 'hospitals';
    const method = hospital ? 'PUT' : 'POST';

    try {
      await api({ method, url, data: { name, address, phone, email, status } });



      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save hospital.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2>{hospital ? 'Edit Hospital' : 'New Hospital'}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          {hospital && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Hospital Code</label>
              <input type="text" value={hospital.hospital_code || ''} disabled style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280' }} />
            </div>
          )}

          <div style={formGroupStyle}>
            <label style={labelStyle}>Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Phone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} style={{ ...inputStyle, minHeight: '80px' }} />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')} style={inputStyle}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div style={footerStyle}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Saving...' : 'Save Hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline styles for simplicity to match vanilla css approach without requiring a css file right now
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000
};
const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '8px', width: '100%', maxWidth: '500px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', maxHeight: '90vh'
};
const headerStyle: React.CSSProperties = {
  padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'
};
const errorStyle: React.CSSProperties = {
  margin: '1.5rem 1.5rem 0', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px'
};
const formStyle: React.CSSProperties = {
  padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto'
};
const formGroupStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.5rem'
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem', fontWeight: 500, color: '#374151'
};
const inputStyle: React.CSSProperties = {
  padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem'
};
const footerStyle: React.CSSProperties = {
  marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer'
};
const submitBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500
};
