import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import { Field } from '../components/ui/Modal';
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
      window.dispatchEvent(new Event('admin-auth-changed'));

      const roleUpper = (data.role || '').toUpperCase();
      if (roleUpper === 'DOCTOR') {
        void navigate('/appointments/today');
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
    <div className="ui-auth">
      <div className="ui-auth-card">
        <div className="ui-auth-brand">
          <span className="ui-rail-logo">
            <HeartPulse size={15} strokeWidth={2.4} />
          </span>
          <span>
            <span className="ui-rail-brand-name">HMS Admin</span>
            <span className="ui-rail-brand-sub">Dr Narendran</span>
          </span>
        </div>

        {isForgotMode ? (
          <>
            <h1>Reset Password</h1>
            <p className="ui-auth-sub">
              Enter your account username, email, or mobile number to set a new password.
            </p>

            {error && (
              <div style={{ marginBottom: 16 }}>
                <Alert>{error}</Alert>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, lineHeight: 1.45 }}>{successMsg}</div>
              </div>
            )}

            {resetSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="ui-btn ui-btn-primary"
                  style={{ height: 40, fontSize: 14 }}
                >
                  Sign in with New Password
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  void handleResetPassword(e);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <Field label="Username, Email, or Mobile">
                  <div className="ui-input-icon">
                    <User size={16} />
                    <input
                      id="forgot-identifier"
                      className="ui-input"
                      type="text"
                      placeholder="e.g. admin or you@hospital.com"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </Field>

                <Field label="New Password">
                  <div className="ui-input-icon">
                    <Lock size={16} />
                    <input
                      id="new-password"
                      className="ui-input"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      className="ui-input-password-toggle"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm New Password">
                  <div className="ui-input-icon">
                    <Lock size={16} />
                    <input
                      id="confirm-password"
                      className="ui-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      className="ui-input-password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: -4 }}>
                  Password must be at least 6 characters long.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="ui-btn ui-btn-primary"
                  style={{ height: 40, marginTop: 4, fontSize: 14 }}
                >
                  {loading ? 'Resetting password…' : 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 12.5, color: '#64748b' }}>
                  <span>Can't reset right now? </span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRequestResetLink();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Request reset assistance &rarr;
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="ui-btn"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign in</span>
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            <h1>Welcome back</h1>
            <p className="ui-auth-sub">Sign in to manage hospitals, doctors and patients.</p>

            <form
              onSubmit={(e) => {
                void handleLogin(e);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {error && (
                <div>
                  <Alert>{error}</Alert>
                  {isClientPortalError && (
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void navigate('/client/login')}
                        className="ui-btn ui-btn-primary"
                        style={{
                          width: '100%',
                          height: 36,
                          fontSize: 13,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span>Go to Client Portal Login</span>
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    fontSize: 13,
                  }}
                >
                  {successMsg}
                </div>
              )}

              <Field label="Email or username">
                <div className="ui-input-icon">
                  <User size={16} />
                  <input
                    id="username"
                    className="ui-input"
                    type="text"
                    placeholder="you@hospital.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="ui-input-icon">
                  <Lock size={16} />
                  <input
                    id="password"
                    className="ui-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    className="ui-input-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: -6,
                  marginBottom: 2,
                }}
              >
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="forgot-password-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 500,
                    padding: '2px 0',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0369a1';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#0284c7';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-primary"
                style={{ height: 40, marginTop: 4, fontSize: 14 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              <span>External partner or diagnostic lab? </span>
              <button
                type="button"
                onClick={() => void navigate('/client/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Access Client Portal &rarr;
              </button>
            </div>
          </>
        )}

        <div className="ui-auth-foot">Protected area · Authorised staff only</div>
      </div>
    </div>
  );
}
