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
import type { PatientTimelineHeader } from '../types/patientTimelines';
import { patientTimelinesApi } from '../services/patientTimelinesApi';

const { Title } = Typography;

interface TimelineHeaderCardProps {
  patient: PatientTimelineHeader;
  onPdfDownloaded?: () => void;
}

export const TimelineHeaderCard: React.FC<TimelineHeaderCardProps> = ({
  patient,
}) => {
  const navigate = useNavigate();
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Top action row */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
        <Button
          type="text"
          icon={<ArrowLeft className="w-4 h-4 text-teal-800" />}
          className="text-teal-800 font-medium hover:text-teal-900 !px-2"
          onClick={() => navigate('/patient-timelines')}
        >
          Back to Patient Timelines
        </Button>

        <Button
          type="primary"
          icon={<Download className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />}
          className="bg-teal-700 hover:bg-teal-800 border-none shadow-xs text-xs font-semibold"
          loading={downloadingPdf}
          onClick={handleDownloadPdf}
        >
          Download PDF Summary
        </Button>
      </div>

      {/* Main Profile Info Header */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {/* Avatar / Photo */}
            <div className="relative">
              <Avatar
                name={patient.name}
                src={patient.profile_image_url}
                size={64}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
                title="Active Record"
              />
            </div>

            {/* Patient Name & Demographics */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Title level={4} className="!mb-0 text-gray-900 font-bold tracking-tight">
                  {patient.name}
                </Title>
                <Tag color="cyan" className="font-mono text-xs !m-0 font-medium">
                  ID: #{patient.id.slice(0, 8).toUpperCase()}
                </Tag>
                {patient.blood_group && (
                  <Tag color="red" className="font-semibold text-xs !m-0 flex items-center gap-1">
                    <Droplet className="w-3 h-3 inline text-red-500 fill-red-500" />
                    {patient.blood_group}
                  </Tag>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                {patient.gender && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-700 capitalize">
                      {patient.gender.toLowerCase()}
                    </span>
                  </span>
                )}
                {patient.age !== null && patient.age !== undefined && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-700">{patient.age} years</span>
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700">{patient.phone}</span>
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700">{patient.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Context Tag */}
          <div className="flex items-center gap-2 bg-teal-50/70 border border-teal-200/60 px-4 py-2.5 rounded-lg text-xs self-start md:self-auto">
            <FileText className="w-4 h-4 text-teal-700 shrink-0" />
            <div>
              <div className="text-[11px] text-teal-700 font-semibold uppercase tracking-wider">
                Clinical Timeline
              </div>
              <div className="text-gray-700">Chronological Medical History</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
