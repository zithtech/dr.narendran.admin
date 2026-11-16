import { App } from 'antd';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  LifeBuoy,
  MessageSquare,
  MoreHorizontal,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CommonFilterBar,
  CommonPageHeader,
  CommonPagination,
  CommonTable,
  type CommonTableColumn,
  type FilterDropdownOption,
  type FilterTabOption,
  PrimaryAvatarCell,
  StatusPill,
} from '../../../components/ui/CommonTable';
import { ActivityCell, Badge, cx } from '../../../components/ui/primitives';
import { timeAgo } from '../../../lib/format';
import { getErrorMessage } from '../../../utils/errors';
import { adminSupportApi } from '../api/adminSupportApi';
import { SupportTicketDrawer } from '../components/SupportTicketDrawer';
import type {
  AdminAgent,
  SupportMetrics,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/support';
import { KnowledgeBaseTab } from './KnowledgeBaseTab';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_DOCTOR', label: 'Waiting for Doctor' },
  { value: 'WAITING_FOR_PATIENT', label: 'Waiting for Patient' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'APPOINTMENTS', label: 'Appointments & Bookings' },
  { value: 'PRESCRIPTIONS', label: 'Prescriptions & Notes' },
  { value: 'SCHEDULE_AVAILABILITY', label: 'Schedule & Slots' },
  { value: 'PATIENT_CONSULTATION', label: 'Patient Consultation' },
  { value: 'PAYOUTS_SETTLEMENTS', label: 'Payouts & Settlements' },
  { value: 'MEDICINE_ORDERS', label: 'Medicine Orders' },
  { value: 'LAB_REPORTS', label: 'Lab Reports & Tests' },
  { value: 'PAYMENTS', label: 'Payments & Billing' },
  { value: 'TECHNICAL_HELP', label: 'Technical Help' },
  { value: 'GENERAL_INQUIRY', label: 'General Inquiry' },
];

export interface SupportCenterPageProps {
  defaultUserType?: 'PATIENT' | 'DOCTOR' | 'ALL';
}

