import { App } from 'antd';
import { CalendarClock, Stethoscope } from 'lucide-react';
import { useState } from 'react';

import DoctorAvailabilityModal from '../components/DoctorAvailabilityModal';
import DoctorDrawer from '../components/DoctorDrawer';
import DoctorModal, { type Doctor } from '../components/DoctorModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { timeAgo } from '../lib/format';
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
  const resource = useResource<Doctor>('doctors', 'doctors');
  const { message } = App.useApp();

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityDoctor, setAvailabilityDoctor] = useState<Doctor | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  // Looked up from the live list so the drawer reflects edits and closes on delete.
  const viewingDoctor = viewingId ? (resource.items.find((d) => d.id === viewingId) ?? null) : null;
  const openDetails = (doctor: Doctor) => setViewingId(doctor.id);

  const openEditor = (doctor: Doctor | null) => {
    setEditingDoctor(doctor);
    setIsDoctorModalOpen(true);
  };

  const openAvailability = (doctor: Doctor) => {
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
            [d.qualification, d.email || d.phone].filter(Boolean).join(' · ') || (
              <span className="ui-muted">No contact info</span>
            )
          }
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
        rowActions={(d) => (
          <button
            type="button"
            className="ui-btn ui-btn-sm ui-btn-soft"
            onClick={() => openAvailability(d)}
          >
            <CalendarClock size={13} /> Schedule
          </button>
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

      <DoctorDrawer
        doctor={viewingDoctor}
        onClose={() => setViewingId(null)}
        onEdit={openEditor}
        onSchedule={openAvailability}
        scheduleVersion={scheduleVersion}
      />
    </>
  );
}
