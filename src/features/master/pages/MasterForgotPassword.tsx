 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/routes';
import { apiClient } from '@/shared/api/client';

export function MasterForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/master/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Failed to request password reset.');
      } else {
        setError('Cannot reach server. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-cyan-600/20 blur-[120px]" />
        <div
          className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-600/20 blur-[120px]"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl"></div>
      </div>

      <div className="relative z-10 px-4 sm:mx-auto sm:w-full sm:max-w-[440px]">
        {/* Logo/Brand Header */}
        <div className="mb-10 flex flex-col items-center">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30">
            <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400"></div>
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
            Forgot Password
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Form Card */}
        <div className="relative rounded-3xl border border-slate-800 bg-slate-900/50 px-6 py-8 shadow-2xl backdrop-blur-xl sm:px-10">
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10"></div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <svg
                  className="h-6 w-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Check your email</h3>
              <p className="mb-6 text-sm text-slate-400">
                If an account exists for <strong className="text-slate-300">{email}</strong>, we've
                sent a password reset link.
              </p>
              <button
                onClick={() => navigate(ROUTES.masterLogin)}
                className="flex w-full justify-center rounded-xl border border-transparent bg-slate-800 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <svg
                    className="h-5 w-5 shrink-0 text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-rose-400">{error}</p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-bold tracking-wider text-slate-400 uppercase"
                  >
                    Email Address
                  </label>
                  <div className="relative mt-1 rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg
                        className="h-5 w-5 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950/50 py-3.5 pr-4 pl-11 text-slate-200 placeholder-slate-600 transition-all focus:border-transparent focus:ring-2 focus:ring-cyan-500 sm:text-sm"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="group relative flex w-full justify-center overflow-hidden rounded-xl border border-transparent bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-cyan-500 hover:to-blue-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full"></div>
                    {isLoading ? (
                      <svg
                        className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <span className="flex items-center gap-2">
                        Send Reset Link
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.masterLogin)}
                  className="text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  Back to login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
