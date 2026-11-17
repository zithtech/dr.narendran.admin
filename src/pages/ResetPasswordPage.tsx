import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

interface ResetPasswordPageProps {
  initialToken?: string;
}

export default function ResetPasswordPage({ initialToken }: ResetPasswordPageProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = initialToken ?? (searchParams.get('token') || '');

  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate the reset token on mount or when token changes
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token || !token.trim()) {
        if (isMounted) {
          setIsVerifyingToken(false);
          setTokenValid(false);
          setTokenError('Missing password reset token. Please request a new link.');
        }
        return;
      }

      setIsVerifyingToken(true);
      setTokenError('');

      try {
        const response = await api.get('tenant/auth/verify-reset-token', {
          params: { token: token.trim() },
        });

        if (isMounted) {
          if (response.data?.valid) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setTokenError(
              response.data?.error ||
                'This password reset link is invalid, expired, or has already been used.',
            );
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError(
            getErrorMessage(
              err,
              'This password reset link is invalid, expired, or has already been used.',
            ),
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifyingToken(false);
        }
      }
    }

    void checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password Strength Criteria
  const rules = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>_\-\\\/+=]/.test(newPassword),
      match: Boolean(
        confirmPassword &&
          newPassword &&
          confirmPassword === newPassword,
      ),
    };
  }, [newPassword, confirmPassword]);

  const isPasswordStrong =
    rules.length &&
    rules.uppercase &&
    rules.lowercase &&
    rules.number &&
    rules.special;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('Reset token is missing. Please request a new reset link.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError('Please ensure your password meets all the security criteria below.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('tenant/auth/reset-password', {
        token: token.trim(),
        password: newPassword,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      setFormError(
        getErrorMessage(
          err,
          'Failed to reset password. The link may have expired or already been used.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <HeartPulse size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Dr. Narendran HMS
          </span>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 max-w-sm mx-auto">
          Create a secure, new password for your clinical portal account.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-[440px] px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 sm:rounded-2xl sm:px-8">
          {/* 1. Verifying Token State */}
          {isVerifyingToken && (
            <div className="text-center py-8 space-y-3">
              <RefreshCw size={26} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                Validating security reset token…
              </p>
            </div>
          )}

          {/* 2. Invalid or Expired Token State */}
          {!isVerifyingToken && !tokenValid && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto shadow-xs">
                <AlertCircle size={26} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Invalid or Expired Link
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  {tokenError ||
                    'This password reset link is invalid, expired, or has already been used.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void navigate('/forgot-password')}
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Request New Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => void navigate('/login')}
                  className="w-full inline-flex justify-center items-center gap-2 py-2 px-4 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Login
                </button>
              </div>
            </div>
          )}

          {/* 3. Successful Reset State */}
          {!isVerifyingToken && tokenValid && isSuccess && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 size={26} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Password Reset Successful
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Your password has been securely updated. You can now sign in using your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void navigate('/login')}
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {/* 4. Active Reset Password Form */}
          {!isVerifyingToken && tokenValid && !isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <span className="font-semibold shrink-0">Error:</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="reset-new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    disabled={isSubmitting}
                    className="block w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    disabled={isSubmitting}
                    className="block w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Password Validation Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600">
                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px]">
                  <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.length ? <Check size={13} className="text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.uppercase ? <Check size={13} className="text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.lowercase ? <Check size={13} className="text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.number ? <Check size={13} className="text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.special ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.special ? <Check size={13} className="text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                    <span>One special character</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.match ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {rules.match ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : confirmPassword && !rules.match ? (
                      <X size={13} className="text-red-500" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />
                    )}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isPasswordStrong || !rules.match}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>

              {/* Back to Login */}
              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => void navigate('/login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
