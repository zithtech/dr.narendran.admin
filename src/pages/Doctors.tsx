import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, CalendarClock } from 'lucide-react';
import DoctorModal, { type Doctor } from '../components/DoctorModal';
import DoctorAvailabilityModal from '../components/DoctorAvailabilityModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityDoctor, setAvailabilityDoctor] = useState<Doctor | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await api.get('doctors');

      const data = response.data;
      setDoctors(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load doctors.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreate = () => {
    setEditingDoctor(null);
    setIsDoctorModalOpen(true);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsDoctorModalOpen(true);
  };

  const handleAvailability = (doctor: Doctor) => {
    setAvailabilityDoctor(doctor);
    setIsAvailabilityModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await api.delete(`doctors/${id}`);

      fetchDoctors();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete doctor.'));
    }
  };

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization && d.specialization.toLowerCase().includes(search.toLowerCase())) ||
    (d.hospital_name && d.hospital_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={pageStyle}>
      <div style={pipelineHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Doctors</span>
          <span style={{ color: '#d1d5db', marginLeft: '4px', marginRight: '4px' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage doctors, specializations, and schedules.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search name, specialization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={handleCreate} style={newBtnStyle}>
            <Plus size={18} /> New doctor
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>DOCTOR</th>
              <th style={thStyle}>HOSPITAL & BRANCH</th>
              <th style={thStyle}>SPECIALIZATION</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={loadingStyle}>Loading...</td></tr>
            ) : filteredDoctors.length === 0 ? (
              <tr><td colSpan={5} style={loadingStyle}>No doctors found.</td></tr>
            ) : (
              filteredDoctors.map(doctor => (
                <tr key={doctor.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={doctorNameStyle}>{doctor.name}</div>
                    <div style={doctorSubStyle}>{doctor.email || doctor.phone || 'No contact info'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>{doctor.hospital_name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{doctor.branch_name || 'No specific branch'}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>{doctor.specialization || 'General'}</span>
                  </td>
                  <td style={tdStyle}>{doctor.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                  <td style={tdStyle}>
                    <div style={actionWrapperStyle}>
                      <button onClick={() => handleAvailability(doctor)} style={availabilityBtnStyle} title="Manage Availability">
                        <CalendarClock size={14} /> Availability
                      </button>
                      <button onClick={() => handleEdit(doctor)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(doctor.id)} style={iconBtnStyle} title="Delete">
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

      <DoctorModal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        doctor={editingDoctor}
        onSave={() => {
          setIsDoctorModalOpen(false);
          fetchDoctors();
        }}
      />

      <DoctorAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        doctor={availabilityDoctor}
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
const doctorNameStyle: React.CSSProperties = { fontWeight: 500, color: '#111827' };
const doctorSubStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' };
const badgeStyle: React.CSSProperties = { padding: '2px 8px', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #e5e7eb' };
const actionWrapperStyle: React.CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center' };
const availabilityBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0px' };
const loadingStyle: React.CSSProperties = { padding: '48px', textAlign: 'center', color: '#6b7280' };
