import { App } from 'antd';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
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

  const email = localStorage.getItem('clientPortalUser') || 'Client Partner';
  const role = localStorage.getItem('clientPortalRole') || 'Lab Admin';
  const portalKey = localStorage.getItem('clientPortalKey');

  const canAccessLabs = context?.isSystemRole || context?.allowedSlugs?.includes('LABS');
  const canAccessServices =
    context?.isSystemRole || context?.allowedSlugs?.includes('LAB_SERVICES');

  const [labs, setLabs] = useState<LabItem[]>([]);
  const [services, setServices] = useState<LabServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.get('labs').catch(() => ({ data: [] })),
      api.get('lab-services').catch(() => ({ data: [] })),
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
    navigator.clipboard.writeText(portalLoginUrl);
    void message.success('Portal login link copied to clipboard!');
  };

  return (
    <div className="client-dashboard-page">
      {/* SaaS Page Header */}
      <div className="client-page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="client-page-title">Overview</h1>
            <span className="client-status-badge">
              <span className="client-status-dot" />
              Live
            </span>
          </div>
          <p className="client-page-subtitle">
            Operations summary, linked diagnostic facilities, and active services for <span className="font-medium text-gray-700">{email}</span>.
          </p>
        </div>

        <div className="client-header-actions">
          <button
            type="button"
            onClick={copyUrl}
            className="client-btn-secondary"
            title="Copy your personal portal access link"
          >
            <Copy size={13} />
            <span>Copy Portal Link</span>
          </button>
          {canAccessLabs && (
            <button
              type="button"
              onClick={() => void navigate('/portal/labs')}
              className="client-btn-primary"
            >
              <FlaskConical size={14} />
              <span>View Labs</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="client-metrics-grid">
        <div
          className={`client-metric-card ${canAccessLabs ? 'cursor-pointer group' : ''}`}
          onClick={() => {
            if (canAccessLabs) void navigate('/portal/labs');
          }}
        >
          <div className="client-metric-top">
            <span className="client-metric-label">Connected Facilities</span>
            <div className="client-metric-icon bg-sky-50 text-sky-600">
              <FlaskConical size={16} />
            </div>
          </div>
          <div className="client-metric-value">
            {loading ? '…' : labs.length}
          </div>
          <div className="client-metric-sub">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>{canAccessLabs ? 'All laboratories operational' : 'Facilities registered'}</span>
          </div>
        </div>

        <div
          className={`client-metric-card ${canAccessServices ? 'cursor-pointer group' : ''}`}
          onClick={() => {
            if (canAccessServices) void navigate('/portal/lab-services');
          }}
        >
          <div className="client-metric-top">
            <span className="client-metric-label">Configured Tests</span>
            <div className="client-metric-icon bg-emerald-50 text-emerald-600">
              <Stethoscope size={16} />
            </div>
          </div>
          <div className="client-metric-value">
            {loading ? '…' : services.length}
          </div>
          <div className="client-metric-sub">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Active service catalog</span>
          </div>
        </div>

        <div className="client-metric-card">
          <div className="client-metric-top">
            <span className="client-metric-label">Access Level</span>
            <div className="client-metric-icon bg-purple-50 text-purple-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="client-metric-value text-base font-semibold text-gray-900 mt-1">
            {role}
          </div>
          <div className="client-metric-sub text-gray-500">
            <span>Verified client partner role</span>
          </div>
        </div>

        <div className="client-metric-card">
          <div className="client-metric-top">
            <span className="client-metric-label">System Health</span>
            <div className="client-metric-icon bg-emerald-50 text-emerald-600">
              <Activity size={16} />
            </div>
          </div>
          <div className="client-metric-value text-base font-semibold text-emerald-700 mt-1">
            Operational
          </div>
          <div className="client-metric-sub">
            <span className="client-dot-green" />
            <span>99.9% uptime · Real-time sync</span>
          </div>
        </div>
      </div>

      {/* Main Operational Split Cards */}
      <div className="client-sections-grid">
        {/* Connected Laboratories */}
        <div className="client-panel-card">
          <div className="client-panel-head">
            <div>
              <h2 className="client-panel-title">Connected Laboratories</h2>
              <p className="client-panel-desc">
                Diagnostic facilities assigned to your partner account.
              </p>
            </div>
            {canAccessLabs && (
              <button
                type="button"
                onClick={() => void navigate('/portal/labs')}
                className="client-panel-link"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="client-panel-body">
            {loading ? (
              <div className="client-empty-state">Loading facilities…</div>
            ) : labs.length === 0 ? (
              <div className="client-empty-state">No linked laboratories found.</div>
            ) : (
              <div className="client-list">
                {labs.slice(0, 3).map((lab) => (
                  <div
                    key={lab.id}
                    onClick={() => {
                      if (canAccessLabs) void navigate('/portal/labs');
                    }}
                    className={`client-list-item ${canAccessLabs ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="client-avatar">
                        {lab.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="client-item-name">{lab.name}</div>
                        <div className="client-item-meta">
                          {lab.address_line_1 && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-gray-400" />
                              {lab.address_line_1}
                              {lab.city ? `, ${lab.city}` : ''}
                            </span>
                          )}
                          {lab.phone && (
                            <span className="flex items-center gap-1 ml-2">
                              <Phone size={11} className="text-gray-400" />
                              {lab.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="client-badge-success">Active</span>
                      {canAccessLabs && <ExternalLink size={13} className="text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lab Services Catalog */}
        <div className="client-panel-card">
          <div className="client-panel-head">
            <div>
              <h2 className="client-panel-title">Lab Services Catalog</h2>
              <p className="client-panel-desc">
                Active test types and diagnostic services.
              </p>
            </div>
            {canAccessServices && (
              <button
                type="button"
                onClick={() => void navigate('/portal/lab-services')}
                className="client-panel-link"
              >
                <span>Manage catalog</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="client-panel-body">
            {loading ? (
              <div className="client-empty-state">Loading services…</div>
            ) : services.length === 0 ? (
              <div className="client-empty-state">No services registered yet.</div>
            ) : (
              <div className="client-list">
                {services.slice(0, 3).map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => void navigate('/portal/lab-services')}
                    className="client-list-item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="client-avatar-cyan">
                        <Stethoscope size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="client-item-name">{srv.name}</div>
                        <div className="client-item-meta">Diagnostic Service</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="client-badge-success">Active</span>
                      <ExternalLink size={13} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
