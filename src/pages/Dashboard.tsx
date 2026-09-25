import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2 } from 'lucide-react';
import HospitalModal, { type Hospital } from '../components/HospitalModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Dashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const response = await api.get('hospitals');

      const data = response.data;
      setHospitals(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load hospitals.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleCreate = () => {
    setEditingHospital(null);
    setIsModalOpen(true);
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return;
    try {
      await api.delete(`hospitals/${id}`);

      fetchHospitals();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete hospital.'));
    }
  };

  const formatMemberFor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diffMonths < 1) return 'New Hospital';
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years === 0) return `${months} months`;
    return `${years} Years, ${months} months`;
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.hospital_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={pageStyle}>
      {/* Pipeline Header */}
      <div style={pipelineHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Hospitals</span>
          <span style={{ color: '#d1d5db', marginLeft: '4px', marginRight: '4px' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage all hospital branches and profiles.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search name, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={handleCreate} style={newBtnStyle}>
            <Plus size={18} /> New hospital
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>HOSPITAL</th>
              <th style={thStyle}>CODE</th>
              <th style={thStyle}>ADDED ON</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={loadingStyle}>Loading...</td></tr>
            ) : filteredHospitals.length === 0 ? (
              <tr><td colSpan={5} style={loadingStyle}>No hospitals found.</td></tr>
            ) : (
              filteredHospitals.map(hospital => (
                <tr key={hospital.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={hospitalNameStyle}>{hospital.name}</div>
                    <div style={hospitalSubStyle}>{hospital.email || hospital.phone || 'No contact info'}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>{hospital.hospital_code}</span>
                  </td>
                  <td style={tdStyle}>{formatMemberFor(hospital.created_at)}</td>
                  <td style={tdStyle}>{hospital.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                  <td style={tdStyle}>
                    <div style={actionWrapperStyle}>
                      <button onClick={() => handleEdit(hospital)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(hospital.id)} style={iconBtnStyle} title="Delete">
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

      <HospitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hospital={editingHospital}
        onSave={() => {
          setIsModalOpen(false);
          fetchHospitals();
        }}
      />
    </div>
  );
}

// Inline styles for CRM look
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
const hospitalNameStyle: React.CSSProperties = { fontWeight: 500, color: '#111827' };
const hospitalSubStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' };
const badgeStyle: React.CSSProperties = { padding: '2px 8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 };
const actionWrapperStyle: React.CSSProperties = { display: 'flex', gap: '8px' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' };
const loadingStyle: React.CSSProperties = { padding: '48px', textAlign: 'center', color: '#6b7280' };
