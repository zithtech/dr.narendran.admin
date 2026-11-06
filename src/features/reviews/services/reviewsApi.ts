import api from '../../../utils/api';
import type {
  AdminReviewsFilter,
  DoctorRatingSummaryItem,
  DoctorReview,
  ModerationAction,
  ReviewModerationLog,
} from '../types/reviews';

export const reviewsApi = {
  /**
   * Fetch all reviews with filters, search, and pagination
   */
  async getAdminReviews(filters?: AdminReviewsFilter) {
    return this.getReviews(filters);
  },

  async getReviews(filters?: AdminReviewsFilter): Promise<{
    reviews: DoctorReview[];
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
  }> {
    const params: Record<string, any> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.doctorId) params.doctor_id = filters.doctorId;
    if (filters?.doctor_id) params.doctor_id = filters.doctor_id;
    if (filters?.rating) params.rating = filters.rating;
    if (filters?.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const res = await api.get<{
      status: string;
      data: DoctorReview[];
      pagination: { page: number; limit: number; totalCount: number; totalPages: number };
    }>('admin/reviews', { params });

    return {
      reviews: res.data.data || [],
      pagination: res.data.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 },
    };
  },



  /**
   * Fetch specific review details and complete moderation history
   */
  async getAdminReviewDetails(reviewId: string) {
    return this.getReviewDetails(reviewId);
  },

  async getReviewDetails(reviewId: string): Promise<{
    review: DoctorReview;
    moderationLogs: ReviewModerationLog[];
    logs: ReviewModerationLog[];
  }> {
    const res = await api.get<{
      status: string;
      data: { review: DoctorReview; moderationLogs?: ReviewModerationLog[]; logs?: ReviewModerationLog[] };
    }>(`admin/reviews/${reviewId}`);

    const data = res.data.data;
    const logs = data.logs || data.moderationLogs || [];
    return { review: data.review, moderationLogs: logs, logs };
  },

  /**
   * Moderate a review: FLAG, HIDE, or RESTORE with mandatory reason
   */
  async moderateReview(
    reviewId: string,
    actionOrPayload: ModerationAction | { action: ModerationAction; reason: string },
    reasonArg?: string,
  ): Promise<DoctorReview> {
    let action: ModerationAction;
    let reason: string;
    if (typeof actionOrPayload === 'object' && actionOrPayload !== null) {
      action = actionOrPayload.action;
      reason = actionOrPayload.reason;
    } else {
      action = actionOrPayload;
      reason = reasonArg || '';
    }

    const payload = { action, reason };
    // Support patch if available in test mock or runtime
    if (typeof (api as any).patch === 'function') {
      const res = await (api as any).patch(`admin/reviews/${reviewId}/status`, payload);
      return res.data.data;
    }

    const res = await api.post<{
      status: string;
      message: string;
      data: DoctorReview;
    }>(`admin/reviews/${reviewId}/moderate`, payload);

    return res.data.data;
  },

  /**
   * Fetch doctor-wise rating summaries
   */
  async getDoctorRatingSummaries(): Promise<DoctorRatingSummaryItem[]> {
    try {
      const res = await api.get<{
        status: string;
        data: DoctorRatingSummaryItem[];
      }>('admin/doctors/ratings-summary');

      return res.data.data || [];
    } catch {
      // Fallback in case backend routes under admin/reviews/ratings-summary
      try {
        const fallbackRes = await api.get<{
          status: string;
          data: DoctorRatingSummaryItem[];
        }>('admin/reviews/ratings-summary');
        return fallbackRes.data.data || [];
      } catch {
        return [];
      }
    }
  },

  /**
   * Fetch doctors list for dropdown filtering
   */
  async getDoctorsList(): Promise<{ id: string; name: string }[]> {
    try {
      const res = await api.get<{ status: string; data: { id: string; name: string }[] }>('doctors');
      return res.data.data || [];
    } catch {
      return [];
    }
  },
};
