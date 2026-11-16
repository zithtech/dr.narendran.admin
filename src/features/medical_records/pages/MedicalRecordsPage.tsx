import { App } from 'antd';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { exportToCSV } from '../../../components/ui/CommonTable';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { Badge, cx } from '../../../components/ui/primitives';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { timeAgo } from '../../../lib/format';
import { EditMedicalRecordModal } from '../components/EditMedicalRecordModal';
import { MedicalRecordPreviewModal } from '../components/MedicalRecordPreviewModal';
import { PatientDossierView } from '../components/PatientDossierView';
import { UploadMedicalRecordModal } from '../components/UploadMedicalRecordModal';
import { medicalRecordsApi } from '../services/medicalRecordsApi';
import type {
  MedicalRecord,
  PatientDossier,
  PrescribedPendingTest,
} from '../types/medicalRecords';

const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);
const PAGE_SIZES = [10, 20, 50, 100];

export default function MedicalRecordsPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { patientId: routePatientId } = useParams<{ patientId?: string }>();

  // Selected Patient State for Dossier Mode
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    routePatientId || searchParams.get('patientId') || null,
  );

  useEffect(() => {
    if (routePatientId) {
      setSelectedPatientId(routePatientId);
    } else if (searchParams.get('patientId')) {
      setSelectedPatientId(searchParams.get('patientId'));
    }
  }, [routePatientId, searchParams]);

  const [dossier, setDossier] = useState<PatientDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Patient Quick Search Autocomplete
  const [patientSearchOptions, setPatientSearchOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // All Records Table State
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRESCRIBED' | 'EXTERNAL'>('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Modals & Dialogs State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activePrescribedTest, setActivePrescribedTest] =
    useState<PrescribedPendingTest | null>(null);
  const [previewRecord, setPreviewRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search (matching Patients page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update relative sync label periodically
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Load Patient Dossier
  const loadDossier = useCallback(
    async (pId: string) => {
      setLoadingDossier(true);
      try {
        const data = await medicalRecordsApi.getPatientDossier(pId);
        setDossier(data);
        setSyncedAt(Date.now());
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Failed to load patient dossier');
        setDossier(null);
      } finally {
        setLoadingDossier(false);
      }
    },
    [message],
  );

  // Fetch All Records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        type: typeFilter,
      };

      if (search.trim()) params.search = search.trim();
      if (uploaderFilter !== 'ALL') params.uploadedBy = uploaderFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await medicalRecordsApi.getMedicalRecords(params);
      setRecords(res.records || []);
      setTotalCount(res.pagination?.total || 0);
      setSyncedAt(Date.now());
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to fetch medical records');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter, uploaderFilter, fromDate, toDate, message]);

  // Synchronize URL param with state
  useEffect(() => {
    const urlPatientId = searchParams.get('patientId');
    if (urlPatientId) {
      setSelectedPatientId(urlPatientId);
      void loadDossier(urlPatientId);
    } else {
      setSelectedPatientId(null);
      setDossier(null);
      void fetchRecords();
    }
  }, [searchParams, loadDossier, fetchRecords]);

  // Patient Quick Search in Header
  useEffect(() => {
    void (async () => {
      try {
        const results = await medicalRecordsApi.getAllPatients();
        setPatientSearchOptions(
          results.map((p) => ({
            value: p.id,
            label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
          })),
        );
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSearchParams({ patientId });
    void loadDossier(patientId);
  };

  const handleClearPatient = () => {
    setSelectedPatientId(null);
    setDossier(null);
    setSearchParams({});
    void fetchRecords();
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await medicalRecordsApi.deleteMedicalRecord(recordToDelete.id);
      message.success(`Medical record "${recordToDelete.testName}" deleted`);
      setRecordToDelete(null);
      if (selectedPatientId) {
        void loadDossier(selectedPatientId);
      } else {
        void fetchRecords();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to delete record');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getUploaderBadgeTone = (uploadedBy?: string) => {
    switch (uploadedBy?.toUpperCase()) {
      case 'ADMIN':
        return 'violet';
      case 'DOCTOR':
        return 'blue';
      case 'LAB':
        return 'amber';
      case 'PATIENT':
        return 'green';
      default:
        return 'neutral';
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() || typeFilter !== 'ALL' || uploaderFilter !== 'ALL' || fromDate || toDate,
  );

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setUploaderFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + records.length, totalCount);

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  const defaultPatientProp = useMemo(() => {
    return selectedPatientId && dossier
      ? { id: dossier.patient.id, name: dossier.patient.name }
      : null;
  }, [selectedPatientId, dossier?.patient?.id, dossier?.patient?.name]);

  const handleExport = () => {
    if (records.length === 0) return;
    const exportColumns = [
      { header: 'Report Date', key: (r: MedicalRecord) => r.reportDate || '—' },
      { header: 'Patient Name', key: (r: MedicalRecord) => r.patientName },
      { header: 'Patient Phone', key: (r: MedicalRecord) => r.patientPhone || '—' },
      { header: 'Record / Test Name', key: (r: MedicalRecord) => r.testName },
      { header: 'File Name', key: (r: MedicalRecord) => r.fileName || '—' },
      { header: 'Category', key: (r: MedicalRecord) => (r.isExternal ? 'External Record' : 'Prescribed Lab Test') },
      { header: 'Uploaded By', key: (r: MedicalRecord) => r.uploadedBy },
      { header: 'Uploader Name', key: (r: MedicalRecord) => r.uploaderName || '—' },
      { header: 'Notes', key: (r: MedicalRecord) => r.notes || '' },
    ];
    exportToCSV(`medical_records_${new Date().toISOString().split('T')[0]}`, records, exportColumns);
    message.success(`Exported ${records.length} medical records to CSV`);
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | string)[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header Matching Patients Page ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Medical Records Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Upload, manage, and review patient lab reports and medical records directly.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {syncedLabel && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block mr-1">
              {syncedLabel}
            </span>
          )}

          {/* Quick Patient Selector */}
          <div className="w-56 shrink-0">
            <SearchableSelect
              size="sm"
              variant="default"
              placeholder="Filter by Patient..."
              searchPlaceholder="Filter patient name or phone..."
              value={selectedPatientId || ''}
              onChange={(val) => {
                if (val) handleSelectPatient(val);
                else handleClearPatient();
              }}
              options={[{ value: '', label: 'All Patients' }, ...patientSearchOptions]}
            />
          </div>

          <button
            type="button"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            onClick={() => {
              if (selectedPatientId) void loadDossier(selectedPatientId);
              else void fetchRecords();
            }}
            disabled={loading || loadingDossier}
            title="Refresh records"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading || loadingDossier ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={handleExport}
            title="Export records to CSV"
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={() => {
              setActivePrescribedTest(null);
              setIsUploadOpen(true);
            }}
          >
            <Plus size={13} strokeWidth={2.4} />
            <span>Upload Medical Record</span>
          </button>
        </div>
      </header>

      {/* ── View Switch: Patient Dossier vs All Records Table ── */}
      {selectedPatientId && loadingDossier ? (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-16 text-center text-slate-400">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-600">Loading patient dossier records...</p>
        </div>
      ) : selectedPatientId && dossier ? (
        <PatientDossierView
          dossier={dossier}
          onClose={handleClearPatient}
          onUploadClick={(prescribedTest) => {
            setActivePrescribedTest(prescribedTest || null);
            setIsUploadOpen(true);
          }}
          onPreviewClick={(record) => setPreviewRecord(record)}
          onEditClick={(record) => setEditingRecord(record)}
          onDeleteClick={(record) => setRecordToDelete(record)}
        />
      ) : (
        /* ── Main Unified Container: Filters Toolbar + Table + Pagination (Matching Patients Page Design) ── */
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          {/* ── Filter Bar Section ── */}
          <div className="flex items-center gap-2 flex-wrap px-3 sm:px-3.5 py-2.5 border-b border-slate-100 bg-white">
            {/* Search Input with ⌘K */}
            <div className="relative flex items-center flex-1 min-w-[160px] sm:min-w-[220px] max-w-full sm:max-w-xs shrink-0">
              <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search record, file, or patient…"
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                aria-label="Search records"
              />
              <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
                ⌘K
              </span>
            </div>

            {/* Record Type Filter Dropdown */}
            <div className="shrink-0 flex-1 sm:flex-initial min-w-[145px] sm:min-w-0">
              <SearchableSelect
                size="sm"
                variant="default"
                aria-label="Record Type"
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter((val as any) || 'ALL');
                  setPage(1);
                }}
                placeholder="All Record Types"
                searchable={false}
                options={[
                  { value: 'ALL', label: 'All Record Types' },
                  { value: 'PRESCRIBED', label: 'Prescribed Lab Tests' },
                  { value: 'EXTERNAL', label: 'External Medical Docs' },
                ]}
              />
            </div>

            {/* Uploaded By Filter Dropdown */}
            <div className="shrink-0 flex-1 sm:flex-initial min-w-[125px] sm:min-w-0">
              <SearchableSelect
                size="sm"
                variant="default"
                aria-label="Uploaded By"
                value={uploaderFilter}
                onChange={(val) => {
                  setUploaderFilter(val || 'ALL');
                  setPage(1);
                }}
                placeholder="All Uploaders"
                searchable={false}
                options={[
                  { value: 'ALL', label: 'All Uploaders' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'DOCTOR', label: 'Doctor' },
                  { value: 'LAB', label: 'Lab' },
                  { value: 'PATIENT', label: 'Patient' },
                ]}
              />
            </div>

            {/* Date Range Inputs */}
            <div className="ui-daterange flex items-center gap-1 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs shrink-0 max-w-full overflow-x-auto">
              <span className="text-slate-400 font-medium text-[11px] select-none">Date</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                aria-label="Report from"
                className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
              />
              <ArrowRight size={11} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                aria-label="Report to"
                className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
              />
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <span>Reset</span>
                <X size={12} className="text-slate-500" />
              </button>
            )}
          </div>

          {/* ── Table Section ── */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2 whitespace-nowrap w-28">Report Date</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-52">Patient</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Test / Document Name</th>
                  <th className="px-3.5 py-2 text-center whitespace-nowrap w-36">Category</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-32">Uploaded By</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {loading && records.length === 0 ? (
                  SKELETON_ROWS.map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3.5 py-2">
                        <div className="h-3.5 bg-slate-100 rounded w-20" />
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="h-3.5 bg-slate-100 rounded w-28 mb-1" />
                        <div className="h-2.5 bg-slate-50 rounded w-16" />
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="h-3.5 bg-slate-100 rounded w-44 mb-1" />
                        <div className="h-2.5 bg-slate-50 rounded w-28" />
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <div className="h-4 bg-slate-100 rounded w-24 mx-auto" />
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="h-4 bg-slate-100 rounded w-16 mb-1" />
                        <div className="h-2.5 bg-slate-50 rounded w-12" />
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <div className="h-5 bg-slate-100 rounded w-24 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                          {hasActiveFilters ? <SearchX size={22} /> : <FileText size={22} />}
                        </div>
                        <strong className="text-xs font-semibold text-slate-700">
                          {hasActiveFilters ? 'No matching medical records found' : 'No medical records uploaded yet'}
                        </strong>
                        <span className="text-[11px] text-slate-500 max-w-sm">
                          {hasActiveFilters
                            ? 'Try clearing filters or search terms.'
                            : 'Upload patient lab reports, discharge summaries, or clinical documents directly.'}
                        </span>
                        <div className="mt-1.5">
                          {hasActiveFilters ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              onClick={resetFilters}
                            >
                              Clear filters
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-2xs"
                              onClick={() => {
                                setActivePrescribedTest(null);
                                setIsUploadOpen(true);
                              }}
                            >
                              <Plus size={13} /> Upload Medical Record
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Report Date */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{rec.reportDate || '—'}</span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-3.5 py-2">
                        <div
                          className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer truncate"
                          onClick={() => handleSelectPatient(rec.patientId)}
                          title="View patient dossier"
                        >
                          {rec.patientName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {rec.patientPhone || 'No phone'}
                        </div>
                      </td>

                      {/* Document / Test Name */}
                      <td className="px-3.5 py-2">
                        <div
                          className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                          onClick={() => setPreviewRecord(rec)}
                          title="Click to preview document"
                        >
                          {rec.testName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rec.fileName} • {formatFileSize(rec.fileSize)}
                        </div>
                        {rec.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-md" title={rec.notes}>
                            {rec.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <Badge tone={rec.isExternal ? 'violet' : 'blue'}>
                          {rec.isExternal ? 'External Record' : 'Prescribed Lab Test'}
                        </Badge>
                      </td>

                      {/* Uploaded By */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <Badge tone={getUploaderBadgeTone(rec.uploadedBy)}>
                          {rec.uploadedBy}
                        </Badge>
                        {rec.uploaderName && (
                          <div className="text-[10.5px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                            {rec.uploaderName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => setPreviewRecord(rec)}
                            title="Preview document"
                            aria-label="Preview"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={() => window.open(rec.documentUrl, '_blank')}
                            title="Download document"
                            aria-label="Download"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            onClick={() => setEditingRecord(rec)}
                            title="Edit metadata"
                            aria-label="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            onClick={() => setRecordToDelete(rec)}
                            title="Delete record"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer / Pagination (Matching Patients Page DataView) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-t border-slate-100 bg-white text-xs text-slate-500 w-full">
            <div className="text-center sm:text-left w-full sm:w-auto">
              {records.length === 0 ? (
                'No records found'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-semibold text-slate-700">
                    {startIdx + 1}–{endIdx}
                  </span>{' '}
                  of <span className="font-semibold text-slate-700">{totalCount}</span> records
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0">
                <span className="text-slate-500">Per page</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  aria-label="Rows per page"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers.map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cx(
                        'w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-2xs',
                        page === p
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                      …
                    </span>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  aria-label="Next page"
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadMedicalRecordModal
        open={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setActivePrescribedTest(null);
        }}
        onSuccess={() => {
          if (selectedPatientId) {
            void loadDossier(selectedPatientId);
          } else {
            void fetchRecords();
          }
        }}
        defaultPatient={defaultPatientProp}
        defaultPrescribedTest={activePrescribedTest}
      />

      {/* Preview Modal */}
      <MedicalRecordPreviewModal
        record={previewRecord}
        open={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
      />

      {/* Edit Metadata Modal */}
      <EditMedicalRecordModal
        record={editingRecord}
        open={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        onSuccess={() => {
          if (selectedPatientId) {
            void loadDossier(selectedPatientId);
          } else {
            void fetchRecords();
          }
        }}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(recordToDelete)}
        title="Delete Medical Record"
        message={
          recordToDelete ? (
            <p>
              Are you sure you want to permanently delete medical record{' '}
              <strong>"{recordToDelete.testName}"</strong> for patient{' '}
              <strong>"{recordToDelete.patientName}"</strong>? This will remove the uploaded report
              document from the patient's records archive.
            </p>
          ) : null
        }
        confirmLabel="Delete Record"
        onConfirm={handleConfirmDelete}
        onClose={() => setRecordToDelete(null)}
      />
    </div>
  );
}
