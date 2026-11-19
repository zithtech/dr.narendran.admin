import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import brandLogoImg from '../assets/brand-logo.png';
import loginDoctorImg from '../assets/login-doctor-illustration.png';
import { Alert } from '../components/ui/primitives';
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

  // Hospital Brand details from storage matching Login page
  const brandFirstName =
    localStorage.getItem('adminFirstName') || 'Hospital Management System';
  const brandLastName =
    localStorage.getItem('adminLastName') || 'Clinical Suite';

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
    <div className="min-h-screen w-full bg-white flex flex-col justify-between">
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Column: Form & Brand Area */}
        <div className="lg:col-span-5 xl:col-span-5 bg-white flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-12 md:px-16 lg:px-14 xl:px-20 z-10">
          {/* Top Brand Area: Kept at the top */}
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-4">
              <img
                src={brandLogoImg}
                alt={`${brandFirstName} Logo`}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0"
              />
              <div className="flex flex-col justify-center min-w-0">
                <span className="block text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                  {brandFirstName}
                </span>
                <span className="block text-xs sm:text-sm font-medium text-slate-500 tracking-wide mt-0.5 truncate">
                  {brandLastName}
                </span>
              </div>
            </div>
          </div>

          {/* Center Content Area */}
          <div className="w-full max-w-md mx-auto my-auto py-8">
            {/* Main Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Reset Password.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Create a secure, new password for your clinical portal account.
              </p>
            </div>

            {/* 1. Verifying Token State */}
            {isVerifyingToken && (
              <div className="text-center py-10 space-y-3">
                <RefreshCw size={28} className="animate-spin text-[#5d45db] mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  Validating security reset token…
                </p>
              </div>
            )}

            {/* 2. Invalid or Expired Token State */}
            {!isVerifyingToken && !tokenValid && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-900 mb-1">
                      Invalid or Expired Link
                    </h3>
                    <p className="leading-relaxed text-red-800">
                      {tokenError ||
                        'This password reset link is invalid, expired, or has already been used.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => void navigate('/forgot-password')}
                    className="w-full h-12 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Request New Reset Link
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate('/login')}
                    className="w-full h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Login</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Successful Reset State */}
            {!isVerifyingToken && tokenValid && isSuccess && (
              <div className="py-4 space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-emerald-900 mb-1">
                      Password Reset Successful
                    </h3>
                    <p className="leading-relaxed text-emerald-800">
                      Your password has been securely updated. You can now sign in using your new credentials.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void navigate('/login')}
                    className="w-full h-12 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Back to Login</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Active Reset Form State */}
            {!isVerifyingToken && tokenValid && !isSuccess && (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {formError && (
                  <div className="mb-2">
                    <Alert>{formError}</Alert>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    New password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Enter new secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm new password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.length ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.length ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>Minimum 8 characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.uppercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.uppercase ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>One uppercase letter</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.lowercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.lowercase ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>One lowercase letter</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.number ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.number ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>One number</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.special ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.special ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>One special character</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        rules.match ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {rules.match ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isPasswordStrong}
                  className="w-full h-12 mt-2 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void navigate('/login')}
                    className="w-full h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Security Note */}
          <div className="w-full max-w-md mx-auto pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Protected administrative area · Authorised healthcare staff only
          </div>
        </div>

        {/* Right Column: Hero Welcome Section with Doctor Consultation Image matching Login */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 bg-[#f7f5ff] relative overflow-hidden flex-col items-center justify-between p-8 xl:p-14 border-l border-slate-200/60 select-none">
          {/* Subtle Ambient Decorative Circles / Bubbles matching login page */}
          <div className="absolute top-12 left-14 w-20 h-20 rounded-full bg-violet-200/50 pointer-events-none" />
          <div className="absolute top-36 right-20 w-12 h-12 rounded-full bg-violet-200/40 pointer-events-none" />
          <div className="absolute top-1/2 left-10 w-8 h-8 rounded-full bg-violet-200/60 pointer-events-none" />
          <div className="absolute bottom-28 left-20 w-14 h-14 rounded-full bg-violet-200/40 pointer-events-none" />
          <div className="absolute bottom-20 right-16 w-24 h-24 rounded-full bg-violet-200/50 pointer-events-none" />
          <div className="absolute top-1/4 right-1/3 w-36 h-36 rounded-full bg-violet-100/70 blur-2xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-indigo-100/60 blur-3xl pointer-events-none" />

          {/* Top Heading */}
          <div className="relative z-10 text-center pt-4 sm:pt-6">
            <span className="block text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Healthcare Administration &amp; Clinical Operations
            </span>
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-[#5d45db] tracking-tight">
              Manage. Monitor. Care.
            </h2>
          </div>

          {/* Centered Doctor Consultation Illustration */}
          <div className="relative z-10 w-full flex-1 flex items-center justify-center p-4 max-w-xl">
            <img
              src={loginDoctorImg}
              alt="Doctor and Patient Consultation"
              className="w-full max-h-[540px] object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>

          {/* Bottom Hospital Tagline */}
          <div className="relative z-10 text-center pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              Healthcare Management Information System
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
