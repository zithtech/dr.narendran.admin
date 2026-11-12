import { App, Modal as AntdModal, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  GitBranch,
  Loader2,
  Mail,
  MapPin,
  Moon,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Sun,
  Sunset,
  Trash2,
  UploadCloud,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_WORK_DAYS,
  SHIFT_TIMINGS,
  STAFF_ROLES,
  WORK_DAY_OPTIONS,
  WORK_DAY_PRESETS,
  type StaffMember,
  type StaffStatus,
} from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Branch } from './BranchModal';
import type { Hospital } from './HospitalModal';
import { Modal } from './ui/Modal';
import { Alert } from './ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onSave: () => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export interface StagedDocument {
  id: string;
  file: File;
  name: string;
  documentType: string;
}

function getDocumentTypeLabel(type: string): string {
  switch (type) {
    case 'ID_PROOF':
      return 'Government ID Proof';
    case 'CERTIFICATION':
      return 'Degree / Certification';
    case 'RESUME':
      return 'Resume / CV';
    case 'CONTRACT':
      return 'Employment Contract';
    case 'OTHER':
    default:
      return 'Other Verification Document';
  }
}

const DOCUMENT_TYPE_OPTIONS: SearchableSelectOption[] = [
  { value: 'ID_PROOF', label: 'Government ID Proof', badge: 'ID' },
  { value: 'CERTIFICATION', label: 'Degree / Council Certification', badge: 'Cert' },
  { value: 'RESUME', label: 'Resume / CV', badge: 'CV' },
  { value: 'CONTRACT', label: 'Employment Contract', badge: 'Contract' },
  { value: 'OTHER', label: 'Other Verification Document', badge: 'Other' },
];

export const CUSTOM_SHIFT_PRESETS = [
  { label: '06:00 AM - 02:00 PM', desc: 'Early Morning (8 hrs)' },
  { label: '08:00 AM - 04:00 PM', desc: 'General Shift (8 hrs)' },
  { label: '09:00 AM - 05:00 PM', desc: 'Standard Day (8 hrs)' },
  { label: '10:00 AM - 06:00 PM', desc: 'Mid Day (8 hrs)' },
  { label: '02:00 PM - 10:00 PM', desc: 'Evening Shift (8 hrs)' },
  { label: '08:00 PM - 08:00 AM', desc: '12-Hour Night Shift' },
  { label: '10:00 PM - 06:00 AM', desc: 'Night Roster (8 hrs)' },
] as const;

export function parseTimePart(str?: string | null): Dayjs | null {
  if (!str) return null;
  const s = str.trim();
  const formats = ['hh:mm A', 'h:mm A', 'hh:mm a', 'h:mm a', 'HH:mm', 'H:mm'];
  for (const f of formats) {
    const d = dayjs(s, f);
    if (d.isValid()) return d;
  }
  return null;
}

export function parseShiftRange(val?: string | null): [Dayjs | null, Dayjs | null] {
  if (!val || !val.includes('-')) return [null, null];
  const parts = val.split('-');
  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts.slice(1).join('-'));
  return [start, end];
}

export function getShiftDuration(val?: string | null): string | null {
  if (!val || !val.includes('-')) return null;
  const [start, end] = parseShiftRange(val);
  if (!start || !end) return null;
  const startMins = start.hour() * 60 + start.minute();
  const endMins = end.hour() * 60 + end.minute();
  let diff = endMins - startMins;
  if (diff <= 0) diff += 24 * 60; // Overnight
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
}

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface FormErrors {
  name?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  joiningDate?: string | undefined;
  address?: string | undefined;
  customRole?: string | undefined;
  customShiftDetails?: string | undefined;
  documentTitle?: string | undefined;
  documentFile?: string | undefined;
}

export function validateStaffName(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Staff full name is required.';
  }
  if (trimmed.length < 2) {
    return 'Staff name must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Staff name cannot exceed 100 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in staff name.';
  }
  if (/[^a-zA-Z\s]/.test(val)) {
    return 'Special characters are not allowed in staff name.';
  }
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return 'Staff name can only contain alphabetic letters and spaces.';
  }
  return undefined;
}

export function validateStaffPhone(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Phone number is required.';
  }
  if (/[a-zA-Z]/.test(val)) {
    return 'Letters are not allowed in phone number.';
  }
  if (/[^0-9+\s-]/.test(val)) {
    return 'Special characters are not allowed in phone number.';
  }
  const digits = val.replace(/\D/g, '');
  if (digits.length < 10) {
    return 'Phone number must contain at least 10 digits.';
  }
  if (digits.length > 15) {
    return 'Phone number cannot exceed 15 digits.';
  }
  return undefined;
}

export function validateStaffEmail(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined; // Optional
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Please enter a valid email address (e.g. staff@hospital.com).';
  }
  if (trimmed.length > 150) {
    return 'Email address cannot exceed 150 characters.';
  }
  return undefined;
}

export function validateJoiningDate(val: string): string | undefined {
  if (!val) {
    return 'Date of joining is required.';
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return 'Please select a valid date.';
  }
  const year = d.getFullYear();
  if (year < 1970 || year > 2099) {
    return 'Please enter a valid year between 1970 and 2099.';
  }
  return undefined;
}

export function validateAddress(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined; // Optional
  if (trimmed.length < 5) {
    return 'Address must be at least 5 characters if provided.';
  }
  if (trimmed.length > 500) {
    return 'Address cannot exceed 500 characters.';
  }
  return undefined;
}

export function validateCustomRole(isCustom: boolean, val: string): string | undefined {
  if (!isCustom) return undefined;
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Custom role title is required.';
  }
  if (trimmed.length < 2) {
    return 'Role title must be at least 2 characters.';
  }
  if (trimmed.length > 60) {
    return 'Role title cannot exceed 60 characters.';
  }
  if (/[0-9]/.test(val)) {
    return 'Numbers are not allowed in role title.';
  }
  if (/[^a-zA-Z\s-]/.test(val)) {
    return 'Special characters are not allowed in role title.';
  }
  return undefined;
}

