import { App } from 'antd';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface DashboardData {
  lab: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    status: string;
    start_time?: string | null;
    end_time?: string | null;
    map_link?: string | null;
    contact_visibility?: boolean;
  };
  profileCompletion: number;
  checklist: { label: string; completed: boolean }[];
  totalServices: number;
  recentServices: {
    id: string;
    name: string;
    description?: string | null;
    price: number | string;
    status: string;
    created_at: string;
  }[];
}

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        const response = await api.get('lab-portal/dashboard');
        if (active) {
          setData(response.data);
        }
      } catch (err: unknown) {
        if (active) {
          void message.error(getErrorMessage(err, 'Failed to load dashboard data.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchDashboard();
    return () => {
      active = false;
    };
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const lab = data?.lab;
  const profileCompletion = data?.profileCompletion ?? 0;
  const checklist = data?.checklist ?? [];
  const totalServices = data?.totalServices ?? 0;
  const recentServices = data?.recentServices ?? [];
  const isVisible = lab?.contact_visibility !== undefined ? Boolean(lab.contact_visibility) : true;

  const addressFormatted = [
    lab?.address_line_1,
    lab?.address_line_2,
    lab?.city,
    lab?.state,
    lab?.pincode ? `PIN: ${lab.pincode}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="w-full flex flex-col p-5 sm:p-6 lg:p-8 gap-6 max-w-7xl mx-auto box-border">
      {/* ── 1. Clean Light Header ── */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <FlaskConical size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  {lab?.name || 'Diagnostic Laboratory'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Facility
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium">
                  <Sparkles size={11} className="text-sky-600" />
                  Client Portal Active
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Hospital Diagnostic Partner Portal · Manage prescribed lab test reports, directory presence, and test investigations.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => void navigate('/client/reports')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <FileCheck2 size={16} />
              <span>Doctor Prescribed Tests</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-all border border-slate-200 cursor-pointer"
            >
              <Building2 size={14} className="text-slate-600" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. The 4 Attractive Compact KPI Metric Boxes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Diagnostic Test Catalog */}
        <div className="relative overflow-hidden bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div className="h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r from-sky-500 to-cyan-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Diagnostic Tests
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <FlaskConical size={14} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {totalServices}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Active investigations in catalog
            </p>
          </div>
          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Rates configured
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/services')}
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
            >
              <span>Manage Catalog</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* KPI 2: Profile Readiness */}
        <div className="relative overflow-hidden bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div className="h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Profile Readiness
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <ShieldCheck size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {profileCompletion}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  profileCompletion >= 80
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {profileCompletion >= 80 ? 'Optimal' : 'Incomplete'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  profileCompletion >= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {checklist.filter((c) => c.completed).length} of {checklist.length} verified
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
            >
              <span>View Details</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* KPI 3: Operating Schedule */}
        <div className="relative overflow-hidden bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div className="h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Operating Hours
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <Clock size={14} />
              </div>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate mt-0.5">
              {lab?.start_time && lab?.end_time
                ? `${lab.start_time} – ${lab.end_time}`
                : 'Schedule not set'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sample drop-off & collection
            </p>
          </div>
          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {lab?.start_time ? 'Open today' : 'Pending setup'}
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
            >
              <span>Set Hours</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* KPI 4: Directory Visibility */}
        <div className="relative overflow-hidden bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group">
          <div className="h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Directory Visibility
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-105 shrink-0 ${
                  isVisible
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
            </div>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isVisible
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isVisible ? 'bg-indigo-600' : 'bg-slate-400'
                  }`}
                />
                {isVisible ? 'Public in Directory' : 'Private / Hidden'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {isVisible ? 'Referral directory visible' : 'Direct referrals only'}
            </p>
          </div>
          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Patient contact access
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
            >
              <span>Change</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Quick Action Hub Banner ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prescription Tests Quick Card */}
        <div
          onClick={() => void navigate('/client/reports')}
          className="group relative overflow-hidden bg-gradient-to-r from-sky-50 to-indigo-50/50 hover:from-sky-100/70 hover:to-indigo-100/60 p-5 rounded-2xl border border-sky-200/70 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25 shrink-0 group-hover:scale-105 transition-transform">
              <FileCheck2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-800 transition-colors">
                Doctor Prescribed Lab Tests & Uploads
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Look up patients by name or phone, view prescribed investigations, and upload test reports.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white text-sky-600 flex items-center justify-center shrink-0 border border-sky-200 shadow-2xs group-hover:translate-x-1 transition-transform">
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Add Services Quick Card */}
        <div
          onClick={() => void navigate('/client/services')}
          className="group relative overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50/50 hover:from-emerald-100/70 hover:to-teal-100/60 p-5 rounded-2xl border border-emerald-200/70 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0 group-hover:scale-105 transition-transform">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Add Diagnostic Test / Investigation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure clinical investigations, standard test rates, and turnaround times in your catalog.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs group-hover:translate-x-1 transition-transform">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* ── 4. Main Two-Column Detailed Work Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Diagnostic Facility Profile Overview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Facility Overview
                  </h2>
                  <p className="text-xs text-slate-400">
                    Clinical registration & directory card
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void navigate('/client/profile')}
                className="text-xs text-sky-600 font-semibold hover:text-sky-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              {/* Phone */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Contact Phone
                    </div>
                    {lab?.phone ? (
                      <a href={`tel:${lab.phone}`} className="font-bold text-slate-900 hover:text-sky-600">
                        {lab.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Facility Email
                    </div>
                    {lab?.email ? (
                      <a
                        href={`mailto:${lab.email}`}
                        className="font-bold text-slate-900 hover:text-sky-600 truncate block max-w-[220px]"
                      >
                        {lab.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={15} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                      Physical Location
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {addressFormatted || <span className="text-slate-400 italic font-normal">No physical address provided</span>}
                    </p>
                    {lab?.map_link && (
                      <a
                        href={lab.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline mt-2 text-xs"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700">Verification Steps</span>
                  <span className="font-bold text-emerald-600">
                    {checklist.filter((c) => c.completed).length} / {checklist.length} Complete
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[11px] text-slate-600"
                    >
                      {item.completed ? (
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Clock size={13} className="text-slate-300 shrink-0" />
                      )}
                      <span className={item.completed ? 'font-medium text-slate-800' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-[11px]">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Verified Facility Profile</span>
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-sky-600 font-bold hover:underline cursor-pointer"
            >
              Update Profile Details →
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Diagnostic Services Catalog */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                  <FlaskConical size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Diagnostic Services & Rates
                  </h2>
                  <p className="text-xs text-slate-400">
                    Investigation directory & standard charges
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void navigate('/client/services')}
                  className="text-xs text-sky-600 font-semibold hover:underline cursor-pointer"
                >
                  View all ({totalServices})
                </button>
                <button
                  type="button"
                  onClick={() => void navigate('/client/services')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Test</span>
                </button>
              </div>
            </div>

            <div className="py-3">
              {recentServices.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                    <FlaskConical size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No diagnostic tests listed yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Add standard clinical tests and charges to help doctors prescribe investigations correctly.
                  </p>
                  <button
                    type="button"
                    onClick={() => void navigate('/client/services')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow-xs hover:bg-sky-500 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add First Test</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 pr-4">Investigation Name</th>
                        <th className="py-3 px-4 text-right">Standard Price</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 pl-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentServices.slice(0, 5).map((service) => (
                        <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 pr-4 font-semibold text-slate-800">
                            <div className="text-sm font-bold text-slate-900">{service.name}</div>
                            {service.description && (
                              <div className="text-xs text-slate-400 font-normal truncate max-w-xs mt-0.5">
                                {service.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {Number(service.price) > 0 ? `₹${Number(service.price).toFixed(2)}` : 'Standard'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                service.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void navigate('/client/services')}
                              className="text-sky-600 hover:text-sky-800 font-bold text-xs cursor-pointer hover:underline"
                            >
                              Edit Rate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              Showing {recentServices.slice(0, 5).length} of {totalServices} investigations
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/services')}
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              <span>Manage Test Catalog</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

