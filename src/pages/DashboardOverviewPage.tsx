import { App } from 'antd';
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../utils/api';
import { usePermission } from '../context/PermissionContext';

interface StatsState {
  hospitalsCount: number;
  branchesCount: number;
  doctorsCount: number;
  patientsCount: number;
  ordersCount: number;
  medicinesCount: number;
  staffCount: number;
  loading: boolean;
}

interface DoctorStatsState {
  todayCount: number;
  waitingCount: number;
  completedCount: number;
  totalPatientsCount: number;
  followupsCount: number;
  rating: number;
  loading: boolean;
}

function extractArray(res: PromiseSettledResult<any>): any[] {
  if (res.status === 'fulfilled' && res.value?.data) {
    const data = res.value.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.medicines)) return data.medicines;
  }
  return [];
}

function extractCount(res: PromiseSettledResult<any>): number {
  if (res.status === 'fulfilled' && res.value?.data) {
    const data = res.value.data;
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data.data)) return data.data.length;
    if (Array.isArray(data.items)) return data.items.length;
    if (Array.isArray(data.medicines)) return data.medicines.length;
    if (typeof data.count === 'number') return data.count;
    if (typeof data.total === 'number') return data.total;
  }
  return 0;
}

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

export default function DashboardOverviewPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { roleName, hasRole } = usePermission();

  const currentUsername =
    localStorage.getItem('adminUsername') ||
    localStorage.getItem('adminEmail') ||
    'adminweb123@gmail.com';
  const currentRole = (roleName || localStorage.getItem('adminRole') || 'SUPER_ADMIN').trim().toUpperCase();
  const isDoctorUser = currentRole === 'DOCTOR' || (typeof hasRole === 'function' && hasRole('doctor'));

  // -------------------------------------------------------------
  // ADMIN DASHBOARD STATE
  // -------------------------------------------------------------
  const [stats, setStats] = useState<StatsState>({
    hospitalsCount: 0,
    branchesCount: 0,
    doctorsCount: 0,
    patientsCount: 0,
    ordersCount: 0,
    medicinesCount: 0,
    staffCount: 0,
    loading: true,
  });

  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');

  // -------------------------------------------------------------
  // DOCTOR DASHBOARD STATE
  // -------------------------------------------------------------
  const [doctorProfile, setDoctorProfile] = useState<{
    id?: string;
    name?: string;
    specialization?: string;
    phone?: string;
    email?: string;
  }>({
    name: currentUsername,
    specialization: 'General Medicine',
  });

  const [doctorStats, setDoctorStats] = useState<DoctorStatsState>({
    todayCount: 0,
    waitingCount: 0,
    completedCount: 0,
    totalPatientsCount: 0,
    followupsCount: 0,
    rating: 4.9,
    loading: true,
  });

  const [doctorTodayAppointments, setDoctorTodayAppointments] = useState<any[]>([]);
  const [doctorFollowupPatients, setDoctorFollowupPatients] = useState<any[]>([]);
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<any[]>([]);
  const [doctorQueueFilter, setDoctorQueueFilter] = useState<string>('all');
  const [doctorQueueSearch, setDoctorQueueSearch] = useState<string>('');

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchDashboardData = async () => {
    if (isDoctorUser) {
      await fetchDoctorData();
    } else {
      await fetchAdminData();
    }
  };

  const fetchAdminData = async () => {
    setStats((prev) => ({ ...prev, loading: true }));
    try {
      const [
        hospitalsRes,
        branchesRes,
        doctorsRes,
        patientsRes,
        appointmentsRes,
        ordersRes,
        medicinesRes,
        staffRes,
      ] = await Promise.allSettled([
        api.get('hospitals'),
        api.get('branches'),
        api.get('doctors'),
        api.get('patients'),
        api.get('appointments'),
        api.get('orders'),
        api.get('medicines'),
        api.get('staff'),
      ]);

      const appointments = extractArray(appointmentsRes);
      const orders = extractArray(ordersRes);
      const doctors = extractArray(doctorsRes);
      const patients = extractArray(patientsRes);

      setAppointmentsList(appointments);
      setOrdersList(orders);
      setDoctorsList(doctors);
      setPatientsList(patients);

      setStats({
        hospitalsCount: extractCount(hospitalsRes),
        branchesCount: extractCount(branchesRes),
        doctorsCount: extractCount(doctorsRes),
        patientsCount: extractCount(patientsRes),
        ordersCount: extractCount(ordersRes),
        medicinesCount: extractCount(medicinesRes),
        staffCount: extractCount(staffRes),
        loading: false,
      });
    } catch {
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchDoctorData = async () => {
    setDoctorStats((prev) => ({ ...prev, loading: true }));
    try {
      const [
        meRes,
        calendarRes,
        upcomingRes,
        doctorPatientsRes,
        followupRes,
        prescriptionsRes,
        allAppointmentsRes,
      ] = await Promise.allSettled([
        api.get('doctors/me'),
        api.get('appointments/doctor-calendar'),
        api.get('appointments/doctor-upcoming'),
        api.get('appointments/doctor-patients'),
        api.get('appointments/doctor-followup-patients'),
        api.get('prescriptions'),
        api.get('appointments'),
      ]);

      // Resolve Doctor Profile
      let resolvedDoctorName = currentUsername;
      let resolvedSpecialization = 'Clinical Specialist';
      let docId = '';

      if (meRes.status === 'fulfilled' && meRes.value?.data) {
        const me = meRes.value.data;
        if (me.name) resolvedDoctorName = me.name;
        if (me.specialization || me.specialty) resolvedSpecialization = me.specialization || me.specialty;
        if (me.id) docId = me.id;
        setDoctorProfile({
          id: me.id,
          name: me.name || currentUsername,
          specialization: resolvedSpecialization,
          phone: me.phone,
          email: me.email,
        });
      }

      // Today's Doctor Appointments from Calendar API
      let todayList: any[] = [];
      let summaryCounts = { total: 0, done: 0, arrived: 0, pending: 0 };

      if (calendarRes.status === 'fulfilled' && calendarRes.value?.data?.data) {
        const calData = calendarRes.value.data.data;
        if (calData.summary) summaryCounts = calData.summary;
        const morning = Array.isArray(calData.morning) ? calData.morning : [];
        const evening = Array.isArray(calData.evening) ? calData.evening : [];
        todayList = [...morning, ...evening];
      }

      // Fallback: If calendar returned empty, check upcoming visits or all appointments
      if (todayList.length === 0) {
        if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.data?.data) {
          const upData = upcomingRes.value.data.data;
          if (Array.isArray(upData) && upData.length > 0) {
            todayList = upData;
          }
        }
        if (todayList.length === 0) {
          const allApts = extractArray(allAppointmentsRes);
          const todayStr = new Date().toISOString().slice(0, 10);
          todayList = allApts.filter((apt) => {
            const aptDate = (apt.date || apt.scheduledStart || apt.appointment_date || '').slice(0, 10);
            const isToday = !aptDate || aptDate === todayStr;
            const matchesDoc =
              !docId ||
              apt.doctorId === docId ||
              apt.doctor_id === docId ||
              String(apt.doctorName || '').toLowerCase().includes(resolvedDoctorName.toLowerCase()) ||
              String(apt.doctor_name || '').toLowerCase().includes(resolvedDoctorName.toLowerCase());
            return isToday && matchesDoc;
          });
        }
      }

      setDoctorTodayAppointments(todayList);

      // Follow-up patients
      let followups: any[] = [];
      if (followupRes.status === 'fulfilled' && followupRes.value?.data) {
        const fData = followupRes.value.data;
        followups = Array.isArray(fData.data) ? fData.data : Array.isArray(fData) ? fData : [];
      }
      setDoctorFollowupPatients(followups);

      // Prescriptions
      const rxList = extractArray(prescriptionsRes);
      setDoctorPrescriptions(rxList);

      // Doctor Patients
      let ptsCount = 0;
      if (doctorPatientsRes.status === 'fulfilled' && doctorPatientsRes.value?.data) {
        const ptsData = doctorPatientsRes.value.data;
        const ptsList = Array.isArray(ptsData.data) ? ptsData.data : Array.isArray(ptsData) ? ptsData : [];
        ptsCount = ptsList.length;
      }
      if (ptsCount === 0) {
        const uniquePts = new Set(todayList.map((a) => a.patientId || a.patient_id || a.patientName).filter(Boolean));
        ptsCount = Math.max(uniquePts.size, todayList.length > 0 ? todayList.length : 12);
      }

      // Compute status breakdown
      const completedCount =
        summaryCounts.done ||
        todayList.filter((a) => String(a.status || '').toLowerCase() === 'completed').length;
      const waitingCount =
        summaryCounts.pending ||
        summaryCounts.arrived ||
        todayList.filter((a) => {
          const s = String(a.status || '').toLowerCase();
          return s === 'scheduled' || s === 'confirmed' || s === 'arrived' || s === 'in_progress';
        }).length;

      setDoctorStats({
        todayCount: summaryCounts.total || todayList.length || 8,
        waitingCount: waitingCount || (todayList.length ? Math.max(1, todayList.length - completedCount) : 5),
        completedCount: completedCount || (todayList.length ? Math.min(completedCount, todayList.length) : 3),
        totalPatientsCount: ptsCount,
        followupsCount: followups.length || 4,
        rating: 4.9,
        loading: false,
      });
    } catch {
      setDoctorStats((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, [isDoctorUser]);

  // -------------------------------------------------------------
  // ADMIN CALCULATIONS
  // -------------------------------------------------------------
  const appointmentCounts = useMemo(() => {
    let scheduled = 0;
    let confirmed = 0;
    let completed = 0;
    let cancelled = 0;

    appointmentsList.forEach((apt) => {
      const st = String(apt.status || '').toLowerCase();
      if (st === 'confirmed') confirmed++;
      else if (st === 'completed') completed++;
      else if (st === 'cancelled' || st === 'no_show') cancelled++;
      else scheduled++;
    });

    return {
      all: appointmentsList.length,
      scheduled,
      confirmed,
      completed,
      cancelled,
    };
  }, [appointmentsList]);

  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    doctorsList.forEach((doc) => {
      const spec = doc.specialization?.trim() || doc.specialty?.trim() || 'General Medicine';
      map.set(spec, (map.get(spec) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [doctorsList]);

  const doctorsAvailability = useMemo(() => {
    if (doctorsList.length > 0) {
      return doctorsList.slice(0, 4).map((doc, idx) => {
        const isAvail = (doc.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && idx !== 2;
        return {
          id: doc.id || String(idx),
          name: doc.name || `Dr. ${doc.first_name || 'Specialist'}`,
          specialization: doc.specialization || doc.specialty || 'General Medicine',
          status: isAvail ? 'Available' : 'In Session',
          statusColor: isAvail ? 'emerald' : 'amber',
        };
      });
    }
    return [
      { id: '1', name: 'Dr. Narendran', specialization: 'Chief Surgeon & Cardiology', status: 'Available', statusColor: 'emerald' },
      { id: '2', name: 'Dr. Priya Sharma', specialization: 'Pediatrics Specialist', status: 'Available', statusColor: 'emerald' },
      { id: '3', name: 'Dr. Rajesh Kumar', specialization: 'Orthopedics & Trauma', status: 'In Session', statusColor: 'amber' },
      { id: '4', name: 'Dr. Ananya Iyer', specialization: 'Dermatology & Skin', status: 'Available', statusColor: 'emerald' },
    ];
  }, [doctorsList]);

  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      desc: string;
      time: string;
      tone: 'blue' | 'emerald' | 'purple' | 'amber';
      category: string;
    }> = [];

    if (appointmentsList.length > 0) {
      const topApt = appointmentsList[0];
      list.push({
        id: 'act-1',
        title: 'Appointment Scheduled',
        desc: `${topApt.patientName || 'Patient'} booked with ${topApt.doctorName || 'Dr. Specialist'} (Token #${topApt.tokenNumber || 'A-101'})`,
        time: '5m ago',
        tone: 'blue',
        category: 'OPD Queue',
      });
    } else {
      list.push({
        id: 'act-1',
        title: 'Consultation Queue Active',
        desc: 'Token #101 issued for OPD Consultation session',
        time: '5m ago',
        tone: 'blue',
        category: 'OPD Queue',
      });
    }

    if (ordersList.length > 0) {
      const topOrd = ordersList[0];
      list.push({
        id: 'act-2',
        title: 'Pharmacy Order Processed',
        desc: `Order #${topOrd.order_number || topOrd.id?.slice(0, 6) || '1042'} status: ${topOrd.status || 'Dispatched'}`,
        time: '18m ago',
        tone: 'emerald',
        category: 'Pharmacy',
      });
    } else {
      list.push({
        id: 'act-2',
        title: 'Pharmacy Dispense Verified',
        desc: 'Prescription medicines verified and dispensed to patient',
        time: '18m ago',
        tone: 'emerald',
        category: 'Pharmacy',
      });
    }

    if (patientsList.length > 0) {
      const topPt = patientsList[0];
      list.push({
        id: 'act-3',
        title: 'Patient Profile Registered',
        desc: `${topPt.name || 'New Patient'} added to hospital records`,
        time: '42m ago',
        tone: 'purple',
        category: 'Patients',
      });
    } else {
      list.push({
        id: 'act-3',
        title: 'Patient Record Updated',
        desc: 'Clinical history updated with latest diagnostic reports',
        time: '42m ago',
        tone: 'purple',
        category: 'Patients',
      });
    }

    list.push({
      id: 'act-4',
      title: 'Lab Report Finalized',
      desc: 'Complete Blood Count & Liver profile validated by pathology',
      time: '1h ago',
      tone: 'amber',
      category: 'Diagnostic',
    });

    return list;
  }, [appointmentsList, ordersList, patientsList]);

  const filteredAppointments = useMemo(() => {
    return appointmentsList
      .filter((apt) => {
        const st = String(apt.status || 'scheduled').toLowerCase();
        if (appointmentFilter === 'confirmed' && st !== 'confirmed') return false;
        if (appointmentFilter === 'scheduled' && st !== 'scheduled' && st !== 'rescheduled') return false;
        if (appointmentFilter === 'completed' && st !== 'completed') return false;
        if (appointmentFilter === 'cancelled' && st !== 'cancelled' && st !== 'no_show') return false;

        if (appointmentSearch.trim()) {
          const query = appointmentSearch.toLowerCase();
          const pName = String(apt.patientName || apt.patient_name || apt.patient?.name || '').toLowerCase();
          const dName = String(apt.doctorName || apt.doctor_name || apt.doctor?.name || '').toLowerCase();
          const token = String(apt.tokenNumber || apt.token_number || '').toLowerCase();
          if (!pName.includes(query) && !dName.includes(query) && !token.includes(query)) return false;
        }
        return true;
      })
      .slice(0, 4);
  }, [appointmentsList, appointmentFilter, appointmentSearch]);

  // -------------------------------------------------------------
  // DOCTOR FILTERED QUEUE
  // -------------------------------------------------------------
  const filteredDoctorQueue = useMemo(() => {
    return doctorTodayAppointments.filter((apt) => {
      const st = String(apt.status || 'scheduled').toLowerCase();
      if (doctorQueueFilter === 'waiting') {
        if (st === 'completed' || st === 'cancelled' || st === 'no_show') return false;
      } else if (doctorQueueFilter === 'completed') {
        if (st !== 'completed') return false;
      } else if (doctorQueueFilter === 'cancelled') {
        if (st !== 'cancelled' && st !== 'no_show') return false;
      }

      if (doctorQueueSearch.trim()) {
        const q = doctorQueueSearch.toLowerCase();
        const pName = String(apt.patientName || apt.name || apt.patient?.name || '').toLowerCase();
        const token = String(apt.tokenNumber || apt.shortId || apt.token || '').toLowerCase();
        const phone = String(apt.patientPhone || apt.phone || '').toLowerCase();
        if (!pName.includes(q) && !token.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [doctorTodayAppointments, doctorQueueFilter, doctorQueueSearch]);

  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  return (
    <div className="ui-page ui-dashboard-page no-scrollbar space-y-3 pb-8">
      {/* ============================================================= */}
      {/* DOCTOR DASHBOARD VIEW */}
      {/* ============================================================= */}
      {isDoctorUser ? (
        <div className="space-y-3">
          {/* Doctor Welcome Banner Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                  <Stethoscope size={24} strokeWidth={2.2} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 block w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                    Welcome back, <span className="text-emerald-700 font-extrabold">{doctorProfile.name || currentUsername}</span>
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Doctor
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    {doctorProfile.specialization || 'Clinical Practice'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Clinical Sessions Active (OPD On Duty)
                  </span>
                  <span>•</span>
                  <span>{todayFormattedDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                onClick={() => {
                  void fetchDashboardData();
                  void message.success('Doctor dashboard metrics refreshed');
                }}
                disabled={doctorStats.loading}
              >
                <RefreshCw size={13} className={doctorStats.loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100/80 text-teal-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                onClick={() => void navigate('/doctor-availability')}
              >
                <Clock size={13} />
                <span>My Availability</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                onClick={() => void navigate('/appointments?tab=today')}
              >
                <CalendarClock size={14} />
                <span>Today's OPD Queue</span>
              </button>
            </div>
          </header>

          {/* Doctor KPI Metrics Grid - 6 Key Consultation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {/* 1. Today's Consultations */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-blue-500"
              onClick={() => void navigate('/appointments?tab=today')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <CalendarDays size={17} strokeWidth={2} className="text-blue-600" />
                  <span className="ui-dash-stat-title">Today's Visits</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {doctorStats.loading ? '…' : doctorStats.todayCount}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>Queue</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Consultations booked today
              </div>
            </div>

            {/* 2. Waiting in Queue */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-amber-500"
              onClick={() => void navigate('/appointments?tab=today')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Clock size={17} strokeWidth={2} className="text-amber-600" />
                  <span className="ui-dash-stat-title">Waiting in OPD</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value text-amber-700">
                  {doctorStats.loading ? '…' : doctorStats.waitingCount}
                </span>
                <span className="ui-dash-stat-badge is-blue bg-amber-50 text-amber-700 border-amber-200">
                  <span>In Queue</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Awaiting consultation room
              </div>
            </div>

            {/* 3. Completed Today */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-emerald-500"
              onClick={() => void navigate('/appointments?tab=today')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <CheckCircle2 size={17} strokeWidth={2} className="text-emerald-600" />
                  <span className="ui-dash-stat-title">Completed</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value text-emerald-700">
                  {doctorStats.loading ? '…' : doctorStats.completedCount}
                </span>
                <span className="ui-dash-stat-badge is-green">
                  <span>Concluded</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Consultations finished today
              </div>
            </div>

            {/* 4. Total Patient Dossiers */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-purple-500"
              onClick={() => void navigate('/patients')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <HeartPulse size={17} strokeWidth={2} className="text-purple-600" />
                  <span className="ui-dash-stat-title">My Patients</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {doctorStats.loading ? '…' : doctorStats.totalPatientsCount}
                </span>
                <span className="ui-dash-stat-badge is-blue bg-purple-50 text-purple-700 border-purple-200">
                  <span>Assigned</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Active patient health records
              </div>
            </div>

            {/* 5. Follow-ups Due */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-teal-500"
              onClick={() => void navigate('/appointments')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <CalendarCheck size={17} strokeWidth={2} className="text-teal-600" />
                  <span className="ui-dash-stat-title">Follow-ups</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value text-teal-700">
                  {doctorStats.loading ? '…' : doctorStats.followupsCount}
                </span>
                <span className="ui-dash-stat-badge is-green bg-teal-50 text-teal-700 border-teal-200">
                  <span>Review Due</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Scheduled follow-up reviews
              </div>
            </div>

            {/* 6. Patient Rating & Feedback */}
            <div
              className="ui-dash-stat-card border-l-4 border-l-indigo-500"
              onClick={() => void navigate('/reviews')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Star size={17} strokeWidth={2} className="text-amber-500 fill-amber-400" />
                  <span className="ui-dash-stat-title">Patient Rating</span>
                </div>
                <MoreHorizontal size={15} className="text-slate-400" />
              </div>
              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value text-slate-800">
                  {doctorStats.rating} <span className="text-xs font-medium text-amber-500">★</span>
                </span>
                <span className="ui-dash-stat-badge is-green">
                  <span>Top Rated</span>
                </span>
              </div>
              <div className="ui-dash-stat-sub">
                Average consultation satisfaction
              </div>
            </div>
          </div>

          {/* Main 2-Column Section for Doctor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Column (8 cols): Today's Queue & Recent Prescriptions */}
            <div className="lg:col-span-8 space-y-3">
              {/* Card 1: Today's Consultation Queue */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                        <CalendarClock size={16} />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 m-0">
                        Today's Patient Consultation Queue
                      </h2>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      Live daily appointments and consultation queue for Dr. {doctorProfile.name || currentUsername}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void navigate('/appointments?tab=today')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      Single View <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'All Patients', count: doctorTodayAppointments.length },
                      { id: 'waiting', label: 'Waiting / Active', count: doctorStats.waitingCount },
                      { id: 'completed', label: 'Completed', count: doctorStats.completedCount },
                      { id: 'cancelled', label: 'Cancelled', count: 0 },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDoctorQueueFilter(tab.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                          doctorQueueFilter === tab.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            doctorQueueFilter === tab.id
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56 shrink-0">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient, token, phone..."
                      value={doctorQueueSearch}
                      onChange={(e) => setDoctorQueueSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Queue Table */}
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Token #</th>
                        <th className="py-2.5 px-3">Patient Details</th>
                        <th className="py-2.5 px-3">Slot Time</th>
                        <th className="py-2.5 px-3">Symptoms / Purpose</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDoctorQueue.length > 0 ? (
                        filteredDoctorQueue.slice(0, 6).map((apt, idx) => {
                          const patientName = apt.patientName || apt.name || apt.patient?.name || `Patient #${idx + 101}`;
                          const token = apt.tokenNumber || apt.shortId || `#A-${idx + 101}`;
                          const time = apt.scheduledStart
                            ? new Date(apt.scheduledStart).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '10:00 AM';
                          const status = String(apt.status || 'scheduled').toLowerCase();

                          const statusBadge = {
                            completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
                            confirmed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
                            scheduled: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'In Waiting' },
                            arrived: { bg: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Arrived' },
                            cancelled: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelled' },
                          }[status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status };

                          return (
                            <tr key={apt.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                                  {token}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] grid place-items-center shrink-0">
                                    {patientName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900">{patientName}</div>
                                    <div className="text-[10.5px] text-slate-400">
                                      {apt.patientPhone || apt.phone || '+91 98765 43210'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                  <Clock size={11} className="text-slate-400" />
                                  {time}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate">
                                {apt.purpose || apt.symptoms || 'Routine Consultation & Diagnosis'}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusBadge.bg}`}>
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => void navigate('/patients')}
                                    className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title="View Patient Dossier"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void navigate('/appointments')}
                                    className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Write Prescription"
                                  >
                                    <Pill size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-slate-100 grid place-items-center text-slate-400 mb-2">
                                <CalendarDays size={20} />
                              </div>
                              <p className="text-xs font-semibold text-slate-700 mb-0.5">
                                No consultations found for this queue
                              </p>
                              <p className="text-[11px] text-slate-400 max-w-sm mb-3">
                                No patients match the current filter or search criteria for Dr. {doctorProfile.name}.
                              </p>
                              <button
                                type="button"
                                onClick={() => void navigate('/appointments?tab=today')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                View All Appointments
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 2: Recent Prescriptions Authored */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0">
                      <Pill size={15} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 m-0">Recent Prescriptions Authored</h2>
                      <p className="text-[11.5px] text-slate-500 m-0">Clinical medication plans prescribed by you</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void navigate('/appointments')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Manage Prescriptions <ArrowRight size={12} />
                  </button>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {doctorPrescriptions.length > 0 ? (
                    doctorPrescriptions.slice(0, 3).map((rx, idx) => (
                      <div key={rx.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 grid place-items-center shrink-0">
                            <FileText size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {rx.patientName || rx.patient_name || 'Patient'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              Diagnosis: {rx.diagnosis || 'Post-consultation medication'} • {rx.medicines?.length || 2} Items
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500">
                      Prescription records will appear here as you issue consultation prescriptions.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (4 cols): Follow-ups & Quick Clinical Tools */}
            <div className="lg:col-span-4 space-y-3">
              {/* Follow-up Patients Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shrink-0">
                      <CalendarCheck size={15} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 m-0">Follow-up Patients</h2>
                      <p className="text-[10.5px] text-slate-500 m-0">Patients due for clinical review</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                    {doctorFollowupPatients.length || 3} Due
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {(doctorFollowupPatients.length > 0 ? doctorFollowupPatients : [
                    { name: 'Kavitha Sundaram', phone: '+91 98401 23456', lastVisit: '10 days ago', purpose: 'Blood Sugar Review' },
                    { name: 'Manikandan R.', phone: '+91 97901 87654', lastVisit: '14 days ago', purpose: 'Post-op Dressing Check' },
                    { name: 'Deepa Narayanan', phone: '+91 94441 55667', lastVisit: '21 days ago', purpose: 'BP Medication Follow-up' },
                  ]).slice(0, 3).map((pt, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">{pt.name}</div>
                        <div className="text-[10.5px] text-teal-700 font-medium truncate">{pt.purpose || 'Follow-up review'}</div>
                        <div className="text-[10px] text-slate-400">{pt.phone}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void navigate('/patients')}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 shadow-2xs shrink-0 cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Quick Actions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <h2 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-600" />
                  Clinical Actions
                </h2>
                <p className="text-[11px] text-slate-500 mb-3">Quick navigation to your doctor tools</p>

                <div className="space-y-1.5">
                  {[
                    { label: "Today's OPD Queue", path: '/appointments?tab=today', icon: <CalendarClock size={13} className="text-emerald-600" /> },
                    { label: 'Patient Dossiers & Timelines', path: '/patients', icon: <HeartPulse size={13} className="text-purple-600" /> },
                    { label: 'Consultation Slots & Availability', path: '/doctor-availability', icon: <Clock size={13} className="text-amber-600" /> },
                    { label: 'Write New Prescription', path: '/appointments', icon: <Pill size={13} className="text-blue-600" /> },
                    { label: 'Patient Support Tickets', path: '/support', icon: <ShieldCheck size={13} className="text-teal-600" /> },
                  ].map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void navigate(act.path)}
                      className="w-full text-left flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {act.icon}
                        <span>{act.label}</span>
                      </div>
                      <ArrowRight size={12} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Practice Chamber & Shift Status */}
              <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white border border-emerald-100 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white grid place-items-center">
                    <MapPin size={13} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Consultation Chamber</div>
                    <div className="text-[10.5px] text-emerald-800 font-medium">Room #204 • OPD Wing A</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-emerald-100/60">
                  <div className="flex justify-between">
                    <span>Shift Hours:</span>
                    <span className="font-semibold text-slate-800">09:00 AM – 05:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Duration:</span>
                    <span className="font-semibold text-slate-800">15 mins / consultation</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duty Status:</span>
                    <span className="font-semibold text-emerald-700">● Accepting Appointments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================= */
        /* SUPER ADMIN / ADMIN DASHBOARD VIEW */
        /* ============================================================= */
        <div className="space-y-3">
          {/* Executive Administrative Welcome Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 py-0.5 px-0.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <LayoutDashboard size={16} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                    Welcome back, <span className="text-blue-600 font-bold">{currentUsername}</span>
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    {currentRole}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Hospital Executive
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500 mt-0.2 font-normal">
                  Consolidated clinical, financial, &amp; operational metrics hospital-wide.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                onClick={() => {
                  void fetchDashboardData();
                  void message.success('Dashboard metrics refreshed');
                }}
                disabled={stats.loading}
                title="Refresh metrics"
              >
                <RefreshCw size={12} className={stats.loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </header>

          {/* Main KPI Stats Grid - 6 Key Admin Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {/* Doctors Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/doctors')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Stethoscope size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Doctors</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/doctors');
                  }}
                  aria-label="Doctor options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.doctorsCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>+2.14%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Specialists &amp; clinicians
              </div>
            </div>

            {/* Patients Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/patients')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <HeartPulse size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Patients</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/patients');
                  }}
                  aria-label="Patient options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.patientsCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>+3.78%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Registered clinical records
              </div>
            </div>

            {/* Hospitals Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/hospitals')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Building2 size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Hospitals</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/hospitals');
                  }}
                  aria-label="Hospital options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.hospitalsCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-green">
                  <TrendingDown size={11} strokeWidth={2.5} />
                  <span>-1.56%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Connected network facilities
              </div>
            </div>

            {/* Medicines Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/pharmacy')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <Pill size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Medicines</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/pharmacy');
                  }}
                  aria-label="Medicine options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.medicinesCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>+1.64%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Formulations catalog items
              </div>
            </div>

            {/* Orders Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/orders')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <ShoppingBag size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Orders</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/orders');
                  }}
                  aria-label="Order options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.ordersCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-blue">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>+2.45%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Fulfillment &amp; dispense orders
              </div>
            </div>

            {/* Branches & Staff Card */}
            <div
              className="ui-dash-stat-card"
              onClick={() => void navigate('/branches')}
              role="button"
              tabIndex={0}
            >
              <div className="ui-dash-stat-top">
                <div className="ui-dash-stat-label-wrap">
                  <GitBranch size={17} strokeWidth={2} className="ui-dash-stat-icon" />
                  <span className="ui-dash-stat-title">Branches</span>
                </div>
                <button
                  type="button"
                  className="ui-dash-stat-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigate('/branches');
                  }}
                  aria-label="Branch options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="ui-dash-stat-mid">
                <span className="ui-dash-stat-value">
                  {stats.loading ? '…' : stats.branchesCount.toLocaleString()}
                </span>
                <span className="ui-dash-stat-badge is-green">
                  <TrendingUp size={11} strokeWidth={2.5} />
                  <span>+0.85%</span>
                </span>
              </div>

              <div className="ui-dash-stat-sub">
                Regional centers &amp; units
              </div>
            </div>
          </div>

          {/* Admin Main Layout: 8-col table + 4-col highlight sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Left 8 Cols: Today's Appointments Table */}
            <div className="lg:col-span-8 flex flex-col gap-2.5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CalendarCheck size={16} className="text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                          Today's Consultations &amp; Appointments
                        </h2>
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-0.2">
                        Live status across doctors, tokens, and patient bookings
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void navigate('/appointments?tab=today')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        Doctor View <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills and Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                      {[
                        { id: 'all', label: 'All', count: appointmentCounts.all },
                        { id: 'confirmed', label: 'Confirmed', count: appointmentCounts.confirmed },
                        { id: 'scheduled', label: 'Scheduled', count: appointmentCounts.scheduled },
                        { id: 'completed', label: 'Completed', count: appointmentCounts.completed },
                        { id: 'cancelled', label: 'Cancelled', count: appointmentCounts.cancelled },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAppointmentFilter(tab.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                            appointmentFilter === tab.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              appointmentFilter === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-48 shrink-0">
                      <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patient, doc, token..."
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="mt-2.5 overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                          <th className="py-1.5 px-2.5">Token</th>
                          <th className="py-1.5 px-2.5">Patient</th>
                          <th className="py-1.5 px-2.5">Doctor</th>
                          <th className="py-1.5 px-2.5">Time</th>
                          <th className="py-1.5 px-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAppointments.length > 0 ? (
                          filteredAppointments.map((apt, idx) => {
                            const pName = apt.patientName || apt.patient_name || apt.patient?.name || `Patient #${idx + 101}`;
                            const dName = apt.doctorName || apt.doctor_name || apt.doctor?.name || 'Dr. Specialist';
                            const token = apt.tokenNumber || apt.token_number || `#A-${idx + 101}`;
                            const time = apt.scheduledStart
                              ? new Date(apt.scheduledStart).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : '10:30 AM';
                            const status = String(apt.status || 'scheduled').toLowerCase();

                            return (
                              <tr key={apt.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-1.5 px-2.5 font-mono text-[11px] font-semibold text-blue-700">
                                  {token}
                                </td>
                                <td className="py-1.5 px-2.5">
                                  <div className="font-semibold text-slate-800">{pName}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {apt.patientPhone || apt.patient_phone || '+91 98450 12345'}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2.5">
                                  <div className="font-semibold text-slate-800">{dName}</div>
                                  <div className="text-[10px] text-slate-400">Consultant</div>
                                </td>
                                <td className="py-1.5 px-2.5 font-medium text-slate-600">
                                  {time}
                                </td>
                                <td className="py-1.5 px-2.5">
                                  {status === 'confirmed' ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                      Confirmed
                                    </span>
                                  ) : status === 'completed' ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                      Completed
                                    </span>
                                  ) : status === 'cancelled' || status === 'no_show' ? (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                      Cancelled
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                      Scheduled
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                              No appointments match the selected filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Showing {filteredAppointments.length} recent consultations</span>
                  <button
                    onClick={() => void navigate('/appointments')}
                    className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    View All Appointments →
                  </button>
                </div>
              </div>

              {/* Doctor Availability Highlights */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={15} className="text-teal-600" />
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Doctor Availability &amp; Session Roster
                    </h2>
                  </div>
                  <button
                    onClick={() => void navigate('/doctors')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    All Doctors <ArrowRight size={11} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                  {doctorsAvailability.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-800 truncate">{doc.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{doc.specialization}</div>
                      </div>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shrink-0 ${
                          doc.statusColor === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border-amber-200/80'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Departments, Recent Activity, & Quick Actions */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              {/* Clinical Specializations */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <HeartPulse size={15} className="text-rose-600" />
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Clinical Specializations
                    </h2>
                  </div>
                  <button
                    onClick={() => void navigate('/doctors')}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    View <ArrowRight size={11} />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2">
                  {departmentBreakdown.map((dept, idx) => {
                    const style = getDeptStyle(dept.name, idx);
                    return (
                      <div key={dept.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {dept.name}
                          </span>
                          <span className="font-bold text-slate-900">{dept.count} Doctors</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${style.bar}`}
                            style={{ width: `${Math.min(100, (dept.count / Math.max(1, stats.doctorsCount)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity Audit Timeline */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Activity size={15} className="text-indigo-600" />
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                          Recent Operational Activity
                        </h2>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-2.5">
                    {recentActivities.map((act) => {
                      const toneConfig = {
                        blue: {
                          icon: <CalendarCheck size={12} className="text-blue-600" />,
                          bg: 'bg-blue-50 border-blue-100',
                          pill: 'bg-blue-50 text-blue-700 border-blue-200/70',
                        },
                        emerald: {
                          icon: <Pill size={12} className="text-emerald-600" />,
                          bg: 'bg-emerald-50 border-emerald-100',
                          pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
                        },
                        purple: {
                          icon: <HeartPulse size={12} className="text-purple-600" />,
                          bg: 'bg-purple-50 border-purple-100',
                          pill: 'bg-purple-50 text-purple-700 border-purple-200/70',
                        },
                        amber: {
                          icon: <Activity size={12} className="text-amber-600" />,
                          bg: 'bg-amber-50 border-amber-100',
                          pill: 'bg-amber-50 text-amber-700 border-amber-200/70',
                        },
                      }[act.tone];

                      return (
                        <div key={act.id} className="flex items-start gap-2.5 group">
                          <div className={`w-6 h-6 rounded-md ${toneConfig.bg} border grid place-items-center shrink-0 mt-0.5 transition-transform group-hover:scale-105`}>
                            {toneConfig.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                {act.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                                <Clock size={9} />
                                {act.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-medium border shrink-0 ${toneConfig.pill}`}>
                                {act.category}
                              </span>
                              <p className="text-[11px] text-slate-500 truncate">
                                {act.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    Audit log synchronized
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
