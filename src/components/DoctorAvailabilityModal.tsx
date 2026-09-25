import React, { useCallback, useEffect, useState } from 'react';
import { X, Trash2, Plus, Edit2 } from 'lucide-react';
import { type Doctor } from './DoctorModal';
import { type Branch } from './BranchModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

interface AvailabilitySlot {
  id: string;
  doctor_id: string;
  branch_id: string;
  branch_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface DoctorAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
}

export default function DoctorAvailabilityModal({ isOpen, onClose, doctor }: DoctorAvailabilityModalProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states for new/edit slot
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [day, setDay] = useState('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [branchId, setBranchId] = useState<string>('');

  const fetchAvailability = useCallback(async () => {
    if (!doctor) return;
    setLoading(true);
    try {
      const response = await api.get(`doctor-availability/doctor/${doctor.id}`);
      setSlots(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch availability.'));
    } finally {
      setLoading(false);
    }
  }, [doctor]);

  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get('branches');
      setBranches(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const resetForm = useCallback(() => {
    setEditingSlotId(null);
    setDay('MONDAY');
    setStartTime('09:00');
    setEndTime('17:00');
    setBranchId(doctor?.branch_id || '');
    setError('');
  }, [doctor]);

  useEffect(() => {
    if (isOpen && doctor) {
      fetchAvailability();
      fetchBranches();
      resetForm();
    }
  }, [isOpen, doctor, fetchAvailability, fetchBranches, resetForm]);

  if (!isOpen || !doctor) return null;

  // Only allow selecting branches in the same hospital as the doctor
  const availableBranches = branches.filter(b => b.hospital_id === doctor.hospital_id);

  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branchId === '') {
      setError('Please select a branch for this schedule.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = editingSlotId
        ? `doctor-availability/${editingSlotId}`
        : 'doctor-availability';
      const method = editingSlotId ? 'PUT' : 'POST';

      await api({ method, url, data: {
          doctor_id: doctor.id,
          branch_id: branchId,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          status: 'ACTIVE'
        } });



      await fetchAvailability();
      resetForm();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save availability.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlot = (slot: AvailabilitySlot) => {
    setEditingSlotId(slot.id);
    setDay(slot.day_of_week);
    setStartTime(slot.start_time.slice(0, 5));
    setEndTime(slot.end_time.slice(0, 5));
    setBranchId(slot.branch_id);
    setError('');
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this time slot?')) return;
    try {
      await api.delete(`doctor-availability/${id}`);
      await fetchAvailability();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete slot.'));
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
            Availability: {doctor.name}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* ADD/EDIT SLOT FORM */}
          <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
                {editingSlotId ? 'Edit Time Slot' : 'Add Time Slot'}
              </h3>
              {editingSlotId && (
                <button type="button" onClick={resetForm} style={cancelEditBtnStyle}>Cancel Edit</button>
              )}
            </div>

            <form onSubmit={handleSubmitSlot} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Day</label>
                <select value={day} onChange={e => setDay(e.target.value)} style={inputStyle}>
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Start</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required style={inputStyle} />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>End</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required style={inputStyle} />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Branch</label>
                <select value={branchId} onChange={e => setBranchId(e.target.value)} style={inputStyle} required>
                  <option value="" disabled>Select...</option>
                  {availableBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={loading} style={editingSlotId ? updateBtnStyle : addBtnStyle}>
                {editingSlotId ? 'Update' : <><Plus size={16} /> Add</>}
              </button>
            </form>
          </div>

          {/* LIST CURRENT SLOTS */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>DAY</th>
                <th style={thStyle}>TIME</th>
                <th style={thStyle}>BRANCH</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {loading && slots.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
              ) : slots.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No availability scheduled.</td></tr>
              ) : (
                slots.map(slot => (
                  <tr key={slot.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: editingSlotId === slot.id ? '#eff6ff' : 'transparent' }}>
                    <td style={tdStyle}>{slot.day_of_week}</td>
                    <td style={tdStyle}>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</td>
                    <td style={tdStyle}>{slot.branch_name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEditSlot(slot)} style={iconEditBtnStyle} title="Edit slot">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteSlot(slot.id)} style={iconDelBtnStyle} title="Remove slot">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={onClose} style={closeBtnAltStyle}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline styles
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' };
const headerStyle: React.CSSProperties = { padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: '#374151' };
const inputStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', outline: 'none' };
const addBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', height: '36px' };
const updateBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: 'none', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', height: '36px' };
const cancelEditBtnStyle: React.CSSProperties = { padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' };
const closeBtnAltStyle: React.CSSProperties = { padding: '0.5rem 1.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' };
const iconEditBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' };
const iconDelBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' };
