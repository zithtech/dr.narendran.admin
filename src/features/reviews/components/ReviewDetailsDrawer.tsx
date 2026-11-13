import { App } from 'antd';
import {
  CheckCircle2,
  Copy,
  Flag,
  History,
  Shield,
  ShieldAlert,
  Star,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Drawer } from '../../../components/ui/Drawer';
import { Badge } from '../../../components/ui/primitives';
import { formatDate, timeAgo } from '../../../lib/format';
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
      setLogs(data.logs ?? []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load review details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reviewId) {
      const timer = window.setTimeout(() => {
        void fetchDetails(reviewId);
        setPendingAction(null);
        setReason('');
        setReasonError(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setReview(null);
      setLogs([]);
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
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

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      label="Consultation Review"
      size="lg"
      hero={
        review ? (
          <div className="flex items-start gap-3 w-full">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <Star size={20} className="fill-amber-400 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Doctor Consultation Review
                </h2>
                {renderStatusBadge(review.status)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                {review.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(review.id, 'Review ID')}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Copy internal review ID"
                  >
                    <span>ID: #{review.id.slice(0, 8).toUpperCase()}</span>
                    <Copy size={11} />
                  </button>
                )}
                {review.created_at && (
                  <span className="text-slate-400">
                    · Submitted {formatDate(review.created_at)} ({timeAgo(review.created_at)})
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null
      }
      loading={loading}
      loadingText="Loading review details..."
      error={error}
      onRetry={() => {
        if (reviewId) {
          void fetchDetails(reviewId);
        }
      }}
      footer={
        <button
          type="button"
          className="h-8 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      {review && !loading ? (
        <div className="space-y-4">
          {/* Doctor & Patient Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Doctor Info */}
            <div className="rounded-lg border border-slate-200/90 p-3 bg-slate-50/50">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Doctor
              </span>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold text-xs border border-teal-100 shrink-0">
                  Dr
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {review.doctor_name ?? 'Dr. Narendran'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {review.doctor_specialty ?? 'Medical Oncology'}
                  </p>
                </div>
              </div>
            </div>

            {/* Patient & Appointment Info */}
            <div className="rounded-lg border border-slate-200/90 p-3 bg-slate-50/50">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Patient & Appointment
              </span>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 shrink-0">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {review.patient_name ?? 'Verified Patient'}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(review.appointment_id, 'Appointment ID')}
                    className="text-xs font-mono text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer truncate"
                    title="Copy appointment ID"
                  >
                    <span>Appt: #{review.appointment_id.slice(0, 8).toUpperCase()}</span>
                    <Copy size={10} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rating & Review Content */}
          <div className="rounded-lg border border-slate-200/90 p-4 bg-white shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < review.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200 fill-slate-200'
                      }
                    />
                  ))}
                </div>
                <span className="text-base font-bold text-slate-900 tabular-nums">
                  {review.rating}.0 / 5.0
                </span>
              </div>

              <span className="text-xs text-slate-400">
                Consultation:{' '}
                {review.appointment_date ? formatDate(review.appointment_date) : 'Recorded'}
              </span>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Patient Feedback Comment
              </h4>
              {review.review_comment ? (
                <blockquote className="text-xs text-slate-800 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80 leading-relaxed italic">
                  "{review.review_comment}"
                </blockquote>
              ) : (
                <p className="text-xs text-slate-400 italic">No written comment provided.</p>
              )}
            </div>

            {/* Sub-aspect ratings breakdown */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Category Ratings Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Communication</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {review.communication_rating ? `${review.communication_rating}.0 ★` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Experience</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {review.experience_rating ? `${review.experience_rating}.0 ★` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Professionalism</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {review.professionalism_rating ? `${review.professionalism_rating}.0 ★` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Waiting Time</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {review.waiting_time_rating ? `${review.waiting_time_rating}.0 ★` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Overall Satisfaction</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {review.satisfaction_rating ? `${review.satisfaction_rating}.0 ★` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Moderation Controls Card */}
          <div className="rounded-lg border border-slate-200/90 p-4 bg-slate-50/40 shadow-2xs space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield size={14} className="text-blue-600" />
                <span>Moderation Controls</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update review visibility on doctor public profiles. Changes are audited with mandatory reasons.
              </p>
            </div>

            {!pendingAction ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {review.status !== 'FLAGGED' && (
                  <button
                    type="button"
                    onClick={() => handleStartModeration('FLAG')}
                    className="inline-flex items-center gap-1.5 h-7.5 px-3 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Flag size={12} />
                    <span>Flag for Review</span>
                  </button>
                )}

                {review.status !== 'HIDDEN' && (
                  <button
                    type="button"
                    onClick={() => handleStartModeration('HIDE')}
                    className="inline-flex items-center gap-1.5 h-7.5 px-3 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <ShieldAlert size={12} />
                    <span>Hide from Public Profile</span>
                  </button>
                )}

                {review.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleStartModeration('RESTORE')}
                    className="inline-flex items-center gap-1.5 h-7.5 px-3 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={12} />
                    <span>Restore to Active</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Confirm Action: {pendingAction}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelModeration}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label htmlFor="moderation-reason-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Moderation (Required for audit log) *
                  </label>
                  <textarea
                    id="moderation-reason-input"
                    rows={2}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (reasonError) setReasonError(null);
                    }}
                    placeholder="State why this review is being moderated (e.g. Clinical review required, Off-topic content, Verified resolved)…"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {reasonError && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{reasonError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelModeration}
                    className="h-7.5 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={moderating}
                    onClick={() => {
                      void handleConfirmModeration();
                    }}
                    className={`inline-flex items-center gap-1.5 h-7.5 px-3.5 text-xs font-bold rounded-lg text-white shadow-2xs cursor-pointer ${
                      pendingAction === 'HIDE'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : pendingAction === 'FLAG'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {moderating ? 'Updating…' : `Confirm ${pendingAction}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Moderation History Audit Timeline */}
          <div className="rounded-lg border border-slate-200/90 p-4 bg-white shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <History size={14} className="text-slate-500" />
              <span>Moderation Audit Logs ({logs.length})</span>
            </h3>

            {logs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-2.5 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'HIDE'
                              ? 'bg-rose-100 text-rose-800'
                              : log.action === 'FLAG'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-slate-600 font-medium">
                          by {log.admin_name ?? 'Admin'}
                        </span>
                      </div>
                      <p className="text-slate-700 italic">"{log.reason}"</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No moderation actions have been performed yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};
