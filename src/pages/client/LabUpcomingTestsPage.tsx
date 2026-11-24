import { App } from 'antd';
import {
  ArrowUpDown,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Search,
  Stethoscope,
  Upload,
  UploadCloud,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { StatusPill, type StatusTone } from '../../components/ui/CommonTable';
import { Modal } from '../../components/ui/Modal';
import { cx } from '../../components/ui/primitives';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export interface UpcomingTestItem {
  id: string;
  prescription_id?: string | undefined;
  prescriptionId?: string | undefined;
  patient_id: string;
  patientId?: string | undefined;
  patient_name: string;
  patientName?: string | undefined;
  patient_phone?: string | null | undefined;
  patientPhone?: string | null | undefined;
  patient_email?: string | null | undefined;
  patientEmail?: string | null | undefined;
  patient_gender?: string | null | undefined;
  patientGender?: string | null | undefined;
  patient_dob?: string | null | undefined;
  patientDob?: string | null | undefined;
  doctor_id?: string | undefined;
  doctorId?: string | undefined;
  doctor_name: string;
  doctorName?: string | undefined;
  doctor_specialization?: string | null | undefined;
  doctorSpecialization?: string | null | undefined;
  test_name: string;
  testName?: string | undefined;
  test_category?: string | null | undefined;
  testCategory?: string | null | undefined;
  instructions?: string | null | undefined;
  prescription_date: string;
  prescriptionDate?: string | undefined;
  scheduled_date?: string | null | undefined;
  scheduledDate?: string | null | undefined;
  status: 'Upcoming' | 'Scheduled' | 'In Progress' | 'Pending';
  diagnosis?: string | null | undefined;
  notes?: string | null | undefined;
  lab_id?: string | null | undefined;
  labId?: string | null | undefined;
  lab_name?: string | null | undefined;
  labName?: string | null | undefined;
}

interface RawUpcomingTestPatient {
  id?: string | undefined;
  name?: string | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  gender?: string | null | undefined;
  dateOfBirth?: string | null | undefined;
}

interface RawUpcomingTestDoctor {
  id?: string | undefined;
  name?: string | undefined;
  specialization?: string | null | undefined;
  specialty?: string | null | undefined;
}

interface RawUpcomingTestLab {
  id?: string | undefined;
  name?: string | undefined;
}

interface RawUpcomingTestRecord {
  id?: string | undefined;
  _id?: string | undefined;
  prescription_id?: string | undefined;
  prescriptionId?: string | undefined;
  patient_id?: string | undefined;
  patientId?: string | undefined;
  patient_name?: string | undefined;
  patientName?: string | undefined;
  patient_phone?: string | null | undefined;
  patientPhone?: string | null | undefined;
  patient_email?: string | null | undefined;
  patientEmail?: string | null | undefined;
  patient_gender?: string | null | undefined;
  patientGender?: string | null | undefined;
  patient_dob?: string | null | undefined;
  patientDob?: string | null | undefined;
  patient?: RawUpcomingTestPatient | undefined;
  doctor_id?: string | undefined;
  doctorId?: string | undefined;
  doctor_name?: string | undefined;
  doctorName?: string | undefined;
  doctor_specialization?: string | null | undefined;
  doctorSpecialization?: string | null | undefined;
  doctor?: RawUpcomingTestDoctor | undefined;
  test_name?: string | undefined;
  testName?: string | undefined;
  test_category?: string | null | undefined;
  testCategory?: string | null | undefined;
  category?: string | null | undefined;
  instructions?: string | null | undefined;
  notes?: string | null | undefined;
  additional_notes?: string | null | undefined;
  prescription_date?: string | undefined;
  prescriptionDate?: string | undefined;
  createdAt?: string | undefined;
  scheduled_date?: string | null | undefined;
  scheduledDate?: string | null | undefined;
  expected_date?: string | null | undefined;
  expectedDate?: string | null | undefined;
  status?: string | undefined;
  diagnosis?: string | null | undefined;
  prescription?: {
    diagnosis?: string | null | undefined;
    additional_notes?: string | null | undefined;
  } | undefined;
  lab_id?: string | null | undefined;
  labId?: string | null | undefined;
  lab?: RawUpcomingTestLab | undefined;
  lab_name?: string | null | undefined;
  labName?: string | null | undefined;
}

interface StoredLabUser {
  id?: string;
  name?: string;
}

/** Format ISO date into friendly standard display format (e.g., 19 Nov 2026) */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Normalize date to YYYY-MM-DD for comparison */
function toDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0] ?? '';
  } catch {
    return '';
  }
}

