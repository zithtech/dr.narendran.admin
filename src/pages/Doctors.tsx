import { App } from 'antd';
import {
  Building2,
  CalendarClock,
  Clock,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Stethoscope,
  Trash2,
} from 'lucide-react';
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
        minTableWidth={800}
        renderMobileCard={(d, helpers) => {
          const initials = d.name
            ? d.name
                .replace(/^Dr\.\s*/i, '')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'DR';
          const isActive = d.status === 'ACTIVE';

          return (
            <div
              key={d.id}
              data-testid={`doctor-card-${d.id}`}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-3 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => openDetails(d)}
            >
              {/* Header: Avatar, Name, Specialization & Status */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs grid place-items-center shrink-0 overflow-hidden border border-slate-200">
                    {d.profile_image_url ? (
                      <img
                        src={d.profile_image_url}
                        alt={d.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {d.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                        {d.specialization || 'General Specialist'}
                      </span>
                      {d.years_of_experience ? (
                        <span className="text-[11px] text-slate-500">
                          • {d.years_of_experience} yrs exp
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <StatusDot active={isActive} />
              </div>

              {/* Hospital & Branch */}
              {(d.hospital_name || d.branch_name) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                  {d.hospital_name && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{d.hospital_name}</span>
                    </div>
                  )}
                  {d.branch_name && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{d.branch_name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Details */}
              <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                {d.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span>{d.phone}</span>
                  </div>
                )}
                {d.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{d.email}</span>
                  </div>
                )}
                {d.medical_registration_number && (
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    Reg: {d.medical_registration_number}
                  </div>
                )}
              </div>

              {/* Footer: Activity & Row Actions */}
              <div
                className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] text-slate-400">
                  {d.updated_at && d.updated_at !== d.created_at
                    ? `Updated ${timeAgo(d.updated_at)}`
                    : `Added ${timeAgo(d.created_at)}`}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                    onClick={() => openAvailability(d)}
                    title="Weekly Schedule"
                    aria-label={`Weekly Schedule for ${d.name}`}
                  >
                    <CalendarClock size={13} />
                  </button>
                  {canView('AVAILABILITY') && (
                    <button
                      type="button"
                      className="p-1.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                      onClick={() => void navigate(`/availability?doctorId=${d.id}`)}
                      title="Availability & Slots"
                      aria-label={`Slots for ${d.name}`}
                    >
                      <Clock size={13} />
                    </button>
                  )}
                  {helpers.isUpdateAllowed && (
                    <button
                      type="button"
                      className="p-1.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                      onClick={() => openEditor(d)}
                      title="Edit doctor"
                      aria-label={`Edit ${d.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {helpers.isDeleteAllowed && helpers.onDelete && (
                    <button
                      type="button"
                      className="p-1.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      onClick={helpers.onDelete}
                      title="Delete doctor"
                      aria-label={`Delete ${d.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    onClick={() => openDetails(d)}
                    title="View details"
                    aria-label={`View ${d.name}`}
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
        extraActions={
          canView('AVAILABILITY') ? (
            <button
              type="button"
              className="ui-btn ui-btn-pill ui-btn-soft text-xs"
              onClick={() => void navigate('/availability')}
              title="Manage Doctor Availability & Appointment Slots"
            >
              <CalendarClock size={15} className="shrink-0" />
              <span className="hidden sm:inline">Availability &amp; Slots</span>
              <span className="sm:hidden">Availability</span>
            </button>
          ) : null
        }
        keepDefaultActions
        rowActions={(d) => (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className="p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[24px] sm:min-h-[24px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
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
                className="p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[24px] sm:min-h-[24px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
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
