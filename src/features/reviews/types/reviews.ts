export type ReviewStatus = 'ACTIVE' | 'HIDDEN' | 'FLAGGED';
export type ModerationAction = 'FLAG' | 'HIDE' | 'RESTORE';

export interface DoctorReviewItem {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  rating: number;
  review_comment?: string | null;
  communication_rating?: number | null;
  experience_rating?: number | null;
  professionalism_rating?: number | null;
  waiting_time_rating?: number | null;
  satisfaction_rating?: number | null;
  status: ReviewStatus;
  moderated_by?: string | null;
  moderated_at?: string | null;
  moderation_action?: string | null;
  moderation_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_image_url?: string | null;
  patient_name?: string;
  appointment_date?: string;
  token_number?: string;
}

export interface ReviewRatingDistribution {
  star5: number;
  star4: number;
  star3: number;
  star2: number;
  star1: number;
}

export interface DoctorRatingSummary {
  doctorId: string;
  doctorName: string;
  specialization?: string | null;
  profileImageUrl?: string | null;
  averageRating: number;
  totalReviews: number;
  activeReviews: number;
  hiddenReviews: number;
  flaggedReviews: number;
  distribution: ReviewRatingDistribution;
}

export interface ReviewModerationLog {
  id: string;
  review_id: string;
  admin_id: string;
  admin_name?: string;
  action: ModerationAction;
  reason: string;
  created_at: string;
}

export interface AdminReviewsFilter {
  page?: number | undefined;
  limit?: number | undefined;
  doctorId?: string | undefined;
  doctor_id?: string | undefined;
  rating?: number | undefined;
  status?: string | undefined;
  search?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

export type DoctorReview = DoctorReviewItem;
export type DoctorRatingSummaryItem = DoctorRatingSummary;
export type ListAdminReviewsParams = AdminReviewsFilter;

export interface AdminReviewsResponse {
  reviews: DoctorReviewItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}