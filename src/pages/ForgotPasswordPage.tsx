import {
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Mail,
  RefreshCw,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

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
          Forgot Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 max-w-sm mx-auto">
          Enter your registered email address and we will send you a secure link to reset your password.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-[420px] px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 sm:rounded-2xl sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span className="font-semibold shrink-0">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 size={26} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Reset Link Sent
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {successMessage}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">Next Steps:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-slate-500">
                  <li>Check your inbox for an email from Dr. Narendran HMS.</li>
                  <li>Click the secure link inside the email to set a new password.</li>
                  <li>The reset link is time-limited and expires in 30 minutes.</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void navigate('/login')}
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => validateEmail(email)}
                    placeholder="you@hospital.com"
                    disabled={loading}
                    className={`block w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      emailError
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1.5 text-[11px] text-red-600 font-medium">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sending reset link…</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>

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
