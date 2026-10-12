import { App } from 'antd';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  createdAt: string;
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

export default function LabReportsPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Patient Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active Patient Details & Tests/Reports
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [requiredTests, setRequiredTests] = useState<RequiredTest[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Table Filter within reports
  const [reportSearch, setReportSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LAB' | 'PATIENT'>('ALL');

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTestMode, setUploadTestMode] = useState<'PRESCRIBED' | 'CUSTOM'>('PRESCRIBED');
  const [selectedPltId, setSelectedPltId] = useState<string>('');
  const [customTestName, setCustomTestName] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Delete Confirmation State
  const [deletingReport, setDeletingReport] = useState<LabReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  // User meta from localStorage
  const userJson = localStorage.getItem('labClientUser');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const currentUserId = currentUser?.id || currentUser?.userId || 'Current Lab User';

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`${label} copied to clipboard!`);
  };

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
        setReports(Array.isArray(res.data.reports) ? res.data.reports : []);
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
    setSearchQuery(patient.name || patient.id);
    setSearchParams({ patientId: patient.id });
    void loadPatientTestsAndReports(patient.id);
  };

  // Clear selected patient
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setRequiredTests([]);
    setReports([]);
    setSearchQuery('');
    setSearchParams({});
  };

  // Open Upload Modal with optional pre-selected test
  const openUploadModal = (prefillTest?: RequiredTest) => {
    if (!selectedPatient) {
      void message.warning('Please search and select a patient first.');
      return;
    }

    if (prefillTest) {
      setUploadTestMode('PRESCRIBED');
      setSelectedPltId(prefillTest.id);
      setCustomTestName(prefillTest.testName);
    } else {
      if (requiredTests.length > 0) {
        setUploadTestMode('PRESCRIBED');
        setSelectedPltId(requiredTests[0]?.id ?? '');
        setCustomTestName(requiredTests[0]?.testName ?? '');
      } else {
        setUploadTestMode('CUSTOM');
        setSelectedPltId('');
        setCustomTestName('');
      }
    }

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
    if (!selectedPatient) return;

    if (!selectedFile) {
      void message.error('Please select a report file to upload (PDF, PNG, JPG).');
      return;
    }

    let testName = '';
    let pltId: string | null = null;

    if (uploadTestMode === 'PRESCRIBED') {
      const match = requiredTests.find((t) => t.id === selectedPltId);
      if (!match) {
        void message.error('Please choose a prescribed test from the list.');
        return;
      }
      testName = match.testName;
      pltId = match.id;
    } else {
      if (!customTestName.trim()) {
        void message.error('Please enter the test name.');
        return;
      }
      testName = customTestName.trim();
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('testName', testName);
    if (pltId) {
      formData.append('prescriptionLabTestId', pltId);
    }
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

      void message.success(`Report for "${testName}" uploaded successfully!`);
      setIsUploadModalOpen(false);
      // Refresh patient data to reflect new status & report row
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

  // Filtered reports for table
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      // Role filter
      if (roleFilter !== 'ALL' && rep.uploadedBy !== roleFilter) {
        return false;
      }

      // Search term
      if (!reportSearch.trim()) return true;
      const term = reportSearch.toLowerCase();
      return (
        rep.testName.toLowerCase().includes(term) ||
        rep.fileName.toLowerCase().includes(term) ||
        (rep.notes && rep.notes.toLowerCase().includes(term)) ||
        rep.uploadedById.toLowerCase().includes(term) ||
        (rep.uploaderName && rep.uploaderName.toLowerCase().includes(term))
      );
    });
  }, [reports, reportSearch, roleFilter]);

  // Statistics counts
  const pendingCount = requiredTests.filter((t) => t.status === 'Pending').length;
  const completedCount = requiredTests.filter((t) => t.status === 'Uploaded').length;

  return (
    <div className="w-full p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Patient Lab Test Reports
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Look up patient prescriptions, identify required tests, upload diagnostic reports, and audit tracking roles.
              </p>
            </div>
          </div>
        </div>

        {selectedPatient && (
          <button
            type="button"
            onClick={() => openUploadModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-sm shadow-sky-600/20 active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <Upload size={16} />
            <span>Upload Test Report</span>
          </button>
        )}
      </div>

      {/* Patient Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 relative" ref={searchContainerRef}>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Patient Lookup
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
              placeholder="Search by Patient ID (UUID), phone number, or patient name..."
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
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              title="Clear patient selection"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
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
                className="w-full text-left p-3 hover:bg-sky-50/80 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={pt.name || 'Patient'} size={36} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 group-hover:text-sky-700 truncate">
                      {pt.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {pt.phone && <span>📞 {pt.phone}</span>}
                      {pt.gender && <span>· {pt.gender}</span>}
                      {pt.bloodGroup && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-600 font-semibold border border-rose-100">
                          {pt.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {pt.id.slice(0, 8)}...
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Patient Identity Card */}
      {selectedPatient ? (
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <Avatar name={selectedPatient.name || 'Patient'} size={56} />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    {selectedPatient.name}
                  </h2>
                  {selectedPatient.gender && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-sky-100 backdrop-blur-xs">
                      {selectedPatient.gender}
                    </span>
                  )}
                  {selectedPatient.bloodGroup && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/25 text-rose-200 border border-rose-400/30">
                      {selectedPatient.bloodGroup}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-sky-200 mt-2">
                  <span className="flex items-center gap-1 font-mono bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
                    ID: {selectedPatient.id}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedPatient.id, 'Patient ID')}
                      className="ml-1 text-sky-300 hover:text-white"
                      title="Copy Patient UUID"
                    >
                      <Copy size={12} />
                    </button>
                  </span>
                  {selectedPatient.phone && <span>📞 {selectedPatient.phone}</span>}
                  {selectedPatient.email && <span>✉️ {selectedPatient.email}</span>}
                  {selectedPatient.dateOfBirth && <span>🎂 DOB: {selectedPatient.dateOfBirth}</span>}
                </div>
              </div>
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-white/10">
                <div className="text-xl font-bold text-white">{requiredTests.length}</div>
                <div className="text-[11px] font-medium text-sky-200 uppercase tracking-wider">
                  Prescribed Tests
                </div>
              </div>

              <div className="bg-amber-500/20 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-amber-400/20">
                <div className="text-xl font-bold text-amber-300">{pendingCount}</div>
                <div className="text-[11px] font-medium text-amber-200 uppercase tracking-wider">
                  Pending Upload
                </div>
              </div>

              <div className="bg-emerald-500/20 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-emerald-400/20">
                <div className="text-xl font-bold text-emerald-300">{completedCount}</div>
                <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">
                  Fulfilled
                </div>
              </div>

              <div className="bg-indigo-500/20 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-indigo-400/20">
                <div className="text-xl font-bold text-indigo-300">{reports.length}</div>
                <div className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider">
                  Reports on File
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <User size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No Patient Selected
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Please search for a patient above using their Patient ID, Phone Number, or Name to review their required lab tests and upload diagnostic reports.
          </p>
        </div>
      )}

      {/* SECTION 1: Required / Prescribed Lab Tests (Requirement 1 & 2) */}
      {selectedPatient && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical size={18} className="text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Required / Prescribed Lab Tests
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  {requiredTests.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lab investigations prescribed by doctors for this patient that require collection and report uploads.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openUploadModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus size={14} />
              <span>Upload Custom / Ad-hoc Test</span>
            </button>
          </div>

          {loadingData ? (
            <div className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-sky-600 border-t-transparent" />
            </div>
          ) : requiredTests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <FileCheck2 size={32} className="mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">
                No Prescribed Lab Tests Found
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No active doctor prescriptions with lab tests were recorded for this patient. You can still upload ad-hoc lab reports using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 divide-y divide-slate-100">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Investigation / Test Name</th>
                    <th className="px-5 py-3.5">Prescribed By</th>
                    <th className="px-5 py-3.5">Clinical Instructions</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requiredTests.map((t) => {
                    const isDone = t.status === 'Uploaded';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 text-sm">
                            {t.testName}
                          </div>
                          {t.prescriptionDate && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={12} />
                              <span>Prescribed on {t.prescriptionDate}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                            <Stethoscope size={14} className="text-sky-600" />
                            <span>{t.doctorName || 'Dr. Narendran'}</span>
                          </div>
                          {t.doctorSpecialization && (
                            <div className="text-[11px] text-slate-400 ml-5">
                              {t.doctorSpecialization}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 max-w-xs">
                          {t.instructions ? (
                            <span>{t.instructions}</span>
                          ) : (
                            <span className="text-slate-400 italic">Standard procedure</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Uploaded ({t.reportsCount})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={13} className="text-amber-600" />
                              <span>Pending Report</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openUploadModal(t)}
                            className={cx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs',
                              isDone
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20',
                            )}
                          >
                            <Upload size={13} />
                            <span>{isDone ? 'Upload More' : 'Upload Report'}</span>
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

      {/* SECTION 2: Lab Test Reports Table (Requirement 3, 4, 5) */}
      {selectedPatient && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Lab Test Reports
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {reports.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete record of diagnostic reports uploaded for this patient with uploader identity tracking.
              </p>
            </div>

            {/* Filter and Search Bar for Reports */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Role Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className={cx(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors',
                    roleFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  All ({reports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('LAB')}
                  className={cx(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors',
                    roleFilter === 'LAB'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  🧪 Lab Assistant ({reports.filter((r) => r.uploadedBy === 'LAB').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('PATIENT')}
                  className={cx(
                    'px-2.5 py-1 rounded-lg font-medium transition-colors',
                    roleFilter === 'PATIENT'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  👤 Patient ({reports.filter((r) => r.uploadedBy === 'PATIENT').length})
                </button>
              </div>

              {/* Keyword Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Filter reports..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-44"
                />
              </div>
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-3">
              <FileSpreadsheet size={36} className="mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">
                {reports.length === 0
                  ? 'No Reports Uploaded for this Patient Yet'
                  : 'No reports match the current filter'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {reports.length === 0
                  ? 'Use the "Upload Report" button to add patient diagnostic reports.'
                  : 'Try changing the role filter or search term to see other reports.'}
              </p>
              {reports.length === 0 && (
                <button
                  type="button"
                  onClick={() => openUploadModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow-xs hover:bg-sky-500"
                >
                  <Upload size={14} />
                  <span>Upload First Report</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 divide-y divide-slate-100">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Test Name</th>
                    <th className="px-5 py-3.5">Report File</th>
                    <th className="px-5 py-3.5">Report Date</th>
                    {/* Requirement 4 & 5: Uploaded By Role */}
                    <th className="px-5 py-3.5">Uploaded By (Role)</th>
                    {/* Requirement 5: Uploaded By ID */}
                    <th className="px-5 py-3.5">Uploaded By ID</th>
                    <th className="px-5 py-3.5">Uploaded On</th>
                    <th className="px-5 py-3.5">Notes</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((rep) => {
                    const isLabUploader = rep.uploadedBy === 'LAB';
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Test Name */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 text-sm">
                            {rep.testName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {rep.prescriptionLabTestId ? (
                              <span className="text-sky-600 font-medium">Doctor Prescribed</span>
                            ) : (
                              <span className="text-slate-500">Direct / External</span>
                            )}
                          </div>
                        </td>

                        {/* File details */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                              <Paperclip size={14} />
                            </div>
                            <div className="min-w-0">
                              <a
                                href={rep.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-xs text-sky-600 hover:text-sky-800 hover:underline truncate max-w-[180px] inline-block"
                                title={rep.fileName}
                              >
                                {rep.fileName}
                              </a>
                              <div className="text-[11px] text-slate-400">
                                {formatFileSize(rep.fileSize)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Report Date */}
                        <td className="px-5 py-4 text-xs text-slate-700 whitespace-nowrap">
                          {rep.reportDate || '—'}
                        </td>

                        {/* REQUIREMENT 4 & 5: Uploaded By (Role) */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isLabUploader ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                🧪 LAB (Lab Assistant)
                              </span>
                              {rep.uploaderName && (
                                <div className="text-[11px] text-slate-500 mt-0.5 ml-3 font-medium">
                                  {rep.uploaderName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                👤 PATIENT
                              </span>
                              {rep.uploaderName && (
                                <div className="text-[11px] text-slate-500 mt-0.5 ml-3 font-medium">
                                  {rep.uploaderName}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* REQUIREMENT 5: Uploaded By ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              title={rep.uploadedById}
                            >
                              {rep.uploadedById.slice(0, 8)}...{rep.uploadedById.slice(-4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rep.uploadedById, 'Uploaded By ID')}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title={`Copy full ID: ${rep.uploadedById}`}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Uploaded On */}
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Notes */}
                        <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate">
                          {rep.notes || '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={rep.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors inline-block"
                              title="View / Download Report Document"
                            >
                              <Eye size={15} />
                            </a>

                            {isLabUploader && (
                              <button
                                type="button"
                                onClick={() => setDeletingReport(rep)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Lab-Uploaded Report"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
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
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Upload Lab Test Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <strong className="text-slate-800">{selectedPatient?.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Test Selection Mode */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Select Investigation / Test *
                </label>

                {requiredTests.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadTestMode('PRESCRIBED');
                        if (requiredTests[0]) {
                          setSelectedPltId(requiredTests[0].id);
                          setCustomTestName(requiredTests[0].testName);
                        }
                      }}
                      className={cx(
                        'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                        uploadTestMode === 'PRESCRIBED'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      Prescribed Test ({requiredTests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadTestMode('CUSTOM');
                        setSelectedPltId('');
                        setCustomTestName('');
                      }}
                      className={cx(
                        'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                        uploadTestMode === 'CUSTOM'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      Custom / Other Test
                    </button>
                  </div>
                )}

                {uploadTestMode === 'PRESCRIBED' && requiredTests.length > 0 ? (
                  <select
                    value={selectedPltId}
                    onChange={(e) => {
                      setSelectedPltId(e.target.value);
                      const t = requiredTests.find((x) => x.id === e.target.value);
                      if (t) setCustomTestName(t.testName);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  >
                    {requiredTests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.testName} {t.status === 'Uploaded' ? '(Already Uploaded)' : '(Pending)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customTestName}
                    onChange={(e) => setCustomTestName(e.target.value)}
                    placeholder="e.g. Complete Blood Count (CBC), Lipid Profile..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                    required
                  />
                )}
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
                        className="p-1 text-slate-400 hover:text-rose-600"
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
                        Click to browse or drop file here
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Supported: PDF, JPG, JPEG, PNG (Max 15MB)
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Clinical Notes / Observations (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Specimen fasting blood, normal reference ranges observed..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                />
              </div>

              {/* Audit attribution info banner */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-sky-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <UserCheck size={14} className="text-sky-600" />
                  <span>Audit Attribution Tracking:</span>
                </div>
                <div className="text-[11px] text-sky-700">
                  This report will be tagged with role <strong>LAB</strong> and your uploader account ID:
                  <span className="font-mono bg-white/70 px-1.5 py-0.5 rounded ml-1 text-sky-900 font-semibold border border-sky-200">
                    {currentUserId}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-sm shadow-sky-600/20 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Uploading Report...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Confirm & Upload</span>
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
                <strong className="text-slate-700">"{deletingReport.testName}"</strong>? This will permanently remove the file from storage.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReport(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
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
