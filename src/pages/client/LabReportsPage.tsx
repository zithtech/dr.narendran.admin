import { App } from 'antd';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Mail,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Avatar, Badge, cx } from '../../components/ui/primitives';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import { getAuthenticatedFileUrl } from '../../utils/fileUrl';

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

interface TestsAndReportsResponse {
  patient?: PatientSummary | null;
  requiredTests?: RequiredTest[];
}

interface StoredLabUserRef {
  id?: string;
  username?: string;
}

interface StoredLabRef {
  id?: string;
}

const MAX_RECENT_PATIENTS = 10;

function getRecentStorageKey(): string {
  try {
    const userStr = localStorage.getItem('labClientUser');
    if (userStr) {
      const user = JSON.parse(userStr) as StoredLabUserRef;
      if (typeof user?.id === 'string' && user.id) return `lab_recent_patients_user_${user.id}`;
      if (typeof user?.username === 'string' && user.username) return `lab_recent_patients_user_${user.username}`;
    }
    const labStr = localStorage.getItem('labClientLab');
    if (labStr) {
      const lab = JSON.parse(labStr) as StoredLabRef;
      if (typeof lab?.id === 'string' && lab.id) return `lab_recent_patients_lab_${lab.id}`;
    }
  } catch {
    // fallback
  }
  return 'lab_recent_patients_default';
}

function loadRecentPatientsFromStorage(): PatientSummary[] {
  try {
    const key = getRecentStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p): p is PatientSummary =>
          typeof p === 'object' &&
          p !== null &&
          'id' in p &&
          typeof (p as { id: unknown }).id === 'string' &&
          'name' in p &&
          typeof (p as { name: unknown }).name === 'string',
      );
    }
  } catch {
    return [];
  }
  return [];
}

