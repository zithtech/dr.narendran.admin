import { App } from 'antd';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge } from '../../components/ui/primitives';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export default function LabChangePasswordPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const userJson = localStorage.getItem('labClientUser');
  const user = userJson ? (JSON.parse(userJson) as Record<string, unknown>) : null;
  const isFirstLogin = Boolean(user?.must_change_password);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Password Strength Evaluation
  const strength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-slate-200' };

    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (/[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword)) score += 1;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score += 1;
    if (newPassword.length >= 10) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Weak', color: 'bg-rose-500' };
    }
  }, [newPassword]);

  const hasLength = newPassword.length >= 6;
  const hasLettersAndDigits = /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  const passwordsMatch = Boolean(confirmPassword && newPassword === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isFirstLogin && !currentPassword) {
      setFormError('Please enter your current password.');
      void message.error('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      void message.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.');
      void message.error('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('lab-portal/auth/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword,
      });

      // Update cached user object so must_change_password is now false
      if (user) {
        localStorage.setItem(
          'labClientUser',
          JSON.stringify({ ...user, must_change_password: false }),
        );
      }

      setSuccess(true);
      void message.success('Password changed successfully!');

      // Redirect to dashboard after a short pause
      setTimeout(() => {
        void navigate('/client/dashboard');
      }, 1200);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, 'Failed to update password.');
      setFormError(errMsg);
      void message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-page max-w-2xl mx-auto space-y-3">
      {/* ── Executive Page Header Matching HMS Admin Pattern ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                void navigate('/client/account');
              }}
              title="Back to My Account"
              aria-label="Back to Account"
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer mr-1"
            >
              <ArrowLeft size={13} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              <KeyRound className="text-blue-600" size={18} />
              <span>Change Password</span>
            </h1>
            <Badge tone="green">Active Session</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            {isFirstLogin
              ? 'Set a permanent, secure password for your laboratory client account.'
              : 'Update your client portal password to keep your facility records protected.'}
          </p>
        </div>
      </header>

      {/* First Login Warning Banner */}
      {isFirstLogin && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="font-bold text-amber-900">
              First-Time Login Requirement
            </h3>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              You are currently authenticated using an auto-generated temporary password. Please set a
              new personal password below before accessing the diagnostic dashboard and services.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {formError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-400 hover:text-rose-600 cursor-pointer p-0.5"
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
          <div className="text-emerald-800 font-medium">
            Password updated successfully! Redirecting to your dashboard…
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4 text-xs"
        >
          {/* Current Password (only if not first login) */}
          {!isFirstLogin && (
            <div>
              <label htmlFor="changeCurrentPassInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="changeCurrentPassInput"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="changeNewPassInput" className="block text-xs font-semibold text-slate-700">
                New Password <span className="text-rose-500">*</span>
              </label>
              {newPassword && (
                <span className="text-[11px] font-semibold text-slate-500">
                  Strength: <strong className="text-slate-800">{strength.label}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <KeyRound size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="changeNewPassInput"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {newPassword && (
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 rounded-full transition-colors ${
                      strength.score >= step ? strength.color : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label htmlFor="changeConfirmPassInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="changeConfirmPassInput"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              >
                {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Dynamic Requirements Checklist */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-500">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-600" />
              <span>Password Security Requirements</span>
            </div>
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                    hasLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Check size={9} />
                </span>
                <span className={hasLength ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                  Must be at least 6 characters in length
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                    hasLettersAndDigits
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Check size={9} />
                </span>
                <span
                  className={hasLettersAndDigits ? 'text-slate-700 font-medium' : 'text-slate-500'}
                >
                  Combination of letters and digits
                </span>
              </div>

              {confirmPassword && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      passwordsMatch
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {passwordsMatch ? <Check size={9} /> : <X size={9} />}
                  </span>
                  <span
                    className={
                      passwordsMatch
                        ? 'text-emerald-700 font-medium'
                        : 'text-rose-600 font-medium'
                    }
                  >
                    {passwordsMatch
                      ? 'Passwords match'
                      : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                void navigate('/client/account');
              }}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
