import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Avatar, Badge, cx } from '../../../components/ui/primitives';
import type {
  MedicalRecord,
  PatientDossier,
  PrescribedPendingTest,
} from '../types/medicalRecords';

interface PatientDossierViewProps {
  dossier: PatientDossier;
  onClose: () => void;
  onUploadClick: (prescribedTest?: PrescribedPendingTest) => void;
  onPreviewClick: (record: MedicalRecord) => void;
  onEditClick: (record: MedicalRecord) => void;
  onDeleteClick: (record: MedicalRecord) => void;
}

export const PatientDossierView: React.FC<PatientDossierViewProps> = ({
  dossier,
  onClose,
  onUploadClick,
  onPreviewClick,
  onEditClick,
  onDeleteClick,
}) => {
  const navigate = useNavigate();
  const { patient, pendingPrescribedTests, records } = dossier;
  const [activeTab, setActiveTab] = useState<'records' | 'prescribed'>('records');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getUploaderBadgeTone = (uploadedBy?: string) => {
    switch (uploadedBy?.toUpperCase()) {
      case 'ADMIN':
        return 'violet';
      case 'DOCTOR':
        return 'blue';
      case 'LAB':
        return 'amber';
      case 'PATIENT':
        return 'green';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Patient Profile Header Card (Matching Patients Page Design) ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            src={patient.profileImageUrl}
            name={patient.name}
            size={52}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {patient.name}
              </h2>
              {patient.gender && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {patient.gender}
                </span>
              )}
              {patient.bloodGroup && (
                <Badge tone="red">{patient.bloodGroup}</Badge>
              )}
            </div>

            <div className="mt-1 flex items-center gap-3.5 text-xs text-slate-500 flex-wrap">
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  <span>{patient.phone}</span>
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  <span>{patient.email}</span>
                </span>
              )}
              {patient.dateOfBirth && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  <span>DOB: {patient.dateOfBirth}</span>
                </span>
              )}
              {patient.address && (
                <span className="flex items-center gap-1 max-w-xs truncate" title={patient.address}>
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{patient.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={() => navigate(`/patient-timelines/${patient.id}`)}
            title="View complete longitudinal timeline"
          >
            <History size={13} className="text-blue-600" />
            <span>Patient Timeline</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={() => onUploadClick()}
          >
            <Plus size={13} strokeWidth={2.4} />
            <span>Upload Record</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            onClick={onClose}
            title="Close patient records dossier"
          >
            <X size={13} />
            <span>Close Dossier</span>
          </button>
        </div>
      </div>

      {/* ── Main Unified Container: Dossier Tabs + Table ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Tabs Row matching DataView Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-3.5 py-1.5 border-b border-slate-100 bg-slate-50/60 flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={cx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
              activeTab === 'records'
                ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
            )}
          >
            <FileText size={13} />
            <span>Uploaded Medical Records</span>
            <span
              className={cx(
                'px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors',
                activeTab === 'records' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600',
              )}
            >
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescribed')}
            className={cx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
              activeTab === 'prescribed'
                ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
            )}
          >
            <CheckCircle2 size={13} />
            <span>Doctor Prescribed Tests</span>
            <span
              className={cx(
                'px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors',
                activeTab === 'prescribed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600',
              )}
            >
              {pendingPrescribedTests.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Uploaded Medical Records Table */}
        {activeTab === 'records' && (
          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2 whitespace-nowrap w-28">Report Date</th>
                  <th className="px-3.5 py-2 whitespace-nowrap">Record / Test Name</th>
                  <th className="px-3.5 py-2 text-center whitespace-nowrap w-36">Category</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-32">Uploaded By</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                          <FileText size={22} />
                        </div>
                        <strong className="text-xs font-semibold text-slate-700">
                          No medical records uploaded for this patient yet
                        </strong>
                        <span className="text-[11px] text-slate-500 max-w-sm">
                          Upload patient lab reports, discharge summaries, or diagnostic documents directly.
                        </span>
                        <button
                          type="button"
                          className="mt-1.5 inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-2xs"
                          onClick={() => onUploadClick()}
                        >
                          <Plus size={13} /> Upload First Record
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Report Date */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{rec.reportDate || '—'}</span>
                        </div>
                      </td>

                      {/* Test Name & File Info */}
                      <td className="px-3.5 py-2">
                        <div
                          className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                          onClick={() => onPreviewClick(rec)}
                          title="Click to preview document"
                        >
                          {rec.testName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rec.fileName} • {formatFileSize(rec.fileSize)}
                        </div>
                        {rec.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5" title={rec.notes}>
                            Notes: {rec.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <Badge tone={rec.isExternal ? 'violet' : 'blue'}>
                          {rec.isExternal ? 'External Record' : 'Prescribed Lab Test'}
                        </Badge>
                      </td>

                      {/* Uploaded By */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <Badge tone={getUploaderBadgeTone(rec.uploadedBy)}>
                          {rec.uploadedBy}
                        </Badge>
                        {rec.uploaderName && (
                          <div className="text-[10.5px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                            {rec.uploaderName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => onPreviewClick(rec)}
                            title="Preview document"
                            aria-label="Preview"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={() => window.open(rec.documentUrl, '_blank')}
                            title="Download document"
                            aria-label="Download"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            onClick={() => onEditClick(rec)}
                            title="Edit metadata"
                            aria-label="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            onClick={() => onDeleteClick(rec)}
                            title="Delete record"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Doctor Prescribed Tests Table */}
        {activeTab === 'prescribed' && (
          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2 whitespace-nowrap">Prescribed Test</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-36">Prescription Date</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-44">Prescribing Doctor</th>
                  <th className="px-3.5 py-2 text-center whitespace-nowrap w-36">Status</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {pendingPrescribedTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                          <CheckCircle2 size={22} />
                        </div>
                        <strong className="text-xs font-semibold text-slate-700">
                          No lab tests prescribed by doctors for this patient
                        </strong>
                        <span className="text-[11px] text-slate-500 max-w-sm">
                          Prescribed lab investigations created during consultations will appear here automatically.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingPrescribedTests.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Test Name & Instructions */}
                      <td className="px-3.5 py-2">
                        <div className="font-semibold text-slate-900">{item.testName}</div>
                        {item.instructions && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Instructions: {item.instructions}
                          </div>
                        )}
                      </td>

                      {/* Prescription Date */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{item.prescriptionDate || 'Not specified'}</span>
                        </div>
                      </td>

                      {/* Doctor Info */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {item.doctorName || 'Dr. Narendran'}
                        </div>
                        {item.doctorSpecialization && (
                          <div className="text-[11px] text-slate-400">{item.doctorSpecialization}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        {item.status === 'Uploaded' ? (
                          <Badge tone="green">
                            <CheckCircle2 size={11} className="mr-1 inline" />
                            <span>Uploaded ({item.reportsCount})</span>
                          </Badge>
                        ) : (
                          <Badge tone="amber">
                            <Clock size={11} className="mr-1 inline" />
                            <span>Pending Upload</span>
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                          onClick={() => onUploadClick(item)}
                        >
                          <Upload size={11} />
                          <span>Upload Report</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
