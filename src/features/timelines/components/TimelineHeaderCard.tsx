import { Button, Tag, Typography } from 'antd';
import {
  ArrowLeft,
  Calendar,
  Download,
  Droplet,
  FileText,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Avatar } from '../../../components/ui/primitives';
import { usePermission } from '../../../context/PermissionContext';
import { patientTimelinesApi } from '../services/patientTimelinesApi';
import type { PatientTimelineHeader } from '../types/patientTimelines';

const { Title } = Typography;

interface TimelineHeaderCardProps {
  patient: PatientTimelineHeader;
  onPdfDownloaded?: () => void;
}

export const TimelineHeaderCard: React.FC<TimelineHeaderCardProps> = ({
  patient,
}) => {
  const navigate = useNavigate();
  const { canView } = usePermission();
  const canReadTimeline = canView('PATIENT_TIMELINES', ['PATIENTS']);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await patientTimelinesApi.downloadPatientHistoryPdf(patient.id, patient.name);
    } catch (err) {
      console.error('Failed to download medical history PDF', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="w-full px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Left section: Back button + Divider + Avatar + Patient Info */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                void navigate('/patient-timelines');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-900 text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
              title="Back to Patient Timelines"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal-700" />
              <span>Back</span>
            </button>

            {/* Subtle Divider */}
            <div className="h-7 w-[1px] bg-slate-200 hidden sm:block shrink-0" />

            {/* Avatar / Photo */}
            <div className="relative shrink-0 ring-2 ring-slate-100 rounded-full shadow-2xs">
              <Avatar
                name={patient.name}
                src={patient.profile_image_url}
                size={46}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                title="Active Record"
              />
            </div>

            {/* Patient Name & Demographics */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Title level={4} className="!mb-0 !text-slate-900 !font-bold tracking-tight text-base sm:text-[17px]">
                  {patient.name}
                </Title>
                <Tag color="cyan" className="font-mono text-[11px] !m-0 font-semibold px-1.5 py-0 rounded">
                  ID: #{patient.id.slice(0, 8).toUpperCase()}
                </Tag>
                {patient.blood_group && (
                  <Tag color="red" className="font-semibold text-[11px] !m-0 px-1.5 py-0 rounded flex items-center gap-1">
                    <Droplet className="w-2.5 h-2.5 inline text-rose-500 fill-rose-500" />
                    {patient.blood_group}
                  </Tag>
                )}
              </div>

              {/* Demographics row */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-xs text-slate-500">
                {patient.gender && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="font-medium capitalize">{patient.gender.toLowerCase()}</span>
                  </span>
                )}
                {patient.age !== null && patient.age !== undefined && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="font-medium">{patient.age} yrs</span>
                  </span>
                )}
                {patient.phone && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{patient.phone}</span>
                  </span>
                )}
                {patient.email && (
                  <span className="inline-flex items-center gap-1 text-slate-600 truncate max-w-[200px]">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Clinical Timeline Context Card & Download Action */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0 pl-1 md:pl-0">
            {/* Clinical Timeline Badge */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-emerald-50/50 border border-teal-200/70 px-3 py-1.5 rounded-lg shadow-2xs">
              <div className="w-7 h-7 rounded-md bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-teal-800 font-bold uppercase tracking-wider leading-none">
                  Clinical Timeline
                </div>
                <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  Chronological Medical History
                </div>
              </div>
            </div>

            {/* Download Button */}
            {canReadTimeline && (
              <Button
                type="primary"
                icon={<Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-bounce' : ''}`} />}
                className="bg-teal-700 hover:bg-teal-800 border-none shadow-xs text-xs font-semibold h-[34px] px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                loading={downloadingPdf}
                onClick={() => {
                  void handleDownloadPdf();
                }}
              >
                PDF Summary
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
