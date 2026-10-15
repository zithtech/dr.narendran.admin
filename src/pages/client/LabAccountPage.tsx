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
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto box-border">
      {/* ── 1. Clean Light Header ── */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <User size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  My Client Portal Account
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Portal Session
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Registered credentials, facility association, and encryption security state for this laboratory user.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void navigate('/client/change-password')}
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-all border border-slate-200 cursor-pointer self-start sm:self-auto"
          >
            <KeyRound size={15} className="text-slate-600" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* ── Account Overview Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-4.5 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center text-2xl font-extrabold shrink-0">
            {account?.username ? account.username.slice(0, 2).toUpperCase() : 'LA'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{account?.username}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>{account?.status || 'ACTIVE'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{account?.email}</p>
          </div>
        </div>

        {/* ── Account Details Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 text-sm">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Portal Username
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{account?.username}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Registered Email
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{account?.email}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Linked Facility
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{account?.lab_name}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Phone size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Facility Phone
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{account?.lab_phone || 'Not set'}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Account Created
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{formatDate(account?.created_at)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Last Login
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">{formatDate(account?.last_login_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Encryption Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0 mt-0.5">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Authentication Management</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                Protect sensitive patient referral and clinical report data by using strong passphrases and rotating passwords periodically.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void navigate('/client/change-password')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <KeyRound size={14} />
            <span>Update Password</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Portal Session Encryption: <strong className="text-slate-800 font-bold">Argon2id + JWT Bearer</strong></span>
          <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <Shield size={13} className="text-emerald-600" />
            <span>Active Protection</span>
          </span>
        </div>
      </div>
    </div>
  );
}
