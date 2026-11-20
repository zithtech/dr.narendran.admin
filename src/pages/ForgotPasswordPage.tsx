import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import brandLogoImg from '../assets/brand-logo.png';
import loginDoctorImg from '../assets/login-doctor-illustration.png';
import { Alert } from '../components/ui/primitives';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Hospital Brand details from storage matching Login page
  const brandFirstName =
    localStorage.getItem('adminFirstName') || 'Hospital Management System';
  const brandLastName =
    localStorage.getItem('adminLastName') || 'Clinical Suite';

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address (e.g. doctor@hospital.com).');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      validateEmail(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('tenant/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      setSuccess(true);
      setSuccessMessage(
        response.data?.message ||
        'If an account exists with this email, you will receive a password reset link.',
      );
    } catch (err: unknown) {
      // Do not reveal whether account exists; surface network or server errors gracefully
      setError(
        getErrorMessage(
          err,
          'Unable to process your password reset request at this time. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
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
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Forgot Password.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Enter your registered email address and we will send you a secure link to reset your password.
              </p>
            </div>

            {/* Error Feedback Alert */}
            {error && (
              <div className="mb-5">
                <Alert>{error}</Alert>
              </div>
            )}

            {/* Success State */}
            {success ? (
              <div className="space-y-5 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-emerald-900 mb-1">
                      Reset Link Sent
                    </h3>
                    <p className="leading-relaxed text-emerald-800">
                      {successMessage}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-800">Next Steps:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500">
                    <li>Check your inbox for an email from our Healthcare System.</li>
                    <li>Click the secure link inside the email to set a new password.</li>
                    <li>The reset link is time-limited and expires in 30 minutes.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => void navigate('/login')}
                  className="w-full h-12 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Login</span>
                </button>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Enter your email address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@hospital.com"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      className={`w-full h-12 px-4 rounded-xl border ${emailError
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-slate-300 focus:border-[#5d45db] focus:ring-[#5d45db]/10'
                        } bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-2xs`}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {emailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sending reset link…</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <div className="pt-3 border-t border-slate-200">
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

        {/* Right Column: Hero Welcome Section with User-provided Doctor Consultation Image matching Login */}
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
