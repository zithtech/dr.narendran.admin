import { App } from 'antd';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  Paperclip,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Avatar, cx } from '../../components/ui/primitives';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface PatientSummary {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
}

interface LabReport {
  id: string;
  prescriptionLabTestId?: string | null;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  reportDate: string;
  documentUrl: string;
  notes?: string | null;
  uploadedBy: 'LAB' | 'PATIENT';
  uploadedById: string;
  uploaderName?: string;
  isExternal: boolean;
  testName: string;
  createdAt: string;
  updatedAt: string;
}

interface RequiredTest {
  id: string;
  prescriptionId: string;
  patientId: string;
  labTestId?: string | null;
  testName: string;
  instructions?: string | null;
  prescriptionDate?: string | null;
  doctorName?: string | null;
  doctorSpecialization?: string | null;
  status: 'Uploaded' | 'Pending';
  reportsCount: number;
  reports?: LabReport[];
  createdAt: string;
}

export default function LabReportsPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Patient Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active Patient Details & Tests
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [requiredTests, setRequiredTests] = useState<RequiredTest[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<RequiredTest | null>(null);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Delete Confirmation State
  const [deletingReport, setDeletingReport] = useState<LabReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Patients API debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await api.get('lab-portal/patients/search', {
          params: { query: searchQuery.trim() },
        });
        setSearchResults(Array.isArray(res.data) ? res.data : []);
        setShowDropdown(true);
      } catch (err: unknown) {
        console.error('Patient search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load patient data when selected
  const loadPatientTestsAndReports = async (patientId: string) => {
    try {
      setLoadingData(true);
      const res = await api.get(`lab-portal/patients/${patientId}/tests-and-reports`);
      if (res.data) {
        setSelectedPatient(res.data.patient || null);
        setRequiredTests(Array.isArray(res.data.requiredTests) ? res.data.requiredTests : []);
      }
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to fetch patient records.'));
    } finally {
      setLoadingData(false);
    }
  };

  // Deep-link loading via ?patientId=...
  useEffect(() => {
    const paramId = searchParams.get('patientId');
    if (paramId && (!selectedPatient || selectedPatient.id !== paramId)) {
      void loadPatientTestsAndReports(paramId);
    }
  }, [searchParams]);

  // Handle select patient
  const handleSelectPatient = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setShowDropdown(false);
    setSearchQuery(patient.name || patient.phone || patient.id);
    setSearchParams({ patientId: patient.id });
    void loadPatientTestsAndReports(patient.id);
  };

  // Clear selected patient
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setRequiredTests([]);
    setSearchQuery('');
    setSearchParams({});
  };

  // Open Upload Modal for a specific prescribed test
  const openUploadModal = (test: RequiredTest) => {
    setActiveTest(test);
    setReportDate(new Date().toISOString().split('T')[0] ?? '');
    setNotes('');
    setSelectedFile(null);
    setIsUploadModalOpen(true);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        void message.error('File size exceeds the 15MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Submit Upload Form
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !activeTest) {
      void message.error('No patient or test selected.');
      return;
    }
    if (!selectedFile) {
      void message.error('Please select a report file to upload (PDF, PNG, JPG).');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('testName', activeTest.testName);
    formData.append('prescriptionLabTestId', activeTest.id);
    if (reportDate) {
      formData.append('reportDate', reportDate);
    }
    if (notes.trim()) {
      formData.append('notes', notes.trim());
    }

    setUploading(true);
    try {
      await api.post(`lab-portal/patients/${selectedPatient.id}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      void message.success(`Report for "${activeTest.testName}" uploaded successfully!`);
      setIsUploadModalOpen(false);
      setActiveTest(null);
      void loadPatientTestsAndReports(selectedPatient.id);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to upload report.'));
    } finally {
      setUploading(false);
    }
  };

  // Delete Lab Report
  const handleDeleteReport = async () => {
    if (!deletingReport || !selectedPatient) return;

    setDeleting(true);
    try {
      await api.delete(`lab-portal/reports/${deletingReport.id}`);
      void message.success('Lab report deleted successfully.');
      setDeletingReport(null);
      void loadPatientTestsAndReports(selectedPatient.id);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to delete report.'));
    } finally {
      setDeleting(false);
    }
  };

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── 1. Clean Light Header ── */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <FlaskConical size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Prescribed Lab Tests & Report Uploads
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Clinical Diagnostic Portal
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Enter a patient's name or mobile number to view lab investigations prescribed by the doctor and securely upload test reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Search Input */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 relative" ref={searchContainerRef}>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Search Patient (Name or Phone Number)
        </label>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="e.g. Enter patient name (e.g. Priya) or phone number (e.g. 9876543210)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {searchLoading && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-sky-600 border-t-transparent flex-shrink-0" />
          )}

          {selectedPatient && (
            <button
              type="button"
              onClick={handleClearPatient}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="Search a different patient"
            >
              <RefreshCw size={14} />
              <span>Change Patient</span>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-5 right-5 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
            <div className="p-2 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">
              Matching Patients ({searchResults.length})
            </div>
            {searchResults.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => handleSelectPatient(pt)}
                className="w-full text-left p-3 hover:bg-sky-50/80 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={pt.name || 'Patient'} size={36} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 group-hover:text-sky-700 truncate">
                      {pt.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {pt.phone && <span className="font-medium text-slate-700">📞 {pt.phone}</span>}
                      {pt.gender && <span>· {pt.gender}</span>}
                      {pt.bloodGroup && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-600 font-semibold border border-rose-100">
                          {pt.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 text-xs text-sky-600 font-medium group-hover:underline">
                  Select Patient →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Patient Banner */}
      {selectedPatient && (
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={selectedPatient.name || 'Patient'} size={52} />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {selectedPatient.name}
                </h2>
                {selectedPatient.gender && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-sky-100">
                    {selectedPatient.gender}
                  </span>
                )}
                {selectedPatient.bloodGroup && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/25 text-rose-200 border border-rose-400/30">
                    {selectedPatient.bloodGroup}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-sky-200 mt-1.5">
                {selectedPatient.phone && (
                  <span className="flex items-center gap-1">
                    <span>📞</span>
                    <strong className="text-white">{selectedPatient.phone}</strong>
                  </span>
                )}
                {selectedPatient.email && <span>✉️ {selectedPatient.email}</span>}
                {selectedPatient.dateOfBirth && <span>🎂 DOB: {selectedPatient.dateOfBirth}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-medium">
            <span className="text-sky-100">Prescribed Tests:</span>
            <strong className="text-white text-sm bg-white/20 px-2 py-0.5 rounded-lg">{requiredTests.length}</strong>
          </div>
        </div>
      )}

      {/* Prescribed Lab Tests Section */}
      {!selectedPatient ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <User size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Enter Patient Name or Phone Number
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Please search for a patient above to view the lab tests prescribed by their doctor and upload the test reports.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FlaskConical size={18} className="text-sky-600" />
              <h3 className="text-base font-bold text-slate-900">
                Doctor Prescribed Lab Tests
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                {requiredTests.length}
              </span>
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-sky-600 border-t-transparent" />
            </div>
          ) : requiredTests.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <FileCheck2 size={36} className="mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">
                No Prescribed Lab Tests Found
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No lab tests were prescribed by doctors for this patient.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[23%] min-w-[210px] whitespace-nowrap">
                      Prescribed Lab Test
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[18%] min-w-[180px] whitespace-nowrap">
                      Prescribed By
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[20%] min-w-[190px] whitespace-nowrap">
                      Instructions
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[14%] min-w-[140px] whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[25%] min-w-[230px] whitespace-nowrap">
                      Uploaded Report File
                    </th>
                    <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap w-[160px] min-w-[160px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requiredTests.map((t) => {
                    const isDone = t.status === 'Uploaded' || (t.reports && t.reports.length > 0);
                    const uploadedReport = t.reports && t.reports.length > 0 ? t.reports[0] : null;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Prescribed Lab Test */}
                        <td className="py-4.5 px-6 align-middle">
                          <div className="font-semibold text-slate-900 text-sm leading-snug">
                            {t.testName}
                          </div>
                          {t.prescriptionDate && (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                              <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                              <span>Prescription date: {t.prescriptionDate}</span>
                            </div>
                          )}
                        </td>

                        {/* Prescribed By */}
                        <td className="py-4.5 px-6 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2.5 text-slate-800 font-medium text-sm whitespace-nowrap">
                            <div className="w-7 h-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100">
                              <Stethoscope size={13} />
                            </div>
                            <span className="font-semibold text-slate-800 whitespace-nowrap">
                              {t.doctorName || 'Dr. Narendran'}
                            </span>
                          </div>
                          {t.doctorSpecialization && (
                            <div className="text-xs text-slate-400 pl-9.5 mt-0.5 whitespace-nowrap">
                              {t.doctorSpecialization}
                            </div>
                          )}
                        </td>

                        {/* Instructions */}
                        <td className="py-4.5 px-6 align-middle">
                          <div className="text-xs text-slate-600 leading-relaxed font-normal max-w-xs">
                            {t.instructions ? (
                              <span>{t.instructions}</span>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4.5 px-6 align-middle whitespace-nowrap">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                              <span>Report Uploaded</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={13} className="text-amber-600 flex-shrink-0" />
                              <span>Pending Report</span>
                            </span>
                          )}
                        </td>

                        {/* Uploaded Report Document Link */}
                        <td className="py-4.5 px-6 align-middle">
                          {uploadedReport ? (
                            <div className="flex items-center gap-2.5 max-w-[280px]">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100">
                                <Paperclip size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={uploadedReport.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-xs text-sky-700 hover:text-sky-900 hover:underline truncate max-w-[190px] inline-flex items-center gap-1"
                                  title={uploadedReport.fileName}
                                >
                                  <span className="truncate">{uploadedReport.fileName}</span>
                                  <ExternalLink size={12} className="flex-shrink-0 text-slate-400" />
                                </a>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                  <span>{formatFileSize(uploadedReport.fileSize)}</span>
                                  {uploadedReport.reportDate && <span>· {uploadedReport.reportDate}</span>}
                                </div>
                              </div>

                              {uploadedReport.uploadedBy === 'LAB' && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingReport(uploadedReport)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
                                  title="Delete uploaded report file"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Not yet uploaded
                            </span>
                          )}
                        </td>

                        {/* Action: Upload Report */}
                        <td className="py-4.5 px-6 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openUploadModal(t)}
                            className={cx(
                              'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs',
                              isDone
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 active:scale-[0.98]',
                            )}
                          >
                            <Upload size={14} />
                            <span>{isDone ? 'Re-upload Report' : 'Upload Report'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Lab Report Modal */}
      {isUploadModalOpen && activeTest && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Upload Report for {activeTest.testName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <strong className="text-slate-800">{selectedPatient.name}</strong>
                    {selectedPatient.phone && <span> ({selectedPatient.phone})</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setActiveTest(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Prescribed Test Info Badge */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Doctor Prescribed Test</div>
                  <div className="font-bold text-sm text-sky-950 mt-0.5">
                    {activeTest.testName}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Prescribed by</div>
                  <div className="font-semibold text-slate-800">{activeTest.doctorName || 'Dr. Narendran'}</div>
                </div>
              </div>

              {/* Report Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Report Date *
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  required
                />
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Report Document (PDF, PNG, JPG) *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="reportFileInput"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={20} className="text-sky-600 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatFileSize(selectedFile.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="reportFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center">
                        <Upload size={18} />
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                        Click to browse or drop report file here
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Supported: PDF, JPG, PNG (Max 15MB)
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Notes / Observations (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Fasting sample collected, normal range..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setActiveTest(null);
                  }}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-sm shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Delete Lab Report?</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete the report for{' '}
                <strong className="text-slate-700">"{deletingReport.testName}"</strong>? This will remove the file from storage.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReport(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
