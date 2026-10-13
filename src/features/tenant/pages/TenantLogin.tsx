/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/* eslint-disable jsx-a11y/label-has-associated-control */

import axios from 'axios';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ROUTES } from '@/app/routes';
import { apiClient } from '@/shared/api/client';

export function TenantLogin() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/tenant/auth/login', {
        tenantCode,
        username,
        password,
      });
      const data = res.data;
      localStorage.setItem(`tenant_${tenantCode}_token`, data.token);
      localStorage.setItem(`tenant_${tenantCode}_username`, username.trim().toLowerCase());

      // Use string replacement since Route string is dynamic
      navigate(ROUTES.tenantDashboard.replace(':tenantCode', tenantCode || ''));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Login failed. Check credentials.');
      } else {
        setError('Network error connecting to hospital API');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
        <div className="relative overflow-hidden bg-cyan-600 p-8 text-center">
          <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"></div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-lg">
            <span className="text-3xl">🏥</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Hospital Admin Portal</h2>
          <div className="mt-3 inline-block rounded-full border border-cyan-500/30 bg-cyan-700/50 px-3 py-1 font-mono text-xs font-medium text-cyan-50 backdrop-blur">
            TENANT: {tenantCode}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Administrator Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-all focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-all focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-cyan-600 py-3.5 font-bold text-white shadow-lg shadow-cyan-200 transition-all hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? 'Signing In...' : 'Secure Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(ROUTES.home)}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              &larr; Back to Platform Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
