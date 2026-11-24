import { App } from 'antd';
import {
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import LinkedMedicalModal, { type LinkedMedical } from '../components/LinkedMedicalModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { cx, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { formatDate, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<LinkedMedical>[] = [
  statusFacet<LinkedMedical>(),
  addedFacet<LinkedMedical>(),
];

export default function LinkedMedicals() {
  const resource = useResource<LinkedMedical>('linked-medicals', 'linked medicals');
  const { message, modal } = App.useApp();
  const { canCreate, canUpdate } = usePermission();
  const isCreatable = canCreate('LINKED_MEDICALS');
  const isUpdatable = canUpdate('LINKED_MEDICALS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedical, setEditingMedical] = useState<LinkedMedical | null>(null);

  const openEditor = (m: LinkedMedical | null) => {
    if (m ? !isUpdatable : !isCreatable) return;
    setEditingMedical(m);
    setIsModalOpen(true);
  };

  const deleteMedical = (m: LinkedMedical): Promise<void> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: `Delete ${m.name}?`,
        content: 'Are you sure you want to delete this linked medical? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          try {
            await api.delete(`linked-medicals/${m.id}`);
            void message.success('Linked medical deleted');
            void resource.refresh();
            resolve();
          } catch (err: any) {
            void message.error(err.response?.data?.error || 'Failed to delete linked medical');
            resolve();
          }
        },
        onCancel: () => resolve(),
      });
    });
  };

  const columns: Column<LinkedMedical>[] = [
    {
      id: 'name',
      header: 'Pharmacy / Medical Name',
      sort: (m) => m.name.toLowerCase(),
      cell: (m) => (
        <PrimaryCell
          name={m.name}
          sub={
            m.start_time && m.end_time ? `${m.start_time} - ${m.end_time}` : undefined
          }
          {...(isUpdatable ? { onOpen: () => openEditor(m) } : {})}
        />
      ),
    },
    {
      id: 'contact',
      header: 'Contact details',
      cell: (m) => (
        <div className="flex flex-col gap-1 text-sm text-gray-500">
          {m.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <a
                href={`tel:${m.phone}`}
                className="hover:text-purple-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {m.phone}
              </a>
            </div>
          )}
          {m.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{m.city}{m.state ? `, ${m.state}` : ''}</span>
              {m.map_link && (
                <a
                  href={m.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-500 hover:text-blue-700 ml-1 inline-flex items-center"
                  title="View on Google Maps"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (m) => m.status,
      cell: (m) => <StatusDot active={m.status === 'ACTIVE'} />,
    },
    {
      id: 'added',
      header: 'Added on',
      sort: (m) => new Date(m.created_at).getTime(),
      cell: (m) => <span className="text-gray-500">{formatDate(m.created_at)}</span>,
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="LINKED_MEDICALS"
        title="Linked Medicals"
        subtitle="Manage pharmacies and medical shops connected to the platform."
        icon={Stethoscope}
        noun="medical"
        nounPlural="medicals"
        resource={resource}
        searchPlaceholder="Search pharmacy name..."
        searchFields={(m) => [m.name, m.city || '', m.phone || '', m.state || '', m.email || '']}
        facets={FACETS}
        dateOf={(m) => m.created_at}
        columns={columns}
        minTableWidth={760}
        createLabel="Add Linked Medical"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={deleteMedical}
        nameOf={(m) => m.name}
        renderMobileCard={(m, { isSel, toggleRow, onEdit, onDelete, isUpdateAllowed, isDeleteAllowed, showCheckCol }) => {
          const fullAddr = [m.address_line_1, m.address_line_2, m.city, m.state, m.pincode]
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={m.id}
              className={cx(
                'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200',
                'bg-white hover:border-slate-300 hover:shadow-xs',
                isSel ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200/80',
              )}
            >
              {/* Header: Store Name, Status Pill, Select Checkbox */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.name}`}
                      checked={isSel}
                      onChange={toggleRow}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEditor(m)}
                        disabled={!isUpdatable}
                        className={cx(
                          'text-[15px] font-bold text-left leading-snug truncate tracking-tight',
                          isUpdatable
                            ? 'text-slate-900 hover:text-purple-600 cursor-pointer'
                            : 'text-slate-900 cursor-default',
                        )}
                      >
                        {m.name}
                      </button>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0',
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200',
                        )}
                      >
                        <span
                          className={cx(
                            'w-1.5 h-1.5 rounded-full',
                            m.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400',
                          )}
                        />
                        {m.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* City / Hours Subtitle */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      {m.city && (
                        <span className="font-medium text-slate-700">
                          {m.city}{m.state ? `, ${m.state}` : ''}
                        </span>
                      )}
                      {m.start_time && m.end_time && (
                        <span className="flex items-center gap-1 text-slate-500">
                          {m.city ? <span className="text-slate-300">•</span> : null}
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{m.start_time} - {m.end_time}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Links: Phone and Email */}
              <div className="flex flex-col gap-1.5 text-xs">
                {m.phone ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={12} className="text-purple-600 shrink-0" />
                    <a
                      href={`tel:${m.phone}`}
                      className="text-purple-700 hover:text-purple-900 font-semibold hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.phone}
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-300 shrink-0" />
                    <span>No phone provided</span>
                  </div>
                )}
                {m.email ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${m.email}`}
                      className="text-slate-700 hover:text-purple-600 font-medium truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.email}
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Physical Address & Google Maps Link */}
              <div className="flex items-start justify-between gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11.5px] leading-relaxed text-slate-700">
                    {fullAddr || <span className="text-slate-400 italic">No address provided</span>}
                  </span>
                </div>
                {m.map_link && (
                  <a
                    href={m.map_link}
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

              {/* Card Footer: Added Tenure and Touch Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <span>Added {formatDate(m.created_at)}</span>
                  {m.updated_at && m.updated_at !== m.created_at && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>Updated {timeAgo(m.updated_at)}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      aria-label={`Edit ${m.name}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {isDeleteAllowed && onDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      aria-label={`Delete ${m.name}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      <LinkedMedicalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        medical={editingMedical}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingMedical ? 'Linked medical updated' : 'Linked medical created');
          void resource.refresh();
        }}
      />
    </>
  );
}
