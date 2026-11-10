import { Calendar, FileCheck, Pill, Stethoscope, TestTube } from 'lucide-react';
import React from 'react';
import type { HealthSummaryData } from '../types/patientTimelines';

interface TimelineHealthSummaryProps {
  summary: HealthSummaryData;
}

export const TimelineHealthSummary: React.FC<TimelineHealthSummaryProps> = ({
  summary,
}) => {
  const primaryCondition = summary.primary_condition || 'General Care';
  const activeMeds = summary.current_medicines_count ?? summary.active_medications?.length ?? 0;
  const recentConsultation = summary.recent_consultation_date || '--';
  const upcomingFollowup = summary.upcoming_followup_date || '--';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Card Header Row */}
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
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

      {/* 4 Primary Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 p-2 sm:p-4">
        {/* 1. Primary Condition */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Primary Condition
          </div>
          <div className="text-lg font-bold text-teal-800 truncate" title={primaryCondition}>
            {primaryCondition}
          </div>
          <div className="text-xs text-gray-400">Chief clinical focus</div>
        </div>

        {/* 2. Current Medicines */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Current Medicines
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{activeMeds}</span>
            <span className="text-xs font-medium text-gray-500">active medications</span>
          </div>
          <div className="text-xs text-teal-600 font-medium">Daily dose adherence</div>
        </div>

        {/* 3. Recent Consultation */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Recent Consultation
          </div>
          <div className="text-lg font-semibold text-gray-800">
            {recentConsultation}
          </div>
          <div className="text-xs text-gray-400">Doctor review recorded</div>
        </div>

        {/* 4. Upcoming Follow-up */}
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Upcoming Follow-up
          </div>
          <div className="text-lg font-bold text-amber-600 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-amber-500 inline" />
            {upcomingFollowup}
          </div>
          <div className="text-xs text-amber-700/80">Scheduled clinic visit</div>
        </div>
      </div>

      {/* Clinical Counter Footnote Bar */}
      <div className="px-6 py-2.5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-4">
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

