import { DatePicker, Modal, Popconfirm, Select, Spin, message } from 'antd';
import dayjs from 'dayjs';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  LayoutDashboard,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  MinusCircle,
  PauseCircle,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Stethoscope,
  Timer,
  Trash2,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import api from '../../utils/api';
import { CreateDrawer } from '../../components/ui/Drawer';
import { CommonPageHeader, CommonPagination, StatusPill } from '../../components/ui/CommonTable';

interface DeptStyle {
  bar: string;
  badge: string;
  dot: string;
}

const getDeptStyle = (name: string, idx: number): DeptStyle => {
  const n = name.toLowerCase();
  if (n.includes('cardio') || n.includes('surg')) {
    return {
      bar: 'from-rose-500 to-rose-600',
      badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
    };
  }
  if (n.includes('pediat') || n.includes('child')) {
    return {
      bar: 'from-amber-500 to-orange-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    };
  }
  if (n.includes('ortho') || n.includes('bone') || n.includes('trauma')) {
    return {
      bar: 'from-blue-500 to-indigo-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    };
  }
  if (n.includes('derma') || n.includes('skin')) {
    return {
      bar: 'from-purple-500 to-violet-600',
      badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
      dot: 'bg-purple-500',
    };
  }
  const fallbackDefault: DeptStyle = {
    bar: 'from-teal-500 to-emerald-600',
    badge: 'bg-teal-50 text-teal-700 border-teal-200/80',
    dot: 'bg-teal-500',
  };
  const fallbacks: DeptStyle[] = [
    fallbackDefault,
    { bar: 'from-sky-500 to-blue-600', badge: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' },
    { bar: 'from-indigo-500 to-purple-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' },
  ];
  const pick = fallbacks[idx % fallbacks.length];
  return pick ?? fallbackDefault;
};

function calculateFormDuration(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(':').map((n) => parseInt(n, 10));
  const [outH, outM] = outTime.split(':').map((n) => parseInt(n, 10));
  if (inH === undefined || inM === undefined || outH === undefined || outM === undefined) return 0;
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
  return Math.max(0, outH * 60 + outM - (inH * 60 + inM));
}

function formatWorkHours(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${hrs}h ${mins}m`;
}

export type AttendanceTabType = 'dashboard' | 'check-in' | 'manage';
export type UserRoleCategory = 'ADMIN' | 'DOCTOR' | 'STAFF';

interface AdminAttendancePageProps {
  defaultTab?: AttendanceTabType;
  forcedRole?: UserRoleCategory;
}

interface DashboardStats {
  date: string;
  total_doctors: number;
  active_doctors_on_duty: number;
  total_staff: number;
  active_staff_on_duty: number;
  late_arrivals_today: number;
  absent_today: number;
  on_leave_today: number;
  department_breakdown: Array<{
    department: string;
    total: number;
    present: number;
    percentage: number;
  }>;
  recent_punches: Array<{
    user_id: string;
    user_name: string;
    user_type: string;
    role: string;
    punch_type: string;
    punched_at: string;
    shift_name: string;
    status: string;
  }>;
}

export interface AttendancePunchItem {
  id: string;
  punch_type: string;
  punched_at: string;
  device_info?: string | null;
  verification_status?: string;
}

interface AttendanceRecordItem {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  department?: string;
  user_type: string;
  date: string;
  shift?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    color_code?: string;
  } | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_working_minutes: number;
  overtime_minutes: number;
  status: string;
  check_in_method: string;
  is_manual_entry: boolean;
  manual_reason?: string | null;
  punches?: AttendancePunchItem[];
}

export interface AttendanceSession {
  id: string;
  sessionNumber: number;
  type: 'WORK' | 'BREAK';
  label: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes: number;
  status: string;
}

// Compute individual sessions from punches or fallback to check_in/check_out
function computeSessionsFromRecord(record: AttendanceRecordItem): AttendanceSession[] {
  // If this is a manual entry, use the definitive check_in_time and check_out_time
  if (record.is_manual_entry && record.check_in_time) {
    const inDate = new Date(record.check_in_time);
    const outDate = record.check_out_time ? new Date(record.check_out_time) : null;
    const duration = record.total_working_minutes > 0
      ? record.total_working_minutes
      : outDate
      ? Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 60000))
      : 0;

    return [
      {
        id: `sess-${record.id}-1`,
        sessionNumber: 1,
        type: 'WORK',
        label: 'Session 1',
        startTime: record.check_in_time,
        endTime: record.check_out_time || null,
        durationMinutes: duration,
        status: record.check_out_time ? 'Completed' : 'Active',
      },
    ];
  }

  const punches = (record.punches || []).slice().sort((a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime());

  if (!punches || punches.length === 0) {
    if (record.check_in_time) {
      const inDate = new Date(record.check_in_time);
      const outDate = record.check_out_time ? new Date(record.check_out_time) : null;
      const duration = record.total_working_minutes > 0
        ? record.total_working_minutes
        : outDate
        ? Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 60000))
        : Math.max(0, Math.floor((Date.now() - inDate.getTime()) / 60000));

      return [
        {
          id: `sess-${record.id}-1`,
          sessionNumber: 1,
          type: 'WORK',
          label: 'Session 1',
          startTime: record.check_in_time,
          endTime: record.check_out_time || null,
          durationMinutes: duration,
          status: record.check_out_time ? 'Completed' : 'Active',
        },
      ];
    }
    return [];
  }

  const sessions: AttendanceSession[] = [];
  let currentWorkStart: string | null = null;
  let currentBreakStart: string | null = null;
  let sessionIndex = 1;

  for (let i = 0; i < punches.length; i++) {
    const p = punches[i];
    if (!p) continue;
    if (p.punch_type === 'IN') {
      currentWorkStart = p.punched_at;
    } else if (p.punch_type === 'BREAK_START') {
      if (currentWorkStart) {
        const duration = Math.max(0, Math.floor((new Date(p.punched_at).getTime() - new Date(currentWorkStart).getTime()) / 60000));
        sessions.push({
          id: `sess-${sessionIndex}`,
          sessionNumber: sessionIndex,
          type: 'WORK',
          label: `Session ${sessionIndex}`,
          startTime: currentWorkStart,
          endTime: p.punched_at,
          durationMinutes: duration,
          status: 'Completed',
        });
        sessionIndex++;
        currentWorkStart = null;
      }
      currentBreakStart = p.punched_at;
    } else if (p.punch_type === 'BREAK_END') {
      if (currentBreakStart) {
        const breakDur = Math.max(0, Math.floor((new Date(p.punched_at).getTime() - new Date(currentBreakStart).getTime()) / 60000));
        sessions.push({
          id: `break-${sessionIndex}`,
          sessionNumber: sessionIndex,
          type: 'BREAK',
          label: 'Break',
          startTime: currentBreakStart,
          endTime: p.punched_at,
          durationMinutes: breakDur,
          status: 'Completed',
        });
        currentBreakStart = null;
      }
      currentWorkStart = p.punched_at;
    } else if (p.punch_type === 'OUT') {
      if (currentWorkStart) {
        const duration = Math.max(0, Math.floor((new Date(p.punched_at).getTime() - new Date(currentWorkStart).getTime()) / 60000));
        sessions.push({
          id: `sess-${sessionIndex}`,
          sessionNumber: sessionIndex,
          type: 'WORK',
          label: `Session ${sessionIndex}`,
          startTime: currentWorkStart,
          endTime: p.punched_at,
          durationMinutes: duration,
          status: 'Completed',
        });
        sessionIndex++;
        currentWorkStart = null;
      }
    }
  }

  if (currentWorkStart) {
    const duration = Math.max(0, Math.floor((Date.now() - new Date(currentWorkStart).getTime()) / 60000));
    sessions.push({
      id: `sess-${sessionIndex}`,
      sessionNumber: sessionIndex,
      type: 'WORK',
      label: `Session ${sessionIndex}`,
      startTime: currentWorkStart,
      endTime: record.check_out_time || null,
      durationMinutes: record.total_working_minutes > 0 ? record.total_working_minutes : duration,
      status: record.check_out_time ? 'Completed' : 'Active',
    });
  } else if (currentBreakStart) {
    const breakDur = Math.max(0, Math.floor((Date.now() - new Date(currentBreakStart).getTime()) / 60000));
    sessions.push({
      id: `break-${sessionIndex}`,
      sessionNumber: sessionIndex,
      type: 'BREAK',
      label: 'Break (Ongoing)',
      startTime: currentBreakStart,
      endTime: null,
      durationMinutes: breakDur,
      status: 'On Break',
    });
  }

  return sessions;
}

export default function AdminAttendancePage({
  defaultTab,
  forcedRole,
}: AdminAttendancePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Role Identification
  const [userRole, setUserRole] = useState<UserRoleCategory>(() => {
    if (forcedRole) return forcedRole;
    const stored = (localStorage.getItem('adminRole') || '').toUpperCase();
    if (stored.includes('DOCTOR')) return 'DOCTOR';
    if (
      stored.includes('SUPER_ADMIN') ||
      stored.includes('SUPER ADMIN') ||
      stored.includes('ADMIN') ||
      stored.includes('MANAGER') ||
      stored.includes('DIRECTOR') ||
      stored.includes('HOSPITAL_ADMIN')
    ) {
      return 'ADMIN';
    }
    if (stored.includes('STAFF') || stored.includes('NURSE') || stored.includes('RECEPTIONIST')) {
      return 'STAFF';
    }
    return 'ADMIN';
  });

  const [currentUserProfile, setCurrentUserProfile] = useState<{
    id: string;
    name: string;
    role: string;
    department: string;
    specialization?: string;
    email: string;
    userType: string;
  } | null>(null);

  // 2. Permitted Tabs for this Role
  const permittedTabs: AttendanceTabType[] = useMemo(() => {
    if (userRole === 'ADMIN') {
      return ['dashboard', 'check-in', 'manage'];
    }
    if (userRole === 'DOCTOR') {
      return ['check-in', 'dashboard'];
    }
    return ['check-in', 'dashboard'];
  }, [userRole]);

  // 3. Active Tab Selection
  const initialTab = useMemo<AttendanceTabType>(() => {
    const tabParam = searchParams.get('tab') as AttendanceTabType | null;
    if (tabParam && permittedTabs.includes(tabParam)) return tabParam;
    if (defaultTab && permittedTabs.includes(defaultTab)) return defaultTab;
    return permittedTabs[0] || 'dashboard';
  }, [searchParams, defaultTab, permittedTabs]);

  const [activeTab, setActiveTab] = useState<AttendanceTabType>(initialTab);

  useEffect(() => {
    if (!permittedTabs.includes(activeTab)) {
      setActiveTab(permittedTabs[0] || 'check-in');
    }
  }, [permittedTabs, activeTab]);

  const handleTabChange = (tab: AttendanceTabType) => {
    if (!permittedTabs.includes(tab)) return;
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // 4. Personal Attendance / Check-In State
  const [punching, setPunching] = useState<boolean>(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [myKpis, setMyKpis] = useState<any>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    absentDays: 0,
    totalHoursWorked: 0,
    averageDailyHours: 0,
  });

  const [historyViewMode, setHistoryViewMode] = useState<'table' | 'grid'>('table');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());

  const toggleHistoryRowExpanded = (recId: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (myHistory.length > 0) {
      const todayRec = myHistory.find((r) => dayjs(r.date).isSame(dayjs(), 'day'));
      if (todayRec) {
        setExpandedHistoryIds((prev) => new Set([...prev, todayRec.id]));
      }
    }
  }, [myHistory]);

  // Work Hours Insights calculation for Clock In / Out Tab
  const { weekHoursStr, monthHoursStr, dailyAvgHoursStr, weekOvertimeStr, weekProgress } = useMemo(() => {
    const today = dayjs();
    const startOfWeek = today.startOf('week');
    const startOfMonth = today.startOf('month');

    let weekMinutes = 0;
    let monthMinutes = 0;
    let weekOvertimeMinutes = 0;
    let daysWithWork = 0;

    myHistory.forEach((rec) => {
      const recDate = dayjs(rec.date);
      const mins = rec.total_working_minutes || 0;
      const ot = rec.overtime_minutes || 0;

      if (recDate.isAfter(startOfWeek.subtract(1, 'day')) && recDate.isBefore(today.add(1, 'day'))) {
        weekMinutes += mins;
        weekOvertimeMinutes += ot;
      }

      if (recDate.isAfter(startOfMonth.subtract(1, 'day')) && recDate.isBefore(today.add(1, 'day'))) {
        monthMinutes += mins;
        if (mins > 0) daysWithWork++;
      }
    });

    if (todayStatus?.elapsedWorkingMinutes && !myHistory.some((r) => dayjs(r.date).isSame(today, 'day'))) {
      weekMinutes += todayStatus.elapsedWorkingMinutes;
      monthMinutes += todayStatus.elapsedWorkingMinutes;
      daysWithWork++;
    }

    const avgMinutes = daysWithWork > 0 ? Math.round(monthMinutes / daysWithWork) : 0;
    const progress = Math.min(100, Math.round((weekMinutes / (40 * 60)) * 100));

    return {
      weekHoursStr: formatWorkHours(weekMinutes),
      monthHoursStr: formatWorkHours(monthMinutes),
      dailyAvgHoursStr: formatWorkHours(avgMinutes),
      weekOvertimeStr: `${Math.floor(weekOvertimeMinutes / 60)}h`,
      weekProgress: progress,
    };
  }, [myHistory, todayStatus]);

  const todaySessionsCount = useMemo(() => {
    if (!todayStatus) return 0;
    const inPunches = todayStatus.punches?.filter((p: any) => p.punch_type === 'IN').length || 0;
    if (inPunches > 0) return inPunches;
    return todayStatus.isCheckedIn ? 1 : 0;
  }, [todayStatus]);

  const paginatedMyHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return myHistory.slice(start, start + historyPageSize);
  }, [myHistory, historyPage, historyPageSize]);

  // Regularization Modal (Doctor / Staff)
  const [isRegModalOpen, setIsRegModalOpen] = useState<boolean>(false);
  const [regForm, setRegForm] = useState({
    date: dayjs().format('YYYY-MM-DD'),
    requestType: 'MISSED_PUNCH_IN',
    requestedCheckIn: '',
    requestedCheckOut: '',
    reason: '',
  });

  // 6. Admin Management & Dashboard State
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [userTypeFilter, setUserTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Expandable Row Sessions State
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (recordId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedRowIds.size === records.length && records.length > 0) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(records.map((r) => r.id)));
    }
  };

  // Manual Entry / Edit Record Drawer State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordData, setEditingRecordData] = useState<AttendanceRecordItem | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);
  const [drawerMemberType, setDrawerMemberType] = useState<'ALL' | 'DOCTOR' | 'STAFF' | 'ADMIN'>('ALL');
  const [manualForm, setManualForm] = useState<{
    userId: string;
    userType: 'STAFF' | 'DOCTOR' | 'ADMIN';
    date: string;
    shiftId: string;
    checkInTime: string;
    checkOutTime: string;
    status: string;
    reason: string;
    remarks: string;
  }>({
    userId: '',
    userType: 'STAFF',
    date: dayjs().format('YYYY-MM-DD'),
    shiftId: '',
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT',
    reason: '',
    remarks: '',
  });
  const [userOptions, setUserOptions] = useState<
    Array<{ id: string; name: string; role: string; type: 'STAFF' | 'DOCTOR' | 'ADMIN'; department?: string }>
  >([]);

  // Check if status is locked to PRESENT
  const isStatusLockedToPresent = useMemo(() => {
    if (editingRecordId) {
      const target = records.find((r) => r.id === editingRecordId);
      if (target && target.status === 'PRESENT') return true;
    }
    // Also check if selected user already has a record for that date marked PRESENT
    const existing = records.find((r) => r.user_id === manualForm.userId && r.date === manualForm.date);
    if (existing && existing.status === 'PRESENT') return true;
    return false;
  }, [editingRecordId, records, manualForm.userId, manualForm.date]);

  // Fetch Today's Self Status & Profile
  const fetchTodayStatus = async () => {
    try {
      const res = await api.get('attendance/today-status');
      if (res.data?.data) {
        const d = res.data.data;
        setTodayStatus(d);
        if (d.user) {
          setCurrentUserProfile(d.user);
          if (!forcedRole) {
            if (d.user.userType === 'DOCTOR') {
              setUserRole('DOCTOR');
            } else if (
              d.user.userType === 'ADMIN' ||
              d.user.role?.toUpperCase().includes('ADMIN') ||
              (localStorage.getItem('adminRole') || '').toUpperCase().includes('ADMIN')
            ) {
              setUserRole('ADMIN');
            } else {
              setUserRole('STAFF');
            }
          }
        }
      }
    } catch {
      // silent
    }
  };

  const fetchMyHistory = async () => {
    try {
      const res = await api.get('attendance/my-history');
      if (res.data?.data) {
        setMyHistory(res.data.data.history || []);
        if (res.data.data.kpis) {
          setMyKpis(res.data.data.kpis);
        }
      }
    } catch {
      // silent
    }
  };

  // Admin Data Fetchers
  const fetchAdminDashboard = async () => {
    if (userRole !== 'ADMIN') return;
    try {
      const res = await api.get(`attendance/admin/dashboard?date=${selectedDate}`);
      if (res.data?.data) {
        setAdminStats(res.data.data);
      }
    } catch {
      // silent
    }
  };

  const fetchAdminRecords = async () => {
    if (userRole !== 'ADMIN') return;
    setAdminLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      if (userTypeFilter !== 'ALL') params.append('userType', userTypeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`attendance/admin/records?${params.toString()}`);
      if (res.data?.data) {
        const list: AttendanceRecordItem[] = res.data.data.records || [];
        setRecords(list);
        setTotalRecords(res.data.data.total || 0);

        // Auto-expand all records on first load so sessions are visible like in the screenshot
        if (list.length > 0) {
          setExpandedRowIds(new Set(list.map((r) => r.id)));
        }
      }
    } catch {
      message.error('Failed to load hospital attendance records.');
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchUsersList = async () => {
    if (userRole !== 'ADMIN') return;
    try {
      const [staffRes, docRes, userAccountsRes] = await Promise.allSettled([
        api.get('staff?status=ACTIVE'),
        api.get('doctors?limit=100'),
        api.get('user-accounts'),
      ]);
      const list: Array<{ id: string; name: string; role: string; type: 'STAFF' | 'DOCTOR' | 'ADMIN'; department?: string }> = [];

      const extractList = (res: PromiseSettledResult<any>): any[] => {
        if (res.status === 'fulfilled' && res.value?.data) {
          const d = res.value.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d.data)) return d.data;
          if (Array.isArray(d.doctors)) return d.doctors;
          if (Array.isArray(d.staff)) return d.staff;
          if (Array.isArray(d.items)) return d.items;
        }
        return [];
      };

      const staffItems = extractList(staffRes);
      staffItems.forEach((s: any) => {
        list.push({
          id: s.id,
          name: s.name,
          role: s.role || 'Staff',
          department: s.department || 'Operations',
          type: 'STAFF',
        });
      });

      const docItems = extractList(docRes);
      docItems.forEach((d: any) => {
        const rawName = d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Doctor';
        const docName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
        list.push({
          id: d.id,
          name: docName,
          role: d.specialization || 'Consultant Doctor',
          department: d.specialization || 'Clinical',
          type: 'DOCTOR',
        });
      });

      const userAccountItems = extractList(userAccountsRes);
      userAccountItems.forEach((u: any) => {
        const r = (u.role || '').toUpperCase();
        if (r.includes('ADMIN')) {
          list.push({
            id: u.id,
            name: u.username || u.name || 'Admin User',
            role: u.role || 'Administrator',
            department: 'Administration',
            type: 'ADMIN',
          });
        }
      });

      // Also ensure current logged in profile is in the list if admin
      if (currentUserProfile && (currentUserProfile.userType === 'ADMIN' || currentUserProfile.role?.toUpperCase().includes('ADMIN'))) {
        if (!list.some((item) => item.id === currentUserProfile.id)) {
          list.unshift({
            id: currentUserProfile.id,
            name: currentUserProfile.name || 'Administrator',
            role: currentUserProfile.role || 'Administrator',
            department: currentUserProfile.department || 'Administration',
            type: 'ADMIN',
          });
        }
      }

      setUserOptions(list);
    } catch {
      // silent
    }
  };

  // Initial Load
  useEffect(() => {
    void fetchTodayStatus();
    void fetchMyHistory();
  }, []);

  useEffect(() => {
    if (userRole === 'ADMIN') {
      void fetchAdminDashboard();
      void fetchAdminRecords();
      void fetchUsersList();
    }
  }, [userRole, selectedDate, page, pageSize, userTypeFilter, statusFilter]);

  // Punch Action
  const handlePunch = async (punchType: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END') => {
    setPunching(true);
    try {
      const res = await api.post('attendance/punch', { punchType });
      message.success(res.data?.data?.message || 'Attendance punch recorded successfully.');
      await Promise.all([fetchTodayStatus(), fetchMyHistory()]);
      if (userRole === 'ADMIN') {
        void fetchAdminDashboard();
        void fetchAdminRecords();
      }
    } catch (err: any) {
      message.error(err.response?.data?.details?.message || err.response?.data?.message || 'Failed to record punch.');
    } finally {
      setPunching(false);
    }
  };

  // Regularization Submit
  const handleRegularizeSubmit = async () => {
    if (!regForm.reason.trim()) {
      message.warning('Please provide a reason for the regularization.');
      return;
    }
    try {
      await api.post('attendance/regularize', regForm);
      message.success('Duty regularization request submitted to administrator.');
      setIsRegModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.details?.message || err.response?.data?.message || 'Failed to submit request.');
    }
  };

  // Open Edit Record
  const handleOpenEditRecord = (record: AttendanceRecordItem) => {
    setEditingRecordId(record.id);
    setEditingRecordData(record);
    const inTime = record.check_in_time ? dayjs(record.check_in_time).format('HH:mm') : '';
    const outTime = record.check_out_time ? dayjs(record.check_out_time).format('HH:mm') : '';
    const recordDate = record.date ? String(record.date).slice(0, 10) : dayjs().format('YYYY-MM-DD');

    const resolvedUserType: 'STAFF' | 'DOCTOR' | 'ADMIN' =
      record.user_type === 'DOCTOR' ? 'DOCTOR' : record.user_type === 'ADMIN' ? 'ADMIN' : 'STAFF';

    setManualForm({
      userId: record.user_id,
      userType: resolvedUserType,
      date: recordDate,
      shiftId: record.shift?.id || '',
      checkInTime: inTime,
      checkOutTime: outTime,
      status: record.status || 'PRESENT',
      reason: record.manual_reason || 'Administrative Update',
      remarks: '',
    });
    setDrawerMemberType(resolvedUserType);
    setIsManualModalOpen(true);
  };

  // Open Add Record
  const handleOpenAddRecord = () => {
    setEditingRecordId(null);
    setEditingRecordData(null);
    setDrawerMemberType('ALL');
    setManualForm({
      userId: '',
      userType: 'STAFF',
      date: dayjs().format('YYYY-MM-DD'),
      shiftId: '',
      checkInTime: '',
      checkOutTime: '',
      status: 'PRESENT',
      reason: '',
      remarks: '',
    });
    setIsManualModalOpen(true);
  };

  // Manual Entry Submit (Admin)
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualForm.userId || !manualForm.reason.trim()) {
      message.warning('Please select a member (Doctor or Staff) and provide a reason.');
      return;
    }

    setManualSubmitting(true);
    // Lock status to PRESENT if existing record is PRESENT
    const finalStatus = isStatusLockedToPresent ? 'PRESENT' : manualForm.status;

    // Convert local date + HH:MM time into fully-qualified ISO timestamp with local timezone offset
    let checkInIso: string | undefined = undefined;
    let checkOutIso: string | undefined = undefined;
    if (manualForm.checkInTime) {
      const localIn = dayjs(`${manualForm.date} ${manualForm.checkInTime}`);
      checkInIso = localIn.isValid() ? localIn.toISOString() : undefined;
    }
    if (manualForm.checkOutTime) {
      const localOut = dayjs(`${manualForm.date} ${manualForm.checkOutTime}`);
      checkOutIso = localOut.isValid() ? localOut.toISOString() : undefined;
    }

    try {
      await api.post('attendance/admin/manual-entry', {
        userId: manualForm.userId,
        userType: manualForm.userType,
        date: manualForm.date,
        shiftId: manualForm.shiftId || undefined,
        checkInTime: checkInIso,
        checkOutTime: checkOutIso,
        status: finalStatus,
        reason: manualForm.reason,
        remarks: manualForm.remarks || undefined,
      });

      message.success(
        editingRecordId ? 'Attendance record updated successfully.' : 'Manual attendance entry saved successfully.'
      );
      setIsManualModalOpen(false);
      setEditingRecordId(null);
      setEditingRecordData(null);
      void fetchAdminRecords();
      void fetchAdminDashboard();
    } catch (err: any) {
      message.error(err.response?.data?.details?.message || err.response?.data?.message || 'Failed to save entry.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (recordId: string) => {
    try {
      await api.delete(`attendance/admin/records/${recordId}`);
      message.success('Attendance record deleted successfully.');
      void fetchAdminRecords();
      void fetchAdminDashboard();
    } catch (err: any) {
      message.error(err.response?.data?.details?.message || err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
    const cleanBase = apiBase.replace(/\/+$/, '');
    window.open(`${cleanBase}/attendance/admin/export?startDate=${selectedDate}&endDate=${selectedDate}`, '_blank');
  };

  // Helper formatters
  const formatMins = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes));
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins < 10 ? `0${mins}` : mins}m`;
  };

  const formatClockTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <StatusPill label="Present" tone="green" />;
      case 'LATE':
        return <StatusPill label="Late" tone="amber" />;
      case 'HALF_DAY':
        return <StatusPill label="Half-Day" tone="amber" />;
      case 'ABSENT':
        return <StatusPill label="Absent" tone="red" />;
      case 'ON_LEAVE':
        return <StatusPill label="On Leave" tone="blue" />;
      default:
        return <StatusPill label={status || 'Unknown'} tone="gray" />;
    }
  };

  // Counts for Overview Banner
  const overviewCounts = useMemo(() => {
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const pct = totalRecords > 0 ? Math.round((present / records.length) * 100) : 0;
    return { present, late, absent, pct };
  }, [records, totalRecords]);

  // Cumulative duty metrics for Dashboard
  const totalHospitalDutyMinutesToday = useMemo(() => {
    return records.reduce((acc, r) => acc + (r.total_working_minutes || 0), 0);
  }, [records]);

  return (
    <div className="ui-page w-full space-y-3.5 sm:space-y-4 pb-8">
      {/* ======================================================== */}
      {/* 1. HEADER & HORIZONTAL TAB NAVIGATION (Compact Unified Group) */}
      {/* ======================================================== */}
      <div className="space-y-1.5 sm:space-y-2">
        <CommonPageHeader
          overline="HOSPITAL ADMINISTRATION"
          title="Attendance & Shift Management"
          subtitle="Hospital presence, duty rosters, personal clock in/out duty, and compliance logs."
          loading={adminLoading || punching}
          onRefresh={() => {
            if (userRole === 'ADMIN') {
              void fetchAdminRecords();
              void fetchAdminDashboard();
            } else {
              void fetchTodayStatus();
              void fetchMyHistory();
            }
          }}
          extraActions={
            userRole === 'ADMIN' ? (
              <DatePicker
                value={dayjs(selectedDate)}
                onChange={(d) => setSelectedDate(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
                allowClear={false}
                className="w-32 sm:w-36 h-7.5 text-xs rounded-lg border-slate-200"
              />
            ) : null
          }
          {...(userRole === 'ADMIN'
            ? {
                onExport: handleExportCsv,
                exportLabel: 'Export CSV',
                createLabel: 'Add Record',
                onCreate: handleOpenAddRecord,
              }
            : {})}
        />

        {/* Tab Navigation */}
        <div className="border-b border-slate-200/90 pb-px">
          <nav className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto scrollbar-none">
            {/* Tab 1: Dashboard */}
            {permittedTabs.includes('dashboard') && (
              <button
                type="button"
                onClick={() => handleTabChange('dashboard')}
                className={`inline-flex items-center gap-2 py-2 px-3.5 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </button>
            )}

            {/* Tab 2: Check In / Out */}
            {permittedTabs.includes('check-in') && (
              <button
                type="button"
                onClick={() => handleTabChange('check-in')}
                className={`inline-flex items-center gap-2 py-2 px-3.5 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'check-in'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Clock size={15} />
                <span>Check In / Out</span>
              </button>
            )}

            {/* Tab 3: Manage Attendance (Role-Filtered: ADMIN ONLY) */}
            {permittedTabs.includes('manage') && (
              <button
                type="button"
                onClick={() => handleTabChange('manage')}
                className={`inline-flex items-center gap-2 py-2 px-3.5 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'manage'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <UserCheck size={15} />
                <span>Manage Attendance</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ACTIVE TAB CONTENT AREA                               */}
      {/* ======================================================== */}
      <div className="w-full">
        {/* ------------------------------------------------------ */}
        {/* VIEW A: MANAGE ATTENDANCE TAB (Image Style + Sessions) */}
        {/* ------------------------------------------------------ */}
        {activeTab === 'manage' && userRole === 'ADMIN' && (
          <div className="space-y-3.5 sm:space-y-4">
            {/* 1. 5 KPI Stat Cards matching Dashboard Page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Card 1: Total Records */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Users size={17} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
                    <span className="ui-dash-stat-title">Total Records</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value">{totalRecords}</span>
                  <span className="ui-dash-stat-badge is-blue">
                    <span>Filtered</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Hospital members on date
                </div>
              </div>

              {/* Card 2: Present Today */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <CheckCircle2 size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
                    <span className="ui-dash-stat-title">Present On Duty</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-emerald-600">{overviewCounts.present}</span>
                  <span className="ui-dash-stat-badge is-green">
                    <span>{overviewCounts.pct}% rate</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Checked in and active
                </div>
              </div>

              {/* Card 3: Late Arrivals */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Clock size={17} strokeWidth={2} className="ui-dash-stat-icon text-amber-500" />
                    <span className="ui-dash-stat-title">Late Arrivals</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-amber-600">{overviewCounts.late}</span>
                  <span className="ui-dash-stat-badge is-amber">
                    <span>Today</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Arrival time after roster
                </div>
              </div>

              {/* Card 4: Absent / Leave */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <XCircle size={17} strokeWidth={2} className="ui-dash-stat-icon text-rose-500" />
                    <span className="ui-dash-stat-title">Absent / Leave</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-rose-600">{overviewCounts.absent}</span>
                  <span className="ui-dash-stat-badge is-red">
                    <span>Unscheduled</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Unexcused or on leave
                </div>
              </div>

              {/* Card 5: Total Duty Logged */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Timer size={17} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
                    <span className="ui-dash-stat-title">Total Duty Logged</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-purple-600">
                    {totalHospitalDutyMinutesToday > 0 ? formatMins(totalHospitalDutyMinutesToday) : '8h 50m'}
                  </span>
                  <span className="ui-dash-stat-badge is-purple">
                    <span>Logged</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Cumulative duty time today
                </div>
              </div>
            </div>

            {/* 2. Unified Controls, Filters & Adherence Bar */}
            <div className="bg-white rounded-lg border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Live Tracker Indicator */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Tracker</span>
                  </span>

                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search member name or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void fetchAdminRecords()}
                      className="pl-8 pr-3 h-8.5 rounded-lg border border-slate-200 text-xs w-52 sm:w-64 focus:outline-blue-500 bg-white"
                    />
                  </div>

                  {/* Role Filter */}
                  <Select
                    value={userTypeFilter}
                    onChange={(val) => setUserTypeFilter(val)}
                    className="w-28 h-8.5"
                    options={[
                      { label: 'All Roles', value: 'ALL' },
                      { label: 'Admins', value: 'ADMIN' },
                      { label: 'Doctors', value: 'DOCTOR' },
                      { label: 'Staff', value: 'STAFF' },
                    ]}
                  />

                  {/* Status Filter */}
                  <Select
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    className="w-32 h-8.5"
                    options={[
                      { label: 'All Statuses', value: 'ALL' },
                      { label: 'Present', value: 'PRESENT' },
                      { label: 'Late', value: 'LATE' },
                      { label: 'Half-Day', value: 'HALF_DAY' },
                      { label: 'Absent', value: 'ABSENT' },
                    ]}
                  />
                </div>

                {/* Right Controls: Expand All Toggle, View Switcher & Refresh */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title={expandedRowIds.size === records.length ? 'Collapse All Sessions' : 'Expand All Sessions'}
                  >
                    {expandedRowIds.size === records.length && records.length > 0 ? (
                      <Minimize2 size={15} />
                    ) : (
                      <Maximize2 size={15} />
                    )}
                  </button>

                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title="Card View"
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title="Table View"
                    >
                      <List size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void fetchAdminRecords();
                      void fetchAdminDashboard();
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={adminLoading ? 'animate-spin' : ''} />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddRecord}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer ml-1"
                  >
                    <Plus size={13} strokeWidth={2.4} />
                    <span>Add Record</span>
                  </button>
                </div>
              </div>

              {/* Duty Attendance Adherence Progress Bar */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Duty Attendance Adherence</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {overviewCounts.pct}% Active
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Present: <strong className="text-slate-800">{overviewCounts.present}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Late: <strong className="text-slate-800">{overviewCounts.late}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Absent: <strong className="text-slate-800">{overviewCounts.absent}</strong>
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{
                      width: `${records.length > 0 ? (overviewCounts.present / records.length) * 100 : 90}%`,
                    }}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{
                      width: `${records.length > 0 ? (overviewCounts.late / records.length) * 100 : 5}%`,
                    }}
                  />
                  <div
                    className="bg-rose-400 h-full transition-all duration-500"
                    style={{
                      width: `${records.length > 0 ? (overviewCounts.absent / records.length) * 100 : 5}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Records Content: Table with Session Timeline (Web UI Standard Card) */}
            {viewMode === 'table' ? (
              <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col w-full">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-[#f8fafc]">
                      <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3 w-10 text-center sticky top-0 z-20 bg-[#f8fafc]"></th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Member</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Date</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Status</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Clock In</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Clock Out</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]">Work Hours</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap sticky top-0 right-0 z-30 bg-[#f8fafc] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {adminLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Spin size="small" />
                            <span className="ml-2">Loading attendance records...</span>
                          </td>
                        </tr>
                      ) : records.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                              <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                                <SearchX size={22} />
                              </div>
                              <strong className="text-xs font-semibold text-slate-700">
                                No attendance records found
                              </strong>
                              <span className="text-[11px] text-slate-500 max-w-sm">
                                Try a different date, search query, or role filter.
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => {
                          const isExpanded = expandedRowIds.has(r.id);
                          const sessions = computeSessionsFromRecord(r);
                          const initials = (r.user_name || 'HU')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <Fragment key={r.id}>
                              {/* Main Member Attendance Row */}
                              <tr className={`group transition-colors duration-100 hover:bg-slate-50/70 ${isExpanded ? 'bg-slate-50/40' : ''}`}>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpanded(r.id)}
                                    className="text-blue-500 hover:text-blue-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                                    title={isExpanded ? 'Collapse sessions' : 'Expand sessions'}
                                  >
                                    {isExpanded ? (
                                      <MinusCircle size={16} className="text-blue-500 stroke-[2.2]" />
                                    ) : (
                                      <PlusCircle size={16} className="text-blue-500 stroke-[2.2]" />
                                    )}
                                  </button>
                                </td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                                        r.user_type === 'DOCTOR'
                                          ? 'bg-purple-600'
                                          : r.user_type === 'ADMIN'
                                          ? 'bg-blue-600'
                                          : 'bg-cyan-500'
                                      }`}
                                    >
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                                        <span>
                                          {r.user_name ||
                                            (r.user_type === 'ADMIN'
                                              ? 'Administrator'
                                              : r.user_type === 'DOCTOR'
                                              ? 'Doctor'
                                              : 'Hospital Staff')}
                                        </span>
                                        {r.user_type === 'ADMIN' && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            Admin
                                          </span>
                                        )}
                                        {r.user_type === 'DOCTOR' && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                            Doctor
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {r.user_role || (r.user_type === 'ADMIN' ? 'Admin' : 'Staff')}{' '}
                                        {r.department ? `• ${r.department}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                                  {dayjs(r.date).format('MMM D, YYYY')}
                                </td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap">{renderStatusBadge(r.status)}</td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-700">
                                  {formatClockTime(r.check_in_time)}
                                </td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-700">
                                  {formatClockTime(r.check_out_time)}
                                </td>

                                <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold text-slate-800">
                                  {formatMins(r.total_working_minutes)}
                                </td>

                                <td className="py-2.5 px-4 whitespace-nowrap text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditRecord(r)}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Record"
                                    >
                                      <Pencil size={13} />
                                    </button>

                                    <Popconfirm
                                      title="Delete Attendance Record"
                                      description="Are you sure you want to delete this attendance record and its sessions?"
                                      onConfirm={() => void handleDeleteRecord(r.id)}
                                      okText="Delete"
                                      cancelText="Cancel"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <button
                                        type="button"
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete Record"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </Popconfirm>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Timeline-Style Sessions Sub-Row */}
                              {isExpanded && (
                                <tr className="bg-slate-50/30 border-b border-slate-100">
                                  <td colSpan={8} className="py-2.5 px-4 pl-12 sm:pl-14">
                                    <div className="space-y-2">
                                      {sessions.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic py-1">
                                          No individual session punches recorded.
                                        </div>
                                      ) : (
                                        sessions.map((sess) => (
                                          <div
                                            key={sess.id}
                                            className="flex items-center justify-between text-xs py-1 hover:bg-white/80 rounded px-2 transition-colors"
                                          >
                                            <div className="flex items-center gap-4">
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`w-2 h-2 rounded-full ${
                                                    sess.type === 'BREAK'
                                                      ? 'bg-amber-500'
                                                      : sess.status === 'Active'
                                                      ? 'bg-emerald-500 animate-pulse'
                                                      : 'bg-blue-600'
                                                  }`}
                                                />
                                                <span className="font-bold text-slate-900">{sess.label}</span>
                                              </div>

                                              <div className="text-slate-600 font-medium">
                                                <span>{formatClockTime(sess.startTime)}</span>
                                                <span className="mx-2 text-slate-400">→</span>
                                                <span className={sess.status === 'Active' ? 'text-emerald-600 font-bold' : ''}>
                                                  {sess.status === 'Active' ? 'Active Duty' : formatClockTime(sess.endTime)}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="font-bold text-slate-800">
                                              {formatMins(sess.durationMinutes)}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination docked seamlessly inside table card */}
                <CommonPagination
                  total={totalRecords}
                  startIdx={records.length === 0 ? 0 : (page - 1) * pageSize + 1}
                  endIdx={records.length === 0 ? 0 : Math.min(page * pageSize, totalRecords)}
                  nounPlural="records"
                  page={page}
                  pageCount={Math.max(1, Math.ceil(totalRecords / pageSize))}
                  perPage={pageSize}
                  onPageChange={(p) => setPage(p)}
                  onPerPageChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                />
              </div>
            ) : (
              /* Cards View */
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {adminLoading ? (
                    <div className="col-span-full py-12 text-center text-slate-400">
                      <Spin size="small" />
                      <span className="ml-2">Loading attendance cards...</span>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
                      No attendance records found.
                    </div>
                  ) : (
                    records.map((r) => {
                      const initials = (r.user_name || 'HU')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      const sessions = computeSessionsFromRecord(r);

                      return (
                        <div
                          key={r.id}
                          className="bg-white rounded-lg border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                                  r.user_type === 'DOCTOR'
                                    ? 'bg-purple-600'
                                    : r.user_type === 'ADMIN'
                                    ? 'bg-blue-600'
                                    : 'bg-cyan-500'
                                }`}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {r.user_name ||
                                      (r.user_type === 'ADMIN'
                                        ? 'Administrator'
                                        : r.user_type === 'DOCTOR'
                                        ? 'Doctor'
                                        : 'Staff Member')}
                                  </span>
                                  {r.user_type === 'ADMIN' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      Admin
                                    </span>
                                  )}
                                  {r.user_type === 'DOCTOR' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                      Doctor
                                    </span>
                                  )}
                                  {renderStatusBadge(r.status)}
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {r.user_role || (r.user_type === 'ADMIN' ? 'Admin' : 'General Staff')} •{' '}
                                  {r.department || 'Hospital'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRecord(r)}
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <Popconfirm
                                title="Delete record?"
                                onConfirm={() => void handleDeleteRecord(r.id)}
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <button type="button" className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </Popconfirm>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs text-slate-500">
                            <div>
                              <span className="text-slate-400">Date:</span>{' '}
                              <strong className="text-slate-700">{dayjs(r.date).format('MMM D, YYYY')}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Work:</span>{' '}
                              <strong className="text-slate-700">{formatMins(r.total_working_minutes)}</strong>
                            </div>
                          </div>

                          {/* Sessions inside card */}
                          <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-xs">
                            {sessions.map((sess) => (
                              <div key={sess.id} className="flex items-center justify-between text-[11.5px]">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      sess.type === 'BREAK'
                                        ? 'bg-amber-500'
                                        : sess.status === 'Active'
                                        ? 'bg-emerald-500'
                                        : 'bg-blue-600'
                                    }`}
                                  />
                                  <span className="font-semibold text-slate-800">{sess.label}:</span>
                                  <span className="text-slate-600">
                                    {formatClockTime(sess.startTime)} → {sess.status === 'Active' ? 'Active' : formatClockTime(sess.endTime)}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-700">{formatMins(sess.durationMinutes)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Pagination docked seamlessly */}
                <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden">
                  <CommonPagination
                    total={totalRecords}
                    startIdx={records.length === 0 ? 0 : (page - 1) * pageSize + 1}
                    endIdx={records.length === 0 ? 0 : Math.min(page * pageSize, totalRecords)}
                    nounPlural="records"
                    page={page}
                    pageCount={Math.max(1, Math.ceil(totalRecords / pageSize))}
                    perPage={pageSize}
                    onPageChange={(p) => setPage(p)}
                    onPerPageChange={(n) => {
                      setPageSize(n);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------ */}
        {/* VIEW B: DASHBOARD TAB                                  */}
        {/* ------------------------------------------------------ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Header Controls for Admin */}
            {userRole === 'ADMIN' ? (
              <>
                {/* 1. Main KPI Stats Grid - 5 Key Executive Attendance Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {/* Card 1: Doctors On Duty */}
                  <div
                    className="ui-dash-stat-card"
                    onClick={() => {
                      setUserTypeFilter('DOCTOR');
                      handleTabChange('manage');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Stethoscope size={17} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
                        <span className="ui-dash-stat-title">Doctors On Duty</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value">
                        {adminStats?.active_doctors_on_duty || 0}
                      </span>
                      <span className="ui-dash-stat-badge is-blue">
                        <span>/ {adminStats?.total_doctors || 0} active</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Clinical consultants on shift
                    </div>
                  </div>

                  {/* Card 2: Staff On Duty */}
                  <div
                    className="ui-dash-stat-card"
                    onClick={() => {
                      setUserTypeFilter('STAFF');
                      handleTabChange('manage');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Users size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
                        <span className="ui-dash-stat-title">Staff On Duty</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value">
                        {adminStats?.active_staff_on_duty || 0}
                      </span>
                      <span className="ui-dash-stat-badge is-green">
                        <span>/ {adminStats?.total_staff || 0} active</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Nursing, technical &amp; support
                    </div>
                  </div>

                  {/* Card 3: Late Arrivals */}
                  <div
                    className="ui-dash-stat-card"
                    onClick={() => {
                      setStatusFilter('LATE');
                      handleTabChange('manage');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Clock size={17} strokeWidth={2} className="ui-dash-stat-icon text-amber-500" />
                        <span className="ui-dash-stat-title">Late Arrivals</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-amber-600">
                        {adminStats?.late_arrivals_today || 0}
                      </span>
                      <span className="ui-dash-stat-badge is-amber">
                        <span>Today</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Punctuality deviations logged
                    </div>
                  </div>

                  {/* Card 4: Absent / On Leave */}
                  <div
                    className="ui-dash-stat-card"
                    onClick={() => {
                      setStatusFilter('ABSENT');
                      handleTabChange('manage');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <XCircle size={17} strokeWidth={2} className="ui-dash-stat-icon text-rose-500" />
                        <span className="ui-dash-stat-title">Absent / Leave</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-rose-600">
                        {(adminStats?.absent_today || 0) + (adminStats?.on_leave_today || 0)}
                      </span>
                      <span className="ui-dash-stat-badge is-red">
                        <span>{adminStats?.on_leave_today || 0} on leave</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Unexcused &amp; approved leaves
                    </div>
                  </div>

                  {/* Card 5: Cumulative Duty Hours */}
                  <div className="ui-dash-stat-card">
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Timer size={17} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
                        <span className="ui-dash-stat-title">Hospital Duty Hours</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-purple-600">
                        {formatMins(totalHospitalDutyMinutesToday)}
                      </span>
                      <span className="ui-dash-stat-badge is-purple">
                        <span>Cumulative</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Total working hours logged today
                    </div>
                  </div>
                </div>

                {/* 2. Two-Column Layout: Department Presence Breakdown (7 cols) + Live Punches & Shortcuts (5 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  {/* Left Column (7 cols): Department Breakdown & Punctuality Distribution */}
                  <div className="lg:col-span-7 space-y-3">
                    {/* Department Presence Breakdown Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shrink-0">
                            <Activity size={15} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 m-0">Departmental Presence Breakdown</h3>
                            <p className="text-[11.5px] text-slate-500 m-0">Active duty clinician coverage across clinical units</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTabChange('manage')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          View All <ArrowRight size={12} />
                        </button>
                      </div>

                      <div className="space-y-3 mt-3">
                        {adminStats?.department_breakdown && adminStats.department_breakdown.length > 0 ? (
                          adminStats.department_breakdown.map((dept, idx) => {
                            const style = getDeptStyle(dept.department, idx);
                            return (
                              <div key={dept.department} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                    {dept.department}
                                  </span>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <span>
                                      <strong className="text-slate-800">{dept.present}</strong> / {dept.total} present
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${style.badge}`}>
                                      {dept.percentage}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
                                    style={{ width: `${Math.max(4, dept.percentage)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No department breakdown data for this date.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shift Punctuality & Distribution Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shrink-0">
                            <Clock size={15} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 m-0">Punctuality &amp; Adherence Distribution</h3>
                            <p className="text-[11.5px] text-slate-500 m-0">Arrival time compliance for today's scheduled rosters</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {records.length} Total Checked
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {/* Multi-segmented distribution bar */}
                        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${
                                records.length > 0
                                  ? Math.round((overviewCounts.present / records.length) * 100)
                                  : 92
                              }%`,
                            }}
                            title="On-Time Present"
                          />
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{
                              width: `${
                                records.length > 0
                                  ? Math.round((overviewCounts.late / records.length) * 100)
                                  : 5
                              }%`,
                            }}
                            title="Late Arrival"
                          />
                          <div
                            className="bg-rose-400 h-full transition-all"
                            style={{
                              width: `${
                                records.length > 0
                                  ? Math.round((overviewCounts.absent / records.length) * 100)
                                  : 3
                              }%`,
                            }}
                            title="Absent / Leave"
                          />
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>On-Time: <strong>{overviewCounts.present}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>Late Arrivals: <strong>{overviewCounts.late}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>Absent / Leave: <strong>{overviewCounts.absent}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (5 cols): Live Punches Stream & Quick Shortcuts */}
                  <div className="lg:col-span-5 space-y-3">
                    {/* Live Punches Activity Stream */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                            <Activity size={15} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 m-0">Live Duty Punches Stream</h3>
                            <p className="text-[11.5px] text-slate-500 m-0">Real-time biometric &amp; portal check-in activity</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Stream
                        </span>
                      </div>

                      <div className="space-y-2 mt-3 max-h-[340px] overflow-y-auto no-scrollbar">
                        {adminStats?.recent_punches && adminStats.recent_punches.length > 0 ? (
                          adminStats.recent_punches.map((p, idx) => {
                            const initials = (p.user_name || 'HU')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                      p.user_type === 'DOCTOR'
                                        ? 'bg-purple-600'
                                        : p.user_type === 'ADMIN'
                                        ? 'bg-blue-600'
                                        : 'bg-teal-600'
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">
                                      {p.user_name}
                                    </div>
                                    <span className="text-[10.5px] text-slate-400 block truncate">
                                      {p.role} • {p.shift_name}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                                      p.punch_type === 'IN'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : p.punch_type === 'OUT'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {p.punch_type}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                    {new Date(p.punched_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No punches recorded today yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Administrative Actions Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                        Quick Administrative Actions
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleOpenAddRecord}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200/80 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Plus size={14} className="stroke-[2.5]" />
                          <span>+ Add Record</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportCsv}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} className="text-slate-500" />
                          <span>Export CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabChange('manage')}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <UserCheck size={14} className="text-slate-500" />
                          <span>Manage Records</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabChange('check-in')}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Clock size={14} className="text-slate-500" />
                          <span>Clock In / Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Doctor / Staff Personal Duty Dashboard */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="ui-dash-stat-card">
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Clock size={17} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
                        <span className="ui-dash-stat-title">Today's Duty Hours</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value">
                        {((todayStatus?.elapsedWorkingMinutes || 0) / 60).toFixed(1)}{' '}
                        <span className="text-xs text-slate-400 font-normal">hrs</span>
                      </span>
                      <span className="ui-dash-stat-badge is-blue">
                        <span>/ 9h shift</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Logged duty time today
                    </div>
                  </div>

                  <div className="ui-dash-stat-card">
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <CheckCircle2 size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
                        <span className="ui-dash-stat-title">Days Present</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-emerald-600">
                        {myKpis.presentDays || 0}
                      </span>
                      <span className="ui-dash-stat-badge is-green">
                        <span>/ {myKpis.totalDays || 0} days</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Present this month
                    </div>
                  </div>

                  <div className="ui-dash-stat-card">
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <AlertCircle size={17} strokeWidth={2} className="ui-dash-stat-icon text-amber-500" />
                        <span className="ui-dash-stat-title">Late Arrivals</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-amber-600">
                        {myKpis.lateDays || 0}
                      </span>
                      <span className="ui-dash-stat-badge is-amber">
                        <span>This Month</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Punctuality deviations
                    </div>
                  </div>

                  <div className="ui-dash-stat-card">
                    <div className="ui-dash-stat-top">
                      <div className="ui-dash-stat-label-wrap">
                        <Timer size={17} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
                        <span className="ui-dash-stat-title">Total Hours Month</span>
                      </div>
                    </div>
                    <div className="ui-dash-stat-mid">
                      <span className="ui-dash-stat-value text-purple-600">
                        {Math.round(myKpis.totalHoursWorked || 0)} hrs
                      </span>
                      <span className="ui-dash-stat-badge is-purple">
                        <span>Cumulative</span>
                      </span>
                    </div>
                    <div className="ui-dash-stat-sub">
                      Monthly duty total
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                        <Clock size={15} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 m-0">Personal Duty &amp; Attendance Logs</h3>
                        <p className="text-[11.5px] text-slate-500 m-0">Attendance history and recorded hours for the last 30 days</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200/90">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-[#f8fafc] border-b border-slate-200/90 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3">Check In</th>
                          <th className="py-2.5 px-3">Check Out</th>
                          <th className="py-2.5 px-3">Working Hours</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No attendance history logged yet.
                            </td>
                          </tr>
                        ) : (
                          myHistory.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {dayjs(rec.date).format('MMM D, YYYY')}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{rec.shift_name || 'General Shift'}</td>
                              <td className="py-2.5 px-3 text-slate-800">
                                {formatClockTime(rec.check_in_time)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800">
                                {formatClockTime(rec.check_out_time)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {formatMins(rec.total_working_minutes)}
                              </td>
                              <td className="py-2.5 px-3">{renderStatusBadge(rec.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------ */}
        {/* VIEW C: CHECK IN / OUT TAB                             */}
        {/* ------------------------------------------------------ */}
        {activeTab === 'check-in' && (
          <div className="w-full space-y-3.5 sm:space-y-4">
            {/* 1. Header Banner matching Dashboard & HMS Design */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Clock size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight m-0">
                      Clock In / Out Duty Dashboard
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Duty Tracker
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 m-0">
                    Track your daily working sessions, duty hours, break intervals, and personal attendance history
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      historyViewMode === 'grid'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode('table')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      historyViewMode === 'table'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Table View"
                  >
                    <List size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void fetchTodayStatus();
                    void fetchMyHistory();
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw size={13} className={punching ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* 2. Work Hours Insights: 4 KPI Cards using .ui-dash-stat-card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Card 1: Hours This Week */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Clock size={17} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
                    <span className="ui-dash-stat-title">Hours This Week</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value">{weekHoursStr}</span>
                  <span className="ui-dash-stat-badge is-blue">
                    <span>{weekProgress}% of 40h</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Weekly roster adherence target
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, weekProgress))}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Hours This Month */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Calendar size={17} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
                    <span className="ui-dash-stat-title">Hours This Month</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-emerald-600">{monthHoursStr}</span>
                  <span className="ui-dash-stat-badge is-green">
                    <span>Cumulative</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Total cumulative duty hours
                </div>
              </div>

              {/* Card 3: Daily Average */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Timer size={17} strokeWidth={2} className="ui-dash-stat-icon text-amber-500" />
                    <span className="ui-dash-stat-title">Daily Average</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-amber-600">{dailyAvgHoursStr}</span>
                  <span className="ui-dash-stat-badge is-amber">
                    <span>Per day</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Average active duty per working day
                </div>
              </div>

              {/* Card 4: Overtime */}
              <div className="ui-dash-stat-card">
                <div className="ui-dash-stat-top">
                  <div className="ui-dash-stat-label-wrap">
                    <Zap size={17} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
                    <span className="ui-dash-stat-title">Weekly Overtime</span>
                  </div>
                </div>
                <div className="ui-dash-stat-mid">
                  <span className="ui-dash-stat-value text-purple-600">{weekOvertimeStr}</span>
                  <span className="ui-dash-stat-badge is-purple">
                    <span>Beyond roster</span>
                  </span>
                </div>
                <div className="ui-dash-stat-sub">
                  Duty hours beyond scheduled roster
                </div>
              </div>
            </div>

            {/* 3. CURRENT SHIFT & Action Bar Card */}
            <div className="bg-white rounded-lg border border-slate-200/90 p-4 sm:p-5 shadow-2xs w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Current Shift Info */}
                <div className="space-y-1 min-w-[170px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      CURRENT DUTY SHIFT
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                    {todayStatus?.activeShift?.name || 'General Hospital Shift'}
                  </span>
                  <span className="text-xs font-semibold text-blue-600 inline-block">
                    {todayStatus?.activeShift?.start_time && todayStatus?.activeShift?.end_time
                      ? `${todayStatus.activeShift.start_time.slice(0, 5)} - ${todayStatus.activeShift.end_time.slice(0, 5)}`
                      : 'Flexible hours'}
                  </span>
                </div>

                {/* Punch Action Buttons */}
                <div className="flex items-center gap-2.5">
                  {!todayStatus?.isCheckedIn ? (
                    <button
                      type="button"
                      disabled={punching}
                      onClick={() => void handlePunch('IN')}
                      className="h-9 sm:h-9.5 px-4.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Play size={15} />
                      <span>{punching ? 'Clocking in...' : 'Start Working Day'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={punching}
                        onClick={() => void handlePunch(todayStatus?.isOnBreak ? 'BREAK_END' : 'BREAK_START')}
                        className="h-9 sm:h-9.5 px-3.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/70 text-amber-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                      >
                        {todayStatus?.isOnBreak ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                        <span>{todayStatus?.isOnBreak ? 'Resume Duty' : 'Pause / Break'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={punching}
                        onClick={() => void handlePunch('OUT')}
                        className="h-9 sm:h-9.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <CheckSquare size={15} />
                        <span>{punching ? 'Completing...' : 'Day Complete'}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Metrics Columns */}
                <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="hidden sm:block h-9 w-px bg-slate-100" />
                  <div className="text-left lg:text-center min-w-[70px]">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      TODAY'S HOURS
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 block mt-0.5">
                      {formatWorkHours(todayStatus?.elapsedWorkingMinutes || 0)}
                    </span>
                  </div>

                  <div className="h-9 w-px bg-slate-100" />
                  <div className="text-left lg:text-center min-w-[65px]">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      STATUS
                    </span>
                    <span
                      className={`text-xs sm:text-sm md:text-base font-bold block mt-0.5 ${
                        todayStatus?.isCheckedIn
                          ? todayStatus?.isOnBreak
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                          : todayStatus?.record?.check_out_time
                          ? 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {todayStatus?.isCheckedIn
                        ? todayStatus?.isOnBreak
                          ? 'On Break'
                          : 'Working'
                        : todayStatus?.record?.check_out_time
                        ? 'Completed'
                        : 'Not Started'}
                    </span>
                  </div>

                  <div className="h-9 w-px bg-slate-100" />
                  <div className="text-left lg:text-center min-w-[55px]">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      SESSIONS
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 block mt-0.5">
                      {todaySessionsCount}
                    </span>
                  </div>

                  <div className="h-9 w-px bg-slate-100" />
                  <div className="text-left lg:text-center min-w-[55px]">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      BREAK
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 block mt-0.5">
                      {formatWorkHours(todayStatus?.record?.total_break_minutes || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Month My Attendance Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5 w-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0 leading-tight">
                      {dayjs().format('MMMM YYYY')} · My Attendance Records
                    </h3>
                    <p className="text-[11.5px] text-slate-500 m-0">Personal clock in, clock out, and session logs</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {myHistory.length} records
                </span>
              </div>

              {myHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No attendance history recorded for this month.
                </div>
              ) : historyViewMode === 'table' ? (
                /* Table View matching Manage Attendance & Web UI */
                <div className="rounded-xl border border-slate-200/90 overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-[#f8fafc] border-b border-slate-200/90 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="w-10 py-2.5 px-3 text-center"></th>
                          <th className="py-2.5 px-4">DATE</th>
                          <th className="py-2.5 px-4">CLOCK IN</th>
                          <th className="py-2.5 px-4">CLOCK OUT</th>
                          <th className="py-2.5 px-4">WORK HOURS</th>
                          <th className="py-2.5 px-4">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedMyHistory.map((rec) => {
                          const isExpanded = expandedHistoryIds.has(rec.id);
                          const sessions = computeSessionsFromRecord(rec);

                          return (
                            <Fragment key={rec.id}>
                              <tr
                                className={`hover:bg-slate-50/70 transition-colors ${
                                  isExpanded ? 'bg-slate-50/40' : ''
                                }`}
                              >
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleHistoryRowExpanded(rec.id)}
                                    className="text-blue-500 hover:text-blue-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                                    title={isExpanded ? 'Collapse sessions' : 'Expand sessions'}
                                  >
                                    {isExpanded ? (
                                      <MinusCircle size={16} className="text-blue-500 stroke-[2.2]" />
                                    ) : (
                                      <PlusCircle size={16} className="text-blue-500 stroke-[2.2]" />
                                    )}
                                  </button>
                                </td>

                                <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                                  {dayjs(rec.date).format('ddd, MMM D, YYYY')}
                                </td>

                                <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                                  {formatClockTime(rec.check_in_time)}
                                </td>

                                <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                                  {formatClockTime(rec.check_out_time)}
                                </td>

                                <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                                  {formatMins(rec.total_working_minutes)}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  {renderStatusBadge(rec.status)}
                                </td>
                              </tr>

                              {/* Expanded Timeline-Style Sessions Sub-Row matching Manage Attendance */}
                              {isExpanded && (
                                <tr className="bg-slate-50/30 border-b border-slate-100">
                                  <td colSpan={6} className="py-3 px-4 pl-12 sm:pl-14">
                                    {sessions.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic py-1">
                                        No individual session punches recorded for this date.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {sessions.map((sess) => {
                                          const inTimeStr = formatClockTime(sess.startTime);
                                          const outTimeStr = sess.status === 'Active'
                                            ? 'Active Duty'
                                            : sess.endTime
                                            ? formatClockTime(sess.endTime)
                                            : !rec.check_out_time && dayjs(rec.date).isSame(dayjs(), 'day')
                                            ? 'Active Duty'
                                            : '-';

                                          return (
                                            <div
                                              key={sess.id}
                                              className="flex items-center justify-between text-xs py-1 hover:bg-white/80 rounded px-2 transition-colors"
                                            >
                                              <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className={`w-2 h-2 rounded-full ${
                                                      sess.type === 'BREAK'
                                                        ? 'bg-amber-500'
                                                        : sess.status === 'Active'
                                                        ? 'bg-emerald-500 animate-pulse'
                                                        : 'bg-blue-600'
                                                    }`}
                                                  />
                                                  <span className="font-bold text-slate-900">{sess.label}</span>
                                                </div>

                                                <div className="text-slate-600 font-medium">
                                                  <span>{inTimeStr}</span>
                                                  <span className="mx-2 text-slate-400">→</span>
                                                  <span className={sess.status === 'Active' ? 'text-emerald-600 font-bold' : ''}>
                                                    {outTimeStr}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="font-bold text-slate-800">
                                                {formatMins(sess.durationMinutes)}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Grid / Cards View matching Web UI Card System */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
                  {paginatedMyHistory.map((rec) => {
                    const isToday = dayjs(rec.date).isSame(dayjs(), 'day');

                    return (
                      <div
                        key={rec.id}
                        className="bg-slate-50/60 rounded-xl border border-slate-200/90 p-4 space-y-3 shadow-2xs hover:shadow-xs hover:bg-white transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <span className="font-bold text-xs sm:text-sm text-slate-900 block leading-tight">
                                {dayjs(rec.date).format('ddd, MMM D, YYYY')}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {isToday ? "Today's Attendance" : 'Past Record'}
                              </span>
                            </div>
                          </div>
                          {renderStatusBadge(rec.status)}
                        </div>

                        {/* Bottom stats row */}
                        <div className="border-t border-slate-200/60 pt-2.5 flex items-center justify-between text-xs text-slate-500 font-medium">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">In:</span>
                            <span className="font-semibold text-slate-700">
                              {formatClockTime(rec.check_in_time)}
                            </span>
                          </div>
                          <span className="text-slate-200">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Out:</span>
                            <span className="font-semibold text-slate-700">
                              {formatClockTime(rec.check_out_time)}
                            </span>
                          </div>
                          <span className="text-slate-200">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Work:</span>
                            <span className="font-semibold text-slate-700">
                              {formatMins(rec.total_working_minutes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Pagination matching Manage Attendance & Web UI */}
              {myHistory.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Showing {myHistory.length > 0 ? (historyPage - 1) * historyPageSize + 1 : 0} to{' '}
                    {Math.min(historyPage * historyPageSize, myHistory.length)} of {myHistory.length} entries
                  </span>

                  <div className="flex items-center gap-2">
                    <Select
                      value={historyPageSize}
                      onChange={(val) => {
                        setHistoryPageSize(val);
                        setHistoryPage(1);
                      }}
                      className="w-28 h-8"
                      options={[
                        { label: '10 / page', value: 10 },
                        { label: '15 / page', value: 15 },
                        { label: '25 / page', value: 25 },
                        { label: '50 / page', value: 50 },
                      ]}
                    />
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-bold text-slate-800 px-2">{historyPage}</span>
                    <button
                      type="button"
                      disabled={historyPage * historyPageSize >= myHistory.length}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. DRAWERS & MODALS                                      */}
      {/* ======================================================== */}
      {/* Admin Manual Entry / Edit Record Common Drawer */}
      <CreateDrawer
        open={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingRecordId(null);
          setEditingRecordData(null);
        }}
        eyebrow="ATTENDANCE MANAGEMENT"
        title={editingRecordId ? 'Edit Attendance Record' : 'Record Manual Attendance Entry'}
        subtitle={
          editingRecordId
            ? 'Adjust attendance details and timestamps for this member.'
            : 'Add manual attendance entry for Doctors or Staff.'
        }
        icon={<Clock size={22} className="text-blue-600" />}
        size="md"
        width={560}
        onSubmit={(e) => void handleManualSubmit(e)}
        submitLabel={editingRecordId ? 'Update Record' : 'Save Attendance'}
        cancelLabel="Cancel"
        submitting={manualSubmitting}
      >
        <div className="space-y-4 py-1 text-xs">
          {/* Status locked banner if already Present */}
          {isStatusLockedToPresent && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 font-medium leading-relaxed">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-900 mb-0.5">Attendance Status Locked</span>
                This member is marked as Present for this date. Once marked Present, the attendance status cannot be changed.
              </div>
            </div>
          )}

          {/* Member Selection Section (Supports both Doctors and Staff) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>Select Member (Doctor, Staff or Admin) *</span>
              </label>
              {!editingRecordId && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setDrawerMemberType('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                      drawerMemberType === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({userOptions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerMemberType('DOCTOR')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer ${
                      drawerMemberType === 'DOCTOR'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Stethoscope size={12} />
                    <span>Doctors ({userOptions.filter((u) => u.type === 'DOCTOR').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerMemberType('STAFF')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer ${
                      drawerMemberType === 'STAFF'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users size={12} />
                    <span>Staff ({userOptions.filter((u) => u.type === 'STAFF').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerMemberType('ADMIN')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer ${
                      drawerMemberType === 'ADMIN'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck size={12} />
                    <span>Admins ({userOptions.filter((u) => u.type === 'ADMIN').length})</span>
                  </button>
                </div>
              )}
            </div>

            {editingRecordId && editingRecordData ? (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                    editingRecordData.user_type === 'DOCTOR'
                      ? 'bg-purple-100 text-purple-800'
                      : editingRecordData.user_type === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-cyan-100 text-cyan-800'
                  }`}
                >
                  {(editingRecordData.user_name || 'HU').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <span>{editingRecordData.user_name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                        editingRecordData.user_type === 'DOCTOR'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : editingRecordData.user_type === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-teal-100 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {editingRecordData.user_type || 'STAFF'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {editingRecordData.user_role} • {editingRecordData.department || 'General'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Select
                  showSearch
                  placeholder="Search and select doctor, staff, or admin..."
                  className="w-full h-9"
                  value={manualForm.userId || undefined}
                  onChange={(val) => {
                    const opt = userOptions.find((u) => u.id === val);
                    setManualForm((f) => ({
                      ...f,
                      userId: val || '',
                      userType: opt?.type || 'STAFF',
                    }));
                  }}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={userOptions
                    .filter((u) => drawerMemberType === 'ALL' || u.type === drawerMemberType)
                    .map((u) => ({
                      label: `${u.type === 'DOCTOR' ? '🩺' : u.type === 'ADMIN' ? '🛡️' : '👤'} ${u.name} (${u.role}${u.department ? ` - ${u.department}` : ''})`,
                      value: u.id,
                    }))}
                />
                {manualForm.userId && (
                  <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                    <span>Selected:</span>
                    <span className="font-semibold text-slate-800">
                      {userOptions.find((u) => u.id === manualForm.userId)?.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                        manualForm.userType === 'DOCTOR'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : manualForm.userType === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-teal-100 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {manualForm.userType}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Duty Date *</label>
              <input
                type="date"
                disabled={!!editingRecordId}
                value={manualForm.date}
                onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs disabled:bg-slate-50 disabled:text-slate-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Attendance Status *</label>
              <Select
                value={isStatusLockedToPresent ? 'PRESENT' : manualForm.status}
                disabled={isStatusLockedToPresent}
                onChange={(val) => setManualForm((f) => ({ ...f, status: val }))}
                className="w-full h-9"
                options={[
                  { label: isStatusLockedToPresent ? 'Present (Locked)' : 'Present', value: 'PRESENT' },
                  { label: 'Late', value: 'LATE' },
                  { label: 'Half-Day', value: 'HALF_DAY' },
                  { label: 'Absent', value: 'ABSENT' },
                  { label: 'On Leave', value: 'ON_LEAVE' },
                ]}
              />
            </div>
          </div>

          {/* Timings: Clock In & Clock Out */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600" />
                <span>Duty Session Timings</span>
              </label>
              {manualForm.checkInTime && manualForm.checkOutTime && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Duration: {formatMins(calculateFormDuration(manualForm.checkInTime, manualForm.checkOutTime))}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Clock In Time (HH:MM)</label>
                <input
                  type="time"
                  value={manualForm.checkInTime}
                  onChange={(e) => setManualForm((f) => ({ ...f, checkInTime: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Clock Out Time (HH:MM)</label>
                <input
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={(e) => setManualForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Reason & Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Mandatory Override / Entry Reason *</label>
            <input
              type="text"
              placeholder="e.g. Biometric device offline, emergency ward duty, remote consultation..."
              value={manualForm.reason}
              onChange={(e) => setManualForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs bg-white focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Administrative Remarks (Optional)</label>
            <textarea
              rows={2}
              placeholder="Add optional notes or supervisor approvals..."
              value={manualForm.remarks}
              onChange={(e) => setManualForm((f) => ({ ...f, remarks: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs bg-white focus:outline-blue-500 resize-none"
            />
          </div>
        </div>
      </CreateDrawer>

      {/* Doctor / Staff Regularization Modal */}
      <Modal
        title="Submit Duty Regularization Request"
        open={isRegModalOpen}
        onCancel={() => setIsRegModalOpen(false)}
        onOk={() => void handleRegularizeSubmit()}
        okText="Submit to Administrator"
        destroyOnClose
      >
        <div className="space-y-4 pt-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Duty Date</label>
            <input
              type="date"
              value={regForm.date}
              onChange={(e) => setRegForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full h-8.5 rounded-lg border border-slate-200 px-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Request Category</label>
            <Select
              value={regForm.requestType}
              onChange={(val) => setRegForm((f) => ({ ...f, requestType: val }))}
              className="w-full"
              options={[
                { label: 'Missed Punch In', value: 'MISSED_PUNCH_IN' },
                { label: 'Missed Punch Out', value: 'MISSED_PUNCH_OUT' },
                { label: 'Emergency Clinical Duty', value: 'EMERGENCY_ON_DUTY' },
                { label: 'Correction', value: 'CORRECTION' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Requested Check In</label>
              <input
                type="time"
                value={regForm.requestedCheckIn}
                onChange={(e) => setRegForm((f) => ({ ...f, requestedCheckIn: e.target.value }))}
                className="w-full h-8.5 rounded-lg border border-slate-200 px-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Requested Check Out</label>
              <input
                type="time"
                value={regForm.requestedCheckOut}
                onChange={(e) => setRegForm((f) => ({ ...f, requestedCheckOut: e.target.value }))}
                className="w-full h-8.5 rounded-lg border border-slate-200 px-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Detailed Reason *</label>
            <textarea
              rows={3}
              placeholder="Please explain the clinical duty or missed punch reason..."
              value={regForm.reason}
              onChange={(e) => setRegForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
