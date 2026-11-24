import { App } from 'antd';
import {
  Clock,
  ExternalLink,
  FlaskConical,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import CreateLabPortalModal, { type LabWithPortal } from '../components/CreateLabPortalModal';
import LabModal, { type Lab } from '../components/LabModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, cx, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Lab>[] = [
  statusFacet<Lab>(),
  addedFacet<Lab>(),
];

export default function Labs() {
  const resource = useResource<Lab>('labs', 'labs');
  const { message } = App.useApp();
  const { canCreate, canUpdate } = usePermission();
  const isCreatable = canCreate('LABS');
  const isUpdatable = canUpdate('LABS');
  const canCreatePortal = canCreate('CLIENT_PORTALS');
  const canUpdatePortal = canUpdate('CLIENT_PORTALS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);

  const [portalLab, setPortalLab] = useState<LabWithPortal | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  const openEditor = (lab: Lab | null) => {
    if (lab ? !isUpdatable : !isCreatable) return;
    setEditingLab(lab);
    setIsModalOpen(true);
  };

  const columns: Column<Lab>[] = [
    {
      id: 'name',
      header: 'Lab',
      sort: (l) => l.name.toLowerCase(),
      cell: (l) => (
        <PrimaryCell
          name={l.name}
          sub={l.phone || <span className="ui-muted">No phone</span>}
          {...(isUpdatable ? { onOpen: () => openEditor(l) } : {})}
        />
      ),
    },
    {
      id: 'location',
      header: 'Location',
      sort: (l) => (l.city ?? '').toLowerCase(),
      cell: (l) => {
        const addressParts = [l.city, l.state].filter(Boolean).join(', ');
        return (
          <div>
            <div style={{ color: 'var(--ui-text)' }}>
              {l.address_line_1 || <span className="ui-muted">No address provided</span>}
            </div>
            {addressParts && <div className="ui-cell-sub">{addressParts}</div>}
          </div>
        );
      },
    },
    {
      id: 'services',
      header: 'Services',
      sort: (l) => l.services?.length || 0,
      cell: (l) => {
        if (!l.services || l.services.length === 0) return <span className="ui-muted">—</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
            {l.services.map((s: any) => (
              <span key={s.id} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--ui-border)', borderRadius: '4px' }}>
                {s.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'tenure',
      header: 'Added',
      sort: (l) => -new Date(l.created_at).getTime(),
      cell: (l) => tenure(l.created_at, 'New lab'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (l) => l.status,
      cell: (l) => <StatusDot active={l.status === 'ACTIVE'} />,
    },
    {
      id: 'portal',
      header: 'Client Portal',
      cell: (l: any) => {
        if (l.portal_account) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Portal Active
              </span>
              {canUpdatePortal && (
                <button
                  type="button"
                  onClick={() => {
                    setPortalLab(l);
                    setIsPortalModalOpen(true);
                  }}
                  className="ui-btn ui-btn-sm text-xs py-0.5 px-2 h-6"
                  title="Manage Portal Details"
                >
                  Manage
                </button>
              )}
            </div>
          );
        }
        return canCreatePortal ? (
          <button
            type="button"
            onClick={() => {
              setPortalLab(l);
              setIsPortalModalOpen(true);
            }}
            className="ui-btn ui-btn-sm text-xs py-0.5 px-2.5 h-6 text-sky-700 border-sky-300 hover:bg-sky-50 whitespace-nowrap font-medium"
          >
            Create Client Portal
          </button>
        ) : (
          <span className="ui-muted">—</span>
        );
      },
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (l) => new Date(l.updated_at || l.created_at).getTime(),
      cell: (l) =>
        l.updated_at && l.updated_at !== l.created_at ? (
          <ActivityCell label="Lab updated" when={timeAgo(l.updated_at)} />
        ) : (
          <ActivityCell label="Lab added" when={timeAgo(l.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="LABS"
        title="Linked Labs"
        subtitle="Recommended laboratories for patients."
        icon={FlaskConical}
        noun="lab"
        nounPlural="labs"
        resource={resource}
        searchPlaceholder="Search lab name, phone, city…"
        searchFields={(l) => [l.name, l.phone, l.address_line_1, l.city, l.state, l.pincode]}
        facets={FACETS}
        dateOf={(l) => l.created_at}
        columns={columns}
        createLabel="Add Linked Lab"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(l) => api.delete(`labs/${l.id}`)}
        nameOf={(l) => l.name}
        minTableWidth={820}
        renderMobileCard={(l, { isSel, toggleRow, onEdit, onDelete, isUpdateAllowed, isDeleteAllowed, showCheckCol }) => {
          const fullAddr = [l.address_line_1, l.address_line_2, l.city, l.state, l.pincode].filter(Boolean).join(', ');
          const servicesList = l.services || [];
          return (
            <div
              key={l.id}
              className={cx(
                'bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all text-xs',
                isSel ? 'border-purple-400 bg-purple-50/20 ring-1 ring-purple-300' : 'hover:border-slate-300',
              )}
              data-testid={`lab-card-${l.id}`}
            >
              {/* Card Header: Checkbox + Flask Icon + Lab Name + Status Dot + Quick Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5 shrink-0"
                      checked={isSel}
                      onChange={toggleRow}
                      aria-label={`Select ${l.name}`}
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <FlaskConical size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={isUpdatable ? () => openEditor(l) : undefined}
                        className={cx(
                          'font-semibold text-slate-900 text-sm tracking-tight text-left leading-snug',
                          isUpdatable ? 'hover:text-purple-600 cursor-pointer' : 'cursor-default',
                        )}
                      >
                        {l.name}
                      </button>
                    </div>
                    {/* Operating Hours or City Subtitle */}
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11.5px] mt-0.5 flex-wrap">
                      {l.city && (
                        <span className="font-medium text-slate-700">
                          {l.city}{l.state ? `, ${l.state}` : ''}
                        </span>
                      )}
                      {l.start_time && l.end_time && (
                        <span className="flex items-center gap-1 text-slate-500">
                          {l.city ? <span className="text-slate-300">•</span> : null}
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{l.start_time} - {l.end_time}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status indicator & Edit / Delete touch buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusDot active={l.status === 'ACTIVE'} />
                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer border border-transparent hover:border-purple-200"
                      onClick={onEdit}
                      aria-label={`Edit ${l.name}`}
                      title="Edit Lab Details"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isDeleteAllowed && onDelete && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      onClick={onDelete}
                      aria-label={`Delete ${l.name}`}
                      title="Delete Linked Lab"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Details (Phone & Email) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-slate-600">
                {l.phone ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <a
                      href={`tel:${l.phone}`}
                      className="text-slate-700 hover:text-purple-600 font-medium truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.phone}
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-300 shrink-0" />
                    <span>No phone provided</span>
                  </div>
                )}
                {l.email ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${l.email}`}
                      className="text-slate-700 hover:text-purple-600 font-medium truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.email}
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Address & Navigation Link */}
              <div className="flex items-start justify-between gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11.5px] leading-relaxed text-slate-700">
                    {fullAddr || <span className="text-slate-400 italic">No address provided</span>}
                  </span>
                </div>
                {l.map_link && (
                  <a
                    href={l.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 px-2 py-0.5 rounded bg-blue-50 border border-blue-200"
                    title="Open in Google Maps"
                  >
                    <span>Map</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Services offered badges */}
              {servicesList.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                    Diagnostic Services ({servicesList.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {servicesList.slice(0, 3).map((s: any) => (
                      <span
                        key={s.id}
                        className="text-[10.5px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-medium"
                      >
                        {s.name}
                      </span>
                    ))}
                    {servicesList.length > 3 && (
                      <span className="text-[10.5px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200 font-semibold">
                        +{servicesList.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Client Portal Integration Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">Client Portal:</span>
                  {l.portal_account ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Portal Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Not Provisioned</span>
                  )}
                </div>
                {l.portal_account ? (
                  canUpdatePortal && (
                    <button
                      type="button"
                      onClick={() => {
                        setPortalLab(l);
                        setIsPortalModalOpen(true);
                      }}
                      className="ui-btn ui-btn-sm text-xs py-1 px-2.5 h-7 font-medium cursor-pointer"
                      title="Manage Portal Details"
                    >
                      Manage Portal
                    </button>
                  )
                ) : canCreatePortal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPortalLab(l);
                      setIsPortalModalOpen(true);
                    }}
                    className="ui-btn ui-btn-sm text-xs py-1 px-2.5 h-7 text-sky-700 border-sky-300 hover:bg-sky-50 font-medium whitespace-nowrap cursor-pointer"
                  >
                    Create Portal
                  </button>
                ) : null}
              </div>

              {/* Card Footer: Tenure & Activity */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>Member for {tenure(l.created_at, 'New lab')}</span>
                </div>
                <div>
                  {l.updated_at && l.updated_at !== l.created_at ? (
                    <span className="text-slate-400">Updated {timeAgo(l.updated_at)}</span>
                  ) : (
                    <span className="text-slate-400">Added {timeAgo(l.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      <LabModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lab={editingLab}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingLab ? 'Lab updated' : 'Lab created');
          void resource.refresh();
        }}
      />

      <CreateLabPortalModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        lab={portalLab}
        onSuccess={() => {
          void resource.refresh();
        }}
      />
    </>
  );
}
