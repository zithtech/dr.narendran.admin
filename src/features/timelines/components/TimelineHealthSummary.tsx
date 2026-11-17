import { Calendar, FileCheck, Pill, Stethoscope, TestTube } from 'lucide-react';
import React from 'react';

import type { HealthSummaryData } from '../types/patientTimelines';

interface TimelineHealthSummaryProps {
  summary: HealthSummaryData;
}

export const TimelineHealthSummary: React.FC<TimelineHealthSummaryProps> = ({
  summary,
}) => {
  const primaryCondition = summary.primary_condition ?? 'General Care';
  const activeMeds = summary.current_medicines_count ?? summary.active_medications?.length ?? 0;
  const recentConsultation = summary.recent_consultation_date ?? '--';
  const upcomingFollowup = summary.upcoming_followup_date ?? '--';

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header Row: Slim & Elegant */}
      <div className="px-3.5 sm:px-4 py-1.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
          </span>
          <span className="font-bold text-slate-800 text-xs sm:text-[13px] tracking-tight">
            Health Summary & Active Care
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active Care Program
        </span>
      </div>

      {/* 4 Primary Metric Grid - Ultra Compact Single Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-100 px-1 py-1">
        {/* 1. Primary Condition */}
        <div className="px-3 py-1.5 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Primary Condition
          </div>
          <div className="text-xs sm:text-sm font-bold text-teal-800 truncate leading-snug" title={primaryCondition}>
            {primaryCondition}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight truncate">Chief clinical focus</div>
        </div>

        {/* 2. Current Medicines */}
        <div className="px-3 py-1.5 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Current Medicines
          </div>
          <div className="flex items-baseline gap-1 leading-snug">
            <span className="text-base sm:text-lg font-bold text-slate-900">{activeMeds}</span>
            <span className="text-[11px] font-medium text-slate-500">active medications</span>
          </div>
          <div className="text-[10px] text-teal-600 font-medium leading-tight">Daily dose adherence</div>
        </div>

        {/* 3. Recent Consultation */}
        <div className="px-3 py-1.5 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Recent Consultation
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
            {recentConsultation}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">Doctor review recorded</div>
        </div>

        {/* 4. Upcoming Follow-up */}
        <div className="px-3 py-1.5 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Upcoming Follow-up
          </div>
          <div className="text-xs sm:text-sm font-bold text-amber-600 flex items-center gap-1 leading-snug">
            <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate">{upcomingFollowup}</span>
          </div>
          <div className="text-[10px] text-amber-700/80 leading-tight">Scheduled clinic visit</div>
        </div>
      </div>

      {/* Clinical Counter Footnote Bar - Slim 26px height */}
      <div className="px-3.5 sm:px-4 py-1 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3.5">
          <span className="flex items-center gap-1 font-medium">
            <Stethoscope className="w-3 h-3 text-teal-600" />
            {summary.consultations_count} Consultations
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium">
            <Pill className="w-3 h-3 text-blue-600" />
            {summary.prescriptions_count} Prescriptions
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium">
            <TestTube className="w-3 h-3 text-emerald-600" />
            {summary.investigations_count} Investigations
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-medium">
            <FileCheck className="w-3 h-3 text-purple-600" />
            {summary.medical_records_count} Medical Records
          </span>
        </div>

        <div className="text-[10.5px] text-slate-400 hidden sm:block">
          Dynamic Clinical Aggregation
        </div>
      </div>
    </div>
  );
};

