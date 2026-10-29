import {
  AlertCircle,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Lock,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function ClientLogin() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('lab-portal/auth/login', {
        username: identifier.trim(),
        password,
      });

      const { token, user, lab } = response.data;

      // Store Lab Client Portal session
      localStorage.setItem('labClientToken', token);
      localStorage.setItem('labClientUser', JSON.stringify(user));
      localStorage.setItem('labClientLab', JSON.stringify(lab));

      // Redirect based on first login password change requirement
      if (user.must_change_password) {
        void navigate('/client/change-password');
      } else {
        void navigate('/client/dashboard');
      }
    } catch (err: unknown) {
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
    <div className="client-login-shell">
      <div className="client-bg-glow glow-1" />
      <div className="client-bg-glow glow-2" />

      <div className="client-login-container">
        {/* Brand Header */}
        <div className="client-brand-header">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 text-white mb-3 shadow-lg shadow-sky-500/20">
            <FlaskConical size={24} strokeWidth={2.2} />
          </div>
          <div className="client-badge-pill">
            <FlaskConical size={12} />
            <span>Lab Client Portal</span>
          </div>
          <h1 className="client-brand-title">Diagnostic Partner Login</h1>
          <p className="client-brand-subtitle">
            Sign in to manage your laboratory profile, operating schedule, and diagnostic services.
          </p>
        </div>

        {/* Login Card */}
        <div className="client-login-card">
          {error && (
            <div className="client-notice notice-error mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="client-login-form">
            {/* Username / Email */}
            <div className="client-field-group">
              <label className="client-label">Username or Registered Email</label>
              <div className="client-input-wrapper">
                <User size={16} className="client-input-icon" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your lab username or email"
                  className="client-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="client-field-group">
              <div className="flex items-center justify-between">
                <label className="client-label">Password</label>
              </div>
              <div className="client-input-wrapper">
                <Lock size={16} className="client-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="client-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="client-password-toggle"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="client-submit-btn flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="client-spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  <span>Sign in to Lab Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="client-footer-security">
            <span>Secure 256-bit encrypted diagnostic partner session</span>
          </div>
        </div>

        {/* Switcher to Hospital Admin */}
        <div className="client-portal-switcher">
          <span>Hospital Staff or Administrator?</span>
          <button
            type="button"
            onClick={() => void navigate('/login')}
            className="client-admin-link"
          >
            Hospital Admin Portal &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
