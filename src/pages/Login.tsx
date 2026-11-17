import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import brandLogoImg from '../assets/brand-logo.png';
import loginDoctorImg from '../assets/login-doctor-illustration.png';
import { Alert } from '../components/ui/primitives';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Login({ defaultForgot = false }: { defaultForgot?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isForgotPath =
    defaultForgot ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password' ||
    searchParams.get('forgot') === 'true';

  const [isForgotMode, setIsForgotMode] = useState(isForgotPath);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot / Reset Password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Hospital Brand details from storage
  const brandFirstName = localStorage.getItem('adminFirstName') || 'HMS Admin';
  const brandLastName = localStorage.getItem('adminLastName') || 'Hospital';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanUsername = username.trim();
      const response = await api.post('tenant/auth/admin-login', {
        username: cleanUsername,
        email: cleanUsername,
        password,
      });

      const data = response.data;

      // Axios handles non-2xx errors in the catch block
      // Clear previous cached permissions so fresh role permissions are loaded
      localStorage.removeItem('adminCachedPermissions');
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username || username);
      localStorage.setItem('adminRole', data.role || 'Administrator');
      if (data.id) {
        localStorage.setItem('adminUserId', data.id);
      }
      if (data.firstName) {
        localStorage.setItem('adminFirstName', data.firstName);
      }
      if (data.lastName) {
        localStorage.setItem('adminLastName', data.lastName);
      }
      if (data.fullName) {
        localStorage.setItem('adminFullName', data.fullName);
      }
      if (data.logoUrl) {
        localStorage.setItem('adminLogoUrl', data.logoUrl);
      }
      window.dispatchEvent(new Event('admin-auth-changed'));
      window.dispatchEvent(new Event('admin-settings-changed'));

      const roleUpper = (data.role || '').toUpperCase();
      if (roleUpper === 'DOCTOR') {
        void navigate('/doctor/profile');
      } else {
        void navigate('/');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const id = (forgotIdentifier || username).trim();
    if (!id) {
      setError('Please enter your username, email, or mobile number.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    setLoading(true);
    try {
      await api.post('tenant/auth/reset-password', {
        identifier: id,
        password: newPassword,
      });

      setResetSuccess(true);
      setSuccessMsg('Password has been reset successfully! You can now sign in with your new credentials.');
      setUsername(id);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reset password. Please check your credentials and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetLink = async () => {
    const id = (forgotIdentifier || username).trim();
    if (!id) {
      setError('Please enter your username, email, or mobile number to send a reset request.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await api.post('tenant/auth/forgot-password', {
        identifier: id,
      });
      setSuccessMsg(
        res.data?.message ||
        'If an account exists for this identifier, a password reset request has been processed.',
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to process forgot password request.'));
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setError('');
    setSuccessMsg('');
    setResetSuccess(false);
    if (username.trim()) {
      setForgotIdentifier(username.trim());
    }
    setIsForgotMode(true);
    if (location.pathname !== '/forgot-password') {
      void navigate('/forgot-password');
    }
  };

  const backToLogin = () => {
    setError('');
    setSuccessMsg('');
    setResetSuccess(false);
    setIsForgotMode(false);
    if (location.pathname !== '/login') {
      void navigate('/login');
    }
  };

  const isClientPortalError = error.includes('Client portal') || error.includes('client portal');

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between">
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Column: Form & Brand Area */}
        <div className="lg:col-span-5 xl:col-span-5 bg-white flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-12 md:px-16 lg:px-14 xl:px-20 z-10">
          {/* Top Brand Area */}
          <div>
            <div className="flex items-center gap-4 mb-8 sm:mb-10">
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

            {/* Main Title & Subtitle */}
            <div className="mb-8">
              {isForgotMode ? (
                <>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Reset Password.
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Enter your account details to set a new password
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Log in.
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Log in with your data that you entered during your registration
                  </p>
                </>
              )}
            </div>

            {/* Feedback Alerts */}
            {error && (
              <div className="mb-5">
                <Alert>{error}</Alert>
                {isClientPortalError && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void navigate('/client/login')}
                      className="w-full h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Go to Client Portal Login</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMsg}</div>
              </div>
            )}

            {/* Forms */}
            {isForgotMode ? (
              resetSuccess ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full h-12 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer"
                  >
                    Sign in with New Password
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    void handleResetPassword(e);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="forgot-identifier"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Enter your email, username, or mobile
                    </label>
                    <input
                      id="forgot-identifier"
                      type="text"
                      placeholder="e.g. admin or you@hospital.com"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className="w-full h-11 px-3.5 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className="w-full h-11 px-3.5 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Password must be at least 6 characters long.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 mt-4 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Resetting password…' : 'Reset Password'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">Can't reset right now? </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRequestResetLink();
                      }}
                      className="text-xs font-semibold text-[#5d45db] hover:underline cursor-pointer"
                    >
                      Request reset assistance &rarr;
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={backToLogin}
                      className="w-full h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign in</span>
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form
                onSubmit={(e) => {
                  void handleLogin(e);
                }}
                className="space-y-4"
              >
                {/* Username / Email field */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Enter your email address
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="name@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Enter your password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="atleast 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full h-12 px-4 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5d45db] focus:ring-4 focus:ring-[#5d45db]/10 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forget Password link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs font-semibold text-[#5d45db] hover:text-[#4d38c7] hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Log in Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-2xl bg-[#5d45db] hover:bg-[#4e36d4] active:bg-[#432dbf] text-white font-semibold text-sm shadow-md shadow-[#5d45db]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </button>

                {/* Don't have an account & Client Portal links */}
                <div className="text-center pt-5 space-y-2">
                  <p className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => void navigate('/client/login')}
                      className="font-bold text-[#5d45db] hover:underline cursor-pointer"
                    >
                      Register
                    </button>
                  </p>
                  <p className="text-[11.5px] text-slate-400">
                    External partner or lab?{' '}
                    <button
                      type="button"
                      onClick={() => void navigate('/client/login')}
                      className="text-slate-600 underline font-medium hover:text-slate-800 cursor-pointer"
                    >
                      Access Client Portal &rarr;
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Security Note */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Protected administrative area · Authorised healthcare staff only
          </div>
        </div>

        {/* Right Column: Hero Welcome Section with User-provided Doctor Consultation Image */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 bg-[#f7f5ff] relative overflow-hidden flex-col items-center justify-between p-8 xl:p-14 border-l border-slate-200/60 select-none">
          {/* Subtle Ambient Decorative Circles / Bubbles matching reference */}
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
              Hospital Management System
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