/** Check if given date matches today in local timezone */
function isDateToday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const target = toDateOnly(dateStr);
  const today = toDateOnly(new Date().toISOString());
  return target === today;
}

/** Check if date is tomorrow */
function isDateTomorrow(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const target = toDateOnly(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return target === toDateOnly(tomorrow.toISOString());
}

/** Check if date is within next N days */
function isDateWithinNextDays(dateStr?: string | null, days = 7): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const limit = new Date(now);
    limit.setDate(limit.getDate() + days);
    return d >= now && d <= limit;
  } catch {
    return false;
  }
}

/** Status tone mapping for upcoming test badges */
function getStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === 'scheduled' || s === 'upcoming') return 'blue';
  if (s === 'in progress' || s === 'in_progress') return 'amber';
  if (s === 'pending') return 'amber';
  return 'blue';
}

/** Normalizes raw incoming test object from API into UpcomingTestItem */
function normalizeUpcomingTestRecord(
  raw: RawUpcomingTestRecord,
  index: number,
): UpcomingTestItem | null {
  const statusRaw = (raw.status ?? 'Upcoming').trim();
  const sLower = statusRaw.toLowerCase();

  // Strict exclusion: completed, cancelled, and uploaded tests are not upcoming
  if (
    sLower === 'completed' ||
    sLower === 'cancelled' ||
    sLower === 'canceled' ||
    sLower === 'uploaded' ||
    sLower === 'rejected'
  ) {
    return null;
  }

  const patientId =
    raw.patient_id ?? raw.patientId ?? raw.patient?.id ?? `PAT-${1000 + index}`;
  const patientName =
    raw.patient_name ?? raw.patientName ?? raw.patient?.name ?? 'Unknown Patient';
  const patientPhone =
    raw.patient_phone ?? raw.patientPhone ?? raw.patient?.phone ?? null;
  const patientEmail =
    raw.patient_email ?? raw.patientEmail ?? raw.patient?.email ?? null;
  const patientGender =
    raw.patient_gender ?? raw.patientGender ?? raw.patient?.gender ?? null;
  const patientDob =
    raw.patient_dob ?? raw.patientDob ?? raw.patient?.dateOfBirth ?? null;

  const doctorId = raw.doctor_id ?? raw.doctorId ?? raw.doctor?.id ?? '';
  const doctorName =
    raw.doctor_name ?? raw.doctorName ?? raw.doctor?.name ?? 'Attending Physician';
  const doctorSpecialization =
    raw.doctor_specialization ??
    raw.doctorSpecialization ??
    raw.doctor?.specialization ??
    raw.doctor?.specialty ??
    'General Medicine';

  const testName = raw.test_name ?? raw.testName ?? 'Laboratory Test';
  const testCategory =
    raw.test_category ??
    raw.testCategory ??
    raw.category ??
    'Diagnostic Investigation';

  const prescriptionDate =
    raw.prescription_date ??
    raw.prescriptionDate ??
    raw.createdAt ??
    (new Date().toISOString().split('T')[0] ?? '');

  const scheduledDate =
    raw.scheduled_date ??
    raw.scheduledDate ??
    raw.expected_date ??
    raw.expectedDate ??
    prescriptionDate;

  let normalizedStatus: UpcomingTestItem['status'] = 'Upcoming';
  if (sLower === 'scheduled') {
    normalizedStatus = 'Scheduled';
  } else if (sLower === 'in progress' || sLower === 'in_progress') {
    normalizedStatus = 'In Progress';
  } else if (sLower === 'pending') {
    normalizedStatus = 'Pending';
  }

  return {
    id: String(raw.id ?? raw._id ?? `upcoming-test-${index}`),
    prescription_id: raw.prescription_id ?? raw.prescriptionId,
    patient_id: patientId,
    patient_name: patientName,
    patient_phone: patientPhone,
    patient_email: patientEmail,
    patient_gender: patientGender,
    patient_dob: patientDob,
    doctor_id: doctorId,
    doctor_name: doctorName,
    doctor_specialization: doctorSpecialization,
    test_name: testName,
    test_category: testCategory,
    instructions: raw.instructions ?? raw.notes ?? null,
    prescription_date: prescriptionDate,
    scheduled_date: scheduledDate,
    status: normalizedStatus,
    diagnosis: raw.diagnosis ?? raw.prescription?.diagnosis ?? null,
    notes: raw.notes ?? raw.additional_notes ?? null,
    lab_id: raw.lab_id ?? raw.labId ?? raw.lab?.id ?? null,
    lab_name: raw.lab_name ?? raw.labName ?? raw.lab?.name ?? null,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function LabUpcomingTestsPage() {
  const { message } = App.useApp();

  // Primary data state
  const [tests, setTests] = useState<UpcomingTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Report Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingTest, setUploadingTest] = useState<UpcomingTestItem | null>(null);
  const [reportDate, setReportDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? '',
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Scheduled' | 'In Progress' | 'Pending'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [doctorFilter, setDoctorFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK'>('ALL');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<'scheduled_date' | 'prescription_date' | 'patient_name' | 'test_name'>('scheduled_date');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View mode (List vs Cards)
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    try {
      const saved = localStorage.getItem('labClientUpcomingTestsViewMode');
      return saved === 'card' ? 'card' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleViewModeChange = (mode: 'list' | 'card') => {
    setViewMode(mode);
    try {
      localStorage.setItem('labClientUpcomingTestsViewMode', mode);
    } catch {
      // ignore
    }
  };

  // Selected test for Slide-in Drawer
  const [selectedTest, setSelectedTest] = useState<UpcomingTestItem | null>(null);

  // Authenticated lab identification from session
  const authenticatedLab = useMemo((): StoredLabUser | null => {
    try {
      const stored = localStorage.getItem('labClientLab');
      return stored ? (JSON.parse(stored) as StoredLabUser) : null;
    } catch {
      return null;
    }
  }, []);

  // Fetch upcoming tests with dedicated lab-scoping
  const fetchUpcomingTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Primary: dedicated endpoint for authenticated lab's upcoming tests
      const res = await api.get<RawUpcomingTestRecord[] | { tests?: RawUpcomingTestRecord[] }>('lab-portal/upcoming-tests');
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.tests)
          ? res.data.tests
          : [];

      const parsed: UpcomingTestItem[] = [];
      rawList.forEach((item: RawUpcomingTestRecord, idx: number) => {
        // Enforce lab-level scoping: if lab_id is provided in the record, ensure it matches authenticated lab
        const itemLabId = item.lab_id ?? item.labId ?? item.lab?.id;
        if (
          authenticatedLab?.id &&
          itemLabId &&
          String(itemLabId) !== String(authenticatedLab.id)
        ) {
          return;
        }
        const norm = normalizeUpcomingTestRecord(item, idx);
        if (norm) parsed.push(norm);
      });

      setTests(parsed);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to retrieve upcoming tests for your lab.');
      setError(errorMsg);
      void message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [authenticatedLab?.id, message]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUpcomingTests();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUpcomingTests]);

  // Dynamic filter options based on available test records
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.test_category) set.add(t.test_category);
    });
    return Array.from(set).sort();
  }, [tests]);

  const doctorOptions = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.doctor_name) set.add(t.doctor_name);
    });
    return Array.from(set).sort();
  }, [tests]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalUpcoming = tests.length;
    let scheduledToday = 0;
    let inProgress = 0;
    const patientIds = new Set<string>();

    tests.forEach((t) => {
      if (isDateToday(t.scheduled_date)) scheduledToday += 1;
      if (t.status === 'In Progress') inProgress += 1;
      if (t.patient_id) patientIds.add(t.patient_id);
    });

    return {
      totalUpcoming,
      scheduledToday,
      inProgress,
      uniquePatients: patientIds.size,
    };
  }, [tests]);

  // Filtered & Sorted tests
  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tests
      .filter((t) => {
        // Search filter: Patient name, Patient ID, Test name, Doctor name
        if (query) {
          const matchPatientName = t.patient_name.toLowerCase().includes(query);
          const matchPatientId = t.patient_id.toLowerCase().includes(query);
          const matchTestName = t.test_name.toLowerCase().includes(query);
          const matchDoctorName = t.doctor_name.toLowerCase().includes(query);
          if (!matchPatientName && !matchPatientId && !matchTestName && !matchDoctorName) {
            return false;
          }
        }

        // Status tab filter
        if (statusFilter !== 'ALL' && t.status !== statusFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter && t.test_category !== categoryFilter) {
          return false;
        }

        // Doctor filter
        if (doctorFilter && t.doctor_name !== doctorFilter) {
          return false;
        }

        // Date filter
        if (dateFilter === 'TODAY' && !isDateToday(t.scheduled_date)) {
          return false;
        }
        if (dateFilter === 'TOMORROW' && !isDateTomorrow(t.scheduled_date)) {
          return false;
        }
        if (dateFilter === 'WEEK' && !isDateWithinNextDays(t.scheduled_date, 7)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: string = a[sortField] ?? '';
        let valB: string = b[sortField] ?? '';
        if (sortField === 'scheduled_date' || sortField === 'prescription_date') {
          valA = a[sortField] ?? '9999-99-99';
          valB = b[sortField] ?? '9999-99-99';
        }
        const cmp = valA.localeCompare(valB);
        return sortAsc ? cmp : -cmp;
      });
  }, [
    tests,
    searchQuery,
    statusFilter,
    categoryFilter,
    doctorFilter,
    dateFilter,
    sortField,
    sortAsc,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTests.length / pageSize) || 1;
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    searchQuery ||
      statusFilter !== 'ALL' ||
      categoryFilter ||
      doctorFilter ||
      dateFilter !== 'ALL',
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('');
    setDoctorFilter('');
    setDateFilter('ALL');
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: 'ALL' | 'Scheduled' | 'In Progress' | 'Pending') => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleDoctorFilterChange = (val: string) => {
    setDoctorFilter(val);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (val: 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK') => {
    setDateFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export filtered upcoming tests to CSV
  const handleExportCSV = () => {
    if (filteredTests.length === 0) {
      void message.warning('No upcoming tests available to export.');
      return;
    }

    const headers = [
      'Patient ID',
      'Patient Name',
      'Patient Phone',
      'Doctor Name',
      'Doctor Specialization',
      'Test Name',
      'Test Category',
      'Prescription Date',
      'Scheduled Date',
      'Status',
      'Clinical Instructions',
    ];

    const rows = filteredTests.map((t) => [
      t.patient_id,
      t.patient_name,
      t.patient_phone ?? '',
      t.doctor_name,
      t.doctor_specialization ?? '',
      t.test_name,
      t.test_category ?? '',
      t.prescription_date,
      t.scheduled_date ?? '',
      t.status,
      (t.instructions ?? '').replace(/"/g, '""'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `upcoming_tests_${new Date().toISOString().split('T')[0] ?? 'list'}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    void message.success(`Exported ${filteredTests.length} upcoming tests.`);
  };

  // Trigger Direct Upload Report Modal
  const handleOpenUploadModal = (test: UpcomingTestItem) => {
    setUploadingTest(test);
    setReportDate(new Date().toISOString().split('T')[0] ?? '');
    setSelectedFile(null);
    setNotes('');
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    if (uploading) return;
    setIsUploadModalOpen(false);
    setUploadingTest(null);
    setSelectedFile(null);
    setNotes('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        void message.error('File size exceeds the 15MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingTest) {
      void message.error('No test selected for report upload.');
      return;
    }
    if (!selectedFile) {
      void message.error('Please select a report file to upload (PDF, PNG, JPG).');
      return;
    }

    const patientId = uploadingTest.patient_id;
    if (!patientId) {
      void message.error('Patient record ID is missing.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('testName', uploadingTest.test_name);
    formData.append('prescriptionLabTestId', uploadingTest.id);
    if (uploadingTest.prescription_id) {
      formData.append('prescriptionId', uploadingTest.prescription_id);
    }
    if (uploadingTest.patient_phone) {
      formData.append('patientPhone', uploadingTest.patient_phone);
    }
    if (uploadingTest.patient_name) {
      formData.append('patientName', uploadingTest.patient_name);
    }
    if (reportDate) {
      formData.append('reportDate', reportDate);
    }
    if (notes.trim()) {
      formData.append('notes', notes.trim());
    }

    setUploading(true);
    try {
      await api.post(`lab-portal/patients/${encodeURIComponent(patientId)}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      void message.success(`Report for "${uploadingTest.test_name}" uploaded successfully!`);
      handleCloseUploadModal();
      if (selectedTest?.id === uploadingTest.id) {
        setSelectedTest(null);
      }
      void fetchUpcomingTests();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to upload report.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ui-page space-y-3 pb-8">
      {/* ── Executive Page Header Matching HMS Admin Design ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Upcoming Tests
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Doctor Prescribed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Laboratory investigations prescribed by doctors assigned to your diagnostic facility awaiting testing and report creation.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              void fetchUpcomingTests();
            }}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh upcoming tests"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || filteredTests.length === 0}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>Export List</span>
          </button>
        </div>
      </header>

      {/* ── Statistics Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Upcoming */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Upcoming Tests
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {stats.totalUpcoming}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active doctor orders</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <CalendarClock size={16} />
          </div>
        </div>

        {/* Scheduled Today */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Scheduled Today
            </div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 tracking-tight mt-0.5">
              {stats.scheduledToday}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Expected for test today</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Calendar size={16} />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              In Progress
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 tracking-tight mt-0.5">
              {stats.inProgress}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sample processing</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <FlaskConical size={16} />
          </div>
        </div>

        {/* Patients Awaiting */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Patients Awaiting
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight mt-0.5">
              {stats.uniquePatients}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Unique individuals</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users size={16} />
          </div>
        </div>
      </div>

      {/* ── Main Unified Listing Container: Filters + Table ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            {/* Status Filter Tabs */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/60">
              {(['ALL', 'Scheduled', 'In Progress', 'Pending'] as const).map((tab) => {
                const count =
                  tab === 'ALL'
                    ? tests.length
                    : tests.filter((t) => t.status === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleStatusFilterChange(tab)}
                    className={cx(
                      'h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                      statusFilter === tab
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900',
                    )}
                  >
                    <span>{tab === 'ALL' ? 'All Tests' : tab}</span>
                    <span
                      className={cx(
                        'px-1.5 py-0.2 rounded text-[10px] font-semibold',
                        statusFilter === tab
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200/70 text-slate-600',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex items-center min-w-[200px] max-w-[280px] flex-1 sm:flex-initial">
              <Search
                size={13}
                className="absolute left-2.5 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search patient, ID, doctor, test..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Right Filters: Category, Doctor, Date Range, Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            {categoryOptions.length > 0 && (
              <div className="w-38 shrink-0">
                <SearchableSelect
                  size="sm"
                  variant="default"
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange}
                  placeholder="All Categories"
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categoryOptions.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            )}

            {/* Doctor Dropdown */}
            {doctorOptions.length > 0 && (
              <div className="w-42 shrink-0">
                <SearchableSelect
                  size="sm"
                  variant="default"
                  value={doctorFilter}
                  onChange={handleDoctorFilterChange}
                  placeholder="All Doctors"
                  options={[
                    { value: '', label: 'All Doctors' },
                    ...doctorOptions.map((d) => ({ value: d, label: d })),
                  ]}
                />
              </div>
            )}

            {/* Date Preset Dropdown */}
            <div className="w-34 shrink-0">
              <SearchableSelect
                size="sm"
                variant="default"
                value={dateFilter}
                onChange={(val) => handleDateFilterChange(val as 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK')}
                placeholder="All Dates"
                options={[
                  { value: 'ALL', label: 'All Dates' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'TOMORROW', label: 'Tomorrow' },
                  { value: 'WEEK', label: 'Next 7 Days' },
                ]}
              />
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* View Mode Toggle (List / Cards) */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <LayoutList size={13} strokeWidth={2.2} />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('card')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Card View"
                aria-label="Card View"
              >
                <LayoutGrid size={13} strokeWidth={2.2} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / Content Section ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs text-slate-500 font-medium">
              Loading upcoming prescribed tests...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <X size={18} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Failed to load upcoming tests
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">{error}</p>
            <button
              type="button"
              onClick={() => {
                void fetchUpcomingTests();
              }}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        ) : paginatedTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <CalendarClock size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {hasActiveFilters
                ? 'No matching upcoming tests found'
                : 'No upcoming tests for your lab'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {hasActiveFilters
                ? 'Try adjusting your search criteria, category, doctor, or date filters to find tests.'
                : 'When doctors prescribe laboratory tests and assign them to your lab, they will appear here.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Clear All Filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void fetchUpcomingTests();
                }}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Refresh Tests</span>
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleSort('patient_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Patient</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleSort('test_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Prescribed Test</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="py-2.5 px-3.5">
                    Prescribing Doctor
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleSort('prescription_date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Prescription Date</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleSort('scheduled_date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Scheduled Date</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="py-2.5 px-3.5">
                    Status
                  </th>
                  <th scope="col" className="py-2.5 px-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedTests.map((t) => {
                  const initial = (t.patient_name ?? 'P').trim().charAt(0).toUpperCase();
                  const isTodayTest = isDateToday(t.scheduled_date);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTest(t)}
                    >
                      {/* Patient Cell */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7.5 h-7.5 rounded-full shrink-0 flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 select-none uppercase"
                            aria-hidden="true"
                          >
                            {initial}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {t.patient_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono text-slate-500 font-medium">
                                #{t.patient_id}
                              </span>
                              {t.patient_phone && (
                                <>
                                  <span>•</span>
                                  <span>{t.patient_phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Prescribed Test Cell */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-slate-900">
                              {t.test_name}
                            </span>
                            {t.test_category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {t.test_category}
                              </span>
                            )}
                          </div>
                          {t.instructions ? (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                              "{t.instructions}"
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              Standard lab protocol
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Prescribing Doctor Cell */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-900">
                            {t.doctor_name}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {t.doctor_specialization ?? 'Clinical Specialist'}
                          </span>
                        </div>
                      </td>

                      {/* Prescription Date Cell */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{formatDate(t.prescription_date)}</span>
                        </div>
                      </td>

                      {/* Scheduled Date Cell */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cx(
                              'inline-flex items-center gap-1 text-xs font-medium',
                              isTodayTest
                                ? 'text-indigo-600 font-semibold'
                                : 'text-slate-700',
                            )}
                          >
                            <Calendar
                              size={12}
                              className={cx(
                                'shrink-0',
                                isTodayTest ? 'text-indigo-500' : 'text-slate-400',
                              )}
                            />
                            <span>{formatDate(t.scheduled_date)}</span>
                          </div>
                          {isTodayTest && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Cell */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <StatusPill
                          tone={getStatusTone(t.status)}
                          label={t.status}
                        />
                      </td>

                      {/* Actions Cell */}
                      <td
                        className="py-2.5 px-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedTest(t)}
                            title="View test & prescription details"
                            className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal(t)}
                            title="Upload lab report for patient"
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <UploadCloud size={12} />
                            <span className="hidden sm:inline">Upload Report</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="p-3.5 sm:p-4 bg-slate-50/50 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[320px] overscroll-contain transition-all"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 transparent',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-2">
              {paginatedTests.map((t) => {
                const initial = (t.patient_name ?? 'P').trim().charAt(0).toUpperCase();
                const isTodayTest = isDateToday(t.scheduled_date);
                const patientIdDisplay = t.patient_id?.startsWith('PA_')
                  ? t.patient_id
                  : t.patient_id && t.patient_id.length > 10
                    ? `${t.patient_id.slice(0, 8)}...`
                    : t.patient_id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTest(t)}
                    className="group bg-white rounded-xl border border-slate-200/90 hover:border-blue-400/80 p-3.5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between relative"
                  >
                    <div>
                      {/* Top Row: Patient Avatar, Name, Phone & Status Pill */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100 select-none uppercase shadow-2xs"
                            aria-hidden="true"
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={t.patient_name}>
                              {t.patient_name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              {patientIdDisplay && (
                                <span
                                  className="font-mono text-slate-500 font-medium shrink-0"
                                  title={`Patient ID: ${t.patient_id}`}
                                >
                                  #{patientIdDisplay}
                                </span>
                              )}
                              {t.patient_phone && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[110px]" title={t.patient_phone}>{t.patient_phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusPill
                          tone={getStatusTone(t.status)}
                          label={t.status}
                        />
                      </div>

                      {/* Prescribed Test Highlight Box */}
                      <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 mb-3">
                        <div className="flex items-start gap-1.5">
                          <FlaskConical size={13} className="text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-900 block truncate">
                              {t.test_name}
                            </span>
                            {t.test_category && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                                {t.test_category}
                              </span>
                            )}
                            {t.instructions ? (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                                "{t.instructions}"
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 mt-1 block">
                                Standard lab protocol
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Key Metadata: Doctor & Dates */}
                      <div className="space-y-1.5 text-xs text-slate-600 mb-3 border-t border-slate-100/80 pt-2.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <Stethoscope size={12} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{t.doctor_name}</span>
                          <span className="text-slate-400 text-[10px] truncate">
                            ({t.doctor_specialization ?? 'Specialist'})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar
                              size={12}
                              className={isTodayTest ? 'text-indigo-500 shrink-0' : 'text-slate-400 shrink-0'}
                            />
                            <span className={isTodayTest ? 'text-indigo-600 font-semibold' : 'text-slate-600'}>
                              {formatDate(t.scheduled_date)}
                            </span>
                          </div>
                          {isTodayTest && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock size={11} className="shrink-0" />
                          <span>Prescribed: {formatDate(t.prescription_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      className="pt-2 border-t border-slate-100 flex items-center gap-1.5 justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedTest(t)}
                        title="View test & prescription details"
                        className="h-7.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUploadModal(t)}
                        title="Upload lab report for patient"
                        className="h-7.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer flex-1 justify-center"
                      >
                        <UploadCloud size={12} />
                        <span>Upload Report</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Table Footer / Pagination ── */}
        {!loading && !error && filteredTests.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 border-t border-slate-100 bg-white text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="text-slate-800">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, filteredTests.length)}
                </strong>{' '}
                of{' '}
                <strong className="text-slate-800">
                  {filteredTests.length}
                </strong>{' '}
                upcoming tests
              </span>
              <div className="inline-flex items-center gap-1 ml-2">
                <span className="text-[11px] text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="h-6 px-1.5 rounded border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-in Right Drawer: View Test Details ── */}
      <Modal
        open={Boolean(selectedTest)}
        onClose={() => setSelectedTest(null)}
        variant="drawer"
        size="xl"
        title="Upcoming Test Details"
        description="Prescription order and diagnostic investigation requirements"
      >
        {selectedTest && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-2">
                <StatusPill
                  tone={getStatusTone(selectedTest.status)}
                  label={selectedTest.status}
                />
                <span className="text-xs font-semibold text-slate-800">
                  {selectedTest.test_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Expected Date</span>
                <span className="text-xs font-bold text-slate-900">
                  {formatDate(selectedTest.scheduled_date)}
                </span>
              </div>
            </div>

            {/* Patient Information Section */}
            <div className="border border-slate-200/90 rounded-lg p-3.5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                <User size={13} className="text-slate-400" />
                <span>Patient Demographics</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Full Name</span>
                  <span className="font-semibold text-slate-900">
                    {selectedTest.patient_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Patient ID</span>
                  <span className="font-mono font-medium text-slate-800">
                    #{selectedTest.patient_id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Contact Number</span>
                  <span className="font-medium text-slate-800">
                    {selectedTest.patient_phone ?? 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Gender & DOB</span>
                  <span className="font-medium text-slate-800">
                    {selectedTest.patient_gender ?? '—'}
                    {selectedTest.patient_dob ? ` • ${selectedTest.patient_dob}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribing Doctor Section */}
            <div className="border border-slate-200/90 rounded-lg p-3.5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                <Stethoscope size={13} className="text-slate-400" />
                <span>Prescribing Physician</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Doctor Name</span>
                  <span className="font-semibold text-slate-900">
                    {selectedTest.doctor_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Specialization</span>
                  <span className="font-medium text-slate-800">
                    {selectedTest.doctor_specialization ?? 'General Medicine'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prescribed Test Details */}
            <div className="border border-slate-200/90 rounded-lg p-3.5 bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                <FlaskConical size={13} className="text-slate-400" />
                <span>Investigation Details</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Test Category</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTest.test_category ?? 'General Diagnostic'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Prescription Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(selectedTest.prescription_date)}
                  </span>
                </div>
                {selectedTest.instructions && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-900">
                    <span className="text-[11px] font-bold block uppercase tracking-wider text-amber-800 mb-0.5">
                      Doctor's Clinical Instructions:
                    </span>
                    <p className="text-xs italic leading-relaxed">
                      "{selectedTest.instructions}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prescription Clinical Notes */}
            {(selectedTest.diagnosis ?? selectedTest.notes) && (
              <div className="border border-slate-200/90 rounded-lg p-3.5 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  <FileText size={13} className="text-slate-400" />
                  <span>Clinical Prescription Notes</span>
                </div>
                {selectedTest.diagnosis && (
                  <div className="text-xs">
                    <span className="text-slate-400 text-[11px] block">Diagnosis</span>
                    <span className="font-medium text-slate-800">
                      {selectedTest.diagnosis}
                    </span>
                  </div>
                )}
                {selectedTest.notes && (
                  <div className="text-xs">
                    <span className="text-slate-400 text-[11px] block">Additional Notes</span>
                    <span className="text-slate-700 leading-relaxed">
                      {selectedTest.notes}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons in Drawer */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedTest;
                  if (target) {
                    handleOpenUploadModal(target);
                  }
                }}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <UploadCloud size={13} />
                <span>Upload Lab Report</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Direct Upload Report Modal ── */}
      <Modal
        open={isUploadModalOpen && Boolean(uploadingTest)}
        onClose={handleCloseUploadModal}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <UploadCloud size={16} />
            </div>
            <span>Upload Test Report</span>
          </div>
        }
        description={
          uploadingTest ? (
            <span>
              Patient: <strong className="text-slate-800 font-semibold">{uploadingTest.patient_name}</strong>
              {uploadingTest.patient_phone ? ` (${uploadingTest.patient_phone})` : ''}
            </span>
          ) : undefined
        }
        size="md"
      >
        <form
          onSubmit={(e) => {
            void handleUploadSubmit(e);
          }}
          className="p-4 sm:p-5 space-y-3.5 text-xs"
        >
          {/* Prescribed Test Info Badge */}
          {uploadingTest && (
            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Doctor Prescribed Test</span>
                <div className="font-bold text-xs text-blue-950 mt-0.5">
                  {uploadingTest.test_name}
                </div>
                {uploadingTest.instructions && (
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    Note: {uploadingTest.instructions}
                  </p>
                )}
              </div>
              <div className="text-right text-[11px] text-slate-500 shrink-0 ml-3">
                <div>Prescribed by</div>
                <div className="font-semibold text-slate-800">{uploadingTest.doctor_name || 'Dr. Narendran'}</div>
                <div className="text-[10px] text-slate-400">{uploadingTest.prescription_date}</div>
              </div>
            </div>
          )}

          {/* Report Date */}
          <div>
            <label htmlFor="reportDateInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Report Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="reportDateInput"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              required
            />
          </div>

          {/* File Upload Zone */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Report Document (PDF, PNG, JPG) <span className="text-rose-500">*</span>
            </span>
            <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-4 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="reportFileInput"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={18} className="text-blue-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="reportFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-1"
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Upload size={15} />
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Click to browse or drop report file here
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Supported: PDF, JPG, PNG (Max 15MB)
                  </p>
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="reportNotesInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Observations (Optional)
            </label>
            <textarea
              id="reportNotesInput"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Test completed successfully, values within standard range..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseUploadModal}
              disabled={uploading}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={13} />
                  <span>Upload Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