function saveRecentPatientsToStorage(patients: PatientSummary[]): void {
  try {
    const key = getRecentStorageKey();
    localStorage.setItem(key, JSON.stringify(patients.slice(0, MAX_RECENT_PATIENTS)));
  } catch {
    // ignore storage quota errors safely
  }
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

  // View Modal State
  const [viewingTest, setViewingTest] = useState<RequiredTest | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<RequiredTest | null>(null);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Delete Confirmation State
  const [deletingReport, setDeletingReport] = useState<LabReport | null>(null);

  // Recently Searched Patients State
  const [recentPatients, setRecentPatients] = useState<PatientSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Load recent patients on mount
  useEffect(() => {
    try {
      const stored = loadRecentPatientsFromStorage();
      setRecentPatients(stored);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  // Record a patient in the recent searches list
  const recordRecentPatient = useCallback((patient: PatientSummary) => {
    setRecentPatients((prev) => {
      const filtered = prev.filter((p) => p.id !== patient.id);
      const updated = [patient, ...filtered].slice(0, MAX_RECENT_PATIENTS);
      saveRecentPatientsToStorage(updated);
      return updated;
    });
  }, []);

  const handleClearRecentPatients = () => {
    try {
      const key = getRecentStorageKey();
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setRecentPatients([]);
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
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          setSearchLoading(true);
          const res = await api.get<PatientSummary[]>('lab-portal/patients/search', {
            params: { query: trimmed },
          });
          setSearchResults(Array.isArray(res.data) ? res.data : []);
          setShowDropdown(true);
        } catch (err: unknown) {
          console.error('Patient search error:', err);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load patient data when selected
  const loadPatientTestsAndReports = useCallback(async (patientId: string) => {
    try {
      setLoadingData(true);
      const res = await api.get<TestsAndReportsResponse>(`lab-portal/patients/${patientId}/tests-and-reports`);
      if (res.data) {
        setSelectedPatient(res.data.patient ?? null);
        if (res.data.patient) {
          recordRecentPatient(res.data.patient);
        }
        setRequiredTests(Array.isArray(res.data.requiredTests) ? res.data.requiredTests : []);
      }
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to fetch patient records.'));
    } finally {
      setLoadingData(false);
    }
  }, [message, recordRecentPatient]);

  // Deep-link loading via ?patientId=...
  useEffect(() => {
    const paramId = searchParams.get('patientId');
    if (paramId && selectedPatient?.id !== paramId) {
      const timer = setTimeout(() => {
        void loadPatientTestsAndReports(paramId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, selectedPatient?.id, loadPatientTestsAndReports]);

  // Handle select patient
  const handleSelectPatient = (patient: PatientSummary) => {
    recordRecentPatient(patient);
    setSelectedPatient(patient);
    setShowDropdown(false);
    setSearchQuery(patient.name || (patient.phone ?? patient.id));
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
    if (e.target.files?.[0]) {
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

    try {
      await api.delete(`lab-portal/reports/${deletingReport.id}`);
      void message.success('Lab report deleted successfully.');
      setDeletingReport(null);
      void loadPatientTestsAndReports(selectedPatient.id);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to delete report.'));
    }
  };

  // Format file size helper
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header (Matching HMS Admin Medical Records Pattern) ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Prescribed Lab Tests & Report Uploads
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Clinical Diagnostic Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Search a patient to view prescribed lab investigations and securely upload diagnostic reports.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            onClick={() => {
              if (selectedPatient) {
                void loadPatientTestsAndReports(selectedPatient.id);
              }
            }}
            disabled={loadingData}
            title="Refresh records"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ── Patient Search Toolbar (Matching Admin Filter Bar Design) ── */}
      <div
        className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-3 sm:p-3.5 relative"
        ref={searchContainerRef}
      >
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim()) {
                  setSearchResults([]);
                  setShowDropdown(false);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search patient by name, phone, UHID, or prescribed test name..."
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {searchLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent shrink-0" />
          )}

          {selectedPatient && (
            <button
              type="button"
              onClick={handleClearPatient}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Search a different patient"
            >
              <RefreshCw size={12} />
              <span>Change Patient</span>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 sm:left-3.5 sm:right-3.5 top-full mt-1.5 bg-white rounded-lg border border-slate-200 shadow-lg z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
            <div className="px-3 py-1.5 text-[10.5px] font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">
              Matching Patients ({searchResults.length})
            </div>
            {searchResults.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => handleSelectPatient(pt)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={pt.name || 'Patient'} size={32} />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                      {pt.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
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
                <div className="text-right shrink-0 text-xs text-blue-600 font-medium group-hover:underline">
                  Select Patient →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Patients Section ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock size={13} className="text-slate-500 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">Recent</h3>
            {recentPatients.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded-full border border-slate-200/70">
                {recentPatients.length}
              </span>
            )}
          </div>
          {recentPatients.length > 0 && (
            <button
              type="button"
              onClick={handleClearRecentPatients}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Clear recently searched patients"
            >
              <Trash2 size={11} />
              <span>Clear Recent</span>
            </button>
          )}
        </div>

        {recentLoading ? (
          <div className="py-2 flex items-center gap-2 text-xs text-slate-400">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent shrink-0" />
            <span>Loading recent searches...</span>
          </div>
        ) : recentPatients.length === 0 ? (
          <div className="py-1.5 flex items-center gap-2 text-xs text-slate-400">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>No recently searched patients</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {recentPatients.map((pt) => {
              const isSelected = selectedPatient?.id === pt.id;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => handleSelectPatient(pt)}
                  className={cx(
                    'text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2 min-w-0 group',
                    isSelected
                      ? 'border-blue-400 bg-blue-50/70 shadow-2xs ring-1 ring-blue-300'
                      : 'border-slate-200/90 bg-slate-50/40 hover:bg-blue-50/40 hover:border-blue-200',
                  )}
                  title={`View tests and reports for ${pt.name}`}
                >
                  <Avatar name={pt.name || 'Patient'} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                      {pt.name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1">
                      {pt.phone ? (
                        <span>{pt.phone}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">ID: {pt.id.slice(0, 8)}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected Patient Dossier Header (Matching PatientDossierView Design) ── */}
      {selectedPatient && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar name={selectedPatient.name || 'Patient'} size={48} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {selectedPatient.name}
                </h2>
                {selectedPatient.gender && (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {selectedPatient.gender}
                  </span>
                )}
                {selectedPatient.bloodGroup && (
                  <Badge tone="red">{selectedPatient.bloodGroup}</Badge>
                )}
              </div>

              <div className="mt-1 flex items-center gap-3.5 text-xs text-slate-500 flex-wrap">
                {selectedPatient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" />
                    <span>{selectedPatient.phone}</span>
                  </span>
                )}
                {selectedPatient.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    <span>{selectedPatient.email}</span>
                  </span>
                )}
                {selectedPatient.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>DOB: {selectedPatient.dateOfBirth}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <FlaskConical size={13} className="text-blue-600" />
              <span>Prescribed Tests:</span>
              <strong className="text-slate-900 font-bold ml-0.5">{requiredTests.length}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Prescribed Lab Tests Section ── */}
      {!selectedPatient ? (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-12 text-center space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <User size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            Search Patient by Name or Phone Number
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the search box above to select a patient. You will be able to review tests prescribed by their doctor and upload diagnostic reports.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical size={15} className="text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Doctor Prescribed Lab Tests
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {requiredTests.length}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              {requiredTests.filter((t) => t.status === 'Uploaded' || (t.reports && t.reports.length > 0)).length} of {requiredTests.length} Uploaded
            </div>
          </div>

          {loadingData ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
              <span className="text-xs text-slate-500">Loading prescribed tests...</span>
            </div>
          ) : requiredTests.length === 0 ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                  <CheckCircle2 size={22} />
                </div>
                <strong className="text-xs font-semibold text-slate-700">
                  No Prescribed Lab Tests Found
                </strong>
                <span className="text-[11px] text-slate-500 max-w-sm">
                  No lab tests were prescribed by doctors for this patient.
                </span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[220px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                    <th className="px-3.5 py-2 whitespace-nowrap">Prescribed Lab Test</th>
                    <th className="px-3.5 py-2 whitespace-nowrap w-48">Prescribing Doctor</th>
                    <th className="px-3.5 py-2 w-56">Instructions</th>
                    <th className="px-3.5 py-2 text-center whitespace-nowrap w-36">Status</th>
                    <th className="px-3.5 py-2 whitespace-nowrap w-64">Uploaded Report File</th>
                    <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {requiredTests.map((t) => {
                    const isDone = t.status === 'Uploaded' || (t.reports && t.reports.length > 0);
                    const uploadedReport = t.reports && t.reports.length > 0 ? t.reports[0] : null;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Prescribed Lab Test */}
                        <td className="px-3.5 py-2.5 align-middle">
                          <div className="font-semibold text-slate-900 text-xs leading-snug">
                            {t.testName}
                          </div>
                          {t.prescriptionDate && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                              <Calendar size={11} className="text-slate-400 shrink-0" />
                              <span>Prescription date: {t.prescriptionDate}</span>
                            </div>
                          )}
                        </td>

                        {/* Prescribing Doctor */}
                        <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                            <Stethoscope size={12} className="text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {t.doctorName ?? 'Dr. Narendran'}
                            </span>
                          </div>
                          {t.doctorSpecialization && (
                            <div className="text-[11px] text-slate-400 pl-4.5 mt-0.5">
                              {t.doctorSpecialization}
                            </div>
                          )}
                        </td>

                        {/* Instructions */}
                        <td className="px-3.5 py-2.5 align-middle">
                          <div className="text-[11px] text-slate-600 leading-relaxed max-w-xs">
                            {t.instructions ? (
                              <span>{t.instructions}</span>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 align-middle text-center whitespace-nowrap">
                          {isDone ? (
                            <Badge tone="green">
                              <CheckCircle2 size={11} className="mr-1 inline" />
                              <span>Report Uploaded</span>
                            </Badge>
                          ) : (
                            <Badge tone="amber">
                              <Clock size={11} className="mr-1 inline" />
                              <span>Pending Upload</span>
                            </Badge>
                          )}
                        </td>

                        {/* Uploaded Report Document Link */}
                        <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                          {uploadedReport ? (
                            <div className="flex items-center gap-2 max-w-xs">
                              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Paperclip size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={getAuthenticatedFileUrl(uploadedReport.documentUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[170px] inline-flex items-center gap-1"
                                  title={uploadedReport.fileName}
                                >
                                  <span className="truncate">{uploadedReport.fileName}</span>
                                  <ExternalLink size={11} className="shrink-0 text-slate-400" />
                                </a>
                                <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{formatFileSize(uploadedReport.fileSize)}</span>
                                  {uploadedReport.reportDate && <span>· {uploadedReport.reportDate}</span>}
                                </div>
                              </div>

                              {uploadedReport.uploadedBy === 'LAB' && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingReport(uploadedReport)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                  title="Delete uploaded report file"
                                  aria-label="Delete report"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Not yet uploaded
                            </span>
                          )}
                        </td>

                        {/* Action: View & Upload Report */}
                        <td className="px-3.5 py-2.5 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setViewingTest(t)}
                              className="inline-flex items-center gap-1 h-6.5 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="View Investigation Details"
                              aria-label="View Investigation Details"
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openUploadModal(t)}
                              className={cx(
                                'inline-flex items-center gap-1 h-6.5 px-2.5 rounded-md text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer',
                                isDone
                                  ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white',
                              )}
                            >
                              <Upload size={11} />
                              <span>{isDone ? 'Re-upload' : 'Upload Report'}</span>
                            </button>
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

      {/* ── Upload Lab Report Modal ── */}
      <Modal
        open={isUploadModalOpen && Boolean(activeTest) && Boolean(selectedPatient)}
        onClose={() => {
          if (!uploading) {
            setIsUploadModalOpen(false);
            setActiveTest(null);
          }
        }}
        title={activeTest ? `Upload Report: ${activeTest.testName}` : 'Upload Lab Report'}
        description={
          selectedPatient ? (
            <span>
              Patient: <strong className="text-slate-800 font-semibold">{selectedPatient.name}</strong>
              {selectedPatient.phone ? ` (${selectedPatient.phone})` : ''}
            </span>
          ) : undefined
        }
        size="md"
      >
        <form
          onSubmit={(e) => {
            void handleUploadSubmit(e);
          }}
          className="p-4 sm:p-5 space-y-3.5"
        >
          {/* Prescribed Test Info Badge */}
          {activeTest && (
            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Doctor Prescribed Test</span>
                <div className="font-bold text-xs text-blue-950 mt-0.5">
                  {activeTest.testName}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>Prescribed by</div>
                <div className="font-semibold text-slate-800">{activeTest.doctorName ?? 'Dr. Narendran'}</div>
              </div>
            </div>
          )}

          {/* Report Date */}
          <div>
            <label htmlFor="reportDateInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Report Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="reportDateInput"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              required
            />
          </div>

          {/* File Upload Zone */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Report Document (PDF, PNG, JPG) <span className="text-rose-500">*</span>
            </span>
            <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-4 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="reportFileInput"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={18} className="text-blue-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="reportFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-1"
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Upload size={15} />
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Click to browse or drop report file here
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Supported: PDF, JPG, PNG (Max 15MB)
                  </p>
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="reportNotesInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Observations (Optional)
            </label>
            <textarea
              id="reportNotesInput"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Fasting sample collected, normal range..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsUploadModalOpen(false);
                setActiveTest(null);
              }}
              disabled={uploading}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Upload Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Prescribed Investigation Details Drawer ── */}
      <Modal
        variant="drawer"
        size="xl"
        open={Boolean(viewingTest)}
        onClose={() => setViewingTest(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FlaskConical size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {viewingTest?.testName ?? 'Investigation Details'}
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                Prescribed laboratory test order details
              </div>
            </div>
          </div>
        }
      >
        {viewingTest && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Status Banner */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Report Status</span>
                <span className="text-sm font-bold text-slate-900">
                  {viewingTest.status === 'Uploaded' || (viewingTest.reports && viewingTest.reports.length > 0)
                    ? 'Report Uploaded'
                    : 'Pending Lab Upload'}
                </span>
              </div>
              <Badge
                tone={
                  viewingTest.status === 'Uploaded' || (viewingTest.reports && viewingTest.reports.length > 0)
                    ? 'green'
                    : 'amber'
                }
              >
                {viewingTest.status === 'Uploaded' || (viewingTest.reports && viewingTest.reports.length > 0) ? (
                  <>
                    <CheckCircle2 size={11} className="mr-1 inline" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Clock size={11} className="mr-1 inline" />
                    <span>Pending</span>
                  </>
                )}
              </Badge>
            </div>

            {/* Patient Info Card */}
            {selectedPatient && (
              <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
                <span className="text-[11px] text-slate-400 block mb-2 font-medium uppercase tracking-wider">
                  Patient Information
                </span>
                <div className="flex items-start gap-3">
                  <Avatar name={selectedPatient.name} size={40} />
                  <div className="space-y-1 flex-1">
                    <div className="font-semibold text-slate-900 text-xs">
                      {selectedPatient.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {selectedPatient.gender && <span>{selectedPatient.gender}</span>}
                      {selectedPatient.dateOfBirth && <span>DOB: {selectedPatient.dateOfBirth}</span>}
                      {selectedPatient.bloodGroup && (
                        <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 font-bold rounded text-[10px]">
                          {selectedPatient.bloodGroup}
                        </span>
                      )}
                      {selectedPatient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} className="text-slate-400" />
                          {selectedPatient.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prescription & Doctor Specifications */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Prescribing Doctor</span>
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <Stethoscope size={12} className="text-blue-600 shrink-0" />
                  <span>{viewingTest.doctorName ?? 'Dr. Narendran'}</span>
                </div>
                {viewingTest.doctorSpecialization && (
                  <span className="text-[10.5px] text-slate-500 block mt-0.5">
                    {viewingTest.doctorSpecialization}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Prescription Date</span>
                <div className="flex items-center gap-1 font-medium text-slate-800">
                  <Calendar size={12} className="text-slate-400 shrink-0" />
                  <span>{viewingTest.prescriptionDate ?? '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Order / Test ID</span>
                <span className="font-mono text-slate-600 text-[11px]">{viewingTest.id}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Prescription ID</span>
                <span className="font-mono text-slate-600 text-[11px]">{viewingTest.prescriptionId}</span>
              </div>
            </div>

            {/* Doctor Instructions */}
            <div className="p-3 rounded-lg border border-slate-100 bg-white">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Doctor's Clinical Instructions</span>
              <p className="text-slate-700 leading-relaxed">
                {viewingTest.instructions ?? <span className="text-slate-400 italic">No special instructions provided by the prescribing doctor.</span>}
              </p>
            </div>

            {/* Uploaded Files Section */}
            <div className="p-3 rounded-lg border border-slate-100 bg-white">
              <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                Uploaded Diagnostic Reports ({viewingTest.reports?.length ?? 0})
              </span>
              {viewingTest.reports && viewingTest.reports.length > 0 ? (
                <div className="space-y-2">
                  {viewingTest.reports.map((rpt) => (
                    <div
                      key={rpt.id}
                      className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Paperclip size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={getAuthenticatedFileUrl(rpt.documentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                            title={rpt.fileName}
                          >
                            {rpt.fileName}
                          </a>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{formatFileSize(rpt.fileSize)}</span>
                            {rpt.reportDate && <span>· Date: {rpt.reportDate}</span>}
                            <span>· By: {rpt.uploadedBy}</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={getAuthenticatedFileUrl(rpt.documentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Open report in new tab"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic py-1">
                  No report files have been uploaded yet for this investigation.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingTest(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = viewingTest;
                  setViewingTest(null);
                  openUploadModal(t);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Upload size={12} />
                <span>
                  {viewingTest.status === 'Uploaded' || (viewingTest.reports && viewingTest.reports.length > 0)
                    ? 'Re-upload Report'
                    : 'Upload Report'}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingReport)}
        title="Delete Lab Report"
        message={
          <span>
            Are you sure you want to delete the report for{' '}
            <strong className="text-slate-800 font-semibold">"{deletingReport?.testName}"</strong>? This will permanently remove the file from storage.
          </span>
        }
        confirmLabel="Delete Report"
        onConfirm={handleDeleteReport}
        onClose={() => setDeletingReport(null)}
      />
    </div>
  );
}
