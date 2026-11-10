import { DatePicker } from 'antd';
import { Calendar, Filter } from 'lucide-react';
import React from 'react';
import type { TimelineFilterType } from '../types/patientTimelines';

const { RangePicker } = DatePicker;

interface TimelineFilterBarProps {
  selectedType: TimelineFilterType;
  onSelectType: (type: TimelineFilterType) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  dateRange: [any, any] | null;
  onDateRangeChange: (dates: [any, any] | null) => void;
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 space-y-4">
      {/* Category Pills Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            Filter by Event Category
          </span>
          <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
            {totalEvents} {totalEvents === 1 ? 'event' : 'events'} found
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_ITEMS.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onSelectType(item.type)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-800 text-white shadow-xs font-semibold'
                    : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/70 border border-transparent'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Period / Year Selector Row */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            Period:
          </span>
          <div className="flex items-center gap-1.5">
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
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isYrSelected
                      ? 'bg-teal-100/80 text-teal-900 font-bold border border-teal-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">or Custom:</span>
          <RangePicker
            size="small"
            value={dateRange}
            onChange={(dates) => {
              onDateRangeChange(dates as any);
              if (dates) onSelectYear('All');
            }}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
};

