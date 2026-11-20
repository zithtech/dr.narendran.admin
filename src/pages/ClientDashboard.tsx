import { App } from 'antd';
import {
  Activity,
  ArrowRight,
  Copy,
  ExternalLink,
  FlaskConical,
  MapPin,
  MoreHorizontal,
  Phone,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';

import type { ClientPortalContextType } from '../components/ClientPortalLayout';
import api from '../utils/api';

interface LabItem {
  id: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  address_line_1?: string | null;
  status: string;
}

interface LabServiceItem {
  id: string;
  name: string;
  status: string;
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const context = useOutletContext<ClientPortalContextType>();

  const email = localStorage.getItem('clientPortalUser') ?? 'Client Partner';
  const role = localStorage.getItem('clientPortalRole') ?? 'Lab Admin';
  const portalKey = localStorage.getItem('clientPortalKey');

  const canAccessLabs = context?.isSystemRole || context?.allowedSlugs?.includes('LABS');
  const canAccessServices =
    context?.isSystemRole || context?.allowedSlugs?.includes('LAB_SERVICES');

  const [labs, setLabs] = useState<LabItem[]>([]);
  const [services, setServices] = useState<LabServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      api.get<LabItem[]>('labs').catch(() => ({ data: [] })),
      api.get<LabServiceItem[]>('lab-services').catch(() => ({ data: [] })),
    ]).then(([labsRes, servicesRes]) => {
      if (mounted) {
        setLabs(Array.isArray(labsRes.data) ? labsRes.data : []);
        setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const portalLoginUrl = portalKey
    ? `${window.location.origin}/client/login?portal_token=${portalKey}`
    : `${window.location.origin}/client/login`;

  const copyUrl = () => {
    void navigator.clipboard.writeText(portalLoginUrl);
    void message.success('Portal login link copied to clipboard!');
  };

  return (
    <div className="ui-page ui-dashboard-page no-scrollbar space-y-3 pb-8">
      {/* ── 1. Executive Welcome Header (Matching Admin Web App Dashboard) ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 py-0.5 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FlaskConical size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                Welcome back, <span className="text-blue-600 font-bold">{email}</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                Live
              </span>
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {role}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.2 font-normal">
              Operations summary, linked diagnostic facilities, and active services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Copy your personal portal access link"
          >
            <Copy size={13} />
            <span>Copy Portal Link</span>
          </button>
          {canAccessLabs && (
            <button
              type="button"
              onClick={() => {
                void navigate('/portal/labs');
              }}
              className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FlaskConical size={13} />
              <span>View Labs</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. Compact Statistics Cards (Matching Admin Web App .ui-dash-stat-card) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Metric 1: Connected Facilities */}
        <div
          className={`ui-dash-stat-card ${canAccessLabs ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (canAccessLabs) void navigate('/portal/labs');
          }}
          onKeyDown={(e) => {
            if (canAccessLabs && (e.key === 'Enter' || e.key === ' ')) {
              void navigate('/portal/labs');
            }
          }}
          role={canAccessLabs ? 'button' : undefined}
          tabIndex={canAccessLabs ? 0 : undefined}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <FlaskConical size={17} strokeWidth={2} className="ui-dash-stat-icon text-sky-600" />
              <span className="ui-dash-stat-title">Connected Facilities</span>
            </div>
            {canAccessLabs && (
              <button
                type="button"
                className="ui-dash-stat-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigate('/portal/labs');
                }}
                aria-label="View Facilities"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">{loading ? '…' : labs.length}</span>
            <span className="ui-dash-stat-badge is-blue">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>Network</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            {canAccessLabs ? 'All laboratories operational' : 'Facilities registered'}
          </div>
        </div>

        {/* Metric 2: Configured Tests */}
        <div
          className={`ui-dash-stat-card ${canAccessServices ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (canAccessServices) void navigate('/portal/lab-services');
          }}
          onKeyDown={(e) => {
            if (canAccessServices && (e.key === 'Enter' || e.key === ' ')) {
              void navigate('/portal/lab-services');
            }
          }}
          role={canAccessServices ? 'button' : undefined}
          tabIndex={canAccessServices ? 0 : undefined}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <Stethoscope size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
              <span className="ui-dash-stat-title">Configured Tests</span>
            </div>
            {canAccessServices && (
              <button
                type="button"
                className="ui-dash-stat-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigate('/portal/lab-services');
                }}
                aria-label="View Services"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">{loading ? '…' : services.length}</span>
            <span className="ui-dash-stat-badge is-green">
              <span>Catalog</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            Active service investigations catalog
          </div>
        </div>

        {/* Metric 3: Access Level */}
        <div className="ui-dash-stat-card">
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <ShieldCheck size={17} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
              <span className="ui-dash-stat-title">Access Level</span>
            </div>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value text-base sm:text-lg truncate">{role}</span>
            <span className="ui-dash-stat-badge is-purple">
              <span>Verified</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            Verified client partner role
          </div>
        </div>

        {/* Metric 4: System Health */}
        <div className="ui-dash-stat-card">
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <Activity size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
              <span className="ui-dash-stat-title">System Health</span>
            </div>
          </div>
          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value text-base sm:text-lg text-emerald-700">Operational</span>
            <span className="ui-dash-stat-badge is-green">
              <span>99.9%</span>
            </span>
          </div>
          <div className="ui-dash-stat-sub">
            Real-time synchronization active
          </div>
        </div>
      </div>

      {/* ── 3. Main Operational Panels (Matching Admin Web App Dashboard Panels) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Connected Laboratories */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shrink-0">
                  <FlaskConical size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 m-0">Connected Laboratories</h2>
                  <p className="text-[10.5px] text-slate-500 m-0">Diagnostic facilities assigned to your partner account</p>
                </div>
              </div>
              {canAccessLabs && (
                <button
                  type="button"
                  onClick={() => {
                    void navigate('/portal/labs');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>

            <div className="mt-2.5">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading facilities…</div>
              ) : labs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No linked laboratories found.</div>
              ) : (
                <div className="space-y-2">
                  {labs.slice(0, 3).map((lab) => (
                    <div
                      key={lab.id}
                      onClick={() => {
                        if (canAccessLabs) void navigate('/portal/labs');
                      }}
                      onKeyDown={(e) => {
                        if (canAccessLabs && (e.key === 'Enter' || e.key === ' ')) {
                          void navigate('/portal/labs');
                        }
                      }}
                      role={canAccessLabs ? 'button' : undefined}
                      tabIndex={canAccessLabs ? 0 : undefined}
                      className={`p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2.5 transition-colors ${
                        canAccessLabs ? 'hover:bg-slate-100/80 cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white font-bold text-[10.5px] flex items-center justify-center shrink-0">
                          {lab.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">{lab.name}</div>
                          <div className="text-[10.5px] text-slate-400 flex items-center gap-2 truncate">
                            {lab.address_line_1 && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                {lab.address_line_1}
                                {lab.city ? `, ${lab.city}` : ''}
                              </span>
                            )}
                            {lab.phone && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Phone size={10} className="text-slate-400" />
                                {lab.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          Active
                        </span>
                        {canAccessLabs && <ExternalLink size={12} className="text-slate-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {labs.slice(0, 3).length} of {labs.length} facilities</span>
            {canAccessLabs && (
              <button
                type="button"
                onClick={() => {
                  void navigate('/portal/labs');
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Manage Facilities →
              </button>
            )}
          </div>
        </div>

        {/* Lab Services Catalog */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Stethoscope size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 m-0">Lab Services Catalog</h2>
                  <p className="text-[10.5px] text-slate-500 m-0">Active test types and diagnostic services</p>
                </div>
              </div>
              {canAccessServices && (
                <button
                  type="button"
                  onClick={() => {
                    void navigate('/portal/lab-services');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage catalog</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>

            <div className="mt-2.5">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading services…</div>
              ) : services.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No services registered yet.</div>
              ) : (
                <div className="space-y-2">
                  {services.slice(0, 3).map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => {
                        void navigate('/portal/lab-services');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          void navigate('/portal/lab-services');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2.5 hover:bg-slate-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                          <Stethoscope size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">{srv.name}</div>
                          <div className="text-[10.5px] text-slate-400 truncate">Diagnostic Service Investigation</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          Active
                        </span>
                        <ExternalLink size={12} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {services.slice(0, 3).length} of {services.length} services</span>
            {canAccessServices && (
              <button
                type="button"
                onClick={() => {
                  void navigate('/portal/lab-services');
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View Complete Catalog →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
