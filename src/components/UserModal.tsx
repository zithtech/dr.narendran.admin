import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCog,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

export interface UserAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: UserAccount | null;
  onSave: () => void;
}

const ROLE_DEFINITIONS: {
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  title: string;
  subtitle: string;
  icon: typeof UserCog;
  badgeTone: string;
}[] = [
  {
    role: 'ADMIN',
    title: 'Administrator',
    subtitle: 'Full access to clinical settings, staff, hospitals, and analytics.',
    icon: ShieldAlert,
    badgeTone: 'purple',
  },
  {
    role: 'DOCTOR',
    title: 'Doctor / Clinician',
    subtitle: 'Access to appointment queues, patient consults, and e-prescriptions.',
    icon: Stethoscope,
    badgeTone: 'indigo',
  },
  {
    role: 'PATIENT',
    title: 'Patient',
    subtitle: 'Patient portal access for viewing personal records and visit summaries.',
    icon: User,
    badgeTone: 'blue',
  },
];

export default function UserModal({
  isOpen,
  onClose,
  userAccount,
  onSave,
}: UserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR' | 'PATIENT'>('PATIENT');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userAccount) {
      setUsername(userAccount.username || '');
      setPassword('');
      setShowPassword(false);
      setRole(userAccount.role || 'PATIENT');
      setStatus(userAccount.status || 'ACTIVE');
    } else {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setRole('PATIENT');
      setStatus('ACTIVE');
    }
    setError('');
  }, [userAccount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!userAccount && !password) {
      setError('Password is required when creating a new user account.');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = userAccount ? `user-accounts/${userAccount.id}` : `user-accounts`;
      const method = userAccount ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          username: username.trim(),
          password: password || null,
          role,
          status,
        },
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save user account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="user-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            <UserCog size={19} style={{ display: 'block', margin: 'auto' }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {userAccount ? 'Edit User Account' : 'Create User Account'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {userAccount
                ? `Editing credentials and role for @${userAccount.username}`
                : 'Register sign-in credentials and assign system access permissions'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        autoComplete="off"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .user-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .user-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .user-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .user-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .user-section-card:hover {
            border-color: #cbd5e1;
          }
          .user-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .user-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #dbeafe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .user-section-badge svg {
            display: block;
            margin: auto;
          }
          .user-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .user-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .user-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .user-drawer-modal .ui-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .user-role-card {
            padding: 12px 14px;
            border-radius: 10px;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transition: all 0.15s ease;
            position: relative;
          }
          .user-role-card.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .user-role-card:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .user-role-card:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .user-status-btn {
            flex: 1;
            padding: 12px 14px;
            border-radius: 9px;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            transition: all 0.15s ease;
            position: relative;
          }
          .user-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .user-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .user-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .user-radio-circle {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.15s ease;
          }
          .user-status-btn.is-active .user-radio-circle,
          .user-role-card.is-active .user-radio-circle {
            border-color: #2563eb;
            background: #2563eb;
          }
          .user-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .user-drawer-modal .ui-modal-foot {
            padding: 14px 24px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Authentication Credentials */}
          <div className="user-section-card">
            <div className="user-section-header">
              <div className="user-section-badge">
                <KeyRound size={14} />
              </div>
              <span className="user-section-tag">Authentication Credentials</span>
              <span className="user-section-subtitle hidden sm:inline">
                Login identity and account secret
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="user-username-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Username <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="user-username-input"
                  className="ui-input w-full"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="e.g. drsmith_23 or admin.clinic"
                  autoComplete="off"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Unique sign-in identifier for portal authentication
                </span>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="user-password-input"
                    className="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Password{' '}
                    {!userAccount && <span className="font-bold text-rose-500">*</span>}
                  </label>
                  {userAccount && (
                    <span className="text-[11px] text-slate-400">
                      Leave blank to preserve current password
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="user-password-input"
                    className="ui-input w-full pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!userAccount}
                    placeholder={
                      userAccount ? '••••••••••••' : 'Enter a strong secret passphrase'
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Must be at least 6 characters with a combination of letters and digits
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Application Access & Role Assignment */}
          <div className="user-section-card">
            <div className="user-section-header">
              <div className="user-section-badge">
                <Lock size={14} />
              </div>
              <span className="user-section-tag">Role & Permission Scope</span>
              <span className="user-section-subtitle hidden sm:inline">
                Access tier for specialized portals
              </span>
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-800">
                Assigned System Role <span className="font-bold text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {ROLE_DEFINITIONS.map((def) => {
                  const Icon = def.icon;
                  const isSelected = role === def.role;
                  return (
                    <button
                      key={def.role}
                      type="button"
                      className={`user-role-card ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setRole(def.role)}
                    >
                      <div className="user-radio-circle">
                        {isSelected && <div className="user-radio-inner" />}
                      </div>

                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isSelected ? '#eff6ff' : '#f1f5f9',
                          color: isSelected ? '#2563eb' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} style={{ display: 'block', margin: 'auto' }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>{def.title}</span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {def.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {def.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Account Authorization Status */}
          <div className="user-section-card">
            <div className="user-section-header">
              <div className="user-section-badge">
                <ShieldCheck size={14} />
              </div>
              <span className="user-section-tag">Account Authorization Status</span>
              <span className="user-section-subtitle hidden sm:inline">
                Login authorization and access state
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                Sign-In Authorization <span className="font-bold text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`user-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <div className="user-radio-circle">
                    {status === 'ACTIVE' && <div className="user-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Active Account
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Enabled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Authorized to sign in to designated clinical or patient applications.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`user-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <div className="user-radio-circle">
                    {status === 'INACTIVE' && <div className="user-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Inactive / Suspended
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Revoked
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Sign-in disabled. Active sessions will be terminated.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div className="ui-modal-foot">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{userAccount ? 'Save Changes' : 'Create User Account'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
