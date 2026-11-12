import { App } from 'antd';
import {
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  ListFilter,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { getErrorMessage } from '../../../utils/errors';
import { ReviewDetailsDrawer } from '../components/ReviewDetailsDrawer';
import { reviewsApi } from '../services/reviewsApi';
import type {
  DoctorRatingSummary,
  DoctorReviewItem,
} from '../types/reviews';

export const ReviewsManagementPage: React.FC = () => {
  const { message } = App.useApp();

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

  // Drawer state
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch reviews list
  const fetchReviews = useCallback(
    async (pageToFetch = pagination.page) => {
      try {
        setLoading(true);
        const data = await reviewsApi.getAdminReviews({
          page: pageToFetch,
          limit: pagination.limit,
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
          totalCount: data.pagination.totalCount,
          totalPages: data.pagination.totalPages,
        }));
      } catch (err: unknown) {
        message.error(getErrorMessage(err, 'Failed to fetch reviews.'));
      } finally {
        setLoading(false);
      }
    },
    [
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
      message.error(getErrorMessage(err, 'Failed to load doctor rating summaries.'));
    } finally {
      setSummariesLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchReviews(1);
    void fetchDoctorSummaries();
  }, [fetchReviews, fetchDoctorSummaries]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDoctorId('');
    setSelectedRating('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 size={11} />
            Active
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Flag size={11} />
            Flagged
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <ShieldAlert size={11} />
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-y-auto bg-slate-50 p-6 pb-12 dark:bg-slate-950 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Star className="text-amber-500 fill-amber-500" size={26} />
            Patient Ratings & Reviews
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clinical feedback moderation, doctor rating distributions, and compliance oversight.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'reviews'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            <ListFilter size={14} />
            All Reviews
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {pagination.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'doctors'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            <BarChart2 size={14} />
            Doctor Summaries
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {doctorSummaries.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'reviews' ? (
        <>
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search patient, doctor, comment..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-indigo-500"
                />
              </div>

              {/* Doctor Dropdown Filter */}
              <div>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-indigo-500"
                >
                  <option value="">All Doctors</option>
                  {doctorSummaries.map((doc) => (
                    <option key={doc.doctorId} value={doc.doctorId}>
                      {doc.doctorName} ({doc.averageRating}★ - {doc.totalReviews} reviews)
                    </option>
                  ))}
                </select>
              </div>

              {/* Star Rating Filter */}
              <div>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-indigo-500"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars (★★★★★)</option>
                  <option value="4">4 Stars (★★★★☆)</option>
                  <option value="3">3 Stars (★★★☆☆)</option>
                  <option value="2">2 Stars (★★☆☆☆)</option>
                  <option value="1">1 Star (★☆☆☆☆)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Published)</option>
                  <option value="FLAGGED">Flagged for Moderation</option>
                  <option value="HIDDEN">Hidden (Removed)</option>
                </select>
              </div>

              {/* Date Filters & Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-200 px-2 py-2 text-[11px] text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  title="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-200 px-2 py-2 text-[11px] text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  title="End Date"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Showing {reviews.length} of {pagination.totalCount} total reviews
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => fetchReviews(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Apply & Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider dark:bg-slate-950/50 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Review Comment</th>
                    <th className="px-4 py-3">Submission Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
                        <p>Loading patient reviews...</p>
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                        <Star size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No reviews found matching current filters.
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Try clearing your filters or search terms.</p>
                      </td>
                    </tr>
                  ) : (
                    reviews.map((r) => {
                      const dateStr = r.created_at
                        ? new Date(r.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                        : '—';
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {r.patient_name || 'Patient'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Appt: {r.appointment_id.slice(0, 8)}…
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {r.doctor_name || 'Dr. Narendran'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {r.doctor_specialty || 'General Consultation'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-500 font-bold text-sm">
                                {'★'.repeat(r.rating)}
                                <span className="text-slate-300 dark:text-slate-700">
                                  {'★'.repeat(5 - r.rating)}
                                </span>
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {r.rating}.0
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 max-w-xs">
                            {r.review_comment ? (
                              <p className="truncate text-slate-700 dark:text-slate-300 italic" title={r.review_comment}>
                                "{r.review_comment}"
                              </p>
                            ) : (
                              <span className="text-slate-400 italic">No comment</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {dateStr}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {renderStatusBadge(r.status)}
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(r.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-colors"
                            >
                              <Eye size={12} />
                              View & Moderate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-100 px-4 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-center sm:text-left">
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchReviews(pagination.page - 1)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={13} />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchReviews(pagination.page + 1)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab 2: Doctor Summaries */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {summariesLoading ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
                <p>Loading doctor rating metrics...</p>
              </div>
            ) : doctorSummaries.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                <Users size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No doctor profiles found.</p>
              </div>
            ) : (
              doctorSummaries.map((doc) => (
                <div
                  key={doc.doctorId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {doc.doctorName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {doc.specialization || 'Consultant Physician'}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500 justify-end">
                        <Star size={18} className="fill-amber-500" />
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                          {doc.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {doc.totalReviews} total reviews
                      </span>
                    </div>
                  </div>

                  {/* Active vs Hidden pills */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {doc.activeReviews} Active
                    </span>
                    {doc.flaggedReviews > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                        {doc.flaggedReviews} Flagged
                      </span>
                    )}
                    {doc.hiddenReviews > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                        {doc.hiddenReviews} Hidden
                      </span>
                    )}
                  </div>

                  {/* 5-to-1 Star Distribution Progress Bars */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {[
                      { stars: 5, count: doc.distribution.star5 },
                      { stars: 4, count: doc.distribution.star4 },
                      { stars: 3, count: doc.distribution.star3 },
                      { stars: 2, count: doc.distribution.star2 },
                      { stars: 1, count: doc.distribution.star1 },
                    ].map((item) => {
                      const pct = doc.totalReviews > 0 ? (item.count / doc.totalReviews) * 100 : 0;
                      return (
                        <div key={item.stars} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-slate-500 font-medium">{item.stars}★</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
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

                  {/* Filter Reviews by this Doctor */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctorId(doc.doctorId);
                      setActiveTab('reviews');
                    }}
                    className="w-full mt-2 py-2 text-xs font-bold rounded-lg bg-slate-50 text-indigo-700 hover:bg-indigo-50 border border-slate-200 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 transition-colors"
                  >
                    View Reviews for {doc.doctorName} →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Review Details & Moderation Drawer */}
      <ReviewDetailsDrawer
        reviewId={selectedReviewId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onReviewUpdated={handleReviewUpdated}
      />
    </div>
  );
};