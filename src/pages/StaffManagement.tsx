import { App } from 'antd';
import {
  Activity,
  Building2,
  Calendar,
  Clock,
  Eye,
  FileCheck,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Moon,
  Phone,
  Power,
  ShieldCheck,
  Stethoscope,
  Sun,
  Sunset,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import StaffDrawer from '../components/StaffDrawer';
import StaffModal from '../components/StaffModal';
import { type Column, DataView, type Facet } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { useResource } from '../hooks/useResource';
import type { StaffMember, StaffStatus } from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

function getStaffInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return (parts[0]?.substring(0, 2) || 'ST').toUpperCase();
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

function getRoleBadgeConfig(role: string) {
  const lower = role.toLowerCase();
  if (lower.includes('nurse')) {
    return {
      icon: HeartPulse,
      background: '#f5f3ff',
      color: '#6d28d9',
      border: '1px solid #ddd6fe',
    };
  }
  if (lower.includes('doctor') || lower.includes('surgeon') || lower.includes('physician')) {
    return {
      icon: Stethoscope,
      background: '#eff6ff',
      color: '#1d4ed8',
      border: '1px solid #bfdbfe',
    };
  }
  if (lower.includes('technician') || lower.includes('patholog') || lower.includes('lab')) {
    return {
      icon: Activity,
      background: '#ecfdf5',
      color: '#047857',
      border: '1px solid #a7f3d0',
    };
  }
  if (lower.includes('pharmac')) {
    return {
      icon: ShieldCheck,
      background: '#fffbeb',
      color: '#b45309',
      border: '1px solid #fde68a',
    };
  }
  if (lower.includes('reception') || lower.includes('admin')) {
    return {
      icon: UserCheck,
      background: '#f8fafc',
      color: '#475569',
      border: '1px solid #e2e8f0',
    };
  }
  return {
    icon: Users,
    background: '#faf5ff',
    color: '#7e22ce',
    border: '1px solid #e9d5ff',
  };
}

function getShiftDetails(shift: string) {
  switch (shift.toLowerCase()) {
    case 'morning':
      return {
        icon: Sun,
        period: '08:00 AM - 04:00 PM',
        background: '#fffbeb',
        color: '#b45309',
        border: '1px solid #fde68a',
      };
    case 'evening':
      return {
        icon: Sunset,
        period: '04:00 PM - 12:00 AM',
        background: '#fff7ed',
        color: '#c2410c',
        border: '1px solid #fed7aa',
      };
    case 'night':
      return {
        icon: Moon,
        period: '12:00 AM - 08:00 AM',
        background: '#e0e7ff',
        color: '#4338ca',
        border: '1px solid #c7d2fe',
      };
    default:
      return {
        icon: Clock,
        period: 'Custom Roster',
        background: '#f5f3ff',
        color: '#7c3aed',
        border: '1px solid #ddd6fe',
      };
  }
}

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

  const columns: Column<StaffMember>[] = [
    {
      id: 'staff',
      header: 'Staff Member',
      sort: (s) => s.name.toLowerCase(),
      cell: (s) => {
        const initials = getStaffInitials(s.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: '1.5px solid #ddd6fe',
                color: '#6d28d9',
                fontWeight: 700,
                fontSize: 13,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => openDetails(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
                >
                  {s.name}
                </button>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#7c3aed',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {s.staffCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#64748b' }}>
                  <Phone size={11} style={{ color: '#94a3b8' }} />
                  {s.phone}
                </span>
                {s.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                    <span>·</span>
                    <Mail size={11} />
                    <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.email}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Staff Role',
      sort: (s) => s.role.toLowerCase(),
      cell: (s) => {
        const config = getRoleBadgeConfig(s.role);
        const RoleIcon = config.icon;
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              background: config.background,
              color: config.color,
              border: config.border,
            }}
          >
            <RoleIcon size={12.5} style={{ flexShrink: 0 }} />
            <span>{s.role}</span>
          </div>
        );
      },
    },
    {
      id: 'assignment',
      header: 'Hospital & Branch',
      sort: (s) => (s.hospitalName || '').toLowerCase(),
      cell: (s) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b', fontSize: 12.5 }}>
            <Building2 size={13.5} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span>{s.hospitalName || 'Main Hospital System'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
            <MapPin size={11.5} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span>{s.branchName || 'Central Campus'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'shift',
      header: 'Shift Timing',
      sort: (s) => s.shiftTiming,
      cell: (s) => {
        const shiftCfg = getShiftDetails(s.shiftTiming);
        const ShiftIcon = shiftCfg.icon;
        return (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2.5px 8px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                background: shiftCfg.background,
                color: shiftCfg.color,
                border: shiftCfg.border,
              }}
            >
              <ShiftIcon size={12} style={{ flexShrink: 0 }} />
              <span>{s.shiftTiming}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              {s.customShiftDetails || shiftCfg.period}
            </div>
          </div>
        );
      },
    },
    {
      id: 'documents',
      header: 'Documents',
      sort: (s) => s.documents?.length || 0,
      cell: (s) => {
        const count = s.documents?.length || 0;
        if (count === 0) {
          return (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: 6,
                background: '#f8fafc',
                color: '#94a3b8',
                border: '1px solid #e2e8f0',
              }}
            >
              <FileText size={12.5} style={{ color: '#cbd5e1' }} />
              <span>No docs</span>
            </div>
          );
        }

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              openDetails(s);
            }}
            title="View stored documents in R2"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              background: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileCheck size={13} style={{ color: '#7c3aed' }} />
            <span>{count === 1 ? '1 doc' : `${count} docs`}</span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 3,
                background: '#ede9fe',
                color: '#7c3aed',
              }}
            >
              R2
            </span>
          </div>
        );
      },
    },
    {
      id: 'joining',
      header: 'Joining Date',
      sort: (s) => new Date(s.joiningDate).getTime(),
      cell: (s) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
          <Calendar size={12.5} style={{ color: '#94a3b8' }} />
          <span>{s.joiningDate}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (s) => s.status,
      cell: (s) => {
        const isActive = s.status === 'ACTIVE';
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              background: isActive ? '#ecfdf5' : '#f8fafc',
              color: isActive ? '#047857' : '#64748b',
              border: isActive ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isActive ? '#10b981' : '#94a3b8',
                boxShadow: isActive ? '0 0 0 2px #bbf7d0' : 'none',
              }}
            />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </div>
        );
      },
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
