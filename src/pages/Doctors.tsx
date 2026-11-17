import { App } from 'antd';
import { CalendarClock, Clock, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import DoctorAvailabilityModal from '../components/DoctorAvailabilityModal';
import DoctorDrawer from '../components/DoctorDrawer';
import DoctorModal, { type Doctor } from '../components/DoctorModal';
import { DoctorQualificationTable } from '../components/DoctorQualificationBadge';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { Drawer } from '../components/ui/Drawer';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { isDoctorRole, usePermission } from '../context/PermissionContext';
import { timeAgo } from '../lib/format';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import api from '../utils/api';

const FACETS: Facet<Doctor>[] = [
  {
    id: 'specialization',
    label: 'Specializations',
    allLabel: 'All specializations',
    value: (d) => d.specialization?.trim() || 'General',
  },
  {
    id: 'hospital',
    label: 'Hospitals',
    allLabel: 'All hospitals',
    value: (d) => d.hospital_name || 'Unknown hospital',
  },
  {
    id: 'branch',
    label: 'Branches',
    allLabel: 'All branches',
    value: (d) => d.branch_name || 'No specific branch',
    inPanel: false,
  },
  {
    id: 'account',
    label: 'App login',
    allLabel: 'Any login state',
    value: (d) => (d.user_account_id ? 'linked' : 'unlinked'),
    optionLabel: (v) => (v === 'linked' ? 'Account linked' : 'No account'),
    order: ['linked', 'unlinked'],
  },
  statusFacet<Doctor>(),
  addedFacet<Doctor>(),
];

export default function Doctors() {
  const navigate = useNavigate();
  const resource = useResource<Doctor>('doctors', 'doctors');
  const { message } = App.useApp();
  const { canView, canCreate, canUpdate, roleName, hasRole } = usePermission();
  const isDoctorUser = isDoctorRole(roleName) || hasRole('DOCTOR', 'Doctor');

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityDoctor, setAvailabilityDoctor] = useState<Doctor | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  // Looked up from the live list so the drawer reflects edits and closes on delete.
  const viewingDoctor = viewingId
    ? (resource.items.find((d) => String(d.id) === String(viewingId)) ?? selectedDoctor)
    : null;
  const openDetails = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setViewingId(doctor.id);
  };

  const openEditor = (doctor: Doctor | null) => {
    if (doctor ? !canUpdate('DOCTORS') : !canCreate('DOCTORS')) return;
    setEditingDoctor(doctor);
    setIsDoctorModalOpen(true);
  };

  const openAvailability = (doctor: Doctor) => {
    if (!canUpdate('AVAILABILITY') && !canView('AVAILABILITY') && !isDoctorUser) {
      void message.warning('You do not have permission to view or manage doctor schedules.');
      return;
    }
    setAvailabilityDoctor(doctor);
    setIsAvailabilityModalOpen(true);
  };

  const columns: Column<Doctor>[] = [
    {
      id: 'name',
      header: 'Doctor',
      sort: (d) => d.name.toLowerCase(),
      cell: (d) => (
        <PrimaryCell
          name={d.name}
          sub={
            <DoctorQualificationTable
              qualification={d.qualification}
              maxVisible={2}
              contact={d.email || d.phone}
            />
          }
          avatarSrc={d.profile_image_url || (d as any).profileImageUrl}
          onOpen={() => openDetails(d)}
        />
      ),
    },
    {
      id: 'specialization',
      header: 'Specialization',
      sort: (d) => (d.specialization ?? '').toLowerCase(),
      cell: (d) => <Badge tone="green">{d.specialization || 'General'}</Badge>,
    },
    {
      id: 'hospital',
      header: 'Hospital & branch',
      sort: (d) => (d.hospital_name ?? '').toLowerCase(),
      cell: (d) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
            {d.hospital_name || 'Unknown'}
          </div>
          <div className="ui-cell-sub">{d.branch_name || 'No specific branch'}</div>
        </div>
      ),
    },
    {
      id: 'experience',
      header: 'Experience',
      sort: (d) => d.years_of_experience ?? -1,
      cell: (d) =>
        d.years_of_experience !== undefined && d.years_of_experience !== null ? (
          `${d.years_of_experience} ${d.years_of_experience === 1 ? 'year' : 'years'}`
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (d) => d.status,
      cell: (d) => <StatusDot active={d.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (d) => new Date(d.updated_at || d.created_at).getTime(),
      cell: (d) =>
        d.updated_at && d.updated_at !== d.created_at ? (
          <ActivityCell label="Profile updated" when={timeAgo(d.updated_at)} />
        ) : (
          <ActivityCell label="Doctor added" when={timeAgo(d.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="DOCTORS"
        title="Doctors"
        subtitle="Doctors, specializations and weekly schedules."
        icon={Stethoscope}
        noun="doctor"
        nounPlural="doctors"
        resource={resource}
        searchPlaceholder="Search name, specialization, hospital…"
        searchFields={(d) => [
          d.name,
          d.specialization,
          d.hospital_name,
          d.branch_name,
          d.email,
          d.phone,
          d.medical_registration_number,
          d.podcast_url,
          d.address_line_1,
          d.city,
          d.state,
          d.pincode,
          d.clinic_address,
        ]}
        facets={FACETS}
        dateOf={(d) => d.created_at}
        columns={columns}
        createLabel="New doctor"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(d) => api.delete(`doctors/${d.id}`)}
        nameOf={(d) => d.name}
        onRowClick={openDetails}
        activeId={viewingId}
        extraActions={
          canView('AVAILABILITY') ? (
            <button
              type="button"
              className="ui-btn ui-btn-pill ui-btn-soft"
              onClick={() => void navigate('/availability')}
              title="Manage Doctor Availability & Appointment Slots"
            >
              <CalendarClock size={15} /> Availability &amp; Slots
            </button>
          ) : null
        }
        keepDefaultActions
        rowActions={(d) => (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openAvailability(d);
              }}
              title="Schedule"
              aria-label={`Schedule ${d.name}`}
            >
              <CalendarClock size={13} />
            </button>
            {canView('AVAILABILITY') && (
              <button
                type="button"
                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigate(`/availability?doctorId=${d.id}`);
                }}
                title="Availability & Slots"
                aria-label={`Slots for ${d.name}`}
              >
                <Clock size={13} />
              </button>
            )}
          </div>
        )}
      />

      <DoctorModal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        doctor={editingDoctor}
        onSave={() => {
          setIsDoctorModalOpen(false);
          void message.success(editingDoctor ? 'Doctor updated' : 'Doctor created');
          void resource.refresh();
        }}
      />

      <DoctorAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => {
          setIsAvailabilityModalOpen(false);
          setScheduleVersion((v) => v + 1);
        }}
        doctor={availabilityDoctor}
      />

      <ErrorBoundary
        fallback={(error, reset) => (
          <Drawer
            open={Boolean(viewingDoctor)}
            onClose={() => {
              setViewingId(null);
              setSelectedDoctor(null);
            }}
            label="Doctor Profile Error"
          >
            <div style={{ padding: 24, textAlign: 'center' }}>
              <h3 style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>
                Failed to render doctor profile
              </h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                {error?.message || 'An unexpected error occurred while loading this doctor profile.'}
              </p>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={reset}
              >
                Try Again
              </button>
            </div>
          </Drawer>
        )}
      >
        <DoctorDrawer
          doctor={viewingDoctor}
          onClose={() => {
            setViewingId(null);
            setSelectedDoctor(null);
          }}
          onEdit={openEditor}
          onSchedule={openAvailability}
          scheduleVersion={scheduleVersion}
        />
      </ErrorBoundary>
    </>
  );
}
