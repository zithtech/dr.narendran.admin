import { App } from 'antd';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { Modal } from '../../components/ui/Modal';
import { Badge, cx } from '../../components/ui/primitives';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export interface AccountInfo {
  id: string;
  username: string;
  email: string;
  status: string;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at: string;
  lab_id: string;
  lab_name: string;
  lab_phone?: string | null;
}

export default function LabAccountPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'facility'>('overview');

  // Custom Avatar / Photo Upload State
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Change Password Drawer State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<AccountInfo>('lab-portal/account');
      setAccount(res.data);

      if (res.data?.id) {
        const storedAvatar = localStorage.getItem(`labUserAvatar_${res.data.id}`);
        if (storedAvatar) {
          setCustomAvatar(storedAvatar);
        }
      }
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load account information.'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAccount();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAccount]);

  // Handle Photo / Avatar Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      void message.error('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      void message.error('Profile image size exceeds 5MB limit.');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomAvatar(dataUrl);
      if (account?.id) {
        localStorage.setItem(`labUserAvatar_${account.id}`, dataUrl);
      }
      setIsUploadingAvatar(false);
      void message.success('Profile avatar updated successfully!');
    };
    reader.onerror = () => {
      setIsUploadingAvatar(false);
      void message.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setCustomAvatar(null);
    if (account?.id) {
      localStorage.removeItem(`labUserAvatar_${account.id}`);
    }
    void message.success('Profile avatar removed.');
  };

  // Handle Password Update Form Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const mustChange = Boolean(account?.must_change_password);

    if (!mustChange && !currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('lab-portal/auth/change-password', {
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim(),
      });

      // Update cached user object so must_change_password is now false
      const userJson = localStorage.getItem('labClientUser');
      if (userJson) {
        try {
          const user = JSON.parse(userJson) as Record<string, unknown>;
          localStorage.setItem(
            'labClientUser',
            JSON.stringify({ ...user, must_change_password: false }),
          );
        } catch {
          // Ignore parsing error
        }
      }

      if (account) {
        setAccount({ ...account, must_change_password: false });
      }

      void message.success('Password updated successfully!');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not recorded';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2.5 text-slate-400">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" />
        <span className="text-xs text-slate-500 font-medium">Loading account details…</span>
      </div>
    );
  }

  const initials = account?.username ? account.username.slice(0, 2).toUpperCase() : 'LA';
  const isActive = (account?.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';

  return (
    <div className="ui-page space-y-3">
      {/* ── Executive Page Header Matching HMS Admin Pattern ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              My Client Portal Account
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Session
            </span>
            <Badge tone="violet">CLIENT_PORTAL</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Registered credentials, facility association, and session authentication for this laboratory user.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              void fetchAccount();
            }}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh account details"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              void navigate('/client/profile');
            }}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Building2 size={13} className="text-blue-600" />
            <span>Facility Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError(null);
              setIsPasswordModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <KeyRound size={13} />
            <span>Change Password</span>
          </button>
        </div>
      </header>

      {/* ── Executive Account Profile Summary Card with Avatar Upload Interface ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar / Photo with Hover Overlay Controls */}
          <div className="relative group shrink-0">
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
              aria-label="Upload Profile Avatar"
            />

            {customAvatar ? (
              <img
                src={customAvatar}
                alt={account?.username ?? 'User Avatar'}
                className="w-13 h-13 rounded-xl object-cover border border-slate-200 shadow-2xs bg-white"
              />
            ) : (
              <div className="w-13 h-13 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-lg font-bold select-none shadow-2xs">
                {initials}
              </div>
            )}

            {/* Avatar Hover / Action Button */}
            <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title={customAvatar ? 'Change Photo' : 'Upload Photo'}
                aria-label="Upload or Change Photo"
                className="p-1 rounded-md bg-white text-slate-800 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Camera size={12} />
                )}
              </button>
              {customAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  title="Remove Photo"
                  aria-label="Remove Custom Photo"
                  className="p-1 rounded-md bg-white text-rose-600 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {account?.username ?? 'Laboratory User'}
              </h2>
              <Badge tone={isActive ? 'green' : 'neutral'}>
                <CheckCircle2 size={11} className="mr-1 inline" />
                <span>{account?.status ?? 'ACTIVE'}</span>
              </Badge>
              <Badge tone="blue">
                <ShieldCheck size={11} className="mr-1 inline" />
                <span>Verified Lab Client</span>
              </Badge>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
              <Mail size={11} className="text-slate-400" />
              <span>{account?.email ?? 'No email associated'}</span>
            </div>
          </div>
        </div>

        {/* Right Status Summary Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Building2 size={13} className="text-blue-600" />
            <span>Facility:</span>
            <strong className="text-slate-900 font-bold ml-0.5 truncate max-w-[140px]">
              {account?.lab_name ?? '—'}
            </strong>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Clock size={13} className="text-violet-600" />
            <span>Last Login:</span>
            <span className="text-slate-800 font-medium ml-0.5">{formatDate(account?.last_login_at)}</span>
          </div>
        </div>
      </div>

      {/* ── Section Navigation Tabs Matching Admin Design ── */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <User size={13} />
          <span>Account Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <ShieldCheck size={13} />
          <span>Security & Encryption</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('facility')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'facility'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <Building2 size={13} />
          <span>Linked Facility</span>
        </button>
      </div>

      {/* ── TAB 1: Account Overview (3 Structured Cards) ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1: User Identity & Credentials */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                  <User size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Identity & Credentials
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Portal Username</span>
                  <span className="text-slate-900 font-semibold text-right truncate">
                    {account?.username ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Official Email</span>
                  <span className="font-semibold text-right truncate">
                    {account?.email ? (
                      <a
                        href={`mailto:${account.email}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Mail size={11} className="text-slate-400" />
                        <span>{account.email}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Not configured</span>
                    )}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Account Status</span>
                  <span className="text-right">
                    <Badge tone={isActive ? 'green' : 'neutral'}>
                      {account?.status ?? 'ACTIVE'}
                    </Badge>
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Password Status</span>
                  <span className="text-right">
                    {account?.must_change_password ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <ShieldAlert size={11} className="text-amber-600" />
                        <span>Update Required</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Custom Active</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Linked Laboratory Facility */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                  <Building2 size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Linked Facility
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Facility Name</span>
                  <span className="text-slate-900 font-semibold text-right truncate">
                    {account?.lab_name ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Contact Phone</span>
                  <span className="font-semibold text-right truncate">
                    {account?.lab_phone ? (
                      <a
                        href={`tel:${account.lab_phone}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Phone size={11} className="text-slate-400" />
                        <span>{account.lab_phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Not set</span>
                    )}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Facility Identifier</span>
                  <span className="text-slate-600 font-mono text-[11px] text-right truncate max-w-[160px]">
                    {account?.lab_id ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Profile Management</span>
                  <span className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        void navigate('/client/profile');
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ExternalLink size={10} />
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Session & Security Details */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-violet-50 text-violet-600">
                  <Calendar size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Session & Audit Log
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Account Created</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {formatDate(account?.created_at)}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Last Active Login</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {formatDate(account?.last_login_at)}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Encryption Type</span>
                  <span className="text-slate-800 font-semibold text-right">
                    Argon2id + JWT Bearer
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Protection Status</span>
                  <span className="text-emerald-700 font-semibold text-right inline-flex items-center gap-1">
                    <Shield size={11} className="text-emerald-600" />
                    <span>Active Protection</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Security & Encryption Management ── */}
      {activeTab === 'security' && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Security & Authentication Management</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Protect sensitive patient referral and clinical report data by using strong passphrases and rotating passwords.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError(null);
                setIsPasswordModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <KeyRound size={13} />
              <span>Update Password</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Lock size={14} className="text-blue-600" />
                <span>Session Credentials Standard</span>
              </div>
              <p className="text-slate-600 leading-normal">
                This portal utilizes Argon2id password hashing alongside cryptographic JSON Web Tokens (JWT) for secure session exchange between your browser and Dr. Narendran clinical database.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Shield size={14} className="text-emerald-600" />
                <span>Zero-Cleartext Guarantee</span>
              </div>
              <p className="text-slate-600 leading-normal">
                Credentials are never stored or transmitted in plain text. Temporary passwords assigned by hospital administrators must be rotated upon first sign-in.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>Portal Session Encryption: <strong className="text-slate-800 font-bold">Argon2id + JWT Bearer</strong></span>
            <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 self-start sm:self-auto">
              <Shield size={12} className="text-emerald-600" />
              <span>Active Protection</span>
            </span>
          </div>
        </div>
      )}

      {/* ── TAB 3: Linked Clinical Facility ── */}
      {activeTab === 'facility' && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 size={16} className="text-blue-600" />
                <span>Linked Clinical Diagnostic Facility</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Organization records, address coordinates, and diagnostic catalog assigned to this client account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void navigate('/client/profile');
              }}
              className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span>Manage Facility Profile</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                Facility Display Name
              </div>
              <div className="text-sm font-bold text-slate-900">
                {account?.lab_name ?? '—'}
              </div>
              <div className="text-slate-500">
                Internal Reference ID: <span className="font-mono text-slate-700 font-semibold">{account?.lab_id ?? '—'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                Registered Contact Channel
              </div>
              <div className="text-sm font-bold text-slate-900">
                {account?.lab_phone ?? 'Phone number not recorded'}
              </div>
              <div className="text-slate-500">
                To update operating hours or physical street address, open the Laboratory Profile editor.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Slide-in Right Drawer Matching Admin UserModal Pattern ── */}
      <Modal
        open={isPasswordModalOpen}
        onClose={() => {
          if (!savingPassword) setIsPasswordModalOpen(false);
        }}
        variant="drawer"
        size="md"
        title={
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600 inline-flex items-center justify-center">
              <KeyRound size={16} strokeWidth={2.2} />
            </div>
            <span>Change Account Password</span>
          </div>
        }
        description="Update your client portal login credentials to keep facility records protected."
      >
        <form
          onSubmit={(e) => {
            void handlePasswordSubmit(e);
          }}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs"
        >
          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {account?.must_change_password && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold block">First-Time Login Requirement</span>
                <span className="text-[11px] text-amber-700">
                  You are currently authenticated using an auto-generated temporary password. Please set a new permanent password.
                </span>
              </div>
            </div>
          )}

          {/* Current Password (if not first-time login) */}
          {!account?.must_change_password && (
            <div>
              <label htmlFor="currentPasswordInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="currentPasswordInput"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label htmlFor="newPasswordInput" className="block text-xs font-semibold text-slate-700 mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="newPasswordInput"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label htmlFor="confirmPasswordInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="confirmPasswordInput"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              >
                {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-500">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-600" />
              <span>Password Security Requirements</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Must be at least 6 characters in length</li>
              <li>Use a combination of letters, numbers, and symbols for high strength</li>
              <li>Do not share portal credentials with unauthorized staff</li>
            </ul>
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {savingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
