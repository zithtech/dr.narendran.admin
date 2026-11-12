import React from 'react';
import { X, Star, Calendar, User, Stethoscope, Clock, ShieldAlert } from 'lucide-react';
import { usePermission } from '../../../context/PermissionContext';
import type { DoctorReview, ReviewModerationLog } from '../types/reviews';

interface Props {
  review: DoctorReview | null;
  moderationLogs: ReviewModerationLog[];
  isOpen: boolean;
  onClose: () => void;
  onOpenModerate?: (review: DoctorReview) => void;
}

export const ReviewDetailsModal: React.FC<Props> = ({
  review,
  moderationLogs,
  isOpen,
  onClose,
  onOpenModerate,
}) => {
  const { canUpdate } = usePermission();
  const canModerate = canUpdate('REVIEWS');

  if (!isOpen || !review) return null;

  const formattedDate = review.created_at
    ? new Date(review.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const apptDate = review.appointment_date
    ? new Date(review.appointment_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">ID: {review.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <User className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" size={18} />
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Patient</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{review.patient_name || 'Verified Patient'}</p>
                <p className="text-xs text-slate-400 font-mono">ID: {review.patient_id?.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Stethoscope className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" size={18} />
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Doctor</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{review.doctor_name || 'Dr. Narendran'}</p>
                <p className="text-xs text-slate-500">{review.doctor_specialty || 'Specialist'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Calendar className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" size={18} />
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Appointment Consultation</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{apptDate}</p>
                <p className="text-xs text-slate-400">Token: #{review.token_number || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Clock className="mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" size={18} />
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Submission Date & Status</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formattedDate}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                  review.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : review.status === 'FLAGGED'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                }`}>
                  {review.status}
                </span>
              </div>
            </div>
          </div>

          {/* Submitted Ratings */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Submitted Rating</h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={22}
                    className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}
                  />
                ))}
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">{review.rating}.0 / 5.0</span>
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-500">Communication:</span>{' '}
                <span className="font-bold">{review.communication_rating ? `${review.communication_rating} ★` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Experience:</span>{' '}
                <span className="font-bold">{review.experience_rating ? `${review.experience_rating} ★` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Professionalism:</span>{' '}
                <span className="font-bold">{review.professionalism_rating ? `${review.professionalism_rating} ★` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Waiting Time:</span>{' '}
                <span className="font-bold">{review.waiting_time_rating ? `${review.waiting_time_rating} ★` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Satisfaction:</span>{' '}
                <span className="font-bold">{review.satisfaction_rating ? `${review.satisfaction_rating} ★` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Patient Feedback Comment</h3>
            {review.review_comment ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">
                "{review.review_comment}"
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No written comment provided by patient.</p>
            )}
          </div>

          {/* Moderation History Logs */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Moderation Audit Trail</h3>
            </div>

            {moderationLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous moderation actions taken on this review.</p>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {moderationLogs.map((log) => (
                  <div key={log.id} className="text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span className="text-teal-700 dark:text-teal-300 font-bold">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      <span className="font-medium">Reason:</span> {log.reason}
                    </p>
                    {log.admin_name && (
                      <p className="text-slate-400 text-[11px] mt-0.5">By Administrator: {log.admin_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
          {onOpenModerate && canModerate && (
            <button
              onClick={() => {
                onClose();
                onOpenModerate(review);
              }}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 transition"
            >
              <ShieldAlert size={16} />
              Moderate Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
