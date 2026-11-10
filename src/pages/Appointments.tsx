import { Dropdown, type MenuProps } from 'antd';
import {
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Clock,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Phone,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import AppointmentDrawer from '../components/AppointmentDrawer';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import EditAppointmentModal from '../components/EditAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import { type Column, DataView, type Facet } from '../components/ui/DataView';
import { addedFacet } from '../components/ui/facets';
import { useResource } from '../hooks/useResource';
import { initials, titleCase } from '../lib/format';
import type { Appointment } from '../types/appointment';
import DoctorTodayAppointments from './DoctorTodayAppointments';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';

const FACETS: Facet<Appointment>[] = [
  {
    id: 'status',
    label: 'Status',
    allLabel: 'All statuses',
    value: (a) => a.status,
    optionLabel: (v) => titleCase(v.replace('_', ' ')),
    order: ['scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'],
  },
  {
    id: 'doctor',
    label: 'Doctor',
    allLabel: 'All doctors',
    value: (a) => a.doctorName || 'Unknown Doctor',
  },
  {
    id: 'branch',
    label: 'Branch & Hospital',
    allLabel: 'All locations',
    value: (a) => a.branchName || a.hospitalName || 'Main Clinic',
    inPanel: false,
  },
  addedFacet<Appointment>(),
];

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'today' ? 'today' : 'all';

  const resource = useResource<Appointment>('appointments', 'appointments');

  // Modal / Drawer state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [prescriptionAppt, setPrescriptionAppt] = useState<Appointment | null>(null);

  const handleTabChange = (tab: 'all' | 'today') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'today') {
        next.set('tab', 'today');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  const renderStatus = (status: string) => {
    const s = status.toLowerCase();
    let bg = '#f8fafc';
    let fg = '#475569';
    let border = '#e2e8f0';
    let dot = '#94a3b8';

    if (s === 'scheduled' || s === 'confirmed') {
      bg = '#f5f3ff';
      fg = '#6d28d9';
      border = '#ede9fe';
      dot = '#7c3aed';
    } else if (s === 'completed') {
      bg = '#f0fdf4';
      fg = '#166534';
      border = '#dcfce7';
      dot = '#22c55e';
    } else if (s === 'rescheduled') {
      bg = '#fffbeb';
      fg = '#92400e';
      border = '#fef3c7';
      dot = '#d97706';
    } else if (s === 'cancelled') {
      bg = '#fef2f2';
      fg = '#991b1b';
      border = '#fee2e2';
      dot = '#ef4444';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2.5px 8px',
          borderRadius: 6,
          fontSize: 11.5,
          fontWeight: 600,
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
        <span>{titleCase(status.replace('_', ' '))}</span>
      </span>
    );
  };

  const getActionMenuItems = (a: Appointment): NonNullable<MenuProps['items']> => {
    const isActive =
      a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'rescheduled';

    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'prescription',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
            <FileText size={14} style={{ color: '#7c3aed' }} />
            <span>Create Prescription</span>
          </span>
        ),
        onClick: () => setPrescriptionAppt(a),
      },
      {
        key: 'edit',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
            <Pencil size={14} style={{ color: '#7c3aed' }} />
            <span>Edit</span>
          </span>
        ),
        onClick: () => openEdit(a),
      },
      {
        key: 'view',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#475569' }}>
            <Eye size={14} style={{ color: '#64748b' }} />
            <span>View Details</span>
          </span>
        ),
        onClick: () => openDetails(a),
      },
    ];

    if (isActive) {
      items.push(
        {
          type: 'divider',
        },
        {
          key: 'reschedule',
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
              <CalendarClock size={14} style={{ color: '#7c3aed' }} />
              <span>Reschedule</span>
            </span>
          ),
          onClick: () => openReschedule(a),
        },
        {
          key: 'cancel',
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#dc2626' }}>
              <CalendarX2 size={14} style={{ color: '#dc2626' }} />
              <span>Cancel Appointment</span>
            </span>
          ),
          danger: true,
          onClick: () => openCancel(a),
        },
      );
    }

    return items;
  };

  const openDetails = (appt: Appointment) => {
    setViewingAppointment(appt);
  };

  const openEdit = (appt: Appointment) => {
    setEditingAppointment(appt);
  };

  const openReschedule = (appt: Appointment) => {
    setReschedulingAppointment(appt);
  };

  const openCancel = (appt: Appointment) => {
    setCancellingAppointment(appt);
  };

  const columns: Column<Appointment>[] = [
    {
      id: 'patient',
      header: 'Patient',
      width: '26%',
      sort: (a) => a.patientName.toLowerCase(),
      cell: (a) => {
        const patientInitials = initials(a.patientName || 'Patient');
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ede9fe',
                fontSize: 11.5,
                fontWeight: 650,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {patientInitials}
            </span>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <button
                type="button"
                className="appt-patient-name"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetails(a);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 200,
                }}
              >
                {a.patientName}
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: '#64748b',
                  marginTop: 2,
                }}
              >
                {a.patientPhone ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={11} style={{ color: '#94a3b8' }} />
                    <span>{a.patientPhone}</span>
                  </span>
                ) : a.patientEmail ? (
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 160,
                    }}
                  >
                    {a.patientEmail}
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>No contact info</span>
                )}
                {a.patientGender && (
                  <>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>{titleCase(a.patientGender)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'doctor',
      header: 'Doctor & Department',
      width: '22%',
      sort: (a) => a.doctorName.toLowerCase(),
      cell: (a) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 220,
            }}
          >
            {a.doctorName}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
              flexWrap: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6d28d9',
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 5,
                padding: '1.5px 7px',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3.5,
              }}
            >
              <Stethoscope size={10.5} style={{ color: '#7c3aed' }} />
              <span>{a.doctorSpecialty || 'General Practitioner'}</span>
            </span>
            {a.branchName && (
              <span
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={a.branchName}
              >
                • {a.branchName}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule & Token',
      width: '18%',
      sort: (a) => new Date(a.scheduledStart).getTime(),
      cell: (a) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a', whiteSpace: 'nowrap' }}>
              {a.date}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                padding: '1.5px 7px',
                borderRadius: 5,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {a.tokenNumber}
            </span>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <Clock size={11} style={{ color: '#94a3b8' }} />
            <span>{a.time}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: '14%',
      sort: (a) => a.status,
      cell: (a) => renderStatus(a.status),
    },
    {
      id: 'purpose',
      header: 'Purpose / Reason',
      width: '20%',
      sort: (a) => a.purpose.toLowerCase(),
      cell: (a) => (
        <div style={{ minWidth: 0, maxWidth: 220 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: 12.5,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={a.purpose}
          >
            {a.purpose}
          </div>
          {(a.patientNote || a.rescheduleReason || a.cancellationReason) && (
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
              }}
              title={a.patientNote || a.rescheduleReason || a.cancellationReason}
            >
              {a.patientNote || a.rescheduleReason || a.cancellationReason}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Navigation Tab Switcher */}
      <div
        style={{
          padding: '6px 12px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--ui-surface-2, #f1f5f9)',
            padding: 3,
            borderRadius: 10,
            border: '1px solid var(--ui-border, #e2e8f0)',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: currentTab === 'all' ? 600 : 500,
              background: currentTab === 'all' ? '#ffffff' : 'transparent',
              color: currentTab === 'all' ? '#6d28d9' : '#64748b',
              boxShadow: currentTab === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarDays size={14} style={{ color: currentTab === 'all' ? '#7c3aed' : '#94a3b8' }} />
            <span>All Appointments</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('today')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: currentTab === 'today' ? 600 : 500,
              background: currentTab === 'today' ? '#ffffff' : 'transparent',
              color: currentTab === 'today' ? '#6d28d9' : '#64748b',
              boxShadow: currentTab === 'today' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Stethoscope size={14} style={{ color: currentTab === 'today' ? '#7c3aed' : '#94a3b8' }} />
            <span>Doctors Today Appointments</span>
          </button>
        </div>
      </div>

      {currentTab === 'today' ? (
        <DoctorTodayAppointments />
      ) : (
        <div className="appointments-all-view">
          <DataView
            title="Appointments"
            subtitle="Schedule and track patient consultations, check doctor availability, and manage appointments."
            icon={CalendarDays}
            noun="appointment"
            nounPlural="appointments"
            resource={resource}
            searchPlaceholder="Search by patient name, phone, doctor, token..."
            searchFields={(a) => [a.patientName, a.patientPhone, a.doctorName, a.tokenNumber, a.purpose]}
            facets={FACETS}
            dateOf={(a) => a.scheduledStart}
            dateLabel="Date"
            columns={columns}
            createLabel="Schedule Appointment"
            onCreate={() => setIsScheduleOpen(true)}
            nameOf={(a) => `${a.patientName} (${a.tokenNumber})`}
            onRowClick={(a) => openDetails(a)}
            activeId={viewingAppointment?.id ?? null}
            rowActions={(a) => (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <Dropdown
                  menu={{ items: getActionMenuItems(a) }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <button
                    type="button"
                    className="appt-action-btn appt-action-menu"
                    title="Actions"
                    aria-label={`Actions for ${a.patientName}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </Dropdown>
              </div>
            )}
          />

          {/* Schedule New Appointment Modal */}
          <ScheduleAppointmentModal
            isOpen={isScheduleOpen}
            onClose={() => setIsScheduleOpen(false)}
            onSuccess={() => void resource.refresh()}
          />

          {/* Edit Appointment Modal */}
          <EditAppointmentModal
            isOpen={Boolean(editingAppointment)}
            appointment={editingAppointment}
            onClose={() => setEditingAppointment(null)}
            onSuccess={() => {
              void resource.refresh();
              if (viewingAppointment && editingAppointment && viewingAppointment.id === editingAppointment.id) {
                setViewingAppointment(null);
              }
            }}
          />

          {/* Reschedule Appointment Modal */}
          <RescheduleAppointmentModal
            isOpen={Boolean(reschedulingAppointment)}
            appointment={reschedulingAppointment}
            onClose={() => setReschedulingAppointment(null)}
            onSuccess={() => {
              void resource.refresh();
              if (viewingAppointment && reschedulingAppointment && viewingAppointment.id === reschedulingAppointment.id) {
                setViewingAppointment(null);
              }
            }}
          />

          {/* Cancel Appointment Modal */}
          <CancelAppointmentModal
            isOpen={Boolean(cancellingAppointment)}
            appointment={cancellingAppointment}
            onClose={() => setCancellingAppointment(null)}
            onSuccess={() => {
              void resource.refresh();
              if (viewingAppointment && cancellingAppointment && viewingAppointment.id === cancellingAppointment.id) {
                setViewingAppointment(null);
              }
            }}
          />

          {/* View Appointment Details Drawer */}
          <AppointmentDrawer
            appointment={viewingAppointment}
            onClose={() => setViewingAppointment(null)}
            onEdit={(appt) => {
              setViewingAppointment(null);
              openEdit(appt);
            }}
            onReschedule={(appt) => {
              openReschedule(appt);
            }}
            onCancel={(appt) => {
              openCancel(appt);
            }}
            onCreatePrescription={(appt) => {
              setPrescriptionAppt(appt);
            }}
          />

          {/* Create Prescription Modal */}
          {prescriptionAppt && (
            <CreatePrescriptionModal
              open={Boolean(prescriptionAppt)}
              appointmentId={prescriptionAppt.id}
              appointmentToken={prescriptionAppt.tokenNumber}
              appointmentDoctorId={prescriptionAppt.doctorId}
              preselectedPatient={{
                id: prescriptionAppt.patientId,
                name: prescriptionAppt.patientName,
                phone: prescriptionAppt.patientPhone ?? undefined,
              }}
              onClose={() => setPrescriptionAppt(null)}
              onSuccess={() => {
                setPrescriptionAppt(null);
                void resource.refresh();
              }}
            />
          )}

          <style>{`
            .appointments-all-view {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .appointments-all-view .ui-page {
              gap: 8px;
              padding: 0 4px;
            }
            .appointments-all-view .ui-header {
              padding: 4px 6px;
            }
            .appointments-all-view .ui-table-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
              background: #ffffff;
            }
            .appointments-all-view .ui-table th {
              height: 38px;
              padding: 0 12px;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
              color: #475569;
              font-size: 11px;
              font-weight: 650;
              letter-spacing: 0.05em;
            }
            .appointments-all-view .ui-table td {
              height: 52px;
              padding: 6px 12px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
              font-size: 12.5px;
            }
            .appointments-all-view .ui-table tbody tr:hover td {
              background: #fafafa;
            }
            .appointments-all-view .ui-table tbody tr.is-selected td {
              background: #f5f3ff;
            }
            .appointments-all-view .ui-table tbody tr.is-open td {
              background: #f5f3ff;
            }
            .appointments-all-view .ui-table td.ui-col-actions {
              background: #ffffff;
              box-shadow: -8px 0 8px -8px rgba(16, 24, 40, 0.06);
            }
            .appointments-all-view .ui-table tbody tr:hover td.ui-col-actions {
              background: #fafafa;
            }
            .appointments-all-view .ui-table tbody tr.is-selected td.ui-col-actions,
            .appointments-all-view .ui-table tbody tr.is-open td.ui-col-actions {
              background: #f5f3ff;
            }
            .appointments-all-view .appt-patient-name:hover {
              color: #7c3aed !important;
            }
            .appointments-all-view .appt-action-btn {
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
            .appointments-all-view .appt-action-menu:hover,
            .appointments-all-view .appt-action-menu:focus-visible {
              background: #f5f3ff !important;
              border: none !important;
              color: #7c3aed;
            }
            .appointments-all-view .ui-checkbox {
              width: 16px;
              height: 16px;
              cursor: pointer;
              accent-color: #7c3aed;
              border-radius: 4px;
              transition: transform 0.12s ease, filter 0.12s ease;
              vertical-align: middle;
            }
            .appointments-all-view .ui-checkbox:hover {
              transform: scale(1.08);
              filter: brightness(0.95);
            }
            .appointments-all-view .ui-checkbox:focus-visible {
              outline: 2px solid #7c3aed;
              outline-offset: 2px;
            }
            .appointments-all-view .ui-bulkbar {
              background: #0f172a;
              border: 1px solid #334155;
              border-radius: 9999px;
              padding: 6px 14px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
            }
            .appointments-all-view .ui-bulkbar .ui-btn {
              border-radius: 9999px;
            }
            .appointments-all-view .ui-btn-primary.ui-btn-pill {
              background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%) !important;
              box-shadow: 0 2px 6px rgba(124, 58, 237, 0.28) !important;
            }
            .appointments-all-view .ui-btn-primary.ui-btn-pill:hover {
              background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%) !important;
              box-shadow: 0 4px 10px rgba(124, 58, 237, 0.35) !important;
            }
            .appointments-all-view .ui-hub-btn {
              color: #6d28d9;
            }
            .appointments-all-view .ui-hub-icon {
              color: #7c3aed;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
