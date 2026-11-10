import { App } from 'antd';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Flag,
  History,
  Shield,
  ShieldAlert,
  Star,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getErrorMessage } from '../../../utils/errors';
import { reviewsApi } from '../services/reviewsApi';
import type {
  DoctorReviewItem,
  ModerationAction,
  ReviewModerationLog,
} from '../types/reviews';

interface ReviewDetailsDrawerProps {
  reviewId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewUpdated?: () => void;
}

export const ReviewDetailsDrawer: React.FC<ReviewDetailsDrawerProps> = ({
  reviewId,
  isOpen,
  onClose,
  onReviewUpdated,
}) => {
  const { message } = App.useApp();
  const [review, setReview] = useState<DoctorReviewItem | null>(null);
  const [logs, setLogs] = useState<ReviewModerationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moderation action form state
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [moderating, setModerating] = useState(false);

  const fetchDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewsApi.getAdminReviewDetails(id);
      setReview(data.review);
      setLogs(data.logs || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load review details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reviewId) {
      void fetchDetails(reviewId);
      setPendingAction(null);
      setReason('');
      setReasonError(null);
    } else {
      setReview(null);
      setLogs([]);
      setError(null);
    }
  }, [isOpen, reviewId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`${label} copied to clipboard`);
  };

  const handleStartModeration = (action: ModerationAction) => {
    setPendingAction(action);
    setReason('');
    setReasonError(null);
  };

  const handleCancelModeration = () => {
    setPendingAction(null);
    setReason('');
    setReasonError(null);
  };

  const handleConfirmModeration = async () => {
    if (!reviewId || !pendingAction) return;

    if (!reason.trim() || reason.trim().length < 2) {
      setReasonError('Please provide a specific reason for this moderation action (min 2 characters).');
      return;
    }

    try {
      setModerating(true);
      setReasonError(null);
      const updated = await reviewsApi.moderateReview(reviewId, {
        action: pendingAction,
        reason: reason.trim(),
      });

      message.success(`Review status successfully changed to ${updated.status}.`);
      setPendingAction(null);
      setReason('');
      // Reload drawer details and trigger list refresh
      await fetchDetails(reviewId);
      onReviewUpdated?.();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to update review moderation status.');
      message.error(msg);
      setReasonError(msg);
    } finally {
      setModerating(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            Active
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Flag size={12} />
            Flagged
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <ShieldAlert size={12} />
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Star size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Doctor Consultation Review
                </h2>
                {review && renderStatusBadge(review.status)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {review?.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(review.id, 'Review ID')}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-amber-600 transition-colors"
                    title="Copy internal review ID"
                  >
                    <span>ID: {review.id.slice(0, 13)}…</span>
                    <Copy size={11} />
                  </button>
                )}
                {review?.created_at && (
                  <span>
                    · {new Date(review.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-sm text-slate-500">Loading review details...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={16} />
                Failed to load review
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {review && !loading && (
            <>
              {/* Doctor & Patient Overview Card */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Doctor
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold text-xs dark:bg-teal-950 dark:text-teal-400">
                      Dr
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {review.doctor_name || 'Dr. Narendran'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {review.doctor_specialty || 'Medical Oncology'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Patient & Appointment
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-400">
                      <User size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {review.patient_name || 'Verified Patient'}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(review.appointment_id, 'Appointment ID')}
                        className="text-xs font-mono text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                      >
                        Appt: {review.appointment_id.slice(0, 8)}… <Copy size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating & Review Content */}
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-amber-500 text-lg">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= review.rating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {review.rating}.0 / 5.0
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    Consultation: {review.appointment_date ? new Date(review.appointment_date).toLocaleDateString() : 'Recorded'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Patient Feedback Comment
                  </h4>
                  {review.review_comment ? (
                    <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed italic">
                      "{review.review_comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No written comment provided.</p>
                  )}
                </div>

                {/* Sub-aspect ratings */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Communication</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {review.communication_rating ? `${review.communication_rating}★` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Experience</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {review.experience_rating ? `${review.experience_rating}★` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Professionalism</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {review.professionalism_rating ? `${review.professionalism_rating}★` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Waiting Time</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {review.waiting_time_rating ? `${review.waiting_time_rating}★` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Overall Satisfaction</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {review.satisfaction_rating ? `${review.satisfaction_rating}★` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Moderation Controls Card */}
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600" />
                      Moderation Actions
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Change the public visibility of this review. All actions are logged with administrative audit reasons.
                    </p>
                  </div>
                </div>

                {!pendingAction ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {review.status !== 'FLAGGED' && (
                      <button
                        type="button"
                        onClick={() => handleStartModeration('FLAG')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 transition-colors"
                      >
                        <Flag size={13} />
                        Flag for Review
                      </button>
                    )}

                    {review.status !== 'HIDDEN' && (
                      <button
                        type="button"
                        onClick={() => handleStartModeration('HIDE')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 transition-colors"
                      >
                        <ShieldAlert size={13} />
                        Hide from Public Profile
                      </button>
                    )}

                    {review.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleStartModeration('RESTORE')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        Restore to Active
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                        Confirm Action: {pendingAction}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelModeration}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Reason for Moderation (Required for audit log) *
                      </label>
                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (reasonError) setReasonError(null);
                        }}
                        placeholder="State why this review is being moderated (e.g. Clinical review required, Off-topic content, Verified resolved)..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-indigo-500"
                      />
                      {reasonError && (
                        <p className="text-xs text-rose-600 mt-1 font-medium">{reasonError}</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelModeration}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={moderating}
                        onClick={handleConfirmModeration}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs ${pendingAction === 'HIDE'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : pendingAction === 'FLAG'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                      >
                        {moderating ? 'Updating...' : `Confirm ${pendingAction}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Moderation History Audit Timeline */}
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History size={16} className="text-slate-500" />
                  Moderation Audit Logs ({logs.length})
                </h3>

                {logs.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map((log) => (
                      <div key={log.id} className="py-2.5 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.action === 'HIDE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : log.action === 'FLAG'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                            >
                              {log.action}
                            </span>
                            <span className="text-slate-500 font-medium">by {log.admin_name || 'Admin'}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 italic">"{log.reason}"</p>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No moderation actions have been performed yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};