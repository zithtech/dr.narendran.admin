import {
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Clock,
  Eye,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import AppointmentDrawer from '../components/AppointmentDrawer';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet } from '../components/ui/facets';
import { Badge } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { titleCase } from '../lib/format';
import type { Appointment } from '../types/appointment';
import DoctorTodayAppointments from './DoctorTodayAppointments';

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
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);

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

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'scheduled':
      case 'confirmed':
        return 'blue';
      case 'rescheduled':
        return 'purple';
      case 'cancelled':
        return 'red';
      case 'no_show':
        return 'gray';
      default:
        return 'neutral';
    }
  };

  const openDetails = (appt: Appointment) => {
    setViewingAppointment(appt);
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
      sort: (a) => a.patientName.toLowerCase(),
      cell: (a) => (
        <PrimaryCell
          name={a.patientName}
          sub={a.patientPhone || a.patientEmail || <span className="ui-muted">No contact info</span>}
          onOpen={() => openDetails(a)}
        />
      ),
    },
    {
      id: 'doctor',
      header: 'Doctor',
      sort: (a) => a.doctorName.toLowerCase(),
      cell: (a) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>{a.doctorName}</div>
          <div style={{ fontSize: 12, color: 'var(--ui-text-muted, #64748b)' }}>
            {a.doctorSpecialty ? <Badge tone="blue">{a.doctorSpecialty}</Badge> : 'General Practitioner'}
          </div>
        </div>
      ),
    },
    {
      id: 'schedule',
      header: 'Date & Time',
      sort: (a) => new Date(a.scheduledStart).getTime(),
      cell: (a) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>{a.date}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {a.tokenNumber}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ui-text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            <span>{a.time}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (a) => a.status,
      cell: (a) => (
        <Badge tone={getStatusTone(a.status) as any}>
          <span style={{ textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</span>
        </Badge>
      ),
    },
    {
      id: 'purpose',
      header: 'Purpose / Reason',
      sort: (a) => a.purpose.toLowerCase(),
      cell: (a) => (
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontWeight: 500, color: 'var(--ui-text, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.purpose}
          </div>
          {a.patientNote && (
            <div style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.patientNote}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Navigation Tab Switcher */}
      <div
        style={{
          background: 'var(--ui-surface, #ffffff)',
          borderBottom: '1px solid var(--ui-border, #e2e8f0)',
          padding: '12px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              background: currentTab === 'all' ? '#e0f2fe' : 'transparent',
              color: currentTab === 'all' ? '#0369a1' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarDays size={16} />
            <span>All Appointments</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('today')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              background: currentTab === 'today' ? '#e0f2fe' : 'transparent',
              color: currentTab === 'today' ? '#0369a1' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Stethoscope size={16} />
            <span>Doctors Today Appointments</span>
          </button>
        </div>
      </div>

      {currentTab === 'today' ? (
        <DoctorTodayAppointments />
      ) : (
        <>
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
            onEdit={(a) => openDetails(a)}
            nameOf={(a) => `${a.patientName} (${a.tokenNumber})`}
            onRowClick={(a) => openDetails(a)}
            activeId={viewingAppointment?.id ?? null}
            rowActions={(a) => {
              const isActive =
                a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'rescheduled';

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    className="ui-icon-btn"
                    title="View details"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetails(a);
                    }}
                  >
                    <Eye size={15} />
                  </button>
                  {isActive && (
                    <>
                      <button
                        type="button"
                        className="ui-icon-btn"
                        title="Reschedule appointment"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReschedule(a);
                        }}
                      >
                        <CalendarClock size={15} />
                      </button>
                      <button
                        type="button"
                        className="ui-icon-btn ui-icon-btn-danger"
                        title="Cancel appointment"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancel(a);
                        }}
                      >
                        <CalendarX2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              );
            }}
          />

          {/* Schedule New Appointment Modal */}
          <ScheduleAppointmentModal
            isOpen={isScheduleOpen}
            onClose={() => setIsScheduleOpen(false)}
            onSuccess={() => void resource.refresh()}
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
            onReschedule={(appt) => {
              openReschedule(appt);
            }}
            onCancel={(appt) => {
              openCancel(appt);
            }}
          />
        </>
      )}
    </>
  );
}
