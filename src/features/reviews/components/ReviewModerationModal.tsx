import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, EyeOff, CheckCircle2 } from 'lucide-react';
import type { DoctorReview, ModerationAction } from '../types/reviews';
import { reviewsApi } from '../services/reviewsApi';

interface Props {
  review: DoctorReview | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedReview: DoctorReview) => void;
}

export const ReviewModerationModal: React.FC<Props> = ({
  review,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !review) return null;

  const [action, setAction] = useState<ModerationAction>(
    review.status === 'HIDDEN' ? 'RESTORE' : 'HIDE'
  );
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A detailed moderation reason is required for compliance audit logs.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const updated = await reviewsApi.moderateReview(review.id, action, reason.trim());
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to moderate review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-teal-600 dark:text-teal-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Moderate Doctor Review</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Current Review Quick Summary */}
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              Patient: <span className="font-normal">{review.patient_name || 'Patient'}</span> · Doctor: <span className="font-normal">{review.doctor_name || 'Doctor'}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Rating: <span className="font-bold text-amber-500">★ {review.rating}.0</span> · Current Status:{' '}
              <span className="font-bold uppercase">{review.status}</span>
            </p>
            {review.review_comment && (
              <p className="italic text-slate-500 truncate mt-1">"{review.review_comment}"</p>
            )}
          </div>

          {/* Action Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Moderation Action *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAction('HIDE')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  action === 'HIDE'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <EyeOff size={18} />
                <span>Hide</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('FLAG')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  action === 'FLAG'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <AlertTriangle size={18} />
                <span>Flag</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('RESTORE')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  action === 'RESTORE'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 size={18} />
                <span>Restore</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {action === 'HIDE' && 'Hidden reviews are immediately removed from public doctor profiles and rating stats.'}
              {action === 'FLAG' && 'Flagged reviews remain marked for internal supervisor review.'}
              {action === 'RESTORE' && 'Restores review visibility to ACTIVE status in public doctor profiles.'}
            </p>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Moderation Reason (Required) *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear reasons (e.g. offensive language, privacy violation, clinical dispute investigation)..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Audit Rule Notice */}
          <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
            <strong>Compliance Rule:</strong> Administrators cannot alter patient-submitted star ratings or review text. Every moderation action records your admin identity, timestamp, and stated reason.
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Recording...' : `Confirm ${action}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
