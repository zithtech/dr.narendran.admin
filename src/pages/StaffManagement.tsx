import { App } from 'antd';
import {
  Clock,
  Eye,
  FileText,
  Power,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import StaffDrawer from '../components/StaffDrawer';
import StaffModal from '../components/StaffModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { Badge } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import type { StaffMember, StaffStatus } from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const FACETS: Facet<StaffMember>[] = [
  {
    id: 'role',
    label: 'Role',
    allLabel: 'All roles',
    value: (s) => s.role,
  },
  {
    id: 'shift',
    label: 'Shift Timing',
    allLabel: 'All shifts',
    value: (s) => s.shiftTiming || 'Morning',
  },
  {
    id: 'hospital',
    label: 'Hospital',
    allLabel: 'All hospitals',
    value: (s) => s.hospitalName || 'Main Hospital',
  },
  {
    id: 'branch',
    label: 'Branch',
    allLabel: 'All branches',
    value: (s) => s.branchName || 'Central Branch',
    inPanel: false,
  },
  statusFacet<StaffMember>(),
  addedFacet<StaffMember>(),
];

export default function StaffManagement() {
  const { message } = App.useApp();
  const resource = useResource<StaffMember>('staff', 'staff');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);

  // Derive currently viewed staff from live items
  const viewingStaff = viewingStaffId
    ? resource.items.find((s) => s.id === viewingStaffId) ?? null
    : null;

  const openDetails = (staff: StaffMember) => {
    setViewingStaffId(staff.id);
  };

  const openEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const nextStatus: StaffStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`staff/${staff.id}/status`, { status: nextStatus });
      message?.success?.(`Staff profile ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      void resource.refresh();
    } catch (err: unknown) {
      message?.error?.(getErrorMessage(err, 'Failed to update staff status.'));
    }
  };

  const getShiftBadgeTone = (shift: string) => {
    switch (shift.toLowerCase()) {
      case 'morning':
        return 'blue';
      case 'evening':
        return 'amber';
      case 'night':
        return 'violet';
      default:
        return 'neutral';
    }
  };

  const columns: Column<StaffMember>[] = [
    {
      id: 'staff',
      header: 'Staff Member',
      sort: (s) => s.name.toLowerCase(),
      cell: (s) => (
        <PrimaryCell
          name={s.name}
          sub={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  padding: '1px 5px',
                  borderRadius: 4,
                }}
              >
                {s.staffCode}
              </span>
              <span>{s.phone}</span>
            </div>
          }
          onOpen={() => openDetails(s)}
        />
      ),
    },
    {
      id: 'role',
      header: 'Staff Role',
      sort: (s) => s.role.toLowerCase(),
      cell: (s) => (
        <div>
          <Badge tone="blue">{s.role}</Badge>
        </div>
      ),
    },
    {
      id: 'assignment',
      header: 'Hospital & Branch',
      sort: (s) => (s.hospitalName || '').toLowerCase(),
      cell: (s) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>
            {s.hospitalName || 'Main Hospital System'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ui-text-muted, #64748b)' }}>
            {s.branchName || 'Central Campus'}
          </div>
        </div>
      ),
    },
    {
      id: 'shift',
      header: 'Shift Timing',
      sort: (s) => s.shiftTiming,
      cell: (s) => (
        <div>
          <Badge tone={getShiftBadgeTone(s.shiftTiming) as any}>
            <Clock size={12} style={{ marginRight: 4 }} />
            {s.shiftTiming}
          </Badge>
          {s.customShiftDetails && (
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {s.customShiftDetails}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'documents',
      header: 'Documents',
      sort: (s) => s.documents?.length || 0,
      cell: (s) => {
        const count = s.documents?.length || 0;
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: count > 0 ? '#f0fdf4' : '#f8fafc',
              color: count > 0 ? '#16a34a' : '#94a3b8',
              border: count > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
            }}
          >
            <FileText size={13} />
            <span>{count > 0 ? `${count} doc${count > 1 ? 's' : ''}` : 'No docs'}</span>
          </div>
        );
      },
    },
    {
      id: 'joining',
      header: 'Joining Date',
      sort: (s) => new Date(s.joiningDate).getTime(),
      cell: (s) => (
        <span style={{ fontSize: 12.5, color: 'var(--ui-text-muted, #475569)' }}>
          {s.joiningDate}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (s) => s.status,
      cell: (s) => (
        <Badge tone={s.status === 'ACTIVE' ? 'green' : 'neutral'}>
          {s.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <DataView
        title="Staff Management"
        subtitle="Add, view, edit, search, and manage hospital staff, shift timings, branches, and verification documents."
        icon={Users}
        noun="staff member"
        nounPlural="staff members"
        resource={resource}
        searchPlaceholder="Search staff by name, phone, role, code, branch..."
        searchFields={(s) => [
          s.name,
          s.phone,
          s.email,
          s.staffCode,
          s.role,
          s.hospitalName,
          s.branchName,
          s.shiftTiming,
        ]}
        facets={FACETS}
        dateOf={(s) => s.created_at}
        dateLabel="Registered Date"
        columns={columns}
        createLabel="Add Staff Member"
        onCreate={() => {
          setEditingStaff(null);
          setIsModalOpen(true);
        }}
        onEdit={(s) => openEdit(s)}
        onDelete={(s) => api.delete(`staff/${s.id}`)}
        nameOf={(s) => `${s.name} (${s.staffCode})`}
        onRowClick={(s) => openDetails(s)}
        activeId={viewingStaffId}
        rowActions={(s) => {
          const isActive = s.status === 'ACTIVE';

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="ui-icon-btn"
                title="View details & documents"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetails(s);
                }}
              >
                <Eye size={15} />
              </button>

              <button
                type="button"
                className={`ui-icon-btn ${isActive ? 'is-danger' : ''}`}
                title={isActive ? 'Deactivate profile' : 'Activate profile'}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleToggleStatus(s);
                }}
              >
                <Power size={15} style={{ color: isActive ? '#dc2626' : '#16a34a' }} />
              </button>
            </div>
          );
        }}
      />

      {/* Add / Edit Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        staff={editingStaff}
        onSave={() => void resource.refresh()}
      />

      {/* Staff Details & Document Drawer */}
      <StaffDrawer
        staff={viewingStaff}
        onClose={() => setViewingStaffId(null)}
        onEdit={(s) => openEdit(s)}
        onStatusChange={() => void resource.refresh()}
        onRefresh={() => void resource.refresh()}
      />
    </>
  );
}