export function validateCustomShift(shift: string, details: string): string | undefined {
  if (shift !== 'Custom Shift') return undefined;
  const trimmed = details.trim();
  if (!trimmed) {
    return 'Custom shift working hours are required (e.g. 06:00 AM - 02:00 PM).';
  }
  if (trimmed.length < 4) {
    return 'Custom shift details must be at least 4 characters.';
  }
  if (trimmed.length > 100) {
    return 'Custom shift details cannot exceed 100 characters.';
  }
  if (/[^a-zA-Z0-9\s:(),./&-]/i.test(trimmed)) {
    return 'Custom shift details can only contain letters, numbers, spaces, and time punctuation (e.g. 08:00 AM - 04:00 PM).';
  }
  return undefined;
}

export function validateDocumentTitle(val: string): string | undefined {
  const trimmed = val.trim();
  if (!trimmed) {
    return 'Document title is required.';
  }
  if (trimmed.length < 2) {
    return 'Document title must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Document title cannot exceed 100 characters.';
  }
  if (/[^a-zA-Z0-9\s._()&/ -]/i.test(trimmed)) {
    return 'Document title can only contain letters, numbers, spaces, and standard punctuation (._-()&).';
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return 'Document title must contain at least one letter (e.g. ID Card, Nursing Degree).';
  }
  return undefined;
}

export function validateDocumentFile(file: File): string | undefined {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return `Unsupported file format (${ext}). Supported formats: PDF, PNG, JPG, JPEG, DOC, DOCX.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds maximum allowed size of 20MB (${formatFileSize(file.size)}).`;
  }
  return undefined;
}

