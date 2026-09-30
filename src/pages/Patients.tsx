import { App } from 'antd';
import { HeartPulse } from 'lucide-react';
import { useState } from 'react';

import PatientDrawer from '../components/PatientDrawer';
import PatientModal, { type Patient } from '../components/PatientModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { ageFrom, formatDate, timeAgo, titleCase } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Patient>[] = [
  {
    id: 'hospital',
    label: 'Hospitals',
    allLabel: 'All hospitals',
    value: (p) => p.hospital_name || 'Unknown hospital',
  },
  {
    id: 'branch',
    label: 'Branches',
    allLabel: 'All branches',
    value: (p) => p.branch_name || 'No specific branch',
    inPanel: false,
  },
  {
    id: 'gender',
    label: 'Gender',
    allLabel: 'All genders',
    value: (p) => p.gender || 'UNSPECIFIED',
    optionLabel: (v) => (v === 'UNSPECIFIED' ? 'Not specified' : titleCase(v)),
    order: ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'],
  },
  {
    id: 'blood',
    label: 'Blood group',
    allLabel: 'All blood groups',
    value: (p) => p.blood_group || null,
    order: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  statusFacet<Patient>(),
  addedFacet<Patient>(),
];

export default function Patients() {
  const resource = useResource<Patient>('patients', 'patients');
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Looked up from the live list so the drawer reflects edits and closes on delete.
  const viewingPatient = viewingId
    ? (resource.items.find((p) => p.id === viewingId) ?? null)
    : null;
  const openDetails = (patient: Patient) => setViewingId(patient.id);

  const openEditor = (patient: Patient | null) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const columns: Column<Patient>[] = [
    {
      id: 'name',
      header: 'Patient',
      sort: (p) => p.name.toLowerCase(),
      cell: (p) => (
        <PrimaryCell
          name={p.name}
          sub={p.phone || p.email || <span className="ui-muted">No contact info</span>}
          avatarSrc={p.profile_image_url}
          onOpen={() => openDetails(p)}
        />
      ),
    },
    {
      id: 'hospital',
      header: 'Hospital & branch',
      sort: (p) => (p.hospital_name ?? '').toLowerCase(),
      cell: (p) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
            {p.hospital_name || 'Unknown'}
          </div>
          <div className="ui-cell-sub">{p.branch_name || 'No specific branch'}</div>
        </div>
      ),
    },
    {
      id: 'profile',
      header: 'Age & gender',
      sort: (p) => ageFrom(p.date_of_birth) ?? -1,
      cell: (p) => {
        const age = ageFrom(p.date_of_birth);
        return (
          <div>
            <div style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
              {age !== null ? `${age} yrs` : <span className="ui-muted">—</span>}
              {p.gender && (
                <span style={{ color: 'var(--ui-muted)', fontWeight: 400 }}>
                  {' '}
                  · {titleCase(p.gender)}
                </span>
              )}
            </div>
            <div className="ui-cell-sub">
              {p.date_of_birth ? `Born ${formatDate(p.date_of_birth)}` : 'DOB not set'}
            </div>
          </div>
        );
      },
    },
    {
      id: 'blood',
      header: 'Blood',
      sort: (p) => p.blood_group ?? '',
      cell: (p) =>
        p.blood_group ? (
          <Badge tone="red">{p.blood_group}</Badge>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (p) => p.status,
      cell: (p) => <StatusDot active={p.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (p) => new Date(p.updated_at || p.created_at).getTime(),
      cell: (p) =>
        p.updated_at && p.updated_at !== p.created_at ? (
          <ActivityCell label="Record updated" when={timeAgo(p.updated_at)} />
        ) : (
          <ActivityCell label="Patient registered" when={timeAgo(p.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        title="Patients"
        subtitle="Patient records and hospital assignments."
        icon={HeartPulse}
        noun="patient"
        nounPlural="patients"
        resource={resource}
        searchPlaceholder="Search name, phone, email…"
        searchFields={(p) => [p.name, p.email, p.phone, p.hospital_name, p.branch_name]}
        facets={FACETS}
        dateOf={(p) => p.created_at}
        dateLabel="Registered"
        columns={columns}
        createLabel="New patient"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(p) => api.delete(`patients/${p.id}`)}
        nameOf={(p) => p.name}
        onRowClick={openDetails}
        activeId={viewingId}
      />

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patient={editingPatient}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingPatient ? 'Patient updated' : 'Patient created');
          void resource.refresh();
        }}
      />

      <PatientDrawer
        patient={viewingPatient}
        onClose={() => setViewingId(null)}
        onEdit={openEditor}
      />
    </>
  );
}
