import { App } from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export default function LabChangePasswordPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const userJson = localStorage.getItem('labClientUser');
  const user = userJson ? JSON.parse(userJson) : null;
  const isFirstLogin = Boolean(user?.must_change_password);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirstLogin && !currentPassword) {
      void message.error('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      void message.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      void message.error('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('lab-portal/auth/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword,
      });

      // Update cached user object so must_change_password is now false
      if (user) {
        localStorage.setItem(
          'labClientUser',
          JSON.stringify({ ...user, must_change_password: false }),
        );
      }

      setSuccess(true);
      void message.success('Password changed successfully!');

      // Redirect to dashboard after a short pause
      setTimeout(() => {
        void navigate('/client/dashboard');
      }, 1200);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to update password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <KeyRound className="text-sky-600" size={24} />
          <span>Change Password</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isFirstLogin
            ? 'Set a permanent, secure password for your laboratory client account.'
            : 'Update your client portal password to keep your facility records protected.'}
        </p>
      </div>

      {/* First Login Warning Banner */}
      {isFirstLogin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              First-Time Login Requirement
            </h3>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              You are currently authenticated using an auto-generated temporary password. Please set a
              new personal password below before accessing the diagnostic dashboard and services.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
          <div className="text-xs text-emerald-800 font-medium">
            Password updated successfully! Redirecting to your dashboard…
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password (only if not first login) */}
          {!isFirstLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Guidelines */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-sky-600" />
              <span>Password Security Requirements</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 pt-1">
              <li>Must be at least 6 characters in length</li>
              <li>Use a combination of letters, numbers, and symbols for high strength</li>
              <li>Do not share portal credentials with unauthorized staff</li>
            </ul>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
