import { App } from 'antd';
import { Building2, Clock, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';

import HospitalModal, { type Hospital } from '../components/HospitalModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, cx, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Hospital>[] = [
  statusFacet<Hospital>(),
  {
    id: 'contact',
    label: 'Contact details',
    allLabel: 'Any contact info',
    value: (h) => (h.email && h.phone ? 'complete' : h.email || h.phone ? 'partial' : 'missing'),
    optionLabel: (v) =>
      ({ complete: 'Email & phone', partial: 'Email or phone', missing: 'No contact info' })[v] ??
      v,
    order: ['complete', 'partial', 'missing'],
  },
  addedFacet<Hospital>(),
];

export default function Dashboard() {
  const resource = useResource<Hospital>('hospitals', 'hospitals');
  const { message } = App.useApp();
  const { canCreate, canUpdate } = usePermission();
  const isCreatable = canCreate('HOSPITALS');
  const isUpdatable = canUpdate('HOSPITALS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  const openEditor = (hospital: Hospital | null) => {
    if (hospital ? !isUpdatable : !isCreatable) return;
    setEditingHospital(hospital);
    setIsModalOpen(true);
  };

  const columns: Column<Hospital>[] = [
    {
      id: 'name',
      header: 'Hospital',
      sort: (h) => h.name.toLowerCase(),
      cell: (h) => (
        <PrimaryCell
          name={h.name}
          sub={h.email || h.phone || <span className="ui-muted">No contact info</span>}
          {...(isUpdatable ? { onOpen: () => openEditor(h) } : {})}
        />
      ),
    },
    {
      id: 'code',
      header: 'Code',
      sort: (h) => h.hospital_code,
      cell: (h) => (
        <Badge tone="green" mono>
          {h.hospital_code}
        </Badge>
      ),
    },
    {
      id: 'address',
      header: 'Address',
      cell: (h) => {
        const fullAddr =
          [h.address_line_1, h.address_line_2, h.city, h.state, h.pincode]
            .filter(Boolean)
            .join(', ') || h.address;
        return fullAddr ? (
          <span
            style={{
              display: 'block',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={fullAddr}
          >
            {fullAddr}
          </span>
        ) : (
          <span className="ui-muted">—</span>
        );
      },
    },
    {
      id: 'tenure',
      header: 'Member for',
      sort: (h) => -new Date(h.created_at).getTime(),
      cell: (h) => tenure(h.created_at, 'New hospital'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (h) => h.status,
      cell: (h) => <StatusDot active={h.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (h) => new Date(h.updated_at ?? h.created_at).getTime(),
      cell: (h) =>
        h.updated_at && h.updated_at !== h.created_at ? (
          <ActivityCell label="Profile updated" when={timeAgo(h.updated_at)} />
        ) : (
          <ActivityCell label="Hospital added" when={timeAgo(h.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="HOSPITALS"
        title="Hospitals"
        subtitle="Every hospital registered on the platform."
        icon={Building2}
        noun="hospital"
        nounPlural="hospitals"
        resource={resource}
        searchPlaceholder="Search name, code, email, phone…"
        searchFields={(h) => [
          h.name,
          h.hospital_code,
          h.email,
          h.phone,
          h.address_line_1,
          h.city,
          h.state,
          h.pincode,
          h.address,
        ]}
        facets={FACETS}
        dateOf={(h) => h.created_at}
        columns={columns}
        createLabel="New hospital"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(h) => api.delete(`hospitals/${h.id}`)}
        nameOf={(h) => h.name}
        deleteWarning="Branches, doctors and patients linked to it may be affected."
        minTableWidth={720}
        renderMobileCard={(h, { isSel, toggleRow, onEdit, onDelete, isUpdateAllowed, isDeleteAllowed, showCheckCol }) => {
          const fullAddr =
            [h.address_line_1, h.address_line_2, h.city, h.state, h.pincode]
              .filter(Boolean)
              .join(', ') || h.address;
          return (
            <div
              key={h.id}
              className={cx(
                'bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all text-xs',
                isSel ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300' : 'hover:border-slate-300',
              )}
              data-testid={`hospital-card-${h.id}`}
            >
              {/* Card Header: Checkbox + Icon + Name + Code + Status & Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
                      checked={isSel}
                      onChange={toggleRow}
                      aria-label={`Select ${h.name}`}
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={isUpdatable ? () => openEditor(h) : undefined}
                        className={cx(
                          'font-semibold text-slate-900 text-sm tracking-tight text-left leading-snug',
                          isUpdatable ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default',
                        )}
                      >
                        {h.name}
                      </button>
                      <Badge tone="green" mono>
                        {h.hospital_code}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusDot active={h.status === 'ACTIVE'} />
                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                      onClick={onEdit}
                      aria-label={`Edit ${h.name}`}
                      title="Edit Hospital"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isDeleteAllowed && onDelete && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      onClick={onDelete}
                      aria-label={`Delete ${h.name}`}
                      title="Delete Hospital"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-slate-600 border-t border-slate-100">
                {h.phone && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <a
                      href={`tel:${h.phone}`}
                      className="text-slate-700 hover:text-blue-600 font-medium truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {h.phone}
                    </a>
                  </div>
                )}
                {h.email && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${h.email}`}
                      className="text-slate-700 hover:text-blue-600 font-medium break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {h.email}
                    </a>
                  </div>
                )}
                {!h.phone && !h.email && (
                  <div className="text-slate-400 italic text-[11px]">No contact details provided</div>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-1.5 text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="text-[11.5px] leading-relaxed text-slate-700">
                  {fullAddr || <span className="text-slate-400 italic">No address provided</span>}
                </span>
              </div>

              {/* Card Footer: Tenure & Activity */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>Member for {tenure(h.created_at, 'New hospital')}</span>
                </div>
                <div className="text-slate-400">
                  {h.updated_at && h.updated_at !== h.created_at ? (
                    <ActivityCell label="Profile updated" when={timeAgo(h.updated_at)} />
                  ) : (
                    <ActivityCell label="Hospital added" when={timeAgo(h.created_at)} />
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      <HospitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hospital={editingHospital}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingHospital ? 'Hospital updated' : 'Hospital created');
          void resource.refresh();
        }}
      />
    </>
  );
}
