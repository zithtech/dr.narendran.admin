import { App } from 'antd';
import { Building2, Clock, GitBranch, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';

import BranchModal, { type Branch } from '../components/BranchModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { ActivityCell, Badge, cx, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { tenure, timeAgo } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Branch>[] = [
  {
    id: 'hospital',
    label: 'Hospitals',
    allLabel: 'All hospitals',
    value: (b) => b.hospital_name || 'Unknown hospital',
  },
  statusFacet<Branch>(),
  addedFacet<Branch>(),
];

export default function Branches() {
  const resource = useResource<Branch>('branches', 'branches');
  const { message } = App.useApp();
  const { canCreate, canUpdate } = usePermission();
  const isCreatable = canCreate('BRANCHES');
  const isUpdatable = canUpdate('BRANCHES');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const openEditor = (branch: Branch | null) => {
    if (branch ? !isUpdatable : !isCreatable) return;
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const columns: Column<Branch>[] = [
    {
      id: 'name',
      header: 'Branch',
      sort: (b) => b.name.toLowerCase(),
      cell: (b) => (
        <PrimaryCell
          name={b.name}
          sub={b.phone || <span className="ui-muted">No phone</span>}
          {...(isUpdatable ? { onOpen: () => openEditor(b) } : {})}
        />
      ),
    },
    {
      id: 'hospital',
      header: 'Hospital',
      sort: (b) => (b.hospital_name ?? '').toLowerCase(),
      cell: (b) => (
        <span style={{ fontWeight: 500, color: 'var(--ui-text)' }}>
          {b.hospital_name || 'Unknown'}
        </span>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      sort: (b) => b.branch_code,
      cell: (b) => (
        <Badge tone="green" mono>
          {b.branch_code}
        </Badge>
      ),
    },
    {
      id: 'tenure',
      header: 'Member for',
      sort: (b) => -new Date(b.created_at).getTime(),
      cell: (b) => tenure(b.created_at, 'New branch'),
    },
    {
      id: 'status',
      header: 'Status',
      sort: (b) => b.status,
      cell: (b) => <StatusDot active={b.status === 'ACTIVE'} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      sort: (b) => new Date(b.updated_at || b.created_at).getTime(),
      cell: (b) =>
        b.updated_at && b.updated_at !== b.created_at ? (
          <ActivityCell label="Branch updated" when={timeAgo(b.updated_at)} />
        ) : (
          <ActivityCell label="Branch added" when={timeAgo(b.created_at)} />
        ),
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="BRANCHES"
        title="Branches"
        subtitle="Hospital branches and their locations."
        icon={GitBranch}
        noun="branch"
        nounPlural="branches"
        resource={resource}
        searchPlaceholder="Search branch, code, hospital…"
        searchFields={(b) => [
          b.name,
          b.branch_code,
          b.hospital_name,
          b.phone,
          b.address,
          b.address_line_1,
          b.city,
          b.state,
          b.pincode,
        ]}
        facets={FACETS}
        dateOf={(b) => b.created_at}
        columns={columns}
        createLabel="New branch"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={(b) => api.delete(`branches/${b.id}`)}
        nameOf={(b) => b.name}
        minTableWidth={720}
        renderMobileCard={(b, { isSel, toggleRow, onEdit, onDelete, isUpdateAllowed, isDeleteAllowed, showCheckCol }) => {
          const fullAddr =
            [b.address_line_1, b.address_line_2, b.city, b.state, b.pincode]
              .filter(Boolean)
              .join(', ') || b.address;
          return (
            <div
              key={b.id}
              className={cx(
                'bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all text-xs',
                isSel ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300' : 'hover:border-slate-300',
              )}
              data-testid={`branch-card-${b.id}`}
            >
              {/* Card Header: Checkbox + Icon + Branch Name + Code + Status & Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
                      checked={isSel}
                      onChange={toggleRow}
                      aria-label={`Select ${b.name}`}
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <GitBranch size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={isUpdatable ? () => openEditor(b) : undefined}
                        className={cx(
                          'font-semibold text-slate-900 text-sm tracking-tight text-left leading-snug',
                          isUpdatable ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default',
                        )}
                      >
                        {b.name}
                      </button>
                      <Badge tone="green" mono>
                        {b.branch_code}
                      </Badge>
                    </div>
                    {/* Parent Hospital */}
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11.5px] mt-0.5">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">
                        {b.hospital_name || 'Unknown Hospital'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusDot active={b.status === 'ACTIVE'} />
                  {isUpdateAllowed && onEdit && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                      onClick={onEdit}
                      aria-label={`Edit ${b.name}`}
                      title="Edit Branch"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isDeleteAllowed && onDelete && (
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      onClick={onDelete}
                      aria-label={`Delete ${b.name}`}
                      title="Delete Branch"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-1 text-slate-600 border-t border-slate-100">
                {b.phone ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <a
                      href={`tel:${b.phone}`}
                      className="text-slate-700 hover:text-blue-600 font-medium truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.phone}
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-300 shrink-0" />
                    <span>No contact phone provided</span>
                  </div>
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
                  <span>Member for {tenure(b.created_at, 'New branch')}</span>
                </div>
                <div className="text-slate-400">
                  {b.updated_at && b.updated_at !== b.created_at ? (
                    <ActivityCell label="Branch updated" when={timeAgo(b.updated_at)} />
                  ) : (
                    <ActivityCell label="Branch added" when={timeAgo(b.created_at)} />
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branch={editingBranch}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingBranch ? 'Branch updated' : 'Branch created');
          void resource.refresh();
        }}
      />
    </>
  );
}
