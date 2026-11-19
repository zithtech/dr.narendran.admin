import { message } from 'antd';
import { ArrowRight, CheckSquare, Clock, PauseCircle, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import api from '../../utils/api';

interface PunchRecord {
  id: string;
  punch_type: string;
  punched_at: string;
}

interface DashboardAttendanceSectionProps {
  userName?: string;
  userRole?: string;
  isDoctor?: boolean;
  className?: string;
}

export function DashboardAttendanceSection({
  userRole = '',
  isDoctor = false,
  className = '',
}: DashboardAttendanceSectionProps) {
  const navigate = useNavigate();

  // 1. Attendance Status & Punch State
  const [punching, setPunching] = useState<boolean>(false);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [, setPunches] = useState<PunchRecord[]>([]);
  const [firstPunchInTime, setFirstPunchInTime] = useState<string | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Load Status from backend
  const loadAttendanceData = async () => {
    try {
      const statusRes = await api.get('attendance/today-status');
      if (statusRes.data?.data) {
        const d = statusRes.data.data;
        setIsCheckedIn(!!d.isCheckedIn);
        setIsOnBreak(!!d.isOnBreak);
        setActiveShift(d.activeShift || null);
        setPunches(d.punches || []);
        setElapsedMinutes(d.elapsedWorkingMinutes || 0);

        if (d.record) {
          setFirstPunchInTime(d.record.check_in_time || null);
        } else if (d.punches && d.punches.length > 0) {
          const inPunch = d.punches.find((p: any) => p.punch_type === 'IN');
          if (inPunch) setFirstPunchInTime(inPunch.punched_at);
        }
      }
    } catch (err) {
      console.warn('[DashboardAttendanceSection] Failed to load data:', err);
    }
  };

  useEffect(() => {
    void loadAttendanceData();
  }, []);

  // Timer tick for live working time
  useEffect(() => {
    if (!isCheckedIn) return;
    const interval = setInterval(() => {
      if (!isOnBreak) {
        setElapsedMinutes((prev) => prev + 1 / 60);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, isOnBreak]);

  // Calculations for Breakdown
  const lateMinutes = useMemo(() => {
    if (!firstPunchInTime) return 0;
    if (!activeShift?.start_time) return 0;

    const inDate = new Date(firstPunchInTime);
    const parts = activeShift.start_time.split(':');
    const shiftStart = new Date(inDate);
    shiftStart.setHours(parseInt(parts[0] || '9', 10), parseInt(parts[1] || '0', 10), 0, 0);

    const diffMs = inDate.getTime() - shiftStart.getTime();
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  }, [firstPunchInTime, activeShift]);

  // Formatters matching user reference images
  const formatWorkDuration = (totalMins: number): string => {
    const m = Math.max(0, Math.round(totalMins));
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    const hrsStr = hrs < 10 ? `0${hrs}` : `${hrs}`;
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrsStr}h ${minsStr}m`;
  };

  const formatMinsDuration = (totalMins: number): string => {
    const m = Math.max(0, Math.round(totalMins));
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} mins`;
  };

  // Punch actions
  const handlePunch = async (punchType: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END') => {
    setPunching(true);
    try {
      const res = await api.post('attendance/punch', { punchType });
      if (res.data?.status === 'success' || res.data?.success) {
        message.success(
          punchType === 'IN'
            ? 'Workday started! Attendance recorded.'
            : punchType === 'OUT'
            ? 'Day completed successfully!'
            : punchType === 'BREAK_START'
            ? 'Attendance paused. Break started.'
            : 'Attendance resumed. Duty active.'
        );
        void loadAttendanceData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.details?.message || err.response?.data?.error || 'Failed to record punch');
    } finally {
      setPunching(false);
    }
  };

  const handleViewDetails = () => {
    if (isDoctor) {
      navigate('/doctor/attendance');
    } else {
      const storedRole = (localStorage.getItem('adminRole') || userRole || '').toUpperCase();
      if (storedRole.includes('DOCTOR')) {
        navigate('/doctor/attendance');
      } else if (storedRole.includes('STAFF') || storedRole.includes('NURSE') || storedRole.includes('RECEPTIONIST')) {
        navigate('/staff/attendance');
      } else {
        navigate('/attendance');
      }
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-2xs transition-all ${className}`}
    >
      {/* 1. Header: [🕒] Daily Attendance   View Details → */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock size={16} className="stroke-[2.2]" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight m-0">
            Daily Attendance
          </h3>
        </div>

        <button
          type="button"
          onClick={handleViewDetails}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer group"
        >
          <span>View Details</span>
          <ArrowRight size={13} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. Body: Donut Circle on Left + Minimal Breakdown on Right */}
      <div className="flex items-center gap-4 sm:gap-5 my-3">
        {/* Left: Circular Donut Ring (Light gray before check-in, Vibrant Blue once checked in) */}
        <div
          className={`w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-full border-[5px] flex flex-col items-center justify-center text-center bg-white shadow-2xs transition-colors ${
            isCheckedIn ? 'border-blue-600' : 'border-slate-100'
          }`}
        >
          <span
            className={`text-xs sm:text-sm font-extrabold leading-tight tracking-tight px-1 ${
              isCheckedIn ? 'text-blue-600' : 'text-slate-900'
            }`}
          >
            {formatWorkDuration(elapsedMinutes)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
            Total
          </span>
        </div>

        {/* Right: Minimal Breakdown List */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-slate-500 font-medium">Working</span>
            </div>
            <span className="font-bold text-slate-900">{formatWorkDuration(elapsedMinutes)}</span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-500 font-medium">Late</span>
            </div>
            <span className="font-bold text-slate-900">{formatMinsDuration(lateMinutes)}</span>
          </div>
        </div>
      </div>

      {/* 3. Divider */}
      <div className="border-t border-slate-100 my-3" />

      {/* 4. Footer Controls: Reduced-Height Action Buttons */}
      {!isCheckedIn ? (
        // BEFORE State: Single Full-width Blue Button [▷ Start Working Day]
        <button
          type="button"
          disabled={punching}
          onClick={() => handlePunch('IN')}
          className="w-full h-9 sm:h-9.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
        >
          <PlayCircle size={16} className="stroke-[2.2]" />
          <span>{punching ? 'Starting Working Day…' : 'Start Working Day'}</span>
        </button>
      ) : (
        // AFTER State: Two Buttons [⏸ Pause / ▷ Resume] and [☑ Day Complete]
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            disabled={punching}
            onClick={() => handlePunch(isOnBreak ? 'BREAK_END' : 'BREAK_START')}
            className={`flex-1 h-9 sm:h-9.5 rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isOnBreak
                ? 'border-emerald-300 bg-[#ecfdf5] hover:bg-emerald-100/70 text-emerald-700'
                : 'border-amber-300 bg-[#fffbeb] hover:bg-amber-100/70 text-amber-600'
            } disabled:opacity-50`}
          >
            {isOnBreak ? (
              <>
                <PlayCircle size={15} className="stroke-[2.2]" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <PauseCircle size={15} className="stroke-[2.2]" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={punching}
            onClick={() => handlePunch('OUT')}
            className="flex-1 h-9 sm:h-9.5 rounded-xl border border-emerald-300 bg-[#ecfdf5] hover:bg-emerald-100/80 text-emerald-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <CheckSquare size={15} className="stroke-[2.2]" />
            <span>{punching ? 'Completing…' : 'Day Complete'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
