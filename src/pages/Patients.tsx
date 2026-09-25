import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, HeartPulse } from 'lucide-react';
import PatientModal, { type Patient } from '../components/PatientModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('patients');

      const data = response.data;
      setPatients(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load patients.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleCreate = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await api.delete(`patients/${id}`);

      fetchPatients();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete patient.'));
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
    (p.phone && p.phone.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={pageStyle}>
      <div style={pipelineHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartPulse size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Patients</span>
          <span style={{ color: '#d1d5db', marginLeft: '4px', marginRight: '4px' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage patient records and hospital assignments.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={handleCreate} style={newBtnStyle}>
            <Plus size={18} /> New patient
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>PATIENT</th>
              <th style={thStyle}>HOSPITAL & BRANCH</th>
              <th style={thStyle}>DOB & GENDER</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={loadingStyle}>Loading...</td></tr>
            ) : filteredPatients.length === 0 ? (
              <tr><td colSpan={5} style={loadingStyle}>No patients found.</td></tr>
            ) : (
              filteredPatients.map(patient => (
                <tr key={patient.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={patientNameStyle}>{patient.name}</div>
                    <div style={patientSubStyle}>{patient.email || patient.phone || 'No contact info'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>{patient.hospital_name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{patient.branch_name || 'No specific branch'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>
                      {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                      {patient.gender || 'Not specified'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      ...badgeStyle,
                      backgroundColor: patient.status === 'ACTIVE' ? '#ecfdf5' : '#f3f4f6',
                      color: patient.status === 'ACTIVE' ? '#065f46' : '#4b5563',
                      borderColor: patient.status === 'ACTIVE' ? '#a7f3d0' : '#e5e7eb'
                    }}>
                      {patient.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={actionWrapperStyle}>
                      <button onClick={() => handleEdit(patient)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(patient.id)} style={iconBtnStyle} title="Delete">
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

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patient={editingPatient}
        onSave={() => {
          setIsModalOpen(false);
          fetchPatients();
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
const patientNameStyle: React.CSSProperties = { fontWeight: 500, color: '#111827' };
const patientSubStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' };
const badgeStyle: React.CSSProperties = { padding: '2px 8px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #e5e7eb' };
const actionWrapperStyle: React.CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0px' };
const loadingStyle: React.CSSProperties = { padding: '48px', textAlign: 'center', color: '#6b7280' };
