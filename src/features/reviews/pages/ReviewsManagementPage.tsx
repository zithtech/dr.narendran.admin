import { App } from 'antd';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  Flag,
  ListFilter,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import { CommonPagination, exportToCSV } from '../../../components/ui/CommonTable';
import { Alert, Badge, cx } from '../../../components/ui/primitives';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { ViewModeSwitcher } from '../../../components/ui/ViewModeSwitcher';
import { formatDate, timeAgo } from '../../../lib/format';
import { getErrorMessage } from '../../../utils/errors';
import { ReviewDetailsDrawer } from '../components/ReviewDetailsDrawer';
import { reviewsApi } from '../services/reviewsApi';
import type {
  DoctorRatingSummary,
  DoctorReviewItem,
} from '../types/reviews';

const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);

export const ReviewsManagementPage: React.FC = () => {
  const { message } = App.useApp();
  const { canUpdate } = usePermission();
  const canModerate = canUpdate('REVIEWS');

  // Active Tab: 'reviews' | 'doctors'
  const [activeTab, setActiveTab] = useState<'reviews' | 'doctors'>('reviews');

  // Reviews list & pagination
  const [reviews, setReviews] = useState<DoctorReviewItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Sync timestamps
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Doctor summaries
  const [doctorSummaries, setDoctorSummaries] = useState<DoctorRatingSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);

  // Drawer state
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Fetch reviews list
  const fetchReviews = useCallback(
    async (pageToFetch = pagination.page, limitToFetch = pagination.limit) => {
      try {
        setLoading(true);
        setError(null);
        const data = await reviewsApi.getAdminReviews({
          page: pageToFetch,
          limit: limitToFetch,
          doctor_id: selectedDoctorId || undefined,
          rating: selectedRating ? Number(selectedRating) : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        setReviews(data.reviews);
        setPagination((prev) => ({
          ...prev,
          page: data.pagination.page,
          limit: data.pagination.limit,
          totalCount: data.pagination.totalCount,
          totalPages: data.pagination.totalPages,
        }));
        setSyncedAt(Date.now());
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Failed to fetch reviews.');
        setError(msg);
        message.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.page,
      pagination.limit,
      selectedDoctorId,
      selectedRating,
      selectedStatus,
      search,
      startDate,
      endDate,
      message,
    ],
  );

  // Fetch doctor summaries
  const fetchDoctorSummaries = useCallback(async () => {
    try {
      setSummariesLoading(true);
      const data = await reviewsApi.getDoctorRatingSummaries();
      setDoctorSummaries(data);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load doctor rating summaries.');
      message.error(msg);
    } finally {
      setSummariesLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchReviews(1);
      void fetchDoctorSummaries();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchReviews, fetchDoctorSummaries]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDoctorId('');
    setSelectedRating('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    void fetchReviews(1);
  };

  const handleOpenDrawer = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedReviewId(null);
  };

  const handleReviewUpdated = () => {
    void fetchReviews(pagination.page);
    void fetchDoctorSummaries();
  };

  // Check if any filter is actively applied
  const isFiltered = Boolean(
    search.trim() ||
    selectedDoctorId ||
    selectedRating ||
    selectedStatus !== 'ALL' ||
    startDate ||
    endDate,
  );

  // Compact summary metrics (Calculated from real backend doctor summaries)
  const summaryMetrics = useMemo(() => {
    const relevantDocs = selectedDoctorId
      ? doctorSummaries.filter((d) => d.doctorId === selectedDoctorId)
      : doctorSummaries;

    if (relevantDocs.length === 0) {
      return {
        totalReviews: pagination.totalCount,
        averageRating: '—',
        star5Count: 0,
        lowRatedCount: 0,
      };
    }

    const totalReviews = relevantDocs.reduce((acc, d) => acc + (d.totalReviews ?? 0), 0);
    const totalStars = relevantDocs.reduce(
      (acc, d) => acc + (d.averageRating ?? 0) * (d.totalReviews ?? 0),
      0,
    );
    const star5Count = relevantDocs.reduce((acc, d) => acc + (d.distribution?.star5 ?? 0), 0);
    const lowRatedCount = relevantDocs.reduce(
      (acc, d) => acc + (d.distribution?.star1 ?? 0) + (d.distribution?.star2 ?? 0),
      0,
    );

    const averageRating =
      totalReviews > 0 ? (totalStars / totalReviews).toFixed(1) : '—';

    return {
      totalReviews: totalReviews !== 0 ? totalReviews : pagination.totalCount,
      averageRating,
      star5Count,
      lowRatedCount,
    };
  }, [doctorSummaries, selectedDoctorId, pagination.totalCount]);

  // CSV Export
  const handleExport = () => {
    if (reviews.length === 0) return;
    const exportColumns = [
      {
        header: 'Review ID',
        key: (r: DoctorReviewItem) => `#${r.id.slice(0, 8).toUpperCase()}`,
      },
      {
        header: 'Patient Name',
        key: (r: DoctorReviewItem) => r.patient_name ?? 'Patient',
      },
      {
        header: 'Doctor Name',
        key: (r: DoctorReviewItem) => r.doctor_name ?? 'Dr. Narendran',
      },
      {
        header: 'Doctor Specialty',
        key: (r: DoctorReviewItem) => r.doctor_specialty ?? 'General Consultation',
      },
      {
        header: 'Rating (out of 5)',
        key: (r: DoctorReviewItem) => `${r.rating}`,
      },
      {
        header: 'Feedback / Comment',
        key: (r: DoctorReviewItem) => r.review_comment ?? 'No comment provided',
      },
      {
        header: 'Review Date',
        key: (r: DoctorReviewItem) => formatDate(r.created_at),
      },
      {
        header: 'Status',
        key: (r: DoctorReviewItem) => r.status,
      },
    ];

    exportToCSV(
      `ratings_and_reviews_${new Date().toISOString().split('T')[0]}`,
      reviews,
      exportColumns,
    );
    void message.success(`Exported ${reviews.length} reviews to CSV`);
  };

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  const startIdx = (pagination.page - 1) * pagination.limit;
  const endIdx = Math.min(startIdx + reviews.length, pagination.totalCount);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge tone="green">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>Active</span>
            </span>
          </Badge>
        );
      case 'FLAGGED':
        return (
          <Badge tone="amber">
            <span className="inline-flex items-center gap-1">
              <Flag size={11} />
              <span>Flagged</span>
            </span>
          </Badge>
        );
      case 'HIDDEN':
        return (
          <Badge tone="red">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert size={11} />
              <span>Hidden</span>
            </span>
          </Badge>
        );
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1" title={`${rating}.0 out of 5 stars`}>
        <div className="flex items-center">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={12}
              className={
                i < rating
                  ? 'text-amber-400 fill-amber-400 shrink-0'
                  : 'text-slate-200 fill-slate-200 shrink-0'
              }
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-800 tabular-nums">
          {rating}.0
        </span>
      </div>
    );
  };

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header Matching Patients Page ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Ratings & Reviews
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Monitor patient consultation feedback, doctor ratings, and review moderation.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {syncedLabel && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block mr-1">
              {syncedLabel}
            </span>
          )}

          {/* Tab Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs w-full xs:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={cx(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex-1 xs:flex-initial',
                activeTab === 'reviews'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <ListFilter size={12} />
              <span>All Reviews</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {pagination.totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('doctors')}
              className={cx(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex-1 xs:flex-initial',
                activeTab === 'doctors'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <BarChart2 size={12} />
              <span>Doctor Summaries</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {doctorSummaries.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer shrink-0"
            onClick={() => {
              void fetchReviews(pagination.page);
              void fetchDoctorSummaries();
            }}
            aria-label="Refresh Reviews"
            title="Refresh ratings and reviews"
          >
            <RefreshCw
              size={13}
              className={loading || summariesLoading ? 'animate-spin' : ''}
            />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            onClick={handleExport}
            disabled={reviews.length === 0}
            title="Export reviews to CSV"
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {/* ── Compact Summary Section (Section 3.B) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {/* Metric 1: Total Reviews */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Reviews
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquare size={13} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {summaryMetrics.totalReviews}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {selectedDoctorId ? 'For selected doctor' : 'Across all doctors'}
            </span>
          </div>
        </div>

        {/* Metric 2: Average Rating */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Average Rating
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Star size={13} className="fill-amber-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {summaryMetrics.averageRating}
            </span>
            {summaryMetrics.averageRating !== '—' && (
              <span className="text-[10px] sm:text-[11px] text-amber-600 font-medium">/ 5.0</span>
            )}
          </div>
        </div>

        {/* Metric 3: 5-Star Reviews */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              5-Star Reviews
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {summaryMetrics.star5Count}
            </span>
            <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">
              {summaryMetrics.totalReviews > 0
                ? `${Math.round((summaryMetrics.star5Count / summaryMetrics.totalReviews) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Metric 4: Low-Rated Reviews (1-2 Stars) */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Low-Rated (1–2★)
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {summaryMetrics.lowRatedCount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">Requires attention</span>
          </div>
        </div>
      </div>

      {/* ── Main View Content ── */}
      {activeTab === 'reviews' ? (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          {/* ── Unified Filter Bar Matching Patients Page ── */}
          <div className="p-3 border-b border-slate-200/80 bg-white">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
              {/* Left: Search input with ⌘K shortcut and Mobile Filter Accordion Toggle */}
              <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
                <div className="relative flex-1">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search patient, doctor, comment… (⌘K)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Mobile Filter Accordion Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsFilterAccordionOpen((prev) => !prev)}
                  className={cx(
                    'lg:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs',
                    isFilterAccordionOpen
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : isFiltered
                        ? 'border-blue-200 bg-blue-50/70 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  aria-expanded={isFilterAccordionOpen}
                  aria-label="Toggle filters"
                >
                  <ListFilter size={13} className={isFiltered ? 'text-blue-600' : 'text-slate-500'} />
                  <span>Filters</span>
                  {isFiltered && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white leading-none">
                      {(selectedDoctorId ? 1 : 0) +
                        (selectedRating ? 1 : 0) +
                        (selectedStatus !== 'ALL' ? 1 : 0) +
                        (startDate || endDate ? 1 : 0)}
                    </span>
                  )}
                  {isFilterAccordionOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* Right: Dropdowns and Date Range */}
              <div
                className={cx(
                  'items-center gap-2 flex-wrap justify-start lg:justify-end w-full lg:w-auto transition-all duration-200',
                  isFilterAccordionOpen
                    ? 'flex flex-col sm:flex-row items-stretch sm:items-center pt-2 lg:pt-0 border-t border-slate-100 lg:border-0'
                    : 'hidden lg:flex',
                )}
              >
                {/* Doctor Filter */}
                <div className="shrink-0 w-full sm:w-auto">
                  <SearchableSelect
                    options={[
                      { value: '', label: 'All Doctors' },
                      ...doctorSummaries.map((doc) => ({
                        value: doc.doctorId,
                        label: doc.doctorName,
                        sublabel: `${doc.averageRating}★ (${doc.totalReviews} reviews)`,
                      })),
                    ]}
                    value={selectedDoctorId}
                    onChange={(val) => setSelectedDoctorId(val)}
                    placeholder="All Doctors"
                    size="sm"
                    width={160}
                  />
                </div>

                {/* Rating Filter */}
                <div className="shrink-0 w-full sm:w-auto">
                  <SearchableSelect
                    options={[
                      { value: '', label: 'All Ratings' },
                      { value: '5', label: '5 Stars ★★★★★' },
                      { value: '4', label: '4 Stars ★★★★☆' },
                      { value: '3', label: '3 Stars ★★★☆☆' },
                      { value: '2', label: '2 Stars ★★☆☆☆' },
                      { value: '1', label: '1 Star ★☆☆☆☆' },
                    ]}
                    value={selectedRating}
                    onChange={(val) => setSelectedRating(val)}
                    placeholder="All Ratings"
                    size="sm"
                    width={130}
                  />
                </div>

                {/* Status Filter */}
                <div className="shrink-0 w-full sm:w-auto">
                  <SearchableSelect
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'ACTIVE', label: 'Active', badgeTone: 'green' },
                      { value: 'FLAGGED', label: 'Flagged', badgeTone: 'amber' },
                      { value: 'HIDDEN', label: 'Hidden', badgeTone: 'red' },
                    ]}
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                    placeholder="All Statuses"
                    size="sm"
                    width={125}
                  />
                </div>

                {/* Date Range Inputs */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs w-full sm:w-auto">
                  <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs text-slate-700 bg-transparent focus:outline-none w-[110px]"
                    title="Start date"
                  />
                  <span className="text-slate-300">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs text-slate-700 bg-transparent focus:outline-none w-[110px]"
                    title="End date"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-slate-400 hover:text-slate-600 ml-0.5 cursor-pointer"
                      title="Clear date range"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Reset button if any filter is active */}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
                    title="Reset all filters"
                  >
                    <X size={12} />
                    <span>Reset</span>
                  </button>
                )}

                {/* View Mode Switcher */}
                <ViewModeSwitcher
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>
            </div>
          </div>

          {/* ── Cards View Section ── */}
          {viewMode === 'cards' && (
            <div className="p-3 sm:p-4 bg-slate-50/50 min-h-[300px] border-b border-slate-200">
              {loading && reviews.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SKELETON_ROWS.map((idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 w-28 bg-slate-200 rounded" />
                        <div className="h-5 w-16 bg-slate-200 rounded-full" />
                      </div>
                      <div className="h-3 w-40 bg-slate-100 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                      <div className="h-12 w-full bg-slate-50 rounded" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="px-3.5 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <Star size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm">
                    No ratings or reviews found.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isFiltered
                      ? 'Try adjusting your search criteria or resetting active filters.'
                      : 'No patient reviews have been submitted yet.'}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <X size={12} />
                      <span>Clear Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reviews.map((r) => (
                    <div
                      key={`card-${r.id}`}
                      className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between"
                      onClick={() => handleOpenDrawer(r.id)}
                    >
                      <div className="space-y-2.5">
                        {/* Row 1: Patient Name, Appt ID & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-sm block truncate">
                              {r.patient_name ?? 'Patient'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Appt: #{r.appointment_id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <div className="shrink-0">{renderStatusBadge(r.status)}</div>
                        </div>

                        {/* Row 2: Doctor Name & Specialty */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/80 px-2.5 py-1.5 rounded-md border border-slate-100">
                          <span className="font-medium text-slate-900 truncate">
                            {r.doctor_name ?? 'Dr. Narendran'}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 truncate">
                            {r.doctor_specialty ?? 'General Consultation'}
                          </span>
                        </div>

                        {/* Row 3: Rating Stars & Date */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div>{renderStars(r.rating)}</div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatDate(r.created_at)} ({timeAgo(r.created_at, now)})
                          </span>
                        </div>

                        {/* Row 4: Review Comment Quote */}
                        {r.review_comment ? (
                          <blockquote className="text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/70 italic leading-relaxed line-clamp-3">
                            "{r.review_comment}"
                          </blockquote>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] block">
                            No written comment
                          </span>
                        )}
                      </div>

                      {/* Row 5: Action Button */}
                      <div
                        className="pt-2 border-t border-slate-100 flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(r.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye size={13} className="text-slate-500" />
                          <span>{canModerate ? 'View & Moderate Review' : 'View Details'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Table Section ── */}
          {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: 760 }}>
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc]">
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Review / Feedback
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Review Date
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading && reviews.length === 0 ? (
                  SKELETON_ROWS.map((idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-3.5 py-2.5">
                        <div className="h-3 w-28 bg-slate-200 rounded mb-1" />
                        <div className="h-2 w-16 bg-slate-100 rounded" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="h-3 w-24 bg-slate-200 rounded mb-1" />
                        <div className="h-2 w-20 bg-slate-100 rounded" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="h-3 w-48 bg-slate-200 rounded" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="h-5 w-16 bg-slate-200 rounded-full" />
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="h-7 w-16 bg-slate-200 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3.5 py-16 text-center text-slate-400">
                      <Star size={36} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">
                        No ratings or reviews found.
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isFiltered
                          ? 'Try adjusting your search criteria or resetting active filters.'
                          : 'No patient reviews have been submitted yet.'}
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => {
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => handleOpenDrawer(r.id)}
                      >
                        {/* Patient Name & Appointment Reference */}
                        <td className="px-3.5 py-2">
                          <span className="font-medium text-slate-900 block">
                            {r.patient_name ?? 'Patient'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Appt: #{r.appointment_id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>

                        {/* Doctor Name & Specialty */}
                        <td className="px-3.5 py-2">
                          <span className="font-medium text-slate-900 block">
                            {r.doctor_name ?? 'Dr. Narendran'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {r.doctor_specialty ?? 'General Consultation'}
                          </span>
                        </td>

                        {/* Star Rating */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {renderStars(r.rating)}
                        </td>

                        {/* Review / Feedback Comment */}
                        <td className="px-3.5 py-2 max-w-xs xl:max-w-md">
                          {r.review_comment ? (
                            <p
                              className="text-slate-700 italic truncate"
                              title={r.review_comment}
                            >
                              "{r.review_comment}"
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              No written comment
                            </span>
                          )}
                        </td>

                        {/* Review Date */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          <span className="font-medium text-slate-700 block">
                            {formatDate(r.created_at)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {timeAgo(r.created_at, now)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {renderStatusBadge(r.status)}
                        </td>

                        {/* Action Button */}
                        <td
                          className="px-3.5 py-2 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(r.id)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="View review details & moderation options"
                          >
                            <Eye size={12} className="text-slate-500 group-hover:text-blue-600" />
                            <span>{canModerate ? 'View & Moderate' : 'View'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* ── Standard Pagination Footer (Matching SupportCenterPage & CommonTable) ── */}
          <CommonPagination
            total={pagination.totalCount}
            startIdx={pagination.totalCount === 0 ? 0 : startIdx + 1}
            endIdx={endIdx}
            nounPlural="reviews"
            page={pagination.page}
            pageCount={pagination.totalPages}
            perPage={pagination.limit}
            onPageChange={(p) => {
              setPagination((prev) => ({ ...prev, page: p }));
              void fetchReviews(p);
            }}
            onPerPageChange={(l) => {
              setPagination((prev) => ({ ...prev, limit: l, page: 1 }));
              void fetchReviews(1, l);
            }}
          />
        </div>
      ) : (
        /* ── Tab 2: Doctor Summaries ── */
        <div className="space-y-3">
          {summariesLoading ? (
            <div className="bg-white border border-slate-200/90 rounded-lg p-12 text-center text-slate-400 shadow-2xs">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
              <p className="text-xs font-medium text-slate-500">Loading doctor rating metrics…</p>
            </div>
          ) : doctorSummaries.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-lg p-12 text-center text-slate-400 shadow-2xs">
              <Users size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">No doctor profiles found.</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Doctor summaries will appear here once consultations and ratings are recorded.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {doctorSummaries.map((doc) => {
                const total = doc.totalReviews || 0;
                return (
                  <div
                    key={doc.doctorId}
                    className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    {/* Header: Doctor info & overall score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {doc.profileImageUrl ? (
                          <img
                            src={doc.profileImageUrl}
                            alt={doc.doctorName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                            Dr
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {doc.doctorName}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {doc.specialization ?? 'Consultant Physician'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-amber-500 justify-end">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span className="text-base font-bold text-slate-900 tabular-nums">
                            {doc.averageRating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {total} {total === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    </div>

                    {/* Status Distribution Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <Badge tone="green">{doc.activeReviews} Active</Badge>
                      {doc.flaggedReviews > 0 && (
                        <Badge tone="amber">{doc.flaggedReviews} Flagged</Badge>
                      )}
                      {doc.hiddenReviews > 0 && (
                        <Badge tone="red">{doc.hiddenReviews} Hidden</Badge>
                      )}
                    </div>

                    {/* Rating Breakdown Bars */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {[
                        { stars: 5, count: doc.distribution?.star5 || 0 },
                        { stars: 4, count: doc.distribution?.star4 || 0 },
                        { stars: 3, count: doc.distribution?.star3 || 0 },
                        { stars: 2, count: doc.distribution?.star2 || 0 },
                        { stars: 1, count: doc.distribution?.star1 || 0 },
                      ].map((item) => {
                        const pct = total > 0 ? (item.count / total) * 100 : 0;
                        return (
                          <div key={item.stars} className="flex items-center gap-2 text-xs">
                            <span className="w-5 text-slate-500 font-medium text-[11px]">
                              {item.stars}★
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-slate-400 font-mono text-[11px]">
                              {item.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick filter action */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(doc.doctorId);
                        setActiveTab('reviews');
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="w-full mt-1 h-7.5 inline-flex items-center justify-center text-xs font-semibold rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      View Reviews for {doc.doctorName} →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Review Details & Moderation Drawer ── */}
      <ReviewDetailsDrawer
        reviewId={selectedReviewId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onReviewUpdated={handleReviewUpdated}
      />
    </div>
  );
};
