import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Lock, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', width: '100%' }}>
      <div className="auth-card" style={{ background: '#1e293b', padding: '2.5rem 2rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', width: '100%', maxWidth: '420px', border: '1px solid #334155' }}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.5rem' }}>Admin Portal</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Sign in to your account</p>
        </div>

        {error && (
          <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1' }}>Email / Username</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="username"
                type="text"
                placeholder="Enter your email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', boxSizing: 'border-box', color: '#f8fafc', fontSize: '0.95rem', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1' }}>Password</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', boxSizing: 'border-box', color: '#f8fafc', fontSize: '0.95rem', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
