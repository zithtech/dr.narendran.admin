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
  IndianRupee,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Modal } from '../../components/ui/Modal';
import { Badge, cx } from '../../components/ui/primitives';
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
  const [viewingRecentService, setViewingRecentService] = useState<DashboardData['recentServices'][0] | null>(null);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        const response = await api.get<DashboardData>('lab-portal/dashboard');
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
    <div className="ui-page ui-dashboard-page no-scrollbar space-y-3 pb-8">
      {/* ── 1. Executive Welcome Header (Matching Admin Web App Dashboard) ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 py-0.5 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FlaskConical size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                Welcome back, <span className="text-sky-700 font-extrabold">{lab?.name ?? 'Diagnostic Laboratory'}</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Verified Facility
              </span>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                <Sparkles size={10} className="mr-1 text-sky-600" />
                Diagnostic Partner
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.2 font-normal">
              Hospital Diagnostic Partner Portal · Manage prescribed lab test reports, directory presence, and test investigations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              void navigate('/client/reports');
            }}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileCheck2 size={13} />
            <span>Doctor Prescribed Tests</span>
            <ArrowRight size={11} />
          </button>
          <button
            type="button"
            onClick={() => {
              void navigate('/client/profile');
            }}
            className="inline-flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Building2 size={13} className="text-slate-600" />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* ── 2. Compact Statistics Cards (Matching Admin Web App .ui-dash-stat-card) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Diagnostic Tests */}
        <div
          className="ui-dash-stat-card"
          onClick={() => {
            void navigate('/client/services');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/services');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <FlaskConical size={17} strokeWidth={2} className="ui-dash-stat-icon text-sky-600" />
              <span className="ui-dash-stat-title">Diagnostic Tests</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                void navigate('/client/services');
              }}
              aria-label="Manage Catalog"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">{totalServices}</span>
            <span className="ui-dash-stat-badge is-blue">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>Catalog</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            Active investigations in catalog
          </div>
        </div>

        {/* KPI 2: Profile Readiness */}
        <div
          className="ui-dash-stat-card"
          onClick={() => {
            void navigate('/client/profile');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/profile');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <ShieldCheck size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
              <span className="ui-dash-stat-title">Profile Readiness</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                void navigate('/client/profile');
              }}
              aria-label="View Details"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">{profileCompletion}%</span>
            <span className={`ui-dash-stat-badge ${profileCompletion >= 80 ? 'is-green' : 'is-amber'}`}>
              <span>{profileCompletion >= 80 ? 'Optimal' : 'Incomplete'}</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            {checklist.filter((c) => c.completed).length} of {checklist.length} verified steps
          </div>
        </div>

        {/* KPI 3: Operating Schedule */}
        <div
          className="ui-dash-stat-card"
          onClick={() => {
            void navigate('/client/profile');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/profile');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <Clock size={17} strokeWidth={2} className="ui-dash-stat-icon text-amber-600" />
              <span className="ui-dash-stat-title">Operating Schedule</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                void navigate('/client/profile');
              }}
              aria-label="Set Hours"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value text-base sm:text-lg truncate">
              {lab?.start_time && lab?.end_time
                ? `${lab.start_time} – ${lab.end_time}`
                : 'Schedule not set'}
            </span>
            <span className={`ui-dash-stat-badge ${lab?.start_time ? 'is-green' : 'is-amber'}`}>
              <span>{lab?.start_time ? 'Open today' : 'Pending'}</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            Sample drop-off &amp; collection
          </div>
        </div>

        {/* KPI 4: Directory Visibility */}
        <div
          className="ui-dash-stat-card"
          onClick={() => {
            void navigate('/client/profile');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/profile');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              {isVisible ? (
                <Eye size={17} strokeWidth={2} className="ui-dash-stat-icon text-indigo-600" />
              ) : (
                <EyeOff size={17} strokeWidth={2} className="ui-dash-stat-icon text-slate-400" />
              )}
              <span className="ui-dash-stat-title">Directory Visibility</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                void navigate('/client/profile');
              }}
              aria-label="Change Visibility"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value text-base sm:text-lg">
              {isVisible ? 'Public in Directory' : 'Private / Hidden'}
            </span>
            <span className={`ui-dash-stat-badge ${isVisible ? 'is-purple' : 'is-amber'}`}>
              <span>{isVisible ? 'Active' : 'Unlisted'}</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            {isVisible ? 'Referral directory visible' : 'Direct referrals only'}
          </div>
        </div>
      </div>

      {/* ── 3. Quick Action Hub Navigation (Matching Admin Dashboard Hub Cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Prescription Tests Quick Card */}
        <div
          onClick={() => {
            void navigate('/client/reports');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/reports');
            }
          }}
          role="button"
          tabIndex={0}
          className="group bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileCheck2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                Doctor Prescribed Lab Tests &amp; Uploads
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Look up patients, review prescribed investigations, and upload medical test records.
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-sky-50 text-slate-400 group-hover:text-sky-600 flex items-center justify-center shrink-0 transition-colors">
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Add Services Quick Card */}
        <div
          onClick={() => {
            void navigate('/client/services');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void navigate('/client/services');
            }
          }}
          role="button"
          tabIndex={0}
          className="group bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                Add Diagnostic Test / Investigation
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Configure clinical investigations, standard test rates, and turnaround times in your catalog.
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ── 4. Main Two-Column Work Area (Matching Admin Dashboard Split Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left Column (5 cols): Diagnostic Facility Profile Overview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shrink-0">
                  <Building2 size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 m-0">Facility Overview</h2>
                  <p className="text-[10.5px] text-slate-500 m-0">Clinical registration &amp; directory card</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigate('/client/profile');
                }}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ArrowRight size={11} />
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              {/* Phone */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
                    <Phone size={13} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Contact Phone
                    </div>
                    {lab?.phone ? (
                      <a href={`tel:${lab.phone}`} className="font-semibold text-xs text-slate-900 hover:text-sky-600">
                        {lab.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
                    <Mail size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Facility Email
                    </div>
                    {lab?.email ? (
                      <a
                        href={`mailto:${lab.email}`}
                        className="font-semibold text-xs text-slate-900 hover:text-sky-600 truncate block max-w-[220px]"
                      >
                        {lab.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Physical Location
                    </div>
                    <p className="text-slate-800 font-medium text-xs leading-relaxed">
                      {addressFormatted || <span className="text-slate-400 italic font-normal">No physical address provided</span>}
                    </p>
                    {lab?.map_link && (
                      <a
                        href={lab.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline mt-1.5 text-[11px]"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-700">Verification Steps</span>
                  <span className="font-bold text-emerald-600 text-[11px]">
                    {checklist.filter((c) => c.completed).length} / {checklist.length} Complete
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[10.5px] text-slate-600"
                    >
                      {item.completed ? (
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Clock size={12} className="text-slate-300 shrink-0" />
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

          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Verified Facility Profile</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void navigate('/client/profile');
              }}
              className="text-sky-600 font-bold hover:underline cursor-pointer"
            >
              Update Profile Details →
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Diagnostic Services Catalog Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shrink-0">
                  <FlaskConical size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 m-0">Diagnostic Services &amp; Rates</h2>
                  <p className="text-[10.5px] text-slate-500 m-0">Investigation directory &amp; standard charges</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void navigate('/client/services');
                  }}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                >
                  View all ({totalServices})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigate('/client/services');
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Test</span>
                </button>
              </div>
            </div>

            <div className="py-2">
              {recentServices.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
                    <FlaskConical size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No diagnostic tests listed yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                    Add standard clinical tests and charges to help doctors prescribe investigations correctly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigate('/client/services');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-xs hover:bg-sky-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add First Test</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                        <th className="py-2 px-3">Investigation Name</th>
                        <th className="py-2 px-3 text-right">Standard Price</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentServices.slice(0, 5).map((service) => (
                        <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            <div className="font-semibold text-slate-900">{service.name}</div>
                            {service.description && (
                              <div className="text-[10.5px] text-slate-400 font-normal truncate max-w-xs">
                                {service.description}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {Number(service.price) > 0 ? `₹${Number(service.price).toFixed(2)}` : 'Standard'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                                service.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setViewingRecentService(service)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                title="View Investigation Details"
                                aria-label="View Investigation Details"
                              >
                                <Eye size={11} />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void navigate('/client/services');
                                }}
                                className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                              >
                                Edit Rate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {recentServices.slice(0, 5).length} of {totalServices} investigations</span>
            <button
              type="button"
              onClick={() => {
                void navigate('/client/services');
              }}
              className="font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              Manage Test Catalog →
            </button>
          </div>
        </div>
      </div>

      {/* ── View Investigation Details Drawer ── */}
      <Modal
        variant="drawer"
        size="xl"
        open={Boolean(viewingRecentService)}
        onClose={() => setViewingRecentService(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FlaskConical size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {viewingRecentService?.name ?? 'Investigation Details'}
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                Laboratory catalog service details
              </div>
            </div>
          </div>
        }
      >
        {viewingRecentService && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Header Status & Price Banner */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Catalog Price</span>
                <span className="text-lg font-bold text-slate-900 flex items-center">
                  <IndianRupee size={15} className="mr-0.5 text-slate-500" />
                  {Number(viewingRecentService.price) > 0 ? Number(viewingRecentService.price).toFixed(2) : 'Standard'}
                </span>
              </div>
              <Badge tone={viewingRecentService.status === 'ACTIVE' ? 'green' : 'neutral'}>
                <span
                  className={cx(
                    'w-1.5 h-1.5 rounded-full mr-1 inline-block',
                    viewingRecentService.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400',
                  )}
                />
                <span>{viewingRecentService.status === 'ACTIVE' ? 'Active in Catalog' : 'Inactive'}</span>
              </Badge>
            </div>

            {/* Service Information Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Investigation Name</span>
                <span className="font-semibold text-slate-800">{viewingRecentService.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Investigation ID</span>
                <span className="font-mono text-slate-600 text-[11px]">{viewingRecentService.id}</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-lg border border-slate-100 bg-white">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Description</span>
              <p className="text-slate-700 leading-relaxed">
                {viewingRecentService.description ?? <span className="text-slate-400 italic">No description provided for this diagnostic service.</span>}
              </p>
            </div>

            {/* Created Timestamp */}
            {viewingRecentService.created_at && (
              <div className="text-[11px] text-slate-400 px-1">
                Added on {new Date(viewingRecentService.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingRecentService(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewingRecentService(null);
                  void navigate('/client/services');
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <span>Manage in Catalog</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

