import { App } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { exportToCSV } from '../components/ui/CommonTable';
import { PrimaryCell } from '../components/ui/DataView';
import { Alert, cx, StatusDot } from '../components/ui/primitives';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { patientTimelinesApi } from '../features/timelines/services/patientTimelinesApi';
import type { AdminPatientListItem } from '../features/timelines/types/patientTimelines';
import { formatDate, formatPatientAge, timeAgo, titleCase } from '../lib/format';

const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);
const PAGE_SIZES = [10, 20, 50, 100];

export default function PatientTimelinesPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [patients, setPatients] = useState<AdminPatientListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

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

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (genderFilter !== 'ALL') params.gender = genderFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.registeredFrom = dateRange[0].startOf('day').toISOString();
        params.registeredTo = dateRange[1].endOf('day').toISOString();
      }

      const res = await patientTimelinesApi.getPatients(params);
      if (res && res.data) {
        setPatients(res.data);
        setTotalCount(res.pagination?.totalCount || res.data.length);
        setSyncedAt(Date.now());
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to load registered patients';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, genderFilter, statusFilter, dateRange, message]);

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  const resetFilters = () => {
    setSearch('');
    setGenderFilter('ALL');
    setStatusFilter('ALL');
    setDateRange(null);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      genderFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      (dateRange && (dateRange[0] || dateRange[1])),
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + patients.length, totalCount);

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  const handleExport = () => {
    if (patients.length === 0) return;
    const exportColumns = [
      {
        header: 'Patient ID',
        key: (p: AdminPatientListItem) => `#${p.id.slice(0, 8).toUpperCase()}`,
      },
      { header: 'Patient Name', key: (p: AdminPatientListItem) => p.name },
      {
        header: 'Gender',
        key: (p: AdminPatientListItem) => (p.gender ? titleCase(p.gender) : 'Not specified'),
      },
      {
        header: 'Age',
        key: (p: AdminPatientListItem) => formatPatientAge(p.date_of_birth),
      },
      {
        header: 'DOB',
        key: (p: AdminPatientListItem) =>
          p.date_of_birth ? formatDate(p.date_of_birth) : 'Not set',
      },
      { header: 'Mobile Number', key: (p: AdminPatientListItem) => p.phone || 'No phone' },
      {
        header: 'Registered Date',
        key: (p: AdminPatientListItem) => formatDate(p.created_at),
      },
      { header: 'Status', key: (p: AdminPatientListItem) => p.status },
    ];
    exportToCSV(
      `patient_timelines_${new Date().toISOString().split('T')[0]}`,
      patients,
      exportColumns,
    );
    void message.success(`Exported ${patients.length} patient records to CSV`);
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
            Patient Timelines
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            View and explore the complete medical history, consultations, prescriptions, and lab
            investigations of registered patients.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {syncedLabel && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block mr-1">
              {syncedLabel}
            </span>
          )}

          <button
            type="button"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            onClick={() => void fetchPatients()}
            aria-label="Refresh Patients"
            title="Refresh patient list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={handleExport}
            title="Export patient records to CSV"
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {/* ── Main Unified Container: Filters + Table + Pagination (Matching Patients DataView) ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* ── Filter Bar Section ── */}
        <div className="flex items-center gap-2 flex-wrap px-3 sm:px-3.5 py-2.5 border-b border-slate-100 bg-white">
          {/* Search Input */}
          <div className="relative flex items-center flex-1 min-w-[160px] sm:min-w-[200px] max-w-full sm:max-w-xs shrink-0">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ID, phone, email…"
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              aria-label="Search patients"
            />
            <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
              ⌘K
            </span>
          </div>

          {/* Gender Filter Dropdown */}
          <div className="shrink-0 flex-1 sm:flex-initial min-w-[125px] sm:min-w-0">
            <SearchableSelect
              size="sm"
              variant="default"
              aria-label="Gender"
              value={genderFilter === 'ALL' ? '' : genderFilter}
              onChange={(val) => {
                setGenderFilter(val || 'ALL');
                setPage(1);
              }}
              placeholder="All genders"
              searchable={false}
              options={[
                { value: '', label: 'All genders' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="shrink-0 flex-1 sm:flex-initial min-w-[125px] sm:min-w-0">
            <SearchableSelect
              size="sm"
              variant="default"
              aria-label="Status"
              value={statusFilter === 'ALL' ? '' : statusFilter}
              onChange={(val) => {
                setStatusFilter(val || 'ALL');
                setPage(1);
              }}
              placeholder="All statuses"
              searchable={false}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active only' },
                { value: 'INACTIVE', label: 'Inactive only' },
              ]}
            />
          </div>

          {/* Registration Date Range */}
          <div className="ui-daterange flex items-center gap-1 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs shrink-0 max-w-full overflow-x-auto">
            <span className="text-slate-400 font-medium text-[11px] select-none">Registered:</span>
            <input
              type="date"
              value={dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : ''}
              max={dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined}
              onChange={(e) => {
                const val = e.target.value;
                const newFrom = val ? dayjs(val) : null;
                const newTo = dateRange?.[1] || null;
                if (!newFrom && !newTo) {
                  setDateRange(null);
                } else {
                  setDateRange([newFrom, newTo] as any);
                }
                setPage(1);
              }}
              aria-label="Registered from"
              className="bg-transparent text-xs text-slate-700 outline-none w-24 cursor-pointer"
            />
            <ArrowRight size={11} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : ''}
              min={dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined}
              onChange={(e) => {
                const val = e.target.value;
                const newFrom = dateRange?.[0] || null;
                const newTo = val ? dayjs(val) : null;
                if (!newFrom && !newTo) {
                  setDateRange(null);
                } else {
                  setDateRange([newFrom, newTo] as any);
                }
                setPage(1);
              }}
              aria-label="Registered to"
              className="bg-transparent text-xs text-slate-700 outline-none w-24 cursor-pointer"
            />
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className={cx(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs cursor-pointer shrink-0',
              hasActiveFilters
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60',
            )}
            title="Reset all filters"
          >
            <span>Reset</span>
            <X size={12} className="text-slate-500" />
          </button>
        </div>

        {/* ── Table Section ── */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                <th className="w-28 px-3.5 py-2 select-none whitespace-nowrap">Patient ID</th>
                <th className="px-3.5 py-2 whitespace-nowrap min-w-[200px]">Patient Name</th>
                <th className="w-24 px-3.5 py-2 whitespace-nowrap">Gender</th>
                <th className="w-36 px-3.5 py-2 whitespace-nowrap">Age & DOB</th>
                <th className="w-36 px-3.5 py-2 whitespace-nowrap">Mobile Number</th>
                <th className="w-36 px-3.5 py-2 whitespace-nowrap">Registered Date</th>
                <th className="w-24 px-3.5 py-2 whitespace-nowrap">Status</th>
                <th className="w-32 px-3.5 py-2 text-right whitespace-nowrap font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {loading ? (
                SKELETON_ROWS.map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="w-28 px-3.5 py-2">
                      <div className="h-4 bg-slate-100 rounded w-16" />
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="w-24 px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-12" />
                    </td>
                    <td className="w-36 px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-16" />
                    </td>
                    <td className="w-36 px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="w-36 px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="w-24 px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-12" />
                    </td>
                    <td className="w-32 px-3.5 py-2 text-right">
                      <div className="h-6 bg-slate-100 rounded w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                        <SearchX size={22} />
                      </div>
                      <strong className="text-xs font-semibold text-slate-700">
                        No matching patients found
                      </strong>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        Try a different search term or remove filters to explore patient timelines.
                      </span>
                      {hasActiveFilters && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            onClick={resetFilters}
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  return (
                    <tr
                      key={patient.id}
                      className="group transition-colors duration-100 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => navigate(`/patient-timelines/${patient.id}`)}
                    >
                      {/* Patient ID */}
                      <td className="w-28 px-3.5 py-2 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60">
                          #{patient.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>

                      {/* Patient Name + Avatar */}
                      <td className="px-3.5 py-2">
                        <PrimaryCell
                          name={patient.name}
                          sub={
                            patient.hospital_name ||
                            patient.branch_name ||
                            'Dr. Narendran Hospital'
                          }
                          avatarSrc={patient.profile_image_url}
                          onOpen={() => navigate(`/patient-timelines/${patient.id}`)}
                        />
                      </td>

                      {/* Gender */}
                      <td className="w-24 px-3.5 py-2 whitespace-nowrap">
                        {patient.gender ? (
                          <span style={{ color: 'var(--ui-text, #0f172a)', fontWeight: 500 }}>
                            {titleCase(patient.gender)}
                          </span>
                        ) : (
                          <span className="ui-muted">—</span>
                        )}
                      </td>

                      {/* Age & DOB */}
                      <td className="w-36 px-3.5 py-2 whitespace-nowrap">
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--ui-text, #0f172a)' }}>
                            {formatPatientAge(patient.date_of_birth)}
                          </div>
                          <div className="ui-cell-sub">
                            {patient.date_of_birth
                              ? `Born ${formatDate(patient.date_of_birth)}`
                              : 'DOB not set'}
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number */}
                      <td className="w-36 px-3.5 py-2 whitespace-nowrap">
                        {patient.phone ? (
                          <span style={{ color: 'var(--ui-text, #0f172a)', fontWeight: 500 }}>
                            {patient.phone}
                          </span>
                        ) : (
                          <span className="ui-muted">No phone</span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="w-36 px-3.5 py-2 whitespace-nowrap">
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--ui-text, #0f172a)' }}>
                            {formatDate(patient.created_at)}
                          </div>
                          <div className="ui-cell-sub flex items-center gap-1 mt-0.5">
                            <Clock size={11} className="inline text-slate-400" />
                            <span>{timeAgo(patient.created_at, now)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="w-24 px-3.5 py-2 whitespace-nowrap">
                        <StatusDot active={patient.status?.toUpperCase() === 'ACTIVE'} />
                      </td>

                      {/* Action Button: View Timeline */}
                      <td className="w-32 px-3.5 py-2 text-right whitespace-nowrap align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patient-timelines/${patient.id}`);
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="View clinical timeline"
                        >
                          <span>View Timeline</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination Section (Matching Patients Page Design) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-t border-slate-100 bg-white text-xs text-slate-500 w-full">
          <div className="text-center sm:text-left w-full sm:w-auto">
            {patients.length === 0 ? (
              'No results'
            ) : (
              <>
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startIdx + 1}–{endIdx}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalCount}</span> registered
                patients
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
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
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
                      'w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-2xs',
                      page === p
                        ? 'border border-slate-200 bg-slate-50 text-slate-900 font-bold'
                        : 'border border-transparent bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-200',
                    )}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
