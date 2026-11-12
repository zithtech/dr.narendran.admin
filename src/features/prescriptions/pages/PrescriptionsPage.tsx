import { App, Dropdown, type MenuProps, Segmented, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Calendar,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { getErrorMessage } from '../../../utils/errors';
import { type Prescription, prescriptionsApi } from '../api/prescriptionsApi';
import { usePermission } from '../../../context/PermissionContext';
import CreatePrescriptionModal from '../components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../components/ViewPrescriptionModal';
import { PrescriptionTemplatesPage } from './PrescriptionTemplatesPage';

const PAGE_SIZES = [10, 25, 50, 100];

export default function PrescriptionsPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate, canUpdate } = usePermission();

  const isRxCreatable = canCreate('PRESCRIPTIONS');
  const isRxUpdatable = canUpdate('PRESCRIPTIONS');

  const activeTab = searchParams.get('tab') === 'templates' ? 'templates' : 'list';

  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination state matching Doctor page
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  // Client-side filtering across loaded prescriptions
  const filteredPrescriptions = useMemo(() => {
    let list = prescriptions;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((p) => {
        const idMatch = p.id.toLowerCase().includes(term);
        const patientMatch =
          (p.patient_name || '').toLowerCase().includes(term) ||
          (p.patient_phone || '').includes(term);
        const doctorMatch =
          (p.doctor?.name || '').toLowerCase().includes(term) ||
          (p.doctor?.specialization || p.doctor?.specialty || '').toLowerCase().includes(term);
        const diagMatch = (p.diagnosis || p.additional_notes || '').toLowerCase().includes(term);
        const medMatch = (p.medicines || []).some(
          (m) =>
            (m.medicine_name || '').toLowerCase().includes(term) ||
            (m.generic_name || '').toLowerCase().includes(term)
        );
        return idMatch || patientMatch || doctorMatch || diagMatch || medMatch;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => (p.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    return list;
  }, [prescriptions, searchTerm, statusFilter]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPrescriptions.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = filteredPrescriptions.slice(startIdx, startIdx + perPage);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prescriptionsApi.getAll({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setPrescriptions(data);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to fetch prescriptions'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, message]);

  useEffect(() => {
    if (activeTab === 'list') {
      void fetchPrescriptions();
    }
  }, [activeTab, fetchPrescriptions]);

  const handleTabChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === 'templates') {
        next.set('tab', 'templates');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  const handleDownload = async (id: string) => {
    const hideLoading = message.loading('Downloading prescription PDF...', 0);
    try {
      await prescriptionsApi.downloadPdf(id);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to download prescription PDF.'));
    } finally {
      hideLoading();
    }
  };

  const columns: ColumnsType<Prescription> = [
    {
      title: 'Prescription ID & Date',
      key: 'id',
      width: 170,
      render: (_, record) => (
        <div>
          <button
            type="button"
            onClick={() => setViewingPrescription(record)}
            style={{
              background: 'none',
              border: 'none',
              color: '#7c3aed',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            #{record.id.slice(0, 8).toUpperCase()}
          </button>
          <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Calendar size={11} />
            <span>{record.prescription_date}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Patient',
      key: 'patient',
      width: 220,
      render: (_, record) => (
        <div
          onClick={() => setViewingPrescription(record)}
          style={{ cursor: 'pointer' }}
          title="Click to view prescription details"
        >
          <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
            {record.patient_name || 'Patient'}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            {[record.patient_gender, record.patient_phone].filter(Boolean).join(' · ') || 'No contact info'}
          </div>
        </div>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 12.5 }}>
            {record.doctor?.name || 'Dr. Narendran'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {record.doctor?.specialization || record.doctor?.specialty || 'General Medicine'}
          </div>
        </div>
      ),
    },
    {
      title: 'Diagnosis & Medicines',
      key: 'diagnosis',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#334155', fontSize: 12.5 }}>
            {record.diagnosis || record.additional_notes || 'General Consultation'}
          </div>
          <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Pill size={11} />
            <span>
              {record.medicines?.length || record.medicines_count || 0} medicine(s)
              {record.lab_tests?.length ? ` · ${record.lab_tests.length} lab test(s)` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <Tag
          color={record.status === 'active' ? 'green' : 'default'}
          style={{ textTransform: 'capitalize', fontWeight: 600 }}
        >
          {record.status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, record) => {
        const items: NonNullable<MenuProps['items']> = [
          {
            key: 'view',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Eye size={13} /> View Details
              </span>
            ),
            onClick: () => setViewingPrescription(record),
          },
          {
            key: 'download',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7c3aed' }}>
                <Download size={13} /> Download PDF
              </span>
            ),
            onClick: () => handleDownload(record.id),
          },
        ];

        if (record.status === 'active' && isRxUpdatable) {
          items.push({
            key: 'edit',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Pencil size={13} /> Edit
              </span>
            ),
            onClick: () => setEditingPrescription(record),
          });
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <button
              type="button"
              className="ui-btn ui-btn-sm"
              onClick={() => setViewingPrescription(record)}
              title="View Details"
              style={{
                padding: '3px 8px',
                fontSize: 11.5,
                color: '#0284c7',
                borderColor: '#e0f2fe',
                background: '#f0f9ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Eye size={12} /> View
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-sm"
              onClick={() => handleDownload(record.id)}
              title="Download PDF"
              style={{
                padding: '3px 8px',
                fontSize: 11.5,
                color: '#7c3aed',
                borderColor: '#ede9fe',
                background: '#f5f3ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Download size={12} /> PDF
            </button>
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="dta-action-icon-btn"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: 4,
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MoreVertical size={14} />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <div
      className="ui-page prescriptions-page"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '16px 24px',
        gap: 12,
        overflow: activeTab === 'templates' ? 'auto' : 'hidden',
      }}
    >
      <style>{`
        .prescriptions-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .prescriptions-table-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .prescriptions-table-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .prescriptions-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .prescriptions-table-scroll .ant-table-thead > tr > th {
          position: sticky !important;
          top: 0 !important;
          z-index: 2 !important;
          background: #f8fafc !important;
        }
        @media (max-height: 650px) {
          .prescriptions-page {
            overflow-y: auto !important;
          }
          .prescriptions-table-card {
            min-height: 380px !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f5f3ff',
                border: '1px solid #ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <FileText size={17} />
            </div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Prescriptions & Consultations
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
            Direct doctor prescription creation, patient history, adherence tracking, and PDF generation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeTab === 'list' && isRxCreatable && (
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => setIsCreateOpen(true)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
              }}
            >
              <Plus size={15} /> Create Prescription
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, flexShrink: 0 }}>
        <Segmented
          value={activeTab}
          onChange={handleTabChange}
          options={[
            {
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
                  <FileText size={14} /> Prescriptions List
                </span>
              ),
              value: 'list',
            },
            {
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
                  <Settings size={14} /> Template & Layout
                </span>
              ),
              value: 'templates',
            },
          ]}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: '#ffffff',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  maxWidth: 360,
                }}
              >
                <Search size={14} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPrescriptions()}
                  placeholder="Search by patient name, phone, diagnosis..."
                  className="ui-input"
                  style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="ui-input"
                style={{ height: 32, fontSize: 12, width: 130 }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              type="button"
              className="ui-btn"
              onClick={() => fetchPrescriptions()}
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Table Card with Scroll Container and Doctor Page Footer */}
          <div
            className="ui-card ui-table-card prescriptions-table-card"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Scrollable table container */}
            <div
              className="ui-table-scroll prescriptions-table-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'auto',
              }}
            >
              <Table
                columns={columns}
                dataSource={pageRows}
                rowKey="id"
                loading={loading}
                pagination={false}
                scroll={{ x: 950 }}
                locale={{
                  emptyText: (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <FileText size={36} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13, fontWeight: 650, color: '#475569' }}>
                        No prescriptions found
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        Create a prescription directly using the "+ Create Prescription" button.
                      </div>
                    </div>
                  ),
                }}
              />
            </div>

            {/* Pagination Footer behaving exactly like the Doctor page */}
            <footer className="ui-footer">
              <span>
                {filteredPrescriptions.length === 0 ? (
                  'No results'
                ) : (
                  <>
                    Showing{' '}
                    <strong>
                      {startIdx + 1}–{startIdx + pageRows.length}
                    </strong>{' '}
                    of <strong>{filteredPrescriptions.length}</strong>
                    {filteredPrescriptions.length !== prescriptions.length && (
                      <> (filtered from {prescriptions.length})</>
                    )}
                  </>
                )}
              </span>
              <div className="ui-pager">
                <span>Per page</span>
                <select
                  className="ui-select"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm"
                  onClick={() => setPage(1)}
                  disabled={current === 1}
                >
                  « First
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 1}
                >
                  ‹ Prev
                </button>
                <span className="ui-pager-page">
                  Page {current} of {pageCount}
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm"
                  onClick={() => setPage(current + 1)}
                  disabled={current === pageCount}
                >
                  Next ›
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm"
                  onClick={() => setPage(pageCount)}
                  disabled={current === pageCount}
                >
                  Last »
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <PrescriptionTemplatesPage />
        </div>
      )}

      {/* Create Modal */}
      <CreatePrescriptionModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void fetchPrescriptions();
        }}
      />

      {/* Edit Modal */}
      {editingPrescription && (
        <CreatePrescriptionModal
          open={Boolean(editingPrescription)}
          editingPrescription={editingPrescription}
          onClose={() => setEditingPrescription(null)}
          onSuccess={() => {
            setEditingPrescription(null);
            void fetchPrescriptions();
          }}
        />
      )}

      {/* View Modal */}
      <ViewPrescriptionModal
        prescription={viewingPrescription}
        open={Boolean(viewingPrescription)}
        onClose={() => setViewingPrescription(null)}
        {...(isRxUpdatable
          ? {
              onEdit: (p: Prescription) => {
                setViewingPrescription(null);
                setEditingPrescription(p);
              },
            }
          : {})}
      />
    </div>
  );
}
