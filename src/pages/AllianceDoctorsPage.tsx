import { App } from 'antd';
import { Eye, Mail, Phone, Settings, UserCheck } from 'lucide-react';
import { useState } from 'react';

import AllianceDoctorDrawer from '../components/AllianceDoctorDrawer';
import AllianceDoctorModal from '../components/AllianceDoctorModal';
import AllianceSettingsDrawer from '../components/AllianceSettingsDrawer';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { Badge, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import type { AllianceDoctor } from '../types/allianceDoctor';
import api from '../utils/api';

const FACETS: Facet<AllianceDoctor>[] = [
  {
    id: 'category',
    label: 'Categories',
    allLabel: 'All categories',
    value: (d) => d.category?.trim() || null,
  },
  {
    id: 'specialization',
    label: 'Specializations',
    allLabel: 'All specializations',
    value: (d) => d.specialization?.trim() || null,
  },
  statusFacet<AllianceDoctor>(),
  addedFacet<AllianceDoctor>(),
];

export default function AllianceDoctorsPage() {
  const resource = useResource<AllianceDoctor>('alliances/doctors', 'alliance doctors');
  const { message, modal } = App.useApp();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const isCreatable =
    canCreate('ALLIANCE_DOCTORS') || canCreate('DOCTORS') || canCreate('HOSPITALS');
  const isUpdatable =
    canUpdate('ALLIANCE_DOCTORS') || canUpdate('DOCTORS') || canUpdate('HOSPITALS');
  const isDeletable =
    canDelete('ALLIANCE_DOCTORS') || canDelete('DOCTORS') || canDelete('HOSPITALS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<AllianceDoctor | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<AllianceDoctor | null>(null);

  // Live lookup from resource.items so drawer reflects updates or deletes
  const viewingDoctor = viewingId
    ? resource.items.find((d) => String(d.id) === String(viewingId)) ?? selectedDoctor
    : null;

  const openDetails = (d: AllianceDoctor) => {
    setSelectedDoctor(d);
    setViewingId(d.id);
  };

  const openEditor = (d: AllianceDoctor | null) => {
    if (d ? !isUpdatable : !isCreatable) return;
    setEditingDoctor(d);
    setIsModalOpen(true);
  };

  const handleDelete = (d: AllianceDoctor): Promise<void> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: `Delete Alliance Doctor ${d.name}?`,
        content: `Are you sure you want to remove Dr. ${d.name} from alliances? This action cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          try {
            await api.delete(`alliances/doctors/${d.id}`);
            void message.success('Alliance doctor deleted successfully');
            if (viewingId === d.id) {
              setViewingId(null);
              setSelectedDoctor(null);
            }
            void resource.refresh();
            resolve();
          } catch (err: any) {
            void message.error(
              err.response?.data?.error || 'Failed to delete alliance doctor',
            );
            resolve();
          }
        },
        onCancel: () => resolve(),
      });
    });
  };

  const columns: Column<AllianceDoctor>[] = [
    {
      id: 'name',
      header: 'Doctor Name',
      sort: (d) => d.name.toLowerCase(),
      cell: (d) => (
        <PrimaryCell
          name={d.name}
          sub={d.qualification || undefined}
          onOpen={() => openDetails(d)}
        />
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sort: (d) => (d.category ?? '').toLowerCase(),
      cell: (d) =>
        d.category ? (
          <Badge tone="neutral">{d.category}</Badge>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'specialization',
      header: 'Specialization',
      sort: (d) => (d.specialization ?? '').toLowerCase(),
      cell: (d) =>
        d.specialization ? (
          <Badge tone="green">{d.specialization}</Badge>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'qualification',
      header: 'Qualification',
      sort: (d) => (d.qualification ?? '').toLowerCase(),
      cell: (d) =>
        d.qualification ? (
          <span style={{ fontWeight: 500, color: 'var(--ui-text)' }}>{d.qualification}</span>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'hospital_clinic_name',
      header: 'Hospital / Clinic Name',
      sort: (d) => (d.hospital_clinic_name ?? '').toLowerCase(),
      cell: (d) =>
        d.hospital_clinic_name ? (
          <span style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
            {d.hospital_clinic_name}
          </span>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'contact_number',
      header: 'Contact Number',
      sort: (d) => d.mobile_number ?? '',
      cell: (d) =>
        d.mobile_number ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-mono">{d.mobile_number}</span>
          </div>
        ) : (
          <span className="ui-muted">—</span>
        ),
    },
    {
      id: 'email',
      header: 'Email',
      sort: (d) => (d.email ?? '').toLowerCase(),
      cell: (d) =>
        d.email ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[180px]">{d.email}</span>
          </div>
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
  ];

  return (
    <>
      <DataView
        moduleSlug="ALLIANCE_DOCTORS"
        fallbackSlugs={['DOCTORS', 'HOSPITALS']}
        title="Alliances – Doctor Management"
        subtitle="Manage partner and alliance doctors, specialist referrals & affiliations."
        icon={UserCheck}
        noun="alliance doctor"
        nounPlural="alliance doctors"
        resource={resource}
        searchPlaceholder="Search doctor name, category, specialization, hospital…"
        searchFields={(d) => [
          d.name,
          d.category,
          d.specialization,
          d.qualification,
          d.hospital_clinic_name,
          d.mobile_number,
          d.alternate_mobile_number,
          d.email,
          d.city,
          d.district,
          d.state,
          d.registration_number,
        ]}
        facets={FACETS}
        dateOf={(d) => d.created_at}
        columns={columns}
        createLabel="Add Alliance Doctor"
        onCreate={() => openEditor(null)}
        afterCreateAction={
          <button
            type="button"
            className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 shadow-2xs transition-colors cursor-pointer"
            onClick={() => setIsSettingsOpen(true)}
            title="Alliances Settings (Categories & Specializations)"
            aria-label="Settings"
          >
            <Settings size={14} />
          </button>
        }
        onEdit={openEditor}
        onDelete={handleDelete}
        nameOf={(d) => d.name}
        onRowClick={openDetails}
        activeId={viewingId}
        minTableWidth={980}
        keepDefaultActions={true}
        rowActions={(d) => (
          <button
            type="button"
            className="p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[24px] sm:min-h-[24px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              openDetails(d);
            }}
            title="View Doctor Details"
            aria-label={`View details for ${d.name}`}
          >
            <Eye size={13} />
          </button>
        )}
      />

      <AllianceDoctorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        doctor={editingDoctor}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(
            editingDoctor ? 'Alliance doctor updated successfully' : 'Alliance doctor created successfully',
          );
          void resource.refresh();
        }}
      />

      <AllianceDoctorDrawer
        doctor={viewingDoctor}
        onClose={() => {
          setViewingId(null);
          setSelectedDoctor(null);
        }}
        onEdit={openEditor}
        onDelete={handleDelete}
        isEditable={isUpdatable}
        isDeletable={isDeletable}
      />

      <AllianceSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={() => {
          void resource.refresh();
        }}
      />
    </>
  );
}
