import { App, Dropdown, type MenuProps } from 'antd';
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
  MoreVertical,
  Pencil,
  Phone,
  Power,
  ShieldCheck,
  Stethoscope,
  Sun,
  Sunset,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import StaffDrawer from '../components/StaffDrawer';
import StaffModal from '../components/StaffModal';
import { type Column, DataView, type Facet } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { useResource } from '../hooks/useResource';
import { formatWorkDays, type StaffMember, type StaffStatus } from '../types/staff';
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

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!window.confirm(`Are you sure you want to delete ${staff.name}?`)) return;
    try {
      await api.delete(`staff/${staff.id}`);
      message?.success?.(`${staff.name} deleted successfully.`);
      void resource.refresh();
    } catch (err: unknown) {
      message?.error?.(getErrorMessage(err, 'Failed to delete staff member.'));
    }
  };

  const getStaffActionMenuItems = (s: StaffMember): NonNullable<MenuProps['items']> => {
    const isActive = s.status === 'ACTIVE';

    return [
      {
        key: 'edit',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
            <Pencil size={14} style={{ color: '#7c3aed' }} />
            <span>Edit Staff Profile</span>
          </span>
        ),
        onClick: () => openEdit(s),
      },
      {
        key: 'view',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#475569' }}>
            <Eye size={14} style={{ color: '#64748b' }} />
            <span>View Details & Documents</span>
          </span>
        ),
        onClick: () => openDetails(s),
      },
      {
        type: 'divider',
      },
      {
        key: 'status',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: isActive ? '#dc2626' : '#16a34a' }}>
            <Power size={14} style={{ color: isActive ? '#dc2626' : '#16a34a' }} />
            <span>{isActive ? 'Deactivate Profile' : 'Activate Profile'}</span>
          </span>
        ),
        onClick: () => void handleToggleStatus(s),
      },
      {
        key: 'delete',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#dc2626' }}>
            <Trash2 size={14} style={{ color: '#dc2626' }} />
            <span>Delete Staff Member</span>
          </span>
        ),
        danger: true,
        onClick: () => void handleDeleteStaff(s),
      },
    ];
  };

  const columns: Column<StaffMember>[] = [
    {
      id: 'staff',
      header: 'Staff Member',
      width: '26%',
      sort: (s) => s.name.toLowerCase(),
      cell: (s) => {
        const initials = getStaffInitials(s.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ede9fe',
                fontWeight: 650,
                fontSize: 11.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="staff-name-btn"
                  onClick={() => openDetails(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 180,
                  }}
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.staffCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11.5, color: '#64748b' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={10.5} style={{ color: '#94a3b8' }} />
                  <span>{s.phone}</span>
                </span>
                {s.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                    <span>·</span>
                    <Mail size={10.5} />
                    <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      width: '18%',
      sort: (s) => s.role.toLowerCase(),
      cell: (s) => {
        const config = getRoleBadgeConfig(s.role);
        const RoleIcon = config.icon;
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2.5px 8px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: config.background,
              color: config.color,
              border: config.border,
              whiteSpace: 'nowrap',
            }}
          >
            <RoleIcon size={12} style={{ flexShrink: 0 }} />
            <span>{s.role}</span>
          </div>
        );
      },
    },
    {
      id: 'assignment',
      header: 'Hospital & Branch',
      width: '20%',
      sort: (s) => (s.hospitalName || '').toLowerCase(),
      cell: (s) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>
            <Building2 size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.hospitalName || 'Main Hospital System'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
            <MapPin size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.branchName || 'Central Campus'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'shift',
      header: 'Shift Timing',
      width: '16%',
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
                padding: '2px 7px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                background: shiftCfg.background,
                color: shiftCfg.color,
                border: shiftCfg.border,
                whiteSpace: 'nowrap',
              }}
            >
              <ShiftIcon size={11} style={{ flexShrink: 0 }} />
              <span>{s.shiftTiming}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {s.customShiftDetails || shiftCfg.period}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                color: '#6d28d9',
                marginTop: 3,
                background: '#f5f3ff',
                border: '1px solid #ede9fe',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              <Calendar size={10} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <span>{formatWorkDays(s.workDays || s.work_days)}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'documents',
      header: 'Documents',
      width: '12%',
      sort: (s) => s.documents?.length || 0,
      cell: (s) => {
        const count = s.documents?.length || 0;
        if (count === 0) {
          return (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                padding: '2.5px 7px',
                borderRadius: 5,
                background: '#f8fafc',
                color: '#94a3b8',
                border: '1px solid #e2e8f0',
                whiteSpace: 'nowrap',
              }}
            >
              <FileText size={11.5} style={{ color: '#cbd5e1' }} />
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
            title="View stored documents "
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              padding: '2.5px 7px',
              borderRadius: 5,
              background: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <FileCheck size={12} style={{ color: '#7c3aed' }} />
            <span>{count === 1 ? '1 doc' : `${count} docs`}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '0.5px 3.5px',
                borderRadius: 3,
                background: '#ede9fe',
                color: '#7c3aed',
              }}
            >
            </span>
          </div>
        );
      },
    },
    {
      id: 'joining',
      header: 'Joining Date',
      width: '14%',
      sort: (s) => new Date(s.joiningDate).getTime(),
      cell: (s) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
          <Calendar size={12} style={{ color: '#94a3b8' }} />
          <span>{s.joiningDate}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: '12%',
      sort: (s) => s.status,
      cell: (s) => {
        const isActive = s.status === 'ACTIVE';
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2.5px 8px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: isActive ? '#f0fdf4' : '#f8fafc',
              color: isActive ? '#166534' : '#64748b',
              border: isActive ? '1px solid #dcfce7' : '1px solid #e2e8f0',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isActive ? '#22c55e' : '#94a3b8',
                flexShrink: 0,
              }}
            />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="staff-management-view">
      <DataView
        title="Staff Management"
        subtitle="Manage hospital staff, shift schedules, branch assignments, and verification documents."
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
          formatWorkDays(s.workDays || s.work_days),
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
        onDelete={(s) => api.delete(`staff/${s.id}`)}
        nameOf={(s) => `${s.name} (${s.staffCode})`}
        onRowClick={(s) => openDetails(s)}
        activeId={viewingStaffId}
        rowActions={(s) => (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <Dropdown
              menu={{ items: getStaffActionMenuItems(s) }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button
                type="button"
                className="appt-action-btn appt-action-menu"
                title="Actions"
                aria-label={`Actions for ${s.name}`}
              >
                <MoreVertical size={15} />
              </button>
            </Dropdown>
          </div>
        )}
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

      <style>{`
        .staff-management-view {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .staff-management-view .ui-page {
          gap: 8px;
          padding: 0 4px;
        }
        .staff-management-view .ui-header {
          padding: 4px 6px;
        }
        .staff-management-view .ui-table-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          background: #ffffff;
        }
        .staff-management-view .ui-table th {
          height: 38px;
          padding: 0 12px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 0.05em;
        }
        .staff-management-view .ui-table td {
          height: 52px;
          padding: 6px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 12.5px;
        }
        .staff-management-view .ui-table tbody tr:hover td {
          background: #fafafa;
        }
        .staff-management-view .ui-table tbody tr.is-selected td {
          background: #f5f3ff;
        }
        .staff-management-view .ui-table tbody tr.is-open td {
          background: #f5f3ff;
        }
        .staff-management-view .ui-table td.ui-col-actions {
          background: #ffffff;
          box-shadow: -8px 0 8px -8px rgba(16, 24, 40, 0.06);
        }
        .staff-management-view .ui-table tbody tr:hover td.ui-col-actions {
          background: #fafafa;
        }
        .staff-management-view .ui-table tbody tr.is-selected td.ui-col-actions,
        .staff-management-view .ui-table tbody tr.is-open td.ui-col-actions {
          background: #f5f3ff;
        }
        .staff-management-view .staff-name-btn:hover {
          color: #7c3aed !important;
        }
        .staff-management-view .appt-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #64748b;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .staff-management-view .appt-action-menu:hover,
        .staff-management-view .appt-action-menu:focus-visible {
          background: #f5f3ff !important;
          border: none !important;
          color: #7c3aed;
        }
        .staff-management-view .ui-checkbox {
          width: 17px;
          height: 17px;
          cursor: pointer;
          accent-color: #7c3aed;
          border-radius: 5px;
          -webkit-border-radius: 5px;
          transition: transform 0.12s ease, filter 0.12s ease;
          vertical-align: middle;
        }
        .staff-management-view .ui-checkbox:hover {
          transform: scale(1.08);
          filter: brightness(0.95);
        }
        .staff-management-view .ui-checkbox:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
        }
        .staff-management-view .ui-bulkbar {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 9999px;
          padding: 6px 14px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
        }
        .staff-management-view .ui-bulkbar .ui-btn {
          border-radius: 9999px;
        }
        .staff-management-view .ui-btn-primary.ui-btn-pill {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%) !important;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.28) !important;
        }
        .staff-management-view .ui-btn-primary.ui-btn-pill:hover {
          background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
          box-shadow: 0 4px 10px rgba(124, 58, 237, 0.35) !important;
        }
        .staff-management-view .ui-hub-btn {
          color: #6d28d9;
        }
        .staff-management-view .ui-hub-icon {
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}
