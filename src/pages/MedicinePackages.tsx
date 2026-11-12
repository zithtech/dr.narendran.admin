import { App, Empty, Input, Popconfirm, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Calendar,
  Eye,
  Layers,
  Package,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { medicinePackagesApi } from '../api/medicinePackagesApi';
import CreateEditPackageModal from '../components/CreateEditPackageModal';
import ViewPackageModal from '../components/ViewPackageModal';
import type { MedicinePackage } from '../types/pharmacy';
import { usePermission } from '../context/PermissionContext';
import { getErrorMessage } from '../utils/errors';

export default function MedicinePackages() {
  const { message } = App.useApp();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const isCreatable = canCreate('MEDICINE_PACKAGES');
  const isUpdatable = canUpdate('MEDICINE_PACKAGES');
  const isDeletable = canDelete('MEDICINE_PACKAGES');

  const [packages, setPackages] = useState<MedicinePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [viewingPackage, setViewingPackage] = useState<MedicinePackage | null>(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MedicinePackage | null>(null);

  // Fetch all packages
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await medicinePackagesApi.getAll();
      setPackages(data);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to fetch medicine packages'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  // Handle Delete
  const handleDelete = async (pkg: MedicinePackage) => {
    if (!isDeletable) return;
    try {
      await medicinePackagesApi.delete(pkg.id);
      message.success(`Medicine package "${pkg.name}" deleted successfully.`);
      void fetchPackages();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to delete package'));
    }
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return packages;

    return packages.filter((pkg) => {
      const matchesName = pkg.name.toLowerCase().includes(term);
      const matchesDesc = pkg.description?.toLowerCase().includes(term) ?? false;
      const matchesDoctor = pkg.doctor_name?.toLowerCase().includes(term) ?? false;
      const matchesMedicine = (pkg.medicines || []).some(
        (m) =>
          m.medicine_name.toLowerCase().includes(term) ||
          (m.generic_name?.toLowerCase().includes(term) ?? false) ||
          (m.manufacturer?.toLowerCase().includes(term) ?? false)
      );
      return matchesName || matchesDesc || matchesDoctor || matchesMedicine;
    });
  }, [packages, searchTerm]);

  // Statistical calculations
  const totalMedicinesCount = useMemo(() => {
    return packages.reduce((acc, p) => acc + (p.medicines?.length || 0), 0);
  }, [packages]);

  const avgMedicinesPerPackage = useMemo(() => {
    if (packages.length === 0) return 0;
    return (totalMedicinesCount / packages.length).toFixed(1);
  }, [packages, totalMedicinesCount]);

  // Table columns definition
  const columns: ColumnsType<MedicinePackage> = [
    {
      title: 'Package Name & ID',
      key: 'name',
      width: 250,
      render: (_, record) => {
        const formattedDate = record.created_at
          ? new Date(record.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '';

        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
                marginTop: 2,
                flexShrink: 0,
              }}
            >
              <Package size={17} />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setViewingPackage(record)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                }}
                className="hover:text-purple-600 transition-colors"
              >
                {record.name}
              </button>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>
                  #{record.id.slice(0, 8).toUpperCase()}
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={11} /> {formattedDate}
                    </span>
                  </>
                )}
              </div>
              {record.doctor_name && (
                <div style={{ fontSize: 11, color: '#6d28d9', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Stethoscope size={11} /> Dr. {record.doctor_name.replace(/^Dr\.\s*/i, '')}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Description',
      key: 'description',
      width: 260,
      render: (_, record) => (
        <div>
          {record.description ? (
            <Tooltip title={record.description}>
              <div
                style={{
                  fontSize: 12.5,
                  color: '#334155',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                }}
              >
                {record.description}
              </div>
            </Tooltip>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              No description provided
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Included Medicines',
      key: 'medicines',
      render: (_, record) => {
        const meds = record.medicines || [];
        const previewMeds = meds.slice(0, 3);
        const remaining = meds.length - previewMeds.length;

        return (
          <div
            onClick={() => setViewingPackage(record)}
            style={{ cursor: 'pointer' }}
            title="Click to view full medicine list"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Tag color="purple" style={{ margin: 0, fontWeight: 650, fontSize: 11 }}>
                {meds.length} {meds.length === 1 ? 'Medicine' : 'Medicines'}
              </Tag>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {previewMeds.map((m) => (
                <Tag
                  key={m.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: 11,
                    margin: 0,
                    padding: '1px 6px',
                  }}
                >
                  {m.medicine_name}
                  {m.strength ? ` (${m.strength} ${m.strength_unit || ''})` : ''}
                </Tag>
              ))}
              {remaining > 0 && (
                <Tag
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: 11,
                    margin: 0,
                    padding: '1px 6px',
                    fontWeight: 600,
                  }}
                >
                  +{remaining} more
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      align: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <button
            type="button"
            className="ui-btn ui-btn-sm"
            onClick={() => setViewingPackage(record)}
            title="View Package Details"
            style={{
              padding: '4px 9px',
              fontSize: 12,
              color: '#0284c7',
              borderColor: '#e0f2fe',
              background: '#f0f9ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <Eye size={13} /> View
          </button>

          {isUpdatable && (
            <button
              type="button"
              className="ui-btn ui-btn-sm"
              onClick={() => {
                setEditingPackage(record);
                setIsCreateEditOpen(true);
              }}
              title="Edit Package"
              style={{
                padding: '4px 9px',
                fontSize: 12,
                color: '#7c3aed',
                borderColor: '#ede9fe',
                background: '#f5f3ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <Pencil size={13} /> Edit
            </button>
          )}

          {isDeletable && (
            <Popconfirm
              title="Delete Medicine Package"
              description={
                <div style={{ maxWidth: 280, fontSize: 12.5, lineHeight: 1.4 }}>
                  Are you sure you want to delete <strong>{record.name}</strong>?
                  <div style={{ color: '#64748b', marginTop: 4 }}>
                    The original pharmacy medicines will <strong>not</strong> be deleted.
                  </div>
                </div>
              }
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDelete(record)}
            >
              <button
                type="button"
                className="ui-btn ui-btn-sm"
                title="Delete Package"
                style={{
                  padding: '4px 9px',
                  fontSize: 12,
                  color: '#dc2626',
                  borderColor: '#fee2e2',
                  background: '#fef2f2',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div
      className="medicine-packages-page"
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        padding: '24px 32px 60px 32px',
      }}
    >
      <style>{`
        .medicine-packages-page::-webkit-scrollbar {
          width: 8px;
        }
        .medicine-packages-page::-webkit-scrollbar-track {
          background: transparent;
        }
        .medicine-packages-page::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .medicine-packages-page::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} style={{ color: '#7c3aed' }} />
            Medicine Packages
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
            Group multiple pharmacy medicines into reusable packages for fast prescribing and standardized treatment sets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="ui-btn"
            onClick={() => void fetchPackages()}
            title="Refresh package list"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {isCreatable && (
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => {
                setEditingPackage(null);
                setIsCreateEditOpen(true);
              }}
              style={{
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(124, 58, 237, 0.2)',
              }}
            >
              <Plus size={15} /> Create Package
            </button>
          )}
        </div>
      </div>

      {/* Metric Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Packages
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {packages.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
            }}
          >
            <Pill size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Medicines Linked
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {totalMedicinesCount}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Avg Medicines per Package
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {avgMedicinesPerPackage}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px 12px 0 0',
          padding: '14px 18px',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, maxWidth: 450 }}>
          <Input
            prefix={<Search size={15} style={{ color: '#94a3b8' }} />}
            placeholder="Search by package name, description, or included medicine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="middle"
            style={{ borderRadius: 8 }}
          />
        </div>

        <div style={{ fontSize: 12.5, color: '#64748b' }}>
          Showing <strong>{filteredPackages.length}</strong> of {packages.length} package(s)
        </div>
      </div>

      {/* Packages Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredPackages}
          rowKey="id"
          loading={loading}
          scroll={{ x: 950 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} packages`,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '36px 0' }}>
                <Empty
                  description={
                    searchTerm
                      ? `No medicine packages matching "${searchTerm}".`
                      : 'No medicine packages created yet.'
                  }
                >
                  {!searchTerm && (
                    <button
                      type="button"
                      className="ui-btn ui-btn-primary"
                      onClick={() => {
                        setEditingPackage(null);
                        setIsCreateEditOpen(true);
                      }}
                      style={{
                        background: '#7c3aed',
                        borderColor: '#7c3aed',
                        color: '#ffffff',
                        fontSize: 12.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        margin: '0 auto',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Create Your First Package
                    </button>
                  )}
                </Empty>
              </div>
            ),
          }}
        />
      </div>

      {/* View Package Modal */}
      <ViewPackageModal
        pkg={viewingPackage}
        open={Boolean(viewingPackage)}
        onClose={() => setViewingPackage(null)}
        {...(isUpdatable
          ? {
              onEdit: (pkg: MedicinePackage) => {
                setViewingPackage(null);
                setEditingPackage(pkg);
                setIsCreateEditOpen(true);
              },
            }
          : {})}
      />

      {/* Create & Edit Package Modal */}
      <CreateEditPackageModal
        open={isCreateEditOpen}
        editingPackage={editingPackage}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingPackage(null);
        }}
        onSuccess={() => {
          void fetchPackages();
        }}
      />
      </div>
    </div>
  );
}
