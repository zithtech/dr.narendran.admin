import { ExternalLink, Eye, EyeOff, HeartPulse, Lock, User } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Field } from '../components/ui/Modal';
import { Alert } from '../components/ui/primitives';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('tenant/auth/admin-login', { username, password });

      const data = response.data;

      // Axios handles non-2xx errors in the catch block
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', username);
      localStorage.setItem('adminRole', data.role || 'Administrator');
      void navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
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

        <div className="ui-auth-foot">Protected area · Authorised staff only</div>
      </div>
    </div>
  );
}
