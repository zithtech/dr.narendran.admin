import { App } from 'antd';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface AccountInfo {
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

  useEffect(() => {
    let active = true;
    const fetchAccount = async () => {
      try {
        const res = await api.get('lab-portal/account');
        if (active) {
          setAccount(res.data);
        }
      } catch (err: unknown) {
        if (active) {
          void message.error(getErrorMessage(err, 'Failed to load account information.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchAccount();
    return () => {
      active = false;
    };
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

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

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="text-sky-600" size={24} />
          <span>My Client Account</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registered credentials, security state, and linked facility association for this portal session.
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-sky-500/20">
            {account?.username ? account.username.slice(0, 2).toUpperCase() : 'LA'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{account?.username}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} />
                <span>{account?.status || 'ACTIVE'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{account?.email}</p>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User size={13} />
              <span>Username</span>
            </div>
            <div className="font-semibold text-slate-800">{account?.username}</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Mail size={13} />
              <span>Registered Email</span>
            </div>
            <div className="font-semibold text-slate-800">{account?.email}</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Building2 size={13} />
              <span>Linked Laboratory</span>
            </div>
            <div className="font-semibold text-slate-800">{account?.lab_name}</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Phone size={13} />
              <span>Facility Phone</span>
            </div>
            <div className="font-semibold text-slate-800">{account?.lab_phone || 'Not set'}</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Calendar size={13} />
              <span>Account Created</span>
            </div>
            <div className="font-semibold text-slate-800">{formatDate(account?.created_at)}</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Clock size={13} />
              <span>Last Login</span>
            </div>
            <div className="font-semibold text-slate-800">{formatDate(account?.last_login_at)}</div>
          </div>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600 mt-0.5">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Password Management</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Keep your laboratory portal credentials secure. Update your password regularly to protect patient referral records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void navigate('/client/change-password')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <KeyRound size={14} />
            <span>Change Password</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Portal Session Encryption: <strong className="text-slate-700">Argon2id + JWT</strong></span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <Shield size={13} />
            Protected
          </span>
        </div>
      </div>
    </div>
  );
}
