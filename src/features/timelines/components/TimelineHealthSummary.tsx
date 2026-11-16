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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Card Header Row */}
      <div className="px-4 sm:px-5 py-2 sm:py-2.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
          </span>
          <span className="font-bold text-gray-900 text-sm tracking-tight">
            Health Summary & Active Care
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active Care Program
        </span>
      </div>

      {/* 4 Primary Metric Grid - Compact & Proportionally Sized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 p-1 sm:p-1.5">
        {/* 1. Primary Condition */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 space-y-0.5">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Primary Condition
          </div>
          <div className="text-sm sm:text-base font-bold text-teal-800 truncate" title={primaryCondition}>
            {primaryCondition}
          </div>
          <div className="text-[11px] text-gray-400 leading-tight">Chief clinical focus</div>
        </div>

        {/* 2. Current Medicines */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 space-y-0.5">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Current Medicines
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{activeMeds}</span>
            <span className="text-xs font-medium text-gray-500">active medications</span>
          </div>
          <div className="text-[11px] text-teal-600 font-medium leading-tight">Daily dose adherence</div>
        </div>

        {/* 3. Recent Consultation */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 space-y-0.5">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Recent Consultation
          </div>
          <div className="text-sm sm:text-base font-semibold text-gray-800">
            {recentConsultation}
          </div>
          <div className="text-[11px] text-gray-400 leading-tight">Doctor review recorded</div>
        </div>

        {/* 4. Upcoming Follow-up */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 space-y-0.5">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Upcoming Follow-up
          </div>
          <div className="text-sm sm:text-base font-bold text-amber-600 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500 inline" />
            {upcomingFollowup}
          </div>
          <div className="text-[11px] text-amber-700/80 leading-tight">Scheduled clinic visit</div>
        </div>
      </div>

      {/* Clinical Counter Footnote Bar - Compact Height */}
      <div className="px-4 sm:px-5 py-1.5 sm:py-2 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            {summary.consultations_count} Consultations
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Pill className="w-3.5 h-3.5 text-blue-600" />
            {summary.prescriptions_count} Prescriptions
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5 font-medium">
            <TestTube className="w-3.5 h-3.5 text-emerald-600" />
            {summary.investigations_count} Investigations
          </span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1.5 font-medium">
            <FileCheck className="w-3.5 h-3.5 text-purple-600" />
            {summary.medical_records_count} Medical Records
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          Dynamic Clinical Aggregation
        </div>
      </div>
    </div>
  );
};

