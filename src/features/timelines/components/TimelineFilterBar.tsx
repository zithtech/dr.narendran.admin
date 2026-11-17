import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { Calendar, Filter } from 'lucide-react';
import React from 'react';

import type { TimelineFilterType } from '../types/patientTimelines';

const { RangePicker } = DatePicker;

interface TimelineFilterBarProps {
  selectedType: TimelineFilterType;
  onSelectType: (type: TimelineFilterType) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  totalEvents: number;
}

const CATEGORY_ITEMS: { type: TimelineFilterType; label: string; icon: string }[] = [
  { type: 'All', label: 'All Events', icon: '📋' },
  { type: 'Consultations', label: 'Consultations', icon: '🩺' },
  { type: 'Medicines', label: 'Medicines', icon: '🌿' },
  { type: 'Prescriptions', label: 'Prescriptions', icon: '💊' },
  { type: 'Investigations', label: 'Investigations', icon: '🧪' },
  { type: 'Reports', label: 'Lab Reports', icon: '📄' },
  { type: 'Records', label: 'Records', icon: '📁' },
];

const PERIOD_YEARS = ['All', '2026', '2025', '2024'];

export const TimelineFilterBar: React.FC<TimelineFilterBarProps> = ({
  selectedType,
  onSelectType,
  selectedYear,
  onSelectYear,
  dateRange,
  onDateRangeChange,
  totalEvents,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs px-3 sm:px-3.5 py-1.5 sm:py-2 space-y-1.5">
      {/* Category Pills Row - Compact */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-teal-700" />
            Filter by Event Category
          </span>
          <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60 leading-tight">
            {totalEvents} {totalEvents === 1 ? 'event' : 'events'} found
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {CATEGORY_ITEMS.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectType(item.type)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-800 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-transparent'
                }`}
              >
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Period / Year Selector Row - Slim */}
      <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            Period:
          </span>
          <div className="flex items-center gap-1">
            {PERIOD_YEARS.map((yr) => {
              const isYrSelected = selectedYear === yr && !dateRange;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    onDateRangeChange(null);
                    onSelectYear(yr);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    isYrSelected
                      ? 'bg-teal-100 text-teal-900 font-bold border border-teal-300'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">or Custom:</span>
          <RangePicker
            size="small"
            value={dateRange}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                onDateRangeChange([dates[0], dates[1]]);
                onSelectYear('All');
              } else {
                onDateRangeChange(null);
              }
            }}
            className="text-[11px] !h-6"
          />
        </div>
      </div>
    </div>
  );
};

