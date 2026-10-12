import { App } from 'antd';
import {
  ArrowRight,
  Building2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
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
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
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
    <div className="w-full h-full flex flex-col p-6 gap-4 box-border overflow-hidden bg-slate-50/50">
      {/* ── Top Header Bar ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-5 py-3.5 shadow-sm flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-sky-500/20 flex-shrink-0">
            <FlaskConical size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {lab?.name || 'Diagnostic Laboratory'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Facility
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Client Portal Dashboard · Facility operations, referral directory presence, and test rates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void navigate('/client/profile')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
          >
            <Building2 size={13} className="text-slate-500" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => void navigate('/client/services')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span>Manage Services</span>
          </button>
        </div>
      </div>

      {/* ── 4 Executive KPI Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-shrink-0">
        {/* KPI 1: Profile Readiness */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Profile Readiness
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                profileCompletion >= 80
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {profileCompletion}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                profileCompletion >= 80 ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              {checklist.filter((c) => c.completed).length} of {checklist.length} details complete
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-sky-600 font-semibold hover:underline"
            >
              Details &rarr;
            </button>
          </div>
        </div>

        {/* KPI 2: Active Services */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Diagnostic Tests
            </span>
            <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
              <FlaskConical size={13} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalServices}
            </div>
            <button
              type="button"
              onClick={() => void navigate('/client/services')}
              className="text-xs text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Catalog</span>
              <ArrowRight size={11} />
            </button>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            Active investigations offered
          </span>
        </div>

        {/* KPI 3: Operating Schedule */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Operating Hours
            </span>
            <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock size={13} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-bold text-slate-800 truncate">
              {lab?.start_time && lab?.end_time
                ? `${lab.start_time} – ${lab.end_time}`
                : 'Schedule not set'}
            </div>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-xs text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Set</span>
              <ArrowRight size={11} />
            </button>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            Sample collection timings
          </span>
        </div>

        {/* KPI 4: Directory Visibility */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Patient Visibility
            </span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                isVisible ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              {isVisible ? 'Public in Directory' : 'Private / Hidden'}
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-xs text-sky-600 font-semibold hover:underline inline-flex items-center gap-1 flex-shrink-0"
            >
              <span>Change</span>
              <ArrowRight size={11} />
            </button>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            {isVisible ? 'Contact details visible to patients' : 'Referral contact restricted'}
          </span>
        </div>
      </div>

      {/* ── Main Two-Column Work Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column (5 cols): Diagnostic Facility Profile Overview */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-sky-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Facility Overview
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-xs text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View Full Profile</span>
              <ArrowRight size={11} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 py-2 space-y-2.5 text-xs">
            {/* Phone */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Phone size={13} />
                <span>Phone:</span>
              </span>
              {lab?.phone ? (
                <a href={`tel:${lab.phone}`} className="font-semibold text-slate-800 hover:text-sky-600">
                  {lab.phone}
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Mail size={13} />
                <span>Email:</span>
              </span>
              {lab?.email ? (
                <a href={`mailto:${lab.email}`} className="font-semibold text-slate-800 hover:text-sky-600 truncate max-w-[200px]">
                  {lab.email}
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            {/* Address */}
            <div className="py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <MapPin size={13} />
                <span>Facility Address:</span>
              </span>
              <p className="text-slate-700 font-medium pl-5 leading-relaxed">
                {addressFormatted || <span className="text-slate-400 italic font-normal">No address provided</span>}
              </p>
            </div>

            {/* Location Link */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Google Maps:</span>
              {lab?.map_link ? (
                <a
                  href={lab.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline"
                >
                  <span>Open in Maps</span>
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span className="text-slate-400 italic">Pending setup</span>
              )}
            </div>

            {/* Checklist summary bar */}
            <div className="pt-1.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-500 font-medium">Directory Readiness</span>
                <span className="font-semibold text-emerald-600">
                  {checklist.filter((c) => c.completed).length} / {checklist.length} verified
                </span>
              </div>
              <div className="flex items-center gap-1">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    title={`${item.label}: ${item.completed ? 'Complete' : 'Pending'}`}
                    className={`h-1.5 flex-1 rounded-full ${
                      item.completed ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-shrink-0 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-[11px]">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>Referral Network Active</span>
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/profile')}
              className="text-sky-600 font-semibold hover:underline text-xs"
            >
              Edit Facility Details &rarr;
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Diagnostic Services Catalog */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FlaskConical size={16} className="text-sky-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Diagnostic Services & Rates
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void navigate('/client/services')}
                className="text-xs text-sky-600 font-semibold hover:underline"
              >
                View all ({totalServices})
              </button>
              <button
                type="button"
                onClick={() => void navigate('/client/services')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs transition-colors"
              >
                <Plus size={12} />
                <span>Add Test</span>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 py-1">
            {recentServices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-6">
                <FlaskConical size={32} className="mx-auto mb-2 opacity-40 text-sky-600" />
                <p className="text-xs font-medium text-slate-600">No diagnostic tests listed yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure clinical tests and prices offered by this facility.
                </p>
                <button
                  type="button"
                  onClick={() => void navigate('/client/services')}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-sm hover:bg-sky-500"
                >
                  <Plus size={12} />
                  <span>Add First Test</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 pr-3">Investigation Name</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentServices.slice(0, 5).map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-800">
                        <div>{service.name}</div>
                        {service.description && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[240px]">
                            {service.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {Number(service.price) > 0 ? `₹${Number(service.price).toFixed(2)}` : 'Standard'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            service.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void navigate('/client/services')}
                          className="text-sky-600 hover:text-sky-800 font-semibold text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-shrink-0 text-xs">
            <span className="text-[11px] text-slate-400">
              Showing {recentServices.slice(0, 5).length} of {totalServices} investigations
            </span>
            <button
              type="button"
              onClick={() => void navigate('/client/services')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <span>Manage Test Catalog</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
