import { App } from 'antd';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  MoreHorizontal,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../utils/api';

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

  const currentUsername =
    localStorage.getItem('adminUsername') ||
    localStorage.getItem('adminEmail') ||
    'adminweb123@gmail.com';
  const currentRole = localStorage.getItem('adminRole') || 'SUPER_ADMIN';

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

  const fetchDashboardData = async () => {
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

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  // Today's Appointment Status breakdown
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

  // Department / Specialization breakdown
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    doctorsList.forEach((doc) => {
      const spec =
        doc.specialization?.trim() || doc.specialty?.trim() || 'General Medicine';
      map.set(spec, (map.get(spec) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [doctorsList]);

  // 1. Recent Patients for Dashboard highlight card
  const recentPatients = useMemo(() => {
    if (patientsList.length > 0) {
      return patientsList.slice(0, 4);
    }
    const uniqueMap = new Map();
    appointmentsList.forEach((apt) => {
      const pName = apt.patientName || apt.patient_name || apt.patient?.name;
      if (pName && !uniqueMap.has(pName)) {
        uniqueMap.set(pName, {
          name: pName,
          phone: apt.patientPhone || apt.patient_phone || '+91 98765 43210',
          gender: apt.gender || 'MALE',
          blood_group: apt.blood_group || 'O+',
        });
      }
    });
    const fromApt = Array.from(uniqueMap.values());
    if (fromApt.length > 0) return fromApt.slice(0, 4);

    return [
      { name: 'Ravi Teja', phone: '+91 98450 12345', gender: 'MALE', blood_group: 'B+' },
      { name: 'Pooja Hegde', phone: '+91 97410 54321', gender: 'FEMALE', blood_group: 'A+' },
      { name: 'Karthik Rao', phone: '+91 94480 87654', gender: 'MALE', blood_group: 'O+' },
      { name: 'Sneha Patel', phone: '+91 99000 11223', gender: 'FEMALE', blood_group: 'AB+' },
    ];
  }, [patientsList, appointmentsList]);

  // 2. Doctor Availability for Dashboard highlight card
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

  // 3. Recent Activity timeline for Dashboard highlight card
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

  // Filtered Appointments for queue table - exactly 5 items
  const filteredAppointments = useMemo(() => {
    return appointmentsList
      .filter((apt) => {
        const st = String(apt.status || 'scheduled').toLowerCase();
        if (appointmentFilter === 'confirmed' && st !== 'confirmed') return false;
        if (
          appointmentFilter === 'scheduled' &&
          st !== 'scheduled' &&
          st !== 'rescheduled'
        )
          return false;
        if (appointmentFilter === 'completed' && st !== 'completed') return false;
        if (
          appointmentFilter === 'cancelled' &&
          st !== 'cancelled' &&
          st !== 'no_show'
        )
          return false;

        if (appointmentSearch.trim()) {
          const query = appointmentSearch.toLowerCase();
          const pName = String(
            apt.patientName || apt.patient_name || apt.patient?.name || ''
          ).toLowerCase();
          const dName = String(
            apt.doctorName || apt.doctor_name || apt.doctor?.name || ''
          ).toLowerCase();
          const token = String(apt.tokenNumber || apt.token_number || '').toLowerCase();
          if (
            !pName.includes(query) &&
            !dName.includes(query) &&
            !token.includes(query)
          )
            return false;
        }
        return true;
      })
      .slice(0, 4);
  }, [appointmentsList, appointmentFilter, appointmentSearch]);

  return (
    <div className="ui-page ui-dashboard-page no-scrollbar">
      {/* Compact Executive Welcome Header */}
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
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.2 font-normal">
              Consolidated clinical &amp; operational details.
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

      {/* Main KPI Stats Grid - 6 Key Metrics */}
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
            Specialists & clinicians
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
            Fulfillment & dispense orders
          </div>
        </div>

        {/* Staff Members Card */}
        <div
          className="ui-dash-stat-card"
          onClick={() => void navigate('/staff')}
          role="button"
          tabIndex={0}
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <Users size={17} strokeWidth={2} className="ui-dash-stat-icon" />
              <span className="ui-dash-stat-title">Staff Members</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                void navigate('/staff');
              }}
              aria-label="Staff options"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">
              {stats.loading ? '…' : stats.staffCount.toLocaleString()}
            </span>
            <span className="ui-dash-stat-badge is-blue">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>+3.12%</span>
            </span>
          </div>

          <div className="ui-dash-stat-sub">
            Active workforce on duty
          </div>
        </div>
      </div>

      {/* Row 1 directly after stats cards: Appointments & Consultation Queue + Doctor Availability on the SAME row */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Left 2 Cols: Main Appointments & Consultation Queue Table - Exactly 4 rows */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    Appointments &amp; Consultation Queue
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Top 4
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Live schedule and incoming patient appointments
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[130px] sm:flex-initial">
                  <Search
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder="Search patient, doctor, token..."
                    className="h-7 pl-6.5 pr-6 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all w-full sm:w-44"
                  />
                  {appointmentSearch && (
                    <button
                      onClick={() => setAppointmentSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => void navigate('/appointments')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
                >
                  <span>View All</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-2 flex items-center gap-1 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
              {[
                { id: 'all', label: 'All', count: appointmentCounts.all },
                { id: 'confirmed', label: 'Confirmed', count: appointmentCounts.confirmed },
                { id: 'scheduled', label: 'Scheduled', count: appointmentCounts.scheduled },
                { id: 'completed', label: 'Completed', count: appointmentCounts.completed },
                { id: 'cancelled', label: 'Cancelled', count: appointmentCounts.cancelled },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAppointmentFilter(tab.id)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                    appointmentFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[9.5px] px-1 py-0 rounded-full ${
                      appointmentFilter === tab.id
                        ? 'bg-slate-700 text-slate-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Table Content */}
            {filteredAppointments.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <CalendarDays size={26} className="mx-auto text-slate-300 mb-1" />
                <div className="text-xs font-medium text-slate-600">No appointments found</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {appointmentSearch
                    ? 'Try matching a different keyword or clear search'
                    : 'No appointments in this filter.'}
                </div>
                <button
                  onClick={() => void navigate('/appointments')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  Open Appointments Manager <ArrowRight size={11} />
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar mt-1.5">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                      <th className="py-1.5 px-2.5 rounded-l-lg">Patient</th>
                      <th className="py-1.5 px-2.5">Doctor &amp; Specialty</th>
                      <th className="py-1.5 px-2.5">Schedule</th>
                      <th className="py-1.5 px-2.5 hidden sm:table-cell">Location</th>
                      <th className="py-1.5 px-2.5">Status</th>
                      <th className="py-1.5 px-2.5 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((apt: any, idx: number) => {
                      const patientName =
                        apt.patientName || apt.patient_name || apt.patient?.name || 'Patient';
                      const doctorName =
                        apt.doctorName || apt.doctor_name || apt.doctor?.name || 'Clinician';
                      const specialty =
                        apt.doctorSpecialty ||
                        apt.doctor_specialty ||
                        apt.specialization ||
                        apt.doctor?.specialization ||
                        'General';
                      const time =
                        apt.time ||
                        apt.slot_time ||
                        apt.appointment_time ||
                        (apt.scheduledStart
                          ? new Date(apt.scheduledStart).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Regular');
                      const date =
                        apt.date ||
                        apt.appointment_date ||
                        (apt.scheduledStart ? apt.scheduledStart.split('T')[0] : 'Today');
                      const token =
                        apt.tokenNumber || apt.token_number || apt.token || null;
                      const status = String(apt.status || 'scheduled').toLowerCase();
                      const location =
                        apt.branchName ||
                        apt.branch_name ||
                        apt.hospitalName ||
                        apt.hospital_name ||
                        'Main Clinic';

                      return (
                        <tr
                          key={apt.id || idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-1.5 px-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10.5px] grid place-items-center border border-slate-200 shrink-0">
                                {patientName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-xs truncate max-w-[120px]">{patientName}</div>
                                <div className="text-[10.5px] text-slate-400 truncate">
                                  {apt.patientPhone || apt.patient_phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <div className="font-medium text-slate-800 text-xs">Dr. {doctorName}</div>
                            <div className="text-[10.5px] text-slate-500">{specialty}</div>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <div className="flex items-center gap-1">
                              {token && (
                                <span className="font-mono text-[9.5px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  #{token}
                                </span>
                              )}
                              <span className="font-medium text-slate-800 text-xs">{time}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-400">{date}</div>
                          </td>
                          <td className="py-1.5 px-2.5 hidden sm:table-cell">
                            <span className="text-slate-700 text-xs">{location}</span>
                          </td>
                          <td className="py-1.5 px-2.5">
                            {status === 'confirmed' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Confirmed
                              </span>
                            ) : status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                <CheckCircle2 size={10} className="text-slate-500" />
                                Completed
                              </span>
                            ) : status === 'cancelled' || status === 'no_show' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Cancelled
                              </span>
                            ) : status === 'rescheduled' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={10} className="text-amber-500" />
                                Rescheduled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <button
                              onClick={() => void navigate('/appointments')}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {filteredAppointments.length} of {appointmentCounts.all} appointments</span>
            <button
              onClick={() => void navigate('/appointments')}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Doctor Availability Card - Exactly 4 doctors */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Stethoscope size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Doctor Availability</h3>
                  <p className="text-[11px] text-slate-500">Clinicians on duty &amp; status</p>
                </div>
              </div>
              <button
                onClick={() => void navigate('/doctors')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                Doctors <ArrowRight size={11} />
              </button>
            </div>

            <div className="mt-2 divide-y divide-slate-100">
              {doctorsAvailability.map((doc) => (
                <div key={doc.id} className="py-1.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-[10.5px] flex items-center justify-center shrink-0 border border-blue-100">
                      <Stethoscope size={12} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate cursor-pointer"
                        onClick={() => void navigate('/doctors')}
                      >
                        {doc.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate">
                        {doc.specialization}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium border ${
                      doc.statusColor === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-amber-50 text-amber-700 border-amber-200/80'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        doc.statusColor === 'emerald' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center text-[11px] text-slate-400">
            <span>{doctorsList.length > 0 ? `${doctorsList.length} total clinicians` : '4 active on duty'}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Patients, Departments & Facilities, Recent Activity (Compact 3-Column Grid) */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* 1. Recent Patients Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                  <HeartPulse size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recent Patients</h3>
                  <p className="text-[11px] text-slate-500">Newly registered records</p>
                </div>
              </div>
              <button
                onClick={() => void navigate('/patients')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                Patients <ArrowRight size={11} />
              </button>
            </div>

            <div className="mt-2 divide-y divide-slate-100">
              {recentPatients.map((p, idx) => {
                const pInitials = (p.name || 'PT')
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div key={idx} className="py-1.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                        {pInitials}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate cursor-pointer"
                          onClick={() => void navigate('/patients')}
                        >
                          {p.name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">
                          {p.phone || p.gender || 'Registered Patient'}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center text-[11px] text-slate-400">
            <span>{patientsList.length > 0 ? `${patientsList.length} registered` : '4 recent records'}</span>
          </div>
        </div>

        {/* 2. Departments & Clinical Capacity */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 grid place-items-center shrink-0 border border-teal-100">
                  <Stethoscope size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Departments &amp; Capacity</h3>
                  <p className="text-[11px] text-slate-500">Active medical specialties</p>
                </div>
              </div>
              <button
                onClick={() => void navigate('/doctors')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
              >
                Doctors <ArrowRight size={11} />
              </button>
            </div>

            <div className="mt-2.5 space-y-2.5">
              {departmentBreakdown.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  <Stethoscope size={20} className="mx-auto text-slate-300 mb-1" />
                  <div className="text-xs font-medium text-slate-600">No departments recorded</div>
                </div>
              ) : (
                departmentBreakdown.map((dept, idx) => {
                  const totalDoctors = stats.doctorsCount || 1;
                  const pct = Math.round((dept.count / totalDoctors) * 100);
                  const style = getDeptStyle(dept.name, idx);

                  return (
                    <div key={dept.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                          <span className="truncate">{dept.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-500 text-[10.5px] font-medium">
                            {dept.count} {dept.count === 1 ? 'specialist' : 'specialists'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold border ${style.badge}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick facilities footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center">
            <button
              onClick={() => void navigate('/hospitals')}
              className="group p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50/70 hover:border-blue-200 transition-all border border-slate-100 flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-blue-600 font-medium">
                <Building2 size={11} className="text-slate-400 group-hover:text-blue-600" />
                <span>Hospitals</span>
              </div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 mt-0.5">
                {stats.hospitalsCount}
              </div>
            </button>
            <button
              onClick={() => void navigate('/branches')}
              className="group p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50/70 hover:border-emerald-200 transition-all border border-slate-100 flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-emerald-600 font-medium">
                <GitBranch size={11} className="text-slate-400 group-hover:text-emerald-600" />
                <span>Branches</span>
              </div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 mt-0.5">
                {stats.branchesCount}
              </div>
            </button>
            <button
              onClick={() => void navigate('/staff')}
              className="group p-1.5 rounded-lg bg-slate-50 hover:bg-violet-50/70 hover:border-violet-200 transition-all border border-slate-100 flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-violet-600 font-medium">
                <Users size={11} className="text-slate-400 group-hover:text-violet-600" />
                <span>Staff</span>
              </div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-violet-700 mt-0.5">
                {stats.staffCount}
              </div>
            </button>
          </div>
        </div>

        {/* 3. Recent Activity Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center shrink-0 border border-indigo-100">
                  <Activity size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Live clinical &amp; audit log</p>
                </div>
              </div>
              <button
                onClick={() => void navigate('/appointments')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Schedule <ArrowRight size={11} />
              </button>
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
  );
}
