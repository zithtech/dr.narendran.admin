import { App } from 'antd';
import { Briefcase, Mail, MapPin, Phone, UserCheck } from 'lucide-react';
import { useState } from 'react';

import ReferralModal, { type Referral } from '../components/ReferralModal';
import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet, statusFacet } from '../components/ui/facets';
import { Badge, StatusDot } from '../components/ui/primitives';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { formatDate } from '../lib/format';
import api from '../utils/api';

const FACETS: Facet<Referral>[] = [
  statusFacet<Referral>(),
  {
    id: 'gender',
    label: 'Gender',
    allLabel: 'All genders',
    value: (r) => (r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1).toLowerCase() : null),
  },
  addedFacet<Referral>(),
];

export default function Referrals() {
  const resource = useResource<Referral>('referrals', 'referrals');
  const { message, modal } = App.useApp();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const isCreatable = canCreate('REFERRALS', ['HOSPITALS', 'DOCTORS']);
  const isUpdatable = canUpdate('REFERRALS', ['HOSPITALS', 'DOCTORS']);
  const isDeletable = canDelete('REFERRALS', ['HOSPITALS', 'DOCTORS']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);

  const openEditor = (r: Referral | null) => {
    if (r ? !isUpdatable : !isCreatable) return;
    setEditingReferral(r);
    setIsModalOpen(true);
  };

  const deleteReferral = (r: Referral): Promise<void> => {
    return new Promise((resolve) => {
      modal.confirm({
        title: `Delete referral partner ${r.name}?`,
        content: 'Are you sure you want to delete this referral record? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          try {
            await api.delete(`referrals/${r.id}`);
            void message.success('Referral deleted successfully');
            void resource.refresh();
            resolve();
          } catch (err: any) {
            void message.error(err.response?.data?.error || 'Failed to delete referral');
            resolve();
          }
        },
        onCancel: () => resolve(),
      });
    });
  };

  const columns: Column<Referral>[] = [
    {
      id: 'name',
      header: 'Referral Partner',
      sort: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <PrimaryCell
          name={r.name}
          sub={r.occupation || 'Healthcare Partner'}
          avatarSrc={r.profile_image_url || undefined}
          {...(isUpdatable ? { onOpen: () => openEditor(r) } : {})}
        />
      ),
    },
    {
      id: 'contact',
      header: 'Contact Details',
      cell: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569' }}>
          {r.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <Mail size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{r.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'gender',
      header: 'Gender',
      sort: (r) => r.gender || '',
      cell: (r) =>
        r.gender ? (
          <Badge tone={r.gender.toLowerCase() === 'female' ? 'violet' : r.gender.toLowerCase() === 'male' ? 'blue' : 'neutral'}>
            {r.gender}
          </Badge>
        ) : (
          <span style={{ color: '#94a3b8' }}>—</span>
        ),
    },
    {
      id: 'occupation',
      header: 'Occupation / Role',
      sort: (r) => r.occupation || '',
      cell: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
          {r.occupation ? (
            <>
              <Briefcase size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{r.occupation}</span>
            </>
          ) : (
            <span style={{ color: '#94a3b8' }}>—</span>
          )}
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      cell: (r) => {
        const parts = [r.city, r.state, r.pincode].filter(Boolean);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#64748b' }}>
            {parts.length > 0 ? (
              <>
                <MapPin size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <span>{parts.join(', ')}</span>
              </>
            ) : (
              <span style={{ color: '#94a3b8' }}>—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      sort: (r) => r.status,
      cell: (r) => <StatusDot active={r.status === 'ACTIVE'} />,
    },
    {
      id: 'added',
      header: 'Added on',
      sort: (r) => new Date(r.created_at).getTime(),
      cell: (r) => <span style={{ color: '#64748b', fontSize: 12.5 }}>{formatDate(r.created_at)}</span>,
    },
  ];

  return (
    <>
      <DataView
        moduleSlug="REFERRALS"
        title="Referrals"
        subtitle="Manage patient referrals, partner doctors, and clinical network directory."
        icon={UserCheck}
        noun="referral"
        nounPlural="referrals"
        resource={resource}
        searchPlaceholder="Search by name, phone, occupation, city..."
        searchFields={(r) => [
          r.name,
          r.phone || '',
          r.email || '',
          r.occupation || '',
          r.city || '',
          r.state || '',
          r.pincode || '',
          r.gender || '',
        ]}
        facets={FACETS}
        dateOf={(r) => r.created_at}
        columns={columns}
        createLabel="Add Referral"
        onCreate={() => openEditor(null)}
        onEdit={openEditor}
        {...(isDeletable ? { onDelete: deleteReferral } : {})}
        nameOf={(r) => r.name}
      />

      <ReferralModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        referral={editingReferral}
        onSave={() => {
          setIsModalOpen(false);
          void message.success(editingReferral ? 'Referral updated successfully' : 'Referral registered successfully');
          void resource.refresh();
        }}
      />
    </>
  );
}