export const SupportCenterPage: React.FC<SupportCenterPageProps> = ({
  defaultUserType = 'ALL',
}) => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<'tickets' | 'kb'>('tickets');
  const [userTypeFilter, setUserTypeFilter] = useState<'PATIENT' | 'DOCTOR' | 'ALL'>(defaultUserType);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AdminAgent[]>([]);

  // Filters matching Doctors & Prescriptions pages
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>(undefined);
  const [assignedFilter, setAssignedFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  // Drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setUserTypeFilter(defaultUserType);
    setPage(1);
  }, [defaultUserType]);

  const fetchMetrics = useCallback(async () => {
    try {
      const activeType = userTypeFilter === 'ALL' ? undefined : userTypeFilter;
      const data = await adminSupportApi.getMetrics(activeType);
      setMetrics(data);
    } catch {
      // Degraded fallback
    }
  }, [userTypeFilter]);

  const fetchAgents = useCallback(async () => {
    try {
      const list = await adminSupportApi.getAgents();
      setAgents(Array.isArray(list) ? list : []);
    } catch {
      setAgents([]);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const activeType = userTypeFilter === 'ALL' ? undefined : userTypeFilter;
      const res = await adminSupportApi.getTickets({
        userType: activeType,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        assignedTo: assignedFilter,
        search: search.trim() ? search.trim() : undefined,
        page,
        limit,
      });
      setTickets(res.tickets || []);
      setTotalTickets(res.total || 0);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load support tickets'));
    } finally {
      setLoading(false);
    }
  }, [userTypeFilter, statusFilter, priorityFilter, categoryFilter, assignedFilter, search, page, limit, message]);

  useEffect(() => {
    void fetchMetrics();
    void fetchAgents();
  }, [fetchMetrics, fetchAgents]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const handleOpenTicket = (id: string) => {
    setSelectedTicketId(id);
    setDrawerVisible(true);
  };

  const handleInlineAssign = async (ticketId: string, agentId: string | null) => {
    try {
      await adminSupportApi.assignTicket(ticketId, agentId);
      void message.success(agentId ? 'Assigned agent updated' : 'Ticket unassigned');
      await fetchTickets();
      void fetchMetrics();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to assign ticket'));
    }
  };

  const handleResetFilters = () => {
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
    setCategoryFilter(undefined);
    setAssignedFilter(undefined);
    setSearch('');
    setPage(1);
  };

  const isDoctorView = userTypeFilter === 'DOCTOR';
  const isPatientView = userTypeFilter === 'PATIENT';

  // Client-side sorted tickets
  const sortedTickets = useMemo(() => {
    if (!sort) return tickets;
    return [...tickets].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sort.id === 'ticket_number') {
        aVal = a.ticket_number || '';
        bVal = b.ticket_number || '';
      } else if (sort.id === 'contact') {
        aVal = (a.user_type === 'DOCTOR' ? a.doctor_name || a.user_name : a.patient_name || a.user_name || '').toLowerCase();
        bVal = (b.user_type === 'DOCTOR' ? b.doctor_name || b.user_name : b.patient_name || b.user_name || '').toLowerCase();
      } else if (sort.id === 'subject') {
        aVal = (a.subject || '').toLowerCase();
        bVal = (b.subject || '').toLowerCase();
      } else if (sort.id === 'priority') {
        aVal = a.priority || '';
        bVal = b.priority || '';
      } else if (sort.id === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else if (sort.id === 'updated_at') {
        aVal = new Date(a.updated_at || a.created_at).getTime();
        bVal = new Date(b.updated_at || b.created_at).getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [tickets, sort]);

  const handleSortChange = (colId: string) => {
    setSort((prev) => {
      if (prev?.id === colId) {
        if (prev.dir === 'asc') return { id: colId, dir: 'desc' };
        return null;
      }
      return { id: colId, dir: 'asc' };
    });
  };

  const columns: CommonTableColumn<SupportTicket>[] = [
    {
      id: 'ticket_number',
      header: 'Ticket #',
      sort: (t) => t.ticket_number || '',
      width: 140,
      cell: (t) => {
        const isDoc = t.user_type?.toUpperCase() === 'DOCTOR';
        const displayNum = t.ticket_number || (isDoc ? 'DOC-XXXX' : 'TKT-XXXX');
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTicket(t.id);
              }}
              className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              #{displayNum.replace(/^#/, '')}
            </button>
            {userTypeFilter === 'ALL' && (
              <span
                className={cx(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                  isDoc
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-sky-50 text-sky-700 border border-sky-200/60',
                )}
              >
                {isDoc ? 'Doc' : 'Pat'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'contact',
      header: isDoctorView ? 'Doctor' : isPatientView ? 'Patient' : 'Requester',
      sort: (t) => {
        const isDoc = t.user_type?.toUpperCase() === 'DOCTOR';
        return (isDoc ? t.doctor_name || t.user_name : t.patient_name || t.user_name || '').toLowerCase();
      },
      cell: (t) => {
        const isDoc = t.user_type?.toUpperCase() === 'DOCTOR';
        if (isDoc) {
          const rawName = t.doctor_name || t.user_name || 'Doctor';
          const docName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName.replace(/^Dr\.?\s*/i, '')}`;
          const subDetails = [
            t.doctor_specialization,
            t.doctor_hospital_name,
            t.doctor_phone || t.user_phone,
          ].filter(Boolean).join(' • ');

          return (
            <PrimaryAvatarCell
              name={docName}
              sub={
                <span className="inline-flex items-center gap-1">
                  <Stethoscope size={10} className="text-blue-500 shrink-0" />
                  <span>{subDetails || 'Specialist Clinician'}</span>
                </span>
              }
              onOpen={() => handleOpenTicket(t.id)}
            />
          );
        }

        const patName = t.patient_name || t.user_name || 'Patient';
        const subDetails = [
          t.patient_phone || t.user_phone,
          t.patient_email || t.user_email,
        ].filter(Boolean).join(' • ');

        return (
          <PrimaryAvatarCell
            name={patName}
            sub={subDetails || 'Registered Patient'}
            onOpen={() => handleOpenTicket(t.id)}
          />
        );
      },
    },
    {
      id: 'subject',
      header: 'Subject & Details',
      sort: (t) => (t.subject || '').toLowerCase(),
      cell: (t) => (
        <div className="max-w-[320px]">
          <div
            className="text-xs font-semibold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
            title={t.subject}
            onClick={() => handleOpenTicket(t.id)}
          >
            {t.subject}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-500 font-medium capitalize">
              {t.category ? t.category.replace(/_/g, ' ').toLowerCase() : 'General Inquiry'}
            </span>
            {t.last_message && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-400 truncate max-w-[180px]" title={t.last_message}>
                  {t.last_message}
                </span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      sort: (t) => t.priority || '',
      width: 100,
      cell: (t) => {
        const p = t.priority?.toUpperCase();
        if (p === 'URGENT') return <Badge tone="red">Urgent</Badge>;
        if (p === 'HIGH') return <Badge tone="amber">High</Badge>;
        if (p === 'MEDIUM') return <Badge tone="blue">Medium</Badge>;
        return <Badge tone="neutral">Low</Badge>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      sort: (t) => t.status || '',
      width: 150,
      cell: (t) => {
        const s = t.status?.toUpperCase();
        if (s === 'OPEN') return <StatusPill label="Open" tone="blue" />;
        if (s === 'IN_PROGRESS') return <StatusPill label="In Progress" tone="amber" />;
        if (s === 'WAITING_FOR_DOCTOR') return <StatusPill label="Waiting Doctor" tone="blue" />;
        if (s === 'WAITING_FOR_PATIENT') return <StatusPill label="Waiting Patient" tone="blue" />;
        if (s === 'RESOLVED') return <StatusPill label="Resolved" tone="green" />;
        if (s === 'CLOSED') return <StatusPill label="Closed" tone="gray" />;
        return <StatusPill label={s || 'Unknown'} tone="gray" />;
      },
    },
    {
      id: 'assigned_to',
      header: 'Assigned Agent',
      width: 160,
      cell: (t) => (
        <div
          className="w-[150px]"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={t.assigned_to || ''}
            onChange={(e) => {
              void handleInlineAssign(t.id, e.target.value || null);
            }}
            className="w-full h-7 px-2 text-xs rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors shadow-2xs"
          >
            <option value="">Unassigned</option>
            {(agents || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: 'updated_at',
      header: 'Last Activity',
      sort: (t) => new Date(t.updated_at || t.created_at).getTime(),
      width: 140,
      cell: (t) => (
        <ActivityCell
          label={t.updated_at && t.updated_at !== t.created_at ? 'Updated' : 'Created'}
          when={timeAgo(t.updated_at || t.created_at)}
        />
      ),
    },
  ];

  const awaitingResponseCount =
    isDoctorView
      ? (metrics?.awaitingDoctorResponse ?? 0)
      : isPatientView
      ? (metrics?.awaitingPatientResponse ?? 0)
      : (metrics?.awaitingPatientResponse ?? 0) + (metrics?.awaitingDoctorResponse ?? 0);

  // Status tabs for CommonFilterBar
  const statusTabs: FilterTabOption[] = [
    {
      id: 'all',
      label: 'All Tickets',
      count: totalTickets,
      active: statusFilter === undefined,
      onClick: () => {
        setStatusFilter(undefined);
        setPage(1);
      },
    },
    {
      id: 'open',
      label: 'Open',
      count: metrics?.openTickets ?? metrics?.totalOpenTickets ?? 0,
      active: statusFilter === 'OPEN',
      onClick: () => {
        setStatusFilter('OPEN');
        setPage(1);
      },
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: metrics?.inProgressTickets ?? 0,
      active: statusFilter === 'IN_PROGRESS',
      onClick: () => {
        setStatusFilter('IN_PROGRESS');
        setPage(1);
      },
    },
    {
      id: 'waiting',
      label: isDoctorView ? 'Waiting Doctor' : 'Waiting Patient',
      count: awaitingResponseCount,
      active: statusFilter === (isDoctorView ? 'WAITING_FOR_DOCTOR' : 'WAITING_FOR_PATIENT'),
      onClick: () => {
        setStatusFilter(isDoctorView ? 'WAITING_FOR_DOCTOR' : 'WAITING_FOR_PATIENT');
        setPage(1);
      },
    },
    {
      id: 'resolved',
      label: 'Resolved',
      count: metrics?.resolvedToday ?? 0,
      active: statusFilter === 'RESOLVED',
      onClick: () => {
        setStatusFilter('RESOLVED');
        setPage(1);
      },
    },
  ];

  // Dropdowns for CommonFilterBar
  const filterDropdowns: FilterDropdownOption[] = [
    {
      id: 'status',
      label: 'Status',
      allLabel: 'All Statuses',
      value: statusFilter ?? '',
      onChange: (val) => {
        setStatusFilter(val ? (val as TicketStatus) : undefined);
        setPage(1);
      },
      options: STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    },
    {
      id: 'priority',
      label: 'Priority',
      allLabel: 'All Priorities',
      value: priorityFilter ?? '',
      onChange: (val) => {
        setPriorityFilter(val ? (val as TicketPriority) : undefined);
        setPage(1);
      },
      options: PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
    },
    {
      id: 'category',
      label: 'Category',
      allLabel: 'All Categories',
      value: categoryFilter ?? '',
      onChange: (val) => {
        setCategoryFilter(val ? (val as TicketCategory) : undefined);
        setPage(1);
      },
      options: CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
    },
    {
      id: 'assigned',
      label: 'Agent',
      allLabel: 'All Agents',
      value: assignedFilter ?? '',
      onChange: (val) => {
        setAssignedFilter(val || undefined);
        setPage(1);
      },
      options: (agents || []).map((a) => ({ value: a.id, label: a.name })),
    },
  ];

  const hasActiveFilters = Boolean(
    statusFilter || priorityFilter || categoryFilter || assignedFilter || search.trim(),
  );

  const pageCount = Math.max(1, Math.ceil(totalTickets / limit));
  const startIdx = totalTickets > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(totalTickets, page * limit);

  return (
    <div className="ui-page space-y-3">
      {/* 1. Common Page Header matching Doctor page layout */}
      <CommonPageHeader
        title={
          isDoctorView
            ? 'Doctor Support'
            : isPatientView
            ? 'Patient Support'
            : 'Support Center'
        }
        subtitle={
          isDoctorView
            ? 'Doctor queries, schedule changes, clinical escalations, and technical assistance.'
            : isPatientView
            ? 'Patient triage, consultation assistance, prescription help, and multi-agent incident resolution.'
            : 'Unified support workspace for clinic doctors, registered patients, and healthcare staff.'
        }
        syncedLabel="Live Support Queue"
        loading={loading}
        onRefresh={() => {
          void fetchMetrics();
          void fetchTickets();
        }}
        extraActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setUserTypeFilter('DOCTOR');
                setPage(1);
              }}
              className={cx(
                'inline-flex items-center gap-1.5 h-7.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer border',
                userTypeFilter === 'DOCTOR'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Stethoscope size={13} className={userTypeFilter === 'DOCTOR' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Doctor Support</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserTypeFilter('PATIENT');
                setPage(1);
              }}
              className={cx(
                'inline-flex items-center gap-1.5 h-7.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer border',
                userTypeFilter === 'PATIENT'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <LifeBuoy size={13} className={userTypeFilter === 'PATIENT' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Patient Support</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserTypeFilter('ALL');
                setPage(1);
              }}
              className={cx(
                'inline-flex items-center gap-1.5 h-7.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer border',
                userTypeFilter === 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span>All Tickets</span>
            </button>
          </div>
        }
      />

      {/* 2. Section Navigation Tabs: Tickets Queue vs Knowledge Base */}
      <div className="flex items-center gap-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={cx(
            'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
            activeTab === 'tickets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <MessageSquare size={14} />
          <span>Tickets Queue</span>
          <span
            className={cx(
              'px-1.5 py-0.2 rounded-full text-[10.5px] font-semibold',
              activeTab === 'tickets' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600',
            )}
          >
            {totalTickets}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kb')}
          className={cx(
            'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer',
            activeTab === 'kb'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <BookOpen size={14} />
          <span>Knowledge Base &amp; FAQs</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'tickets' ? (
        <div className="flex flex-col gap-3">
          {/* KPI Metric Cards following Dashboard design & layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Open Tickets */}
            <div
              className={cx(
                'ui-dash-stat-card',
                statusFilter === 'OPEN' && 'ring-2 ring-blue-500/40 border-blue-400 bg-blue-50/20',
              )}
              onClick={() => {
                setStatusFilter(statusFilter === 'OPEN' ? undefined : 'OPEN');
                setPage(1);
              }}
              role="button"
              tabIndex={0}
              title="Filter by Open Tickets"
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <AlertCircle size={16} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
                  <span className="ui-dash-stat-title">Open Tickets</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter('OPEN');
                    setPage(1);
                  }}
                  aria-label="Open tickets options"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {loading && !metrics ? '…' : (metrics?.totalOpenTickets ?? metrics?.openTickets ?? 0).toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <AlertCircle size={10} strokeWidth={2.5} />
                  <span>Triage</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">Requires staff attention</div>
            </div>

            {/* In Progress */}
            <div
              className={cx(
                'ui-dash-stat-card',
                statusFilter === 'IN_PROGRESS' && 'ring-2 ring-amber-500/40 border-amber-400 bg-amber-50/20',
              )}
              onClick={() => {
                setStatusFilter(statusFilter === 'IN_PROGRESS' ? undefined : 'IN_PROGRESS');
                setPage(1);
              }}
              role="button"
              tabIndex={0}
              title="Filter by In Progress Tickets"
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Clock size={16} strokeWidth={2} className="ui-dash-stat-icon text-amber-600" />
                  <span className="ui-dash-stat-title">In Progress</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter('IN_PROGRESS');
                    setPage(1);
                  }}
                  aria-label="In progress options"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {loading && !metrics ? '…' : (metrics?.inProgressTickets ?? 0).toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-amber">
                  <Clock size={10} strokeWidth={2.5} />
                  <span>Active</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">Active investigation</div>
            </div>

            {/* Awaiting Doctor / Patient */}
            <div
              className={cx(
                'ui-dash-stat-card',
                statusFilter === (isDoctorView ? 'WAITING_FOR_DOCTOR' : 'WAITING_FOR_PATIENT') &&
                  'ring-2 ring-purple-500/40 border-purple-400 bg-purple-50/20',
              )}
              onClick={() => {
                const targetStatus = isDoctorView ? 'WAITING_FOR_DOCTOR' : 'WAITING_FOR_PATIENT';
                setStatusFilter(statusFilter === targetStatus ? undefined : targetStatus);
                setPage(1);
              }}
              role="button"
              tabIndex={0}
              title={`Filter by ${isDoctorView ? 'Awaiting Doctor' : isPatientView ? 'Awaiting Patient' : 'Awaiting Reply'}`}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <UserCheck size={16} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
                  <span className="ui-dash-stat-title">
                    {isDoctorView ? 'Awaiting Doctor' : isPatientView ? 'Awaiting Patient' : 'Awaiting Reply'}
                  </span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter(isDoctorView ? 'WAITING_FOR_DOCTOR' : 'WAITING_FOR_PATIENT');
                    setPage(1);
                  }}
                  aria-label="Awaiting options"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {loading && !metrics ? '…' : awaitingResponseCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-purple">
                  <UserCheck size={10} strokeWidth={2.5} />
                  <span>Pending</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">Pending user response</div>
            </div>

            {/* Resolved Today */}
            <div
              className={cx(
                'ui-dash-stat-card',
                statusFilter === 'RESOLVED' && 'ring-2 ring-emerald-500/40 border-emerald-400 bg-emerald-50/20',
              )}
              onClick={() => {
                setStatusFilter(statusFilter === 'RESOLVED' ? undefined : 'RESOLVED');
                setPage(1);
              }}
              role="button"
              tabIndex={0}
              title="Filter by Resolved Tickets"
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <CheckCircle size={16} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
                  <span className="ui-dash-stat-title">Resolved Today</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter('RESOLVED');
                    setPage(1);
                  }}
                  aria-label="Resolved options"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {loading && !metrics ? '…' : (metrics?.resolvedToday ?? 0).toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-green">
                  <CheckCircle size={10} strokeWidth={2.5} />
                  <span>Closed</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">Successfully closed today</div>
            </div>
          </div>

          {/* Common Table matching Doctor page */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
            <CommonFilterBar
              tabs={statusTabs}
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              searchPlaceholder={
                isDoctorView
                  ? 'Search ticket #, doctor name, subject...'
                  : 'Search ticket #, patient name, doctor, subject...'
              }
              dropdowns={filterDropdowns}
              onReset={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            <CommonTable
              columns={columns}
              data={sortedTickets}
              loading={loading}
              onRowClick={(t) => handleOpenTicket(t.id)}
              sort={sort}
              onSortChange={handleSortChange}
              rowActions={(t) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTicket(t.id);
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 hover:border-blue-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Open Ticket Workspace"
                >
                  <MessageSquare size={12} className="text-blue-600" />
                  <span>Open</span>
                </button>
              )}
              emptyState={
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                    <LifeBuoy size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No support tickets found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    {hasActiveFilters
                      ? 'No tickets match your active filter criteria. Try resetting filters or adjusting search.'
                      : `No ${isDoctorView ? 'doctor' : isPatientView ? 'patient' : ''} support tickets currently open.`}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              }
            />

            <CommonPagination
              total={totalTickets}
              startIdx={startIdx}
              endIdx={endIdx}
              nounPlural="tickets"
              page={page}
              pageCount={pageCount}
              perPage={limit}
              onPageChange={(p) => setPage(p)}
              onPerPageChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        <KnowledgeBaseTab userType={userTypeFilter} />
      )}

      {/* Ticket Details & Workspace Drawer */}
      <SupportTicketDrawer
        ticketId={selectedTicketId}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onTicketUpdated={() => {
          void fetchTickets();
          void fetchMetrics();
        }}
        agents={agents}
      />
    </div>
  );
};

export default SupportCenterPage;
