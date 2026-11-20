import { HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router';

import { type Patient } from '../components/PatientModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, StatusDot } from '../components/ui/primitives';
import { useResource } from '../hooks/useResource';
import { ageFrom, formatDate, formatPatientAge, formatPatientDisplayName, timeAgo, titleCase } from '../lib/format';
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
  const navigate = useNavigate();
  const resource = useResource<Patient>('patients', 'patients');
  const openDetails = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const openEditor = (patient: Patient | null) => {
    if (patient) {
      navigate(`/patients/${patient.id}/edit`);
    } else {
      navigate('/patients/new');
    }
  };

  const columns: Column<Patient>[] = [
    {
      id: 'name',
      header: 'Patient',
      sort: (p) => p.name.toLowerCase(),
      cell: (p) => (
        <PrimaryCell
          name={formatPatientDisplayName(p.name, p.patient_id)}
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
        const ageDisplay = formatPatientAge(p.date_of_birth);
        return (
          <div>
            <div style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
              {ageDisplay}
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
        moduleSlug="PATIENTS"
        title="Patients"
        subtitle="Patient records and hospital assignments."
        icon={HeartPulse}
        noun="patient"
        nounPlural="patients"
        resource={resource}
        searchPlaceholder="Search name, phone, email…"
        searchFields={(p) => [
          p.name,
          p.patient_id,
          p.email,
          p.phone,
          p.hospital_name,
          p.branch_name,
          p.address_line_1,
          p.city,
          p.state,
          p.pincode,
          p.address,
        ]}
        facets={FACETS}
        dateOf={(p) => p.created_at}
        dateLabel="Registered"
        columns={columns}
        createLabel="New patient"
        onCreate={() => openEditor(null)}
        onEdit={(p) => openEditor(p)}
        onDelete={(p) => api.delete(`patients/${p.id}`)}
        nameOf={(p) => formatPatientDisplayName(p.name, p.patient_id)}
        onRowClick={openDetails}
        minTableWidth={720}
      />
    </>
  );
}
