import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, List } from 'lucide-react';
import BranchModal, { type Branch } from '../components/BranchModal';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await api.get('branches');

      const data = response.data;
      setBranches(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load branches.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await api.delete(`branches/${id}`);

      fetchBranches();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete branch.'));
    }
  };

  const formatMemberFor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diffMonths < 1) return 'New Branch';
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years === 0) return `${months} months`;
    return `${years} Years, ${months} months`;
  };

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.branch_code.toLowerCase().includes(search.toLowerCase()) ||
    (b.hospital_name && b.hospital_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={pageStyle}>
      {/* Pipeline Header */}
      <div style={pipelineHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <List size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Branches</span>
          <span style={{ color: '#d1d5db', marginLeft: '4px', marginRight: '4px' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage hospital branches and locations.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search branch, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={handleCreate} style={newBtnStyle}>
            <Plus size={18} /> New branch
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>BRANCH INFO</th>
              <th style={thStyle}>HOSPITAL</th>
              <th style={thStyle}>CODE</th>
              <th style={thStyle}>ADDED ON</th>
              <th style={thStyle}>STATUS</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={loadingStyle}>Loading...</td></tr>
            ) : filteredBranches.length === 0 ? (
              <tr><td colSpan={6} style={loadingStyle}>No branches found.</td></tr>
            ) : (
              filteredBranches.map(branch => (
                <tr key={branch.id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={branchNameStyle}>{branch.name}</div>
                    <div style={branchSubStyle}>{branch.phone || 'No phone'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>{branch.hospital_name || 'Unknown'}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>{branch.branch_code}</span>
                  </td>
                  <td style={tdStyle}>{formatMemberFor(branch.created_at)}</td>
                  <td style={tdStyle}>{branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                  <td style={tdStyle}>
                    <div style={actionWrapperStyle}>
                      <button onClick={() => handleEdit(branch)} style={iconBtnStyle} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(branch.id)} style={iconBtnStyle} title="Delete">
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

      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branch={editingBranch}
        onSave={() => {
          setIsModalOpen(false);
          fetchBranches();
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
const branchNameStyle: React.CSSProperties = { fontWeight: 500, color: '#111827' };
const branchSubStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' };
const badgeStyle: React.CSSProperties = { padding: '2px 8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 };
const actionWrapperStyle: React.CSSProperties = { display: 'flex', gap: '8px' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' };
const loadingStyle: React.CSSProperties = { padding: '48px', textAlign: 'center', color: '#6b7280' };
