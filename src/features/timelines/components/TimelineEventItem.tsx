import { Button, Image, Tag } from 'antd';
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Pill,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import type { TimelineEvent } from '../types/patientTimelines';

interface TimelineMedicineItem {
  name?: string;
  medicineName?: string;
  dosage?: string;
  strength?: string;
  frequency?: string;
  duration?: string | number;
  foodTiming?: string;
  instructions?: string;
  foodInstruction?: string;
}

interface TimelineEventItemProps {
  event: TimelineEvent;
  isLast?: boolean;
}

export const TimelineEventItem: React.FC<TimelineEventItemProps> = ({
  event,
  isLast = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Do not toggle if clicking on interactive elements or inside the expanded details area
    if (target.closest('button, a, [data-expanded-content]')) {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  // Parse formatted clinical date
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const date = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const { date: formattedDate, time: formattedTime } = formatEventDate(event.occurred_at);

  // Event category styling tokens
  const getBadgeConfig = () => {
    switch (event.type) {
      case 'CONSULTATION':
        return {
          icon: '🩺',
          label: 'Consultation',
          bg: 'bg-teal-50',
          text: 'text-teal-800',
          border: 'border-teal-200',
          dotBg: 'bg-teal-600',
        };
      case 'PRESCRIPTION':
        return {
          icon: '💊',
          label: 'Prescription',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          dotBg: 'bg-blue-600',
        };
      case 'MEDICINE_STARTED':
      case 'MEDICINE_CHANGED':
      case 'MEDICINE_STOPPED':
        return {
          icon: '🌿',
          label:
            event.type === 'MEDICINE_STARTED'
              ? 'Medicine Started'
              : event.type === 'MEDICINE_CHANGED'
              ? 'Medicine Changed'
              : 'Medicine Stopped',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          dotBg: 'bg-amber-600',
        };
      case 'LAB_TEST_ORDERED':
        return {
          icon: '🧪',
          label: 'Investigation Ordered',
          bg: 'bg-teal-50',
          text: 'text-teal-800',
          border: 'border-teal-200',
          dotBg: 'bg-teal-600',
        };
      case 'LAB_REPORT':
        return {
          icon: '📄',
          label: 'Lab Report',
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          dotBg: 'bg-emerald-600',
        };
      case 'IMAGING':
        return {
          icon: '🩻',
          label: 'Imaging Scan',
          bg: 'bg-purple-50',
          text: 'text-purple-800',
          border: 'border-purple-200',
          dotBg: 'bg-purple-600',
        };
      case 'APPOINTMENT':
      case 'FOLLOW_UP':
        return {
          icon: '📅',
          label: event.type === 'FOLLOW_UP' ? 'Follow-up Scheduled' : 'Appointment',
          bg: 'bg-orange-50',
          text: 'text-orange-800',
          border: 'border-orange-200',
          dotBg: 'bg-orange-600',
        };
      case 'DOCTOR_NOTE':
        return {
          icon: '📝',
          label: 'Doctor Note',
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          dotBg: 'bg-gray-600',
        };
      case 'MEDICAL_RECORD':
      default:
        return {
          icon: '📋',
          label: 'Medical Record',
          bg: 'bg-teal-50',
          text: 'text-teal-800',
          border: 'border-teal-200',
          dotBg: 'bg-teal-600',
        };
    }
  };

  const badge = getBadgeConfig();
  const details = event.details ?? {};
  const medicines: TimelineMedicineItem[] = (event.medicines as TimelineMedicineItem[] | undefined) ?? (details.medicines as TimelineMedicineItem[] | undefined) ?? [];
  const vitals = details.vitals as Record<string, string | number | undefined> | undefined;
  const rawDoc = (details.documentUrl ?? details.document_url ?? details.prescriptionUrl ?? details.imageUrl) as string | undefined;
  const isAbsolute = typeof rawDoc === 'string' && (rawDoc.startsWith('http://') || rawDoc.startsWith('https://') || rawDoc.startsWith('data:') || rawDoc.startsWith('blob:'));
  const documentUrl = typeof rawDoc === 'string' && rawDoc.trim()
    ? isAbsolute
      ? rawDoc.trim()
      : `https://zithtech-s3-bucket-431451850777-eu-north-1-an.s3.eu-north-1.amazonaws.com/${rawDoc.trim().replace(/^\/+/, '')}`
    : undefined;

  const isImage = typeof documentUrl === 'string' && (
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(documentUrl) ||
    String(details.file_type ?? details.fileType ?? '').toLowerCase().startsWith('image/')
  );

  return (
    <div className="relative pl-7 sm:pl-9 pb-3 sm:pb-3.5">
      {/* Vertical Rail Connector Line */}
      {!isLast && (
        <div className="absolute left-[13px] sm:left-[17px] top-6 bottom-0 w-[2px] bg-gray-200" />
      )}

      {/* Chronological Circle Node */}
      <div
        className={`absolute left-[7px] sm:left-[11px] top-2.5 w-3.5 h-3.5 rounded-full ${badge.dotBg} ring-4 ring-white shadow-xs`}
      />

      {/* Event Card Container with Click-to-Expand */}
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition-all overflow-hidden cursor-pointer"
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${event.title} timeline event`}
      >
        {/* Event Header Row */}
        <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </span>

            <span className="text-xs font-semibold text-gray-700">
              {formattedDate} {formattedTime ? `· ${formattedTime}` : ''}
            </span>

            {event.status && (
              <Tag color={event.status.toLowerCase() === 'completed' ? 'green' : 'blue'} className="text-[11px] !m-0 uppercase font-medium">
                {event.status}
              </Tag>
            )}
          </div>

          {/* Doctor Info */}
          {event.doctor && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-800">{event.doctor.name}</span>
              {event.doctor.specialization && (
                <span className="text-gray-400">({event.doctor.specialization})</span>
              )}
            </div>
          )}
        </div>

        {/* Event Summary Body - Compact 2-Column Layout */}
        <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left Section: Event Title, Summary & Diagnosis */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-sm font-bold text-gray-900 tracking-tight leading-snug">
              {event.title}
            </div>

            {event.summary && (
              <div className="text-xs text-gray-600 leading-normal line-clamp-2">
                {event.summary}
              </div>
            )}

            {details.diagnosis && (
              <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                <span className="font-semibold text-gray-700">Diagnosis:</span>
                <Tag color="volcano" className="font-medium text-[11px] !m-0">
                  {details.diagnosis}
                </Tag>
              </div>
            )}
          </div>

          {/* Right Section: Medicine Count / Document Action & View Details */}
          <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 text-right">
            {/* Prescriptions: Medicine count indicator */}
            {event.type === 'PRESCRIPTION' && medicines.length > 0 && (
              <div className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {medicines.length} {medicines.length === 1 ? 'medicine prescribed' : 'medicines prescribed'}
                </span>
              </div>
            )}

            {/* Document button if present */}
            {documentUrl && (
              <div className="flex items-center gap-2">
                {isImage && (
                  <Image
                    style={{ display: 'none' }}
                    src={documentUrl}
                    preview={{
                      visible: previewVisible,
                      src: documentUrl,
                      onVisibleChange: (value) => setPreviewVisible(value),
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isImage) {
                      setPreviewVisible(true);
                    } else {
                      window.open(documentUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Document
                </button>
              </div>
            )}

            {/* View / Hide Details Action */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer"
              aria-label={isExpanded ? 'Hide details' : 'View details'}
            >
              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-teal-700" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Expanded Clinical Details */}
        {isExpanded && (
          <div
            data-expanded-content="true"
            className="px-2.5 sm:px-3 pb-3 pt-2.5 border-t border-gray-100 bg-gray-50/50 space-y-2 text-xs cursor-default"
          >
            {/* Consultation Notes */}
            {Boolean(details.consultation_notes ?? details.notes) && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-gray-400" />
                  Clinical & Consultation Notes
                </div>
                <div className="p-2 bg-white border border-gray-200 rounded-md text-gray-800 leading-relaxed font-normal">
                  {details.consultation_notes ?? details.notes}
                </div>
              </div>
            )}

            {/* Vitals Summary */}
            {vitals && Object.keys(vitals).length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Activity className="w-3 h-3 text-teal-600" />
                  Recorded Patient Vitals
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {vitals.bp && (
                    <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                      <div className="text-[10px] text-gray-400">Blood Pressure</div>
                      <div className="font-bold text-gray-800">{vitals.bp}</div>
                    </div>
                  )}
                  {vitals.pulse && (
                    <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                      <div className="text-[10px] text-gray-400">Pulse</div>
                      <div className="font-bold text-gray-800">{vitals.pulse} bpm</div>
                    </div>
                  )}
                  {vitals.weight_kg && (
                    <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                      <div className="text-[10px] text-gray-400">Weight</div>
                      <div className="font-bold text-gray-800">{vitals.weight_kg} kg</div>
                    </div>
                  )}
                  {vitals.temp && (
                    <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                      <div className="text-[10px] text-gray-400">Temperature</div>
                      <div className="font-bold text-gray-800">{vitals.temp} °F</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prescribed Medicines Table */}
            {medicines.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Pill className="w-3 h-3 text-blue-600" />
                  Prescribed Medicines Breakdown
                </div>
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                      <tr>
                        <th className="py-1.5 px-2">Medicine</th>
                        <th className="py-1.5 px-2">Dosage / Strength</th>
                        <th className="py-1.5 px-2">Frequency</th>
                        <th className="py-1.5 px-2">Duration</th>
                        <th className="py-1.5 px-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {medicines.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 font-semibold text-gray-900">
                            {m.name ?? m.medicineName}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600">
                            {m.dosage ?? m.strength ?? '1 Tab'}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600">
                            {m.frequency ?? 'Once Daily'}
                          </td>
                          <td className="py-1.5 px-2 text-gray-600">
                            {m.duration ? `${m.duration} Days` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-gray-500 italic">
                            {m.foodTiming ?? m.instructions ?? m.foodInstruction ?? 'After food'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lab Test Reports or Investigation Details */}
            {(event.type === 'LAB_REPORT' || event.type === 'LAB_TEST_ORDERED' || event.type === 'IMAGING') && (
              <div className="p-2 bg-white border border-gray-200 rounded-md space-y-1.5">
                <div className="font-semibold text-gray-700 text-xs flex items-center justify-between">
                  <span>Investigation Details:</span>
                  <span className="text-gray-400 font-normal">Reference ID: #{event.reference_id?.slice(0, 8) ?? 'N/A'}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                  {details.testName && <div><strong>Test:</strong> {details.testName}</div>}
                  {details.status && <div><strong>Status:</strong> {details.status}</div>}
                  {details.fileName && <div><strong>File:</strong> {details.fileName}</div>}
                </div>
                {documentUrl && (
                  <div className="pt-1 flex items-center gap-3">
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        if (isImage) {
                          setPreviewVisible(true);
                        } else {
                          window.open(documentUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      className="!p-0 text-blue-700 font-semibold"
                    >
                      {isImage ? 'Preview Attached Report' : 'Open Attached Document'}
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      href={documentUrl}
                      target="_blank"
                      download
                      icon={<Download className="w-3.5 h-3.5" />}
                      className="!p-0 text-teal-700 font-semibold"
                    >
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Details */}
            {details.follow_up_date && (
              <div className="p-2 bg-amber-50/60 border border-amber-200 rounded-md space-y-1">
                <div className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  Scheduled Follow-up Date: {details.follow_up_date}
                </div>
                {details.instructions && (
                  <div className="text-amber-800 text-xs">
                    Instructions: {details.instructions}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