export default function StaffModal({ isOpen, onClose, staff, onSave }: StaffModalProps) {
  const { message } = App.useApp();

  // Basic Information
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Role & Hospital Assignment
  const [role, setRole] = useState<string>('Senior Nurse');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // Shift & Status
  const [shiftTiming, setShiftTiming] = useState<string>('Morning');
  const [customShiftDetails, setCustomShiftDetails] = useState('');
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [modalStartTime, setModalStartTime] = useState<Dayjs | null>(null);
  const [modalEndTime, setModalEndTime] = useState<Dayjs | null>(null);
  const [workDays, setWorkDays] = useState<string[]>(DEFAULT_WORK_DAYS);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [status, setStatus] = useState<StaffStatus>('ACTIVE');
  const [notes, setNotes] = useState('');

  // Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('ID_PROOF');
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation and error state
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Async data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch hospitals and branches
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [hRes, bRes] = await Promise.all([
            api.get('hospitals'),
            api.get('branches'),
          ]);
          setHospitals(Array.isArray(hRes.data) ? hRes.data : (hRes.data as any)?.data || []);
          setBranches(Array.isArray(bRes.data) ? bRes.data : (bRes.data as any)?.data || []);
        } catch (err) {
          console.error('Failed to fetch hospitals/branches for staff modal', err);
        }
      };
      void fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setPhone(staff.phone);
      setEmail(staff.email || '');
      setAddress(staff.address || '');

      const isStandardRole = STAFF_ROLES.includes(staff.role as any);
      if (isStandardRole) {
        setRole(staff.role);
        setIsCustomRole(false);
        setCustomRole('');
      } else {
        setRole('Other');
        setIsCustomRole(true);
        setCustomRole(staff.role);
      }

      setHospitalId(staff.hospitalId || staff.hospital_id || '');
      setBranchId(staff.branchId || staff.branch_id || '');
      setShiftTiming(staff.shiftTiming || staff.shift_timing || 'Morning');
      setCustomShiftDetails(staff.customShiftDetails || staff.custom_shift_details || '');

      const rawDays = staff.workDays || staff.work_days;
      if (rawDays) {
        const parsed = Array.isArray(rawDays)
          ? rawDays
          : typeof rawDays === 'string'
            ? rawDays.split(',').map((s) => s.trim()).filter(Boolean)
            : DEFAULT_WORK_DAYS;
        setWorkDays(parsed.length > 0 ? parsed : DEFAULT_WORK_DAYS);
      } else {
        setWorkDays(DEFAULT_WORK_DAYS);
      }

      setJoiningDate(staff.joiningDate || staff.joining_date || (new Date().toISOString().split('T')[0] ?? ''));
      setStatus(staff.status || 'ACTIVE');
      setNotes(staff.notes || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setRole('Senior Nurse');
      setIsCustomRole(false);
      setCustomRole('');
      setHospitalId('');
      setBranchId('');
      setShiftTiming('Morning');
      setCustomShiftDetails('');
      setWorkDays(DEFAULT_WORK_DAYS);
      setJoiningDate(new Date().toISOString().split('T')[0] ?? '');
      setStatus('ACTIVE');
      setNotes('');
    }
    setSelectedFile(null);
    setDocumentName('');
    setDocumentType('ID_PROOF');
    setStagedDocuments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors({});
    setTouched({});
    setError('');
  }, [staff, isOpen]);

  // Handlers for name
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Delete' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }
    // Disallow numbers and special characters: allow only letters and spaces
    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z\s]/g, '');
    setName(sanitized);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateStaffName(sanitized) }));
    }
  };

  const handleNamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const sanitized = pasted.replace(/[^a-zA-Z\s]/g, '');
    const target = e.currentTarget;
    const start = target.selectionStart ?? name.length;
    const end = target.selectionEnd ?? name.length;
    const nextVal = name.slice(0, start) + sanitized + name.slice(end);
    setName(nextVal);
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateStaffName(nextVal) }));
    }
  };

  // Handlers for phone
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Delete' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }
    // Allow only digits, +, spaces, and hyphens
    if (!/^[0-9+\s-]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9+\s-]/g, '');
    setPhone(sanitized);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validateStaffPhone(sanitized) }));
    }
  };

  // Handlers for email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setEmail(val);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateStaffEmail(val) }));
    }
  };

  // Handlers for date of joining
  const handleJoiningDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setJoiningDate(val);
    if (touched.joiningDate) {
      setErrors((prev) => ({ ...prev, joiningDate: validateJoiningDate(val) }));
    }
  };

  // Handlers for address
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAddress(val);
    if (touched.address) {
      setErrors((prev) => ({ ...prev, address: validateAddress(val) }));
    }
  };

  // Handlers for custom role
  const handleCustomRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Delete' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[a-zA-Z\s-]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleCustomRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s-]/g, '');
    setCustomRole(sanitized);
    if (touched.customRole) {
      setErrors((prev) => ({ ...prev, customRole: validateCustomRole(true, sanitized) }));
    }
  };

  // Handlers for custom shift details (not typeable via keyboard)
  const handleCustomShiftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Escape' || e.ctrlKey || e.metaKey) {
      return;
    }
    // Prevent direct typing - time must be chosen via Ant Design TimePicker or Modal
    e.preventDefault();
  };

  const handleCustomShiftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s:(),./&-]/g, '');
    setCustomShiftDetails(sanitized);
    if (touched.customShiftDetails) {
      setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, sanitized) }));
    }
  };

  // Memoized RangePicker value parsed from customShiftDetails string
  const shiftRangeValue = useMemo<[Dayjs | null, Dayjs | null]>(() => {
    return parseShiftRange(customShiftDetails);
  }, [customShiftDetails]);

  // Computed shift duration for display
  const currentShiftDuration = useMemo(() => {
    return getShiftDuration(customShiftDetails);
  }, [customShiftDetails]);

  // Open the Ant Design modal to pick time
  const handleOpenTimeModal = () => {
    const [start, end] = parseShiftRange(customShiftDetails);
    setModalStartTime(start || dayjs('08:00 AM', 'hh:mm A'));
    setModalEndTime(end || dayjs('04:00 PM', 'hh:mm A'));
    setIsTimeModalOpen(true);
  };

  // Modal duration preview
  const modalDuration = useMemo(() => {
    if (!modalStartTime || !modalEndTime) return null;
    const sMins = modalStartTime.hour() * 60 + modalStartTime.minute();
    const eMins = modalEndTime.hour() * 60 + modalEndTime.minute();
    let diff = eMins - sMins;
    if (diff <= 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hours`;
  }, [modalStartTime, modalEndTime]);

  // Apply time selected inside the Ant Design modal
  const handleApplyModalTime = () => {
    if (!modalStartTime || !modalEndTime) {
      message?.warning?.('Please select both start time and end time.');
      return;
    }
    const formatted = `${modalStartTime.format('hh:mm A')} - ${modalEndTime.format('hh:mm A')}`;
    setCustomShiftDetails(formatted);
    setTouched((prev) => ({ ...prev, customShiftDetails: true }));
    setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, formatted) }));
    setIsTimeModalOpen(false);
    message?.success?.(`Custom shift set to ${formatted}`);
  };

  // Ant Design RangePicker change handler (inputReadOnly ensures not typeable)
  const handleTimePickerRangeChange = (
    _dates: [Dayjs | null, Dayjs | null] | null,
    dateStrings: [string, string]
  ) => {
    if (dateStrings[0] && dateStrings[1]) {
      const formatted = `${dateStrings[0]} - ${dateStrings[1]}`;
      setCustomShiftDetails(formatted);
      setTouched((prev) => ({ ...prev, customShiftDetails: true }));
      setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, formatted) }));
    } else if (!dateStrings[0] && !dateStrings[1]) {
      setCustomShiftDetails('');
      setTouched((prev) => ({ ...prev, customShiftDetails: true }));
      setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, '') }));
    }
  };

  // Handlers for document title
  const handleDocumentNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Delete' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[a-zA-Z0-9\s._()&/ -]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleDocumentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s._()&/ -]/g, '');
    setDocumentName(sanitized);
    if (touched.documentTitle) {
      setErrors((prev) => ({ ...prev, documentTitle: validateDocumentTitle(sanitized) }));
    }
  };

  // File handling with validation
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const invalidMessages: string[] = [];
    const validFiles: File[] = [];

    for (const f of fileArray) {
      const err = validateDocumentFile(f);
      if (err) {
        invalidMessages.push(`${f.name}: ${err}`);
      } else {
        validFiles.push(f);
      }
    }

    if (invalidMessages.length > 0) {
      setErrors((prev) => ({ ...prev, documentFile: invalidMessages[0] }));
      message?.error?.(invalidMessages[0]);
    } else {
      setErrors((prev) => ({ ...prev, documentFile: undefined }));
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (validFiles.length === 1) {
      const file = validFiles[0]!;
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      const newItems: StagedDocument[] = validFiles.map((f) => ({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        name: f.name.replace(/\.[^/.]+$/, ''),
        documentType: documentType || 'ID_PROOF',
      }));
      setStagedDocuments((prev) => [...prev, ...newItems]);
      setSelectedFile(null);
      setDocumentName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      message?.info?.(`${newItems.length} document(s) added to upload queue.`);
    }
  };

  const handleAddDocument = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedFile) {
      message?.warning?.('Please select a document file first.');
      return;
    }
    const fileErr = validateDocumentFile(selectedFile);
    if (fileErr) {
      setErrors((prev) => ({ ...prev, documentFile: fileErr }));
      message?.error?.(fileErr);
      return;
    }

    const titleCandidate = documentName.trim() || selectedFile.name.replace(/\.[^/.]+$/, '').trim();
    const titleErr = validateDocumentTitle(titleCandidate);
    if (titleErr) {
      setTouched((prev) => ({ ...prev, documentTitle: true }));
      setErrors((prev) => ({ ...prev, documentTitle: titleErr }));
      message?.error?.(titleErr);
      return;
    }

    const newDoc: StagedDocument = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file: selectedFile,
      name: titleCandidate,
      documentType,
    };
    setStagedDocuments((prev) => [...prev, newDoc]);
    setSelectedFile(null);
    setDocumentName('');
    setDocumentType('ID_PROOF');
    setErrors((prev) => ({ ...prev, documentFile: undefined, documentTitle: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    message?.success?.(`Added "${titleCandidate}" to documents list.`);
  };

  const handleRemoveStagedDocument = (docId: string) => {
    setStagedDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Filter branches by selected hospital
  const filteredBranches = hospitalId
    ? branches.filter((b) => b.hospital_id === hospitalId)
    : branches;

  // Memoized options for SearchableSelect
  const roleOptions = useMemo<SearchableSelectOption[]>(() => {
    return STAFF_ROLES.map((r) => ({
      value: r,
      label: r,
      badge: r === 'Other' ? 'Custom' : undefined,
      badgeTone: r === 'Other' ? 'amber' : 'neutral',
    }));
  }, []);

  const hospitalOptions = useMemo<SearchableSelectOption[]>(() => {
    return hospitals.map((h) => ({
      value: h.id,
      label: h.name,
      badge: h.status === 'ACTIVE' ? 'Active' : 'Inactive',
      badgeTone: h.status === 'ACTIVE' ? 'green' : 'neutral',
    }));
  }, [hospitals]);

  const branchOptions = useMemo<SearchableSelectOption[]>(() => {
    return filteredBranches.map((b) => ({
      value: b.id,
      label: b.name,
      badge: b.status === 'ACTIVE' ? 'Active' : 'Inactive',
      badgeTone: b.status === 'ACTIVE' ? 'green' : 'neutral',
    }));
  }, [filteredBranches]);

  const shiftTimingOptions = useMemo<SearchableSelectOption[]>(() => {
    return SHIFT_TIMINGS.map((s) => ({
      value: s.id,
      label: s.label,
      sublabel: s.period,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateStaffName(name);
    const phoneErr = validateStaffPhone(phone);
    const emailErr = validateStaffEmail(email);
    const dateErr = validateJoiningDate(joiningDate);
    const addressErr = validateAddress(address);
    const roleErr = isCustomRole ? validateCustomRole(true, customRole) : undefined;
    const shiftErr = shiftTiming === 'Custom Shift' ? validateCustomShift(shiftTiming, customShiftDetails) : undefined;
    const docTitleErr = selectedFile
      ? validateDocumentTitle(documentName.trim() || selectedFile.name.replace(/\.[^/.]+$/, '').trim())
      : undefined;

    const currentErrors: FormErrors = {
      name: nameErr,
      phone: phoneErr,
      email: emailErr,
      joiningDate: dateErr,
      address: addressErr,
      customRole: roleErr,
      customShiftDetails: shiftErr,
      documentTitle: docTitleErr,
    };

    const hasErrors = Object.values(currentErrors).some(Boolean);
    if (hasErrors) {
      setErrors(currentErrors);
      setTouched({
        name: true,
        phone: true,
        email: true,
        joiningDate: true,
        address: true,
        customRole: true,
        customShiftDetails: true,
        documentTitle: Boolean(selectedFile),
      });
      const firstMsg = nameErr || phoneErr || emailErr || dateErr || addressErr || roleErr || shiftErr || docTitleErr;
      setError(firstMsg || 'Please correct the highlighted validation errors.');
      return;
    }

    if (workDays.length === 0) {
      setError('Please select at least one working day.');
      return;
    }

    const finalRole = isCustomRole ? customRole.trim() : role;
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        role: finalRole,
        hospitalId: hospitalId || undefined,
        branchId: branchId || undefined,
        shiftTiming,
        customShiftDetails: shiftTiming === 'Custom Shift' ? customShiftDetails.trim() || undefined : undefined,
        workDays: workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS,
        joiningDate: joiningDate || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      let staffId = staff?.id;

      if (staff) {
        await api.put(`staff/${staff.id}`, payload);
        message?.success?.('Staff member details updated successfully.');
      } else {
        const createRes = await api.post('staff', payload);
        staffId = createRes.data?.data?.id || createRes.data?.id;
        message?.success?.('Staff member registered successfully.');
      }

      // If documents were staged or selected during creation, upload them now to Cloudflare R2
      const allDocsToUpload: StagedDocument[] = [...stagedDocuments];
      if (selectedFile) {
        allDocsToUpload.push({
          id: 'selected_at_submit',
          file: selectedFile,
          name: documentName.trim() || selectedFile.name,
          documentType,
        });
      }

      if (allDocsToUpload.length > 0 && staffId) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (const doc of allDocsToUpload) {
          const formData = new FormData();
          formData.append('file', doc.file);
          formData.append('name', doc.name);
          formData.append('documentType', doc.documentType);

          try {
            await api.post(`staff/${staffId}/documents`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            uploadedCount++;
          } catch (uploadErr) {
            console.error(`Failed to upload initial document (${doc.name}):`, uploadErr);
            failedCount++;
          }
        }

        if (uploadedCount > 0 && failedCount === 0) {
          message?.success?.(
            uploadedCount === 1
              ? 'Staff verification document uploaded.'
              : `${uploadedCount} staff verification documents uploaded.`
          );
        } else if (uploadedCount > 0 && failedCount > 0) {
          message?.warning?.(
            `${uploadedCount} document(s) uploaded successfully, but ${failedCount} failed. You can re-upload from staff details.`
          );
        } else {
          message?.warning?.('Staff member saved, but document upload failed. You can re-upload from details.');
        }
      }

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save staff member.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        variant="drawer"
        size="lg"
        className="staff-create-drawer-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
              }}
            >
              {staff ? <Pencil size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--ui-text, #0f172a)', letterSpacing: '-0.01em' }}>
                {staff ? `Edit Staff Member · ${staff.name}` : 'Add New Hospital Staff'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {staff
                  ? 'Update staff profile details, shift assignments, and credentials.'
                  : 'Enter staff profile details, department assignments, shift schedule & verification documents.'}
              </div>
            </div>
          </div>
        }
        description=""
      >
        <form
          id="staff-form"
          onSubmit={handleSubmit}
          className="ui-modal-form"
          noValidate
        >
          <style>{`
          .staff-create-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .staff-create-drawer-modal .ui-modal-head {
            padding: 18px 26px;
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
          }
          .staff-create-drawer-modal .ui-modal-head h2 {
            font-size: 16.5px;
            margin: 0;
          }
          .staff-create-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .staff-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .staff-section-card:hover {
            border-color: #cbd5e1;
          }
          .staff-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .staff-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #dbeafe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .staff-section-badge svg {
            display: block;
            margin: auto;
          }
          .staff-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .staff-create-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .staff-create-drawer-modal .ui-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
            outline: none;
          }
          .shift-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          @media (max-width: 600px) {
            .shift-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .shift-card-btn {
            padding: 10px 12px;
            border-radius: 9px;
            cursor: pointer;
            text-align: left;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 5px;
            transition: all 0.15s ease;
            position: relative;
          }
          .shift-card-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
          }
          .shift-card-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .shift-card-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .staff-status-btn {
            flex: 1;
            padding: 12px 14px;
            border-radius: 9px;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            transition: all 0.15s ease;
            position: relative;
          }
          .staff-status-btn.is-active {
            border: 1.5px solid #2563eb !important;
            background: #eff6ff !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
          }
          .staff-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .staff-status-btn:not(.is-active):hover {
            background: #fafafa;
            border-color: #cbd5e1;
          }
          .staff-dropzone {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 16px;
            border-radius: 11px;
            border: 2px dashed #cbd5e1;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: center;
            gap: 6px;
          }
          .staff-dropzone:hover,
          .staff-dropzone.has-file {
            border-color: #2563eb;
            background: #eff6ff;
          }
          .staff-submit-btn {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
            border: none !important;
            color: #ffffff !important;
          }
          .staff-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
          }
        `}</style>
          <div className="ui-modal-body">
            {error && <Alert>{error}</Alert>}

            {/* Section 1: Basic Information */}
            <div className="staff-section-card">
              <div className="staff-section-header">
                <div className="staff-section-badge">
                  <User size={13} />
                </div>
                <div>
                  <div className="staff-section-tag">
                    Basic Information
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label htmlFor="staff-full-name" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Staff Full Name</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>Letters & spaces only</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: errors.name ? '#ef4444' : '#94a3b8' }} />
                    <input
                      id="staff-full-name"
                      type="text"
                      className="ui-input"
                      placeholder="e.g. Sister Mary Joseph"
                      value={name}
                      onChange={handleNameChange}
                      onKeyDown={handleNameKeyDown}
                      onPaste={handleNamePaste}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, name: true }));
                        setErrors((prev) => ({ ...prev, name: validateStaffName(name) }));
                      }}
                      style={{
                        paddingLeft: 34,
                        borderColor: errors.name ? '#ef4444' : undefined,
                        boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      required
                    />
                  </div>
                  {errors.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="staff-phone" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Phone Number</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>10-15 digits</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: errors.phone ? '#ef4444' : '#94a3b8' }} />
                    <input
                      id="staff-phone"
                      type="tel"
                      className="ui-input"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyDown={handlePhoneKeyDown}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, phone: true }));
                        setErrors((prev) => ({ ...prev, phone: validateStaffPhone(phone) }));
                      }}
                      style={{
                        paddingLeft: 34,
                        borderColor: errors.phone ? '#ef4444' : undefined,
                        boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      required
                    />
                  </div>
                  {errors.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label htmlFor="staff-email" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span>Email Address</span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>Optional</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: errors.email ? '#ef4444' : '#94a3b8' }} />
                    <input
                      id="staff-email"
                      type="email"
                      className="ui-input"
                      placeholder="e.g. staff@hospital.com"
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, email: true }));
                        setErrors((prev) => ({ ...prev, email: validateStaffEmail(email) }));
                      }}
                      style={{
                        paddingLeft: 34,
                        borderColor: errors.email ? '#ef4444' : undefined,
                        boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                  </div>
                  {errors.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="staff-joining-date" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Joining Date</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>YYYY-MM-DD</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: errors.joiningDate ? '#ef4444' : '#94a3b8' }} />
                    <input
                      id="staff-joining-date"
                      type="date"
                      className="ui-input"
                      value={joiningDate}
                      onChange={handleJoiningDateChange}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, joiningDate: true }));
                        setErrors((prev) => ({ ...prev, joiningDate: validateJoiningDate(joiningDate) }));
                      }}
                      style={{
                        paddingLeft: 34,
                        borderColor: errors.joiningDate ? '#ef4444' : undefined,
                        boxShadow: errors.joiningDate ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                      required
                    />
                  </div>
                  {errors.joiningDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.joiningDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="staff-address" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} style={{ color: '#94a3b8' }} />
                    <span>Residential / Postal Address</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>Optional · min 5 chars</span>
                </label>
                <textarea
                  id="staff-address"
                  className="ui-input"
                  rows={2}
                  placeholder="e.g. 12/B Health Colony, Opp. Apollo Hospital, Chennai"
                  value={address}
                  onChange={handleAddressChange}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, address: true }));
                    setErrors((prev) => ({ ...prev, address: validateAddress(address) }));
                  }}
                  style={{
                    minHeight: 58,
                    lineHeight: 1.4,
                    padding: '8px 12px',
                    borderColor: errors.address ? '#ef4444' : undefined,
                    boxShadow: errors.address ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} />
                    <span>{errors.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Hospital & Role Placement */}
            <div className="staff-section-card">
              <div className="staff-section-header">
                <div className="staff-section-badge">
                  <Briefcase size={13} />
                </div>
                <div>
                  <div className="staff-section-tag">
                    Role, Hospital & Shift Assignment
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="staff-role" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                  <Briefcase size={13} style={{ color: '#94a3b8' }} />
                  <span>Staff Role</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  id="staff-role"
                  name="role"
                  aria-label="Staff Role"
                  options={roleOptions}
                  value={role}
                  onChange={(val) => {
                    setRole(val);
                    setIsCustomRole(val === 'Other');
                  }}
                  searchable={true}
                  placeholder="Select staff role..."
                  searchPlaceholder="Search staff role..."
                  required
                />
              </div>

              {isCustomRole && (
                <div>
                  <label htmlFor="staff-custom-role" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Custom Role Title</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>Letters only</span>
                  </label>
                  <input
                    id="staff-custom-role"
                    type="text"
                    className="ui-input"
                    placeholder="Specify custom role title"
                    value={customRole}
                    onChange={handleCustomRoleChange}
                    onKeyDown={handleCustomRoleKeyDown}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, customRole: true }));
                      setErrors((prev) => ({ ...prev, customRole: validateCustomRole(true, customRole) }));
                    }}
                    style={{
                      borderColor: errors.customRole ? '#ef4444' : undefined,
                      boxShadow: errors.customRole ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                    required
                  />
                  {errors.customRole && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{errors.customRole}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label htmlFor="staff-hospital" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <Building2 size={13} style={{ color: '#94a3b8' }} />
                    <span>Assigned Hospital</span>
                  </label>
                  <SearchableSelect
                    id="staff-hospital"
                    name="hospitalId"
                    aria-label="Assigned Hospital"
                    options={hospitalOptions}
                    value={hospitalId}
                    onChange={(val) => {
                      setHospitalId(val);
                      setBranchId('');
                    }}
                    searchable={true}
                    clearable={true}
                    onClear={() => {
                      setHospitalId('');
                      setBranchId('');
                    }}
                    placeholder="-- Select Hospital --"
                    searchPlaceholder="Search hospital by name..."
                    emptyText="No hospitals found"
                  />
                </div>

                <div>
                  <label htmlFor="staff-branch" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <GitBranch size={13} style={{ color: '#94a3b8' }} />
                    <span>Hospital Branch</span>
                  </label>
                  <SearchableSelect
                    id="staff-branch"
                    name="branchId"
                    aria-label="Hospital Branch"
                    options={branchOptions}
                    value={branchId}
                    onChange={(val) => setBranchId(val)}
                    searchable={true}
                    clearable={true}
                    onClear={() => setBranchId('')}
                    placeholder={hospitalId ? '-- Select Branch --' : 'Select a hospital first'}
                    searchPlaceholder="Search branch by name..."
                    emptyText={hospitalId ? 'No branches found for this hospital' : 'Please select a hospital first'}
                    disabled={!hospitalId || filteredBranches.length === 0}
                  />
                </div>
              </div>

              {/* Shift Timing Selection (SearchableSelect + Visual Interactive Cards) */}
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <label
                    htmlFor="staff-shift-timing"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 5,
                    }}
                  >
                    <Clock size={13} style={{ color: '#94a3b8' }} />
                    <span>Shift Timing</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    id="staff-shift-timing"
                    name="shiftTiming"
                    aria-label="Shift Timing"
                    options={shiftTimingOptions}
                    value={shiftTiming}
                    onChange={(val) => setShiftTiming(val)}
                    searchable={false}
                    placeholder="Select shift timing..."
                    required
                  />
                </div>

                {/* Interactive Shift Cards */}
                <div className="shift-grid">
                  {SHIFT_TIMINGS.map((shift) => {
                    const isSelected = shiftTiming === shift.id;
                    let ShiftIcon = Sun;
                    if (shift.id === 'Evening') ShiftIcon = Sunset;
                    else if (shift.id === 'Night') ShiftIcon = Moon;
                    else if (shift.id === 'Custom Shift') ShiftIcon = Clock;

                    return (
                      <button
                        type="button"
                        key={shift.id}
                        onClick={() => setShiftTiming(shift.id)}
                        className={`shift-card-btn ${isSelected ? 'is-active' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <ShiftIcon size={15} style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
                          {isSelected && (
                            <span
                              style={{
                                width: 15,
                                height: 15,
                                borderRadius: '50%',
                                background: '#2563eb',
                                color: '#ffffff',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                            {shift.id}
                          </div>
                          <div style={{ fontSize: 10, color: isSelected ? '#2563eb' : '#64748b', marginTop: 1 }}>
                            {shift.period}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {shiftTiming === 'Custom Shift' && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <label
                        htmlFor="staff-custom-shift-details"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          margin: 0,
                        }}
                      >
                        <Clock size={13} style={{ color: '#64748b' }} />
                        <span>Custom Shift Timing Details</span>
                        <span style={{ color: '#ef4444' }}>*</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleOpenTimeModal}
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 6,
                          padding: '3px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Open Ant Design Time Modal"
                      >
                        <Clock size={12} />
                        <span>Choose in Time Modal</span>
                      </button>
                    </div>

                    {/* Primary interactive TimePicker.RangePicker (inputReadOnly prevents manual typing) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <TimePicker.RangePicker
                          format="hh:mm A"
                          use12Hours
                          minuteStep={5}
                          inputReadOnly={true}
                          value={shiftRangeValue}
                          onChange={handleTimePickerRangeChange}
                          placeholder={['Start Time', 'End Time']}
                          style={{
                            width: '100%',
                            borderRadius: 8,
                            height: 38,
                            borderColor: errors.customShiftDetails ? '#ef4444' : '#cbd5e1',
                          }}
                          needConfirm={false}
                          aria-label="Custom Shift Time Picker"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenTimeModal}
                        className="ui-btn"
                        style={{
                          height: 38,
                          padding: '0 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Clock size={13} />
                        <span>Time Modal</span>
                      </button>
                    </div>

                    {/* Non-typeable display input (readOnly ensures not typeable, click opens modal) */}
                    <div style={{ marginTop: 8 }}>
                      <input
                        id="staff-custom-shift-details"
                        type="text"
                        className="ui-input"
                        placeholder="e.g. 06:00 AM - 02:00 PM or 12hr Rotating Roster"
                        value={customShiftDetails}
                        readOnly={true}
                        onClick={handleOpenTimeModal}
                        onChange={handleCustomShiftChange}
                        onKeyDown={handleCustomShiftKeyDown}
                        onBlur={() => {
                          setTouched((prev) => ({ ...prev, customShiftDetails: true }));
                          setErrors((prev) => ({
                            ...prev,
                            customShiftDetails: validateCustomShift(shiftTiming, customShiftDetails),
                          }));
                        }}
                        style={{
                          borderColor: errors.customShiftDetails ? '#ef4444' : undefined,
                          boxShadow: errors.customShiftDetails ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                          cursor: 'pointer',
                          background: '#ffffff',
                          fontSize: 12,
                          fontWeight: customShiftDetails ? 600 : 400,
                          color: customShiftDetails ? '#1e293b' : '#64748b',
                        }}
                        title="Click to choose time in modal"
                        required
                      />
                    </div>

                    {errors.customShiftDetails && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 6,
                          color: '#dc2626',
                          fontSize: 11,
                        }}
                      >
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.customShiftDetails}</span>
                      </div>
                    )}

                    {/* Quick Shift Presets */}
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                          Quick Presets:
                        </span>
                        {currentShiftDuration && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#0f172a',
                              background: '#f1f5f9',
                              padding: '1px 8px',
                              borderRadius: 10,
                            }}
                          >
                            Duration: {currentShiftDuration}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {CUSTOM_SHIFT_PRESETS.map((preset) => {
                          const isActive = customShiftDetails === preset.label;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setCustomShiftDetails(preset.label);
                                setTouched((prev) => ({ ...prev, customShiftDetails: true }));
                                setErrors((prev) => ({ ...prev, customShiftDetails: undefined }));
                              }}
                              style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                background: isActive ? '#2563eb' : '#ffffff',
                                color: isActive ? '#ffffff' : '#334155',
                                cursor: 'pointer',
                                fontWeight: isActive ? 600 : 500,
                                transition: 'all 0.15s ease',
                              }}
                              title={preset.desc}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Days Selection */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        margin: 0,
                      }}
                    >
                      <Calendar size={13} style={{ color: '#94a3b8' }} />
                      <span>Work Days</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {WORK_DAY_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setWorkDays([...preset.days])}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 5,
                            padding: '2px 7px',
                            fontSize: 11,
                            color: '#64748b',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day Buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {WORK_DAY_OPTIONS.map((day) => {
                      const isSelected = workDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`Work day ${day.fullLabel}`}
                          onClick={() => {
                            setWorkDays((prev) =>
                              prev.includes(day.id)
                                ? prev.filter((d) => d !== day.id)
                                : [...prev, day.id]
                            );
                          }}
                          style={{
                            flex: '1 1 0%',
                            minWidth: 42,
                            height: 36,
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: isSelected ? 650 : 500,
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            boxShadow: isSelected ? '0 1px 3px rgba(37, 99, 235, 0.12)' : 'none',
                          }}
                        >
                          <span>{day.label}</span>
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              background: isSelected ? '#2563eb' : 'transparent',
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {workDays.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>Please select at least one work day.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Visibility & Status */}
            <div className="staff-section-card">
              <div className="staff-section-header">
                <div className="staff-section-badge">
                  <ShieldCheck size={13} />
                </div>
                <div>
                  <div className="staff-section-tag">
                    Profile Status & Availability
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {/* Active Option */}
                <button
                  type="button"
                  className={`staff-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: status === 'ACTIVE' ? '#1d4ed8' : '#1e293b',
                      }}
                    >
                      Active Profile
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                      Active for shift duties, hospital operations, and assignment workflows.
                    </div>
                  </div>
                  {status === 'ACTIVE' && (
                    <CheckCircle2
                      size={16}
                      style={{ color: '#2563eb', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
                    />
                  )}
                </button>

                {/* Inactive Option */}
                <button
                  type="button"
                  className={`staff-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#94a3b8',
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: status === 'INACTIVE' ? '#1d4ed8' : '#1e293b',
                      }}
                    >
                      Inactive Profile
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.35 }}>
                      Temporarily suspended or excluded from active shift schedules.
                    </div>
                  </div>
                  {status === 'INACTIVE' && (
                    <CheckCircle2
                      size={16}
                      style={{ color: '#2563eb', marginLeft: 'auto', flexShrink: 0, marginTop: 2 }}
                    />
                  )}
                </button>
              </div>
            </div>

            {/* Section 4: Document Upload (Secure R2 Storage) */}
            {!staff && (
              <div className="staff-section-card">
                <div className="staff-section-header">
                  <div className="staff-section-badge">
                    <FileUp size={13} />
                  </div>
                  <div>
                    <div className="staff-section-tag">
                      Staff Documents
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: -4 }}>
                  Upload qualification certificates, council registration, ID proofs, or resumes.
                </div>

                {errors.documentFile && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 11px',
                      borderRadius: 8,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: 11.5,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{errors.documentFile}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label htmlFor="staff-document-title" style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span>Document Title</span>
                      <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>Letters & numbers</span>
                    </label>
                    <input
                      id="staff-document-title"
                      type="text"
                      className="ui-input"
                      placeholder="e.g. Nursing Registration Certificate"
                      value={documentName}
                      onChange={handleDocumentNameChange}
                      onKeyDown={handleDocumentNameKeyDown}
                      onBlur={() => {
                        if (documentName.trim()) {
                          setTouched((prev) => ({ ...prev, documentTitle: true }));
                          setErrors((prev) => ({
                            ...prev,
                            documentTitle: validateDocumentTitle(documentName),
                          }));
                        }
                      }}
                      style={{
                        borderColor: errors.documentTitle ? '#ef4444' : undefined,
                        boxShadow: errors.documentTitle ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                      }}
                    />
                    {errors.documentTitle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: '#dc2626', fontSize: 11 }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>{errors.documentTitle}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="staff-document-category"
                      style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}
                    >
                      Document Category
                    </label>
                    <SearchableSelect
                      id="staff-document-category"
                      name="documentType"
                      aria-label="Document Category"
                      options={DOCUMENT_TYPE_OPTIONS}
                      value={documentType}
                      onChange={(val) => setDocumentType(val)}
                      searchable={false}
                      placeholder="Select document category..."
                    />
                  </div>
                </div>

                {/* File Dropzone */}
                <div
                  className={`staff-dropzone ${selectedFile ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                      processFiles(e.dataTransfer.files);
                    }
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: selectedFile ? '#2563eb' : '#64748b',
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    {selectedFile ? <CheckCircle2 size={22} style={{ color: '#2563eb' }} /> : <UploadCloud size={22} />}
                  </div>

                  {selectedFile ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        {formatFileSize(selectedFile.size)} · Click "+ Add Document" below to stage
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          marginTop: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#64748b',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <X size={12} />
                        <span>Choose different file</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        Click to browse or drop document here
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        PDF, PNG, JPG, or DOCX (Up to 20MB) · Select multiple or add one by one
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    id="staff-document-file-input"
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files) {
                        processFiles(e.target.files);
                      }
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                </div>

                {/* Action Row with "+ Add Document" Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    background: '#f8fafc',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 11.5, color: '#475569' }}>
                    {selectedFile ? (
                      <span>
                        Ready: <strong style={{ color: '#0f172a' }}>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
                      </span>
                    ) : (
                      <span>Choose a file above, then click <strong>Add Document</strong> to add more.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDocument}
                    disabled={!selectedFile}
                    className="ui-btn"
                    style={{
                      height: 32,
                      padding: '0 14px',
                      borderRadius: 7,
                      fontWeight: 600,
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: selectedFile ? '#2563eb' : '#e2e8f0',
                      color: selectedFile ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      cursor: selectedFile ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Document</span>
                  </button>
                </div>

                {/* Staged Documents List */}
                {stagedDocuments.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      paddingTop: 8,
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                        Documents to Upload ({stagedDocuments.length})
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                        Stored in Cloudflare R2 on registration
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {stagedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            borderRadius: 8,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 7,
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                border: '1px solid #dbeafe',
                              }}
                            >
                              <FileText size={15} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {doc.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 9999,
                                    background: '#f8fafc',
                                    color: '#334155',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  {getDocumentTypeLabel(doc.documentType)}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                {doc.file.name} · {formatFileSize(doc.file.size)}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStagedDocument(doc.id)}
                            title="Remove document"
                            aria-label={`Remove document ${doc.name}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '5px',
                              borderRadius: 6,
                              color: '#94a3b8',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fee2e2';
                              e.currentTarget.style.color = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#94a3b8';
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Administrative Remarks */}
            <div className="staff-section-card">
              <div className="staff-section-header">
                <div className="staff-section-badge">
                  <FileText size={13} />
                </div>
                <div>
                  <div className="staff-section-tag">
                    Administrative Remarks
                  </div>
                </div>
              </div>

              <textarea
                className="ui-input"
                rows={2}
                placeholder="e.g. Certified in ACLS, experienced in ICU triage and medication protocol"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ minHeight: 58, lineHeight: 1.4, padding: '8px 12px' }}
              />
            </div>
          </div>

          {/* Docked Action Footer */}
          <div
            className="ui-modal-foot"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 22px',
              borderTop: '1px solid #e2e8f0',
              background: '#ffffff',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                className="ui-btn ui-btn-neutral"
                disabled={loading}
                style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-primary staff-submit-btn"
                style={{
                  height: 38,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '0 20px',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="is-spinning" />
                    <span>Saving...</span>
                  </>
                ) : staff ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Register Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Ant Design Modal for Custom Shift Timing (not typeable, chooses time in modal) */}
      <AntdModal
        open={isTimeModalOpen}
        onCancel={() => setIsTimeModalOpen(false)}
        onOk={handleApplyModalTime}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f1f5f9',
                display: 'grid',
                placeItems: 'center',
                color: '#0f172a',
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                Choose Custom Shift Timing
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 400 }}>
                Select start & end time using Ant Design time pickers
              </div>
            </div>
          </div>
        }
        okText="Apply Shift Timing"
        cancelText="Cancel"
        okButtonProps={{
          style: {
            background: '#2563eb',
            borderColor: '#2563eb',
            borderRadius: 6,
            fontWeight: 600,
          },
        }}
        cancelButtonProps={{
          style: {
            borderRadius: 6,
          },
        }}
        width={460}
        centered
      >
        <div style={{ paddingTop: 14, paddingBottom: 6 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              background: '#f8fafc',
              padding: 14,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 5,
                }}
              >
                Start Time <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <TimePicker
                format="hh:mm A"
                use12Hours
                minuteStep={5}
                inputReadOnly={true}
                value={modalStartTime}
                onChange={(val) => setModalStartTime(val)}
                placeholder="Start Time"
                style={{ width: '100%', borderRadius: 6, height: 38 }}
                needConfirm={false}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 5,
                }}
              >
                End Time <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <TimePicker
                format="hh:mm A"
                use12Hours
                minuteStep={5}
                inputReadOnly={true}
                value={modalEndTime}
                onChange={(val) => setModalEndTime(val)}
                placeholder="End Time"
                style={{ width: '100%', borderRadius: 6, height: 38 }}
                needConfirm={false}
              />
            </div>
          </div>

          {/* Live Duration and Shift Preview Card */}
          {modalStartTime && modalEndTime && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} style={{ color: '#475569' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {modalStartTime.format('hh:mm A')} - {modalEndTime.format('hh:mm A')}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Selected Custom Shift</div>
                </div>
              </div>
              {modalDuration && (
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {modalDuration}
                </span>
              )}
            </div>
          )}

          {/* Presets in Modal */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Quick Shift Presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {CUSTOM_SHIFT_PRESETS.map((preset) => {
                const [pStart, pEnd] = parseShiftRange(preset.label);
                const isMatch =
                  modalStartTime?.format('hh:mm A') === pStart?.format('hh:mm A') &&
                  modalEndTime?.format('hh:mm A') === pEnd?.format('hh:mm A');
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setModalStartTime(pStart);
                      setModalEndTime(pEnd);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: isMatch ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      background: isMatch ? '#eff6ff' : '#ffffff',
                      color: isMatch ? '#1d4ed8' : '#334155',
                      fontSize: 11.5,
                      fontWeight: isMatch ? 700 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{preset.label}</span>
                    <span style={{ fontSize: 10, color: isMatch ? '#2563eb' : '#94a3b8' }}>
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AntdModal>
    </>
  );
}
