import { useEffect, useState, useCallback } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Eye,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  EyeOff,
} from 'lucide-react';

import type {
  DoctorRatingSummaryItem,
  DoctorReview,
  ReviewModerationLog,
} from '../types/reviews';
import { reviewsApi } from '../services/reviewsApi';
import { ReviewDetailsModal } from '../components/ReviewDetailsModal';
import { ReviewModerationModal } from '../components/ReviewModerationModal';

export default function DoctorReviewsPage() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'summary'>('reviews');

  // Reviews listing state
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Doctor summaries state
  const [doctorSummaries, setDoctorSummaries] = useState<DoctorRatingSummaryItem[]>([]);
  const [summariesLoading, setSummariesLoading] = useState<boolean>(false);
  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string }[]>([]);

  // Modals state
  const [selectedReview, setSelectedReview] = useState<DoctorReview | null>(null);
  const [moderationLogs, setModerationLogs] = useState<ReviewModerationLog[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isModerateOpen, setIsModerateOpen] = useState<boolean>(false);

  // Fetch doctors for filter
  useEffect(() => {
    reviewsApi.getDoctorsList().then(setDoctorsList).catch(() => {});
  }, []);

  // Fetch reviews listing
  const fetchReviews = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      const res = await reviewsApi.getReviews({
        page: targetPage,
        limit: 15,
        search,
        doctorId: selectedDoctorId || undefined,
        rating: selectedRating ? Number(selectedRating) : undefined,
        status: selectedStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setReviews(res.reviews);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.totalCount);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedDoctorId, selectedRating, selectedStatus, startDate, endDate]);

  // Fetch doctor summaries
  const fetchDoctorSummaries = useCallback(async () => {
    try {
      setSummariesLoading(true);
      const data = await reviewsApi.getDoctorRatingSummaries();
      setDoctorSummaries(data);
    } catch (err) {
      console.error('Failed to load doctor summaries:', err);
    } finally {
      setSummariesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews(1);
    } else {
      fetchDoctorSummaries();
    }
  }, [activeTab, fetchReviews, fetchDoctorSummaries]);

  const handleOpenDetails = async (review: DoctorReview) => {
    try {
      const details = await reviewsApi.getReviewDetails(review.id);
      setSelectedReview(details.review);
      setModerationLogs(details.moderationLogs);
      setIsDetailsOpen(true);
    } catch {
      setSelectedReview(review);
      setModerationLogs([]);
      setIsDetailsOpen(true);
    }
  };

  const handleOpenModerate = (review: DoctorReview) => {
    setSelectedReview(review);
    setIsModerateOpen(true);
  };

  const handleModerationSuccess = (updatedReview: DoctorReview) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? { ...r, ...updatedReview } : r))
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedDoctorId('');
    setSelectedRating('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-y-auto space-y-6 p-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Doctor Ratings & Reviews
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor, audit, and moderate patient feedback for all clinical consultations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (activeTab === 'reviews' ? fetchReviews(page) : fetchDoctorSummaries())}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw size={14} className={loading || summariesLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'reviews'
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Star size={16} />
          All Patient Reviews ({totalCount})
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'summary'
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope size={16} />
          Doctor Rating Summaries
        </button>
      </div>

      {activeTab === 'reviews' ? (
        <>
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Search input */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search patient, doctor, or token..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Doctor filter */}
              <div>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Doctors</option>
                  {doctorsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating filter */}
              <div>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars ★★★★★</option>
                  <option value="4">4 Stars ★★★★☆</option>
                  <option value="3">3 Stars ★★★☆☆</option>
                  <option value="2">2 Stars ★★☆☆☆</option>
                  <option value="1">1 Star ★☆☆☆☆</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">ACTIVE (Visible)</option>
                  <option value="FLAGGED">FLAGGED (Review Needed)</option>
                  <option value="HIDDEN">HIDDEN (Moderated)</option>
                </select>
              </div>

              {/* Reset button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Review Comment</th>
                    <th className="py-3 px-4">Consultation / Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <RefreshCw className="mx-auto mb-2 animate-spin text-teal-600" size={20} />
                        Loading submitted reviews...
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No reviews match your current filters.
                      </td>
                    </tr>
                  ) : (
                    reviews.map((r) => {
                      const formattedDate = new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {r.patient_name || 'Verified Patient'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              #{r.appointment_id?.slice(0, 8)}
                            </p>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {r.doctor_name || 'Dr. Narendran'}
                            </p>
                            <p className="text-[11px] text-slate-400">{r.doctor_specialty || 'General'}</p>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center text-amber-500 font-bold">
                                {'★'.repeat(r.rating)}
                                <span className="text-slate-200 dark:text-slate-700">
                                  {'★'.repeat(5 - r.rating)}
                                </span>
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {r.rating}.0
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            {r.review_comment ? (
                              <p className="truncate italic text-slate-700 dark:text-slate-300" title={r.review_comment}>
                                "{r.review_comment}"
                              </p>
                            ) : (
                              <span className="text-slate-400 italic">No comment</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            <p>{formattedDate}</p>
                            <p className="text-[11px] text-slate-400">Token: #{r.token_number || '—'}</p>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                r.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : r.status === 'FLAGGED'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              }`}
                            >
                              {r.status === 'ACTIVE' && <CheckCircle size={10} />}
                              {r.status === 'FLAGGED' && <AlertTriangle size={10} />}
                              {r.status === 'HIDDEN' && <EyeOff size={10} />}
                              {r.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenDetails(r)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenModerate(r)}
                                className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
                                title="Moderate Review"
                              >
                                <ShieldAlert size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Page <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span> ({totalCount} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => fetchReviews(page - 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => fetchReviews(page + 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Doctor Rating Summaries Section */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Average Rating</th>
                  <th className="py-3 px-4">Total Reviews</th>
                  <th className="py-3 px-4">Star Breakdown</th>
                  <th className="py-3 px-4">Moderation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summariesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="mx-auto mb-2 animate-spin text-teal-600" size={20} />
                      Loading doctor rating summaries...
                    </td>
                  </tr>
                ) : doctorSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No doctor ratings found in the database.
                    </td>
                  </tr>
                ) : (
                  doctorSummaries.map((doc) => (
                    <tr
                      key={doc.doctorId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {doc.doctorName}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {doc.specialization || 'Consultant Specialist'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-500 font-bold text-sm">★ {doc.averageRating.toFixed(1)}</span>
                          <span className="text-[11px] text-slate-400">/ 5.0</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {doc.totalReviews}
                      </td>

                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <span title="5 stars" className="text-emerald-700 dark:text-emerald-300 font-semibold">5★: {doc.distribution.star5}</span> ·{' '}
                          <span title="4 stars">4★: {doc.distribution.star4}</span> ·{' '}
                          <span title="3 stars">3★: {doc.distribution.star3}</span> ·{' '}
                          <span title="2 stars">2★: {doc.distribution.star2}</span> ·{' '}
                          <span title="1 star" className="text-rose-700 dark:text-rose-300 font-semibold">1★: {doc.distribution.star1}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{doc.activeReviews} active</span>
                        {doc.flaggedReviews > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold ml-2">· {doc.flaggedReviews} flagged</span>
                        )}
                        {doc.hiddenReviews > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold ml-2">· {doc.hiddenReviews} hidden</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <ReviewDetailsModal
        review={selectedReview}
        moderationLogs={moderationLogs}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onOpenModerate={(r) => handleOpenModerate(r)}
      />

      {/* Moderation Modal */}
      <ReviewModerationModal
        review={selectedReview}
        isOpen={isModerateOpen}
        onClose={() => setIsModerateOpen(false)}
        onSuccess={handleModerationSuccess}
      />
    </div>
  );
}
