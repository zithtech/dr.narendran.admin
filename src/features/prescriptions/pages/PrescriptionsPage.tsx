import { App } from 'antd';
import {
  Calendar,
  Download,
  Eye,
  FileText,
  Pencil,
  Pill,
  Settings,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  CommonFilterBar,
  CommonPageHeader,
  CommonPagination,
  CommonTable,
  type CommonTableColumn,
  PrimaryAvatarCell,
  StatusPill,
} from '../../../components/ui/CommonTable';
import { Badge } from '../../../components/ui/primitives';
import { usePermission } from '../../../context/PermissionContext';
import { titleCase } from '../../../lib/format';
import { getErrorMessage } from '../../../utils/errors';
import { type Prescription, prescriptionsApi } from '../api/prescriptionsApi';
import CreatePrescriptionModal from '../components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../components/ViewPrescriptionModal';
import { PrescriptionTemplatesPage } from './PrescriptionTemplatesPage';

function getStatusTone(status: string): 'green' | 'blue' | 'red' | 'gray' {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'green';
  if (s === 'completed') return 'blue';
  if (s === 'cancelled') return 'red';
  return 'gray';
}

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
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  // Sorting & pagination state matching Doctor page
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

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

  // Unique doctor options for common filter dropdown
  const doctorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of prescriptions) {
      const docName = p.doctor?.name || 'Dr. Narendran';
      counts.set(docName, (counts.get(docName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [prescriptions]);

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
            (m.generic_name || '').toLowerCase().includes(term),
        );
        return idMatch || patientMatch || doctorMatch || diagMatch || medMatch;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => (p.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (doctorFilter !== 'all') {
      list = list.filter((p) => (p.doctor?.name || 'Dr. Narendran') === doctorFilter);
    }
    return list;
  }, [prescriptions, searchTerm, statusFilter, doctorFilter]);

  const handleDownload = useCallback(
    async (id: string) => {
      const hideLoading = message.loading('Downloading prescription PDF...', 0);
      try {
        await prescriptionsApi.downloadPdf(id);
      } catch (err: unknown) {
        message.error(getErrorMessage(err, 'Failed to download prescription PDF.'));
      } finally {
        hideLoading();
      }
    },
    [message],
  );

  // CommonTable columns matching Doctor page layout
  const columns: CommonTableColumn<Prescription>[] = useMemo(
    () => [
      {
        id: 'id',
        header: 'Prescription',
        width: 170,
        sort: (r) => r.prescription_date || r.created_at || r.id,
        cell: (r) => (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewingPrescription(r);
              }}
              className="font-mono text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              #{r.id.slice(0, 8).toUpperCase()}
            </button>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
              <Calendar size={11} className="text-slate-400" />
              <span>{r.prescription_date}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'patient',
        header: 'Patient',
        sort: (r) => (r.patient_name || '').toLowerCase(),
        cell: (r) => (
          <PrimaryAvatarCell
            name={r.patient_name || 'Patient'}
            sub={
              [r.patient_gender, r.patient_phone].filter(Boolean).join(' · ') || 'No contact info'
            }
            onOpen={() => setViewingPrescription(r)}
          />
        ),
      },
      {
        id: 'doctor',
        header: 'Doctor',
        sort: (r) => (r.doctor?.name || '').toLowerCase(),
        cell: (r) => (
          <div>
            <div className="font-medium text-slate-900">
              {r.doctor?.name || 'Dr. Narendran'}
            </div>
            <div className="ui-cell-sub">
              {r.doctor?.specialization || r.doctor?.specialty || 'General Medicine'}
            </div>
          </div>
        ),
      },
      {
        id: 'diagnosis',
        header: 'Diagnosis & Medicines',
        sort: (r) => (r.diagnosis || r.additional_notes || '').toLowerCase(),
        cell: (r) => {
          const medCount = r.medicines?.length || r.medicines_count || 0;
          const labCount = r.lab_tests?.length || 0;
          return (
            <div>
              <div
                className="font-medium text-slate-800 max-w-[260px] truncate"
                title={r.diagnosis || r.additional_notes || 'General Consultation'}
              >
                {r.diagnosis || r.additional_notes || 'General Consultation'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge tone="blue">
                  <span className="inline-flex items-center gap-1">
                    <Pill size={11} />
                    {medCount} {medCount === 1 ? 'medicine' : 'medicines'}
                  </span>
                </Badge>
                {labCount > 0 && (
                  <Badge tone="neutral">
                    {labCount} {labCount === 1 ? 'lab test' : 'lab tests'}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        width: 120,
        sort: (r) => r.status,
        cell: (r) => (
          <StatusPill label={titleCase(r.status)} tone={getStatusTone(r.status)} />
        ),
      },
    ],
    [],
  );

  // Sorted & paginated rows
  const sortedPrescriptions = useMemo(() => {
    const list = [...filteredPrescriptions];
    const col = sort && columns.find((c) => c.id === sort.id);
    if (col?.sort && sort) {
      const key = col.sort;
      const dir = sort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    return list;
  }, [filteredPrescriptions, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedPrescriptions.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = sortedPrescriptions.slice(startIdx, startIdx + perPage);

  const toggleSort = (id: string) => {
    setSort((prev) => {
      if (prev?.id !== id) return { id, dir: 'asc' };
      if (prev.dir === 'asc') return { id, dir: 'desc' };
      return null;
    });
  };

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

  return (
    <div
      className="ui-page prescriptions-page"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @media (max-height: 650px) {
          .prescriptions-page {
            overflow-y: auto !important;
          }
        }
      `}</style>

      {/* Top Header matching Doctor & CommonPageHeader pages */}
      <div className="shrink-0">
        <CommonPageHeader
          title="Prescriptions & Consultations"
          subtitle="Direct doctor prescription creation, patient history, adherence tracking, and PDF generation."
          {...(activeTab === 'list'
            ? {
                loading,
                onRefresh: () => {
                  void fetchPrescriptions();
                },
              }
            : {})}
          {...(activeTab === 'list' && isRxCreatable
            ? {
                createLabel: 'Create Prescription',
                onCreate: () => setIsCreateOpen(true),
              }
            : {})}
        />
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('list')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>Prescriptions List</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'list'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {prescriptions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('templates')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings size={14} />
          <span>Template &amp; Layout</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Common Search & Filter Bar */}
          <CommonFilterBar
            className="!justify-start shrink-0"
            search={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            searchPlaceholder="Search patient name, phone, doctor, diagnosis, or medicine..."
            dropdowns={[
              {
                id: 'status',
                label: 'Status',
                allLabel: 'All Statuses',
                value: statusFilter === 'all' ? '' : statusFilter,
                onChange: (val) => {
                  setStatusFilter(val || 'all');
                  setPage(1);
                },
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ],
              },
              ...(doctorOptions.length > 0
                ? [
                    {
                      id: 'doctor',
                      label: 'Doctor',
                      allLabel: 'All Doctors',
                      value: doctorFilter === 'all' ? '' : doctorFilter,
                      onChange: (val: string) => {
                        setDoctorFilter(val || 'all');
                        setPage(1);
                      },
                      options: doctorOptions,
                    },
                  ]
                : []),
            ]}
            hasActiveFilters={
              Boolean(searchTerm.trim()) || statusFilter !== 'all' || doctorFilter !== 'all'
            }
            onReset={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDoctorFilter('all');
              setPage(1);
            }}
          />

          {/* Common Table View matching Doctor page */}
          <div className="flex-1 min-h-0 overflow-y-auto [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
            <CommonTable<Prescription>
              columns={columns}
              data={pageRows}
              loading={loading}
              sort={sort}
              onSortChange={toggleSort}
              onRowClick={(r) => setViewingPrescription(r)}
              rowActions={(r) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPrescription(r);
                    }}
                    title="View Details"
                    aria-label="View Details"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload(r.id);
                    }}
                    title="Download PDF"
                    aria-label="Download PDF"
                  >
                    <Download size={12} /> PDF
                  </button>
                  {r.status === 'active' && isRxUpdatable && (
                    <button
                      type="button"
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPrescription(r);
                      }}
                      title="Edit Prescription"
                      aria-label="Edit Prescription"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}
              emptyState={
                <div className="py-10 text-center">
                  <FileText size={36} className="text-slate-300 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-600">
                    No prescriptions found
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isRxCreatable
                      ? 'Create a prescription directly using the "+ Create Prescription" button.'
                      : 'Try adjusting your search or filter criteria.'}
                  </div>
                </div>
              }
            />
          </div>

          {/* Common Pagination Footer */}
          <CommonPagination
            total={sortedPrescriptions.length}
            startIdx={sortedPrescriptions.length === 0 ? 0 : startIdx + 1}
            endIdx={startIdx + pageRows.length}
            nounPlural="prescriptions"
            page={current}
            pageCount={pageCount}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
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
