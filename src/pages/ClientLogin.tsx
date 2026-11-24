import {
  Eye,
  EyeOff,
  FlaskConical,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import clientLoginIllustration from '../assets/client-portal-login-illustration.png';
import { Alert } from '../components/ui/primitives';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function ClientLogin() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Client Portal branding matching inside portal sidebar
  const [brandName] = useState<string>('Client Portal');
  const [brandSub] = useState<string>(() => {
    try {
      const labJson = localStorage.getItem('labClientLab');
      if (labJson) {
        const parsed = JSON.parse(labJson) as { name?: string };
        if (parsed?.name?.trim()) return parsed.name.trim();
      }
    } catch {}
    return 'raj lab';
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanUsername = identifier.trim();
      const response = await api.post('lab-portal/auth/login', {
        username: cleanUsername,
        password,
      });

      const { token, user, lab } = response.data;

      // Store Lab Client Portal session
      localStorage.setItem('labClientToken', token);
      localStorage.setItem('labClientUser', JSON.stringify(user));
      localStorage.setItem('labClientLab', JSON.stringify(lab));

      // Redirect based on first login password change requirement
      if (user?.must_change_password) {
        void navigate('/client/change-password');
      } else {
        void navigate('/client/dashboard');
      }
    } catch (err: unknown) {
      // Fallback: try client-portals/auth/login if partner client account
      try {
        const cleanUsername = identifier.trim();
        const portalRes = await api.post('client-portals/auth/login', {
          email: cleanUsername,
          password,
        });
        const { token, portal } = portalRes.data;
        localStorage.setItem('clientPortalToken', token);
        localStorage.setItem('clientPortalData', JSON.stringify(portal));
        void navigate('/client/dashboard');
        return;
      } catch {
        // Fallback also failed, display primary error message
      }

      setError(
        getErrorMessage(
          err,
          'Invalid username or password. Please verify your credentials.',
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
          {/* Top Brand Area: Matches Client Portal sidebar brand */}
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
                }}
              >
                <FlaskConical size={26} strokeWidth={2.3} />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="block text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                  {brandName}
                </span>
                <span className="block text-xs sm:text-sm font-medium text-slate-500 tracking-wide mt-0.5 truncate">
                  {brandSub}
                </span>
              </div>
            </div>
          </div>

          {/* Center Content Area */}
          <div className="w-full max-w-md mx-auto my-auto py-6">
            {/* Main Title & Subtitle */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Log in.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Log in with your data that you entered during your registration
              </p>
            </div>

            {/* Feedback Alert */}
            {error && (
              <div className="mb-5">
                <Alert>{error}</Alert>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username / Email field */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Enter your email address
                </label>
                <input
                  id="identifier"
                  type="text"
                  placeholder="name@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
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

              {/* Forgot Password link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => void navigate('/forgot-password')}
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

              {/* Switcher to Hospital Admin */}
              <div className="text-center pt-5 space-y-2">
                <p className="text-xs text-slate-500">
                  Hospital staff or administrator?{' '}
                  <button
                    type="button"
                    onClick={() => void navigate('/login')}
                    className="font-bold text-[#5d45db] hover:underline cursor-pointer"
                  >
                    Hospital Admin Portal &rarr;
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Bottom Security Note */}
          <div className="w-full max-w-md mx-auto pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Protected diagnostic &amp; partner portal area · Authorised clients only
          </div>
        </div>

        {/* Right Column: Hero Welcome Section with Client Portal Illustration */}
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
              Manage. Monitor. Care.
            </h2>
          </div>

          {/* Centered Client Portal Laboratory Illustration */}
          <div className="relative z-10 w-full flex-1 flex items-center justify-center p-4 max-w-xl">
            <img
              src={clientLoginIllustration}
              alt="Diagnostic Partner & Laboratory Portal"
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
