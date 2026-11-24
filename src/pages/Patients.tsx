import {
  Eye,
  HeartPulse,
  History,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
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
        renderMobileCard={(p, helpers) => {
          const initials = p.name
            ? p.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'PT';
          const ageDisplay = formatPatientAge(p.date_of_birth);
          const isActive = p.status === 'ACTIVE';

          return (
            <div
              key={p.id}
              data-testid={`patient-card-${p.id}`}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-3 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => openDetails(p)}
            >
              {/* Header: Avatar, Name, MRN, Status */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs grid place-items-center shrink-0 overflow-hidden border border-slate-200">
                    {p.profile_image_url ? (
                      <img
                        src={p.profile_image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {formatPatientDisplayName(p.name, p.patient_id)}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10.5px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {p.patient_id || `#${p.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      {p.blood_group && (
                        <Badge tone="red">{p.blood_group}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <StatusDot active={isActive} />
              </div>

              {/* Demographics & Hospital */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Age & Gender</span>
                  <span className="font-medium text-slate-800">
                    {ageDisplay || 'Age N/A'} {p.gender ? `• ${titleCase(p.gender)}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hospital</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {p.hospital_name || 'Hospital Profile'}
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                {p.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span>{p.phone}</span>
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                )}
              </div>

              {/* Footer: Timeline Link & Actions */}
              <div
                className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-slate-400">
                  {p.created_at ? `Registered ${formatDate(p.created_at)}` : ''}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200/60 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patient-timelines/${p.id}`)}
                    title="View Patient Timeline"
                    aria-label={`Timeline for ${p.name}`}
                  >
                    <History size={12} />
                    <span>Timeline</span>
                  </button>

                  {helpers.isUpdateAllowed && (
                    <button
                      type="button"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      onClick={() => openEditor(p)}
                      title="Edit patient"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil size={12} />
                    </button>
                  )}

                  {helpers.isDeleteAllowed && helpers.onDelete && (
                    <button
                      type="button"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      onClick={helpers.onDelete}
                      title="Delete patient"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                    onClick={() => openDetails(p)}
                    title="View details"
                    aria-label={`View ${p.name}`}
                  >
                    <Eye size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
