import { App } from 'antd';
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
import React, { useEffect, useRef, useState } from 'react';

import {
  SHIFT_TIMINGS,
  STAFF_ROLES,
  type StaffMember,
  type StaffStatus,
} from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Branch } from './BranchModal';
import type { Hospital } from './HospitalModal';
import { Modal } from './ui/Modal';
import { Alert } from './ui/primitives';

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

  // Handlers for custom shift details
  const handleCustomShiftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (!/^[a-zA-Z0-9\s:(),./&-]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleCustomShiftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s:(),./&-]/g, '');
    setCustomShiftDetails(sanitized);
    if (touched.customShiftDetails) {
      setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, sanitized) }));
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
              ? 'Staff verification document uploaded and stored in Cloudflare R2.'
              : `${uploadedCount} staff verification documents uploaded and stored in Cloudflare R2.`
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
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            {staff ? <Pencil size={18} /> : <UserPlus size={18} />}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ui-text, #0f172a)' }}>
              {staff ? `Edit Staff Member · ${staff.name}` : 'Add New Hospital Staff'}
            </div>
          </div>
        </div>
      }
      description="Configure staff credentials, clinical designation, shift schedule, and secure verification documents stored in Cloudflare R2."
    >
      <form
        id="staff-form"
        onSubmit={handleSubmit}
        className="ui-modal-form"
        noValidate
      >
        <div
          className="ui-modal-body"
          style={{
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: '22px 28px',
          }}
        >
        {error && <Alert>{error}</Alert>}

        {/* Section 1: Basic Information */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Basic & Contact Details
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Primary identification and communication information
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            <div>
              <label htmlFor="staff-full-name" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Staff Full Name</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Letters & spaces only</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: errors.name ? '#ef4444' : '#94a3b8' }} />
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
                    paddingLeft: 36,
                    height: 38,
                    borderColor: errors.name ? '#ef4444' : undefined,
                    boxShadow: errors.name ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  required
                />
              </div>
              {errors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="staff-phone" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Phone Number</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Digits only (10-15 digits)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: errors.phone ? '#ef4444' : '#94a3b8' }} />
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
                    paddingLeft: 36,
                    height: 38,
                    borderColor: errors.phone ? '#ef4444' : undefined,
                    boxShadow: errors.phone ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  required
                />
              </div>
              {errors.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            <div>
              <label htmlFor="staff-email" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Email Address</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Optional · user@domain.com</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: errors.email ? '#ef4444' : '#94a3b8' }} />
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
                    paddingLeft: 36,
                    height: 38,
                    borderColor: errors.email ? '#ef4444' : undefined,
                    boxShadow: errors.email ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
              </div>
              {errors.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="staff-joining-date" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Date of Joining</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>YYYY-MM-DD</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: errors.joiningDate ? '#ef4444' : '#94a3b8' }} />
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
                    paddingLeft: 36,
                    height: 38,
                    borderColor: errors.joiningDate ? '#ef4444' : undefined,
                    boxShadow: errors.joiningDate ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  required
                />
              </div>
              {errors.joiningDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.joiningDate}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="staff-address" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} style={{ color: '#64748b' }} />
                <span>Residential / Permanent Address</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Optional · min 5 chars</span>
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
                minHeight: 64,
                lineHeight: 1.4,
                borderColor: errors.address ? '#ef4444' : undefined,
                boxShadow: errors.address ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
              }}
            />
            {errors.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{errors.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Hospital & Role Placement */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Building2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Role & Hospital Placement
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Clinical designation, hospital institution, and operating branch
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            <div>
              <label htmlFor="staff-role" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Briefcase size={14} style={{ color: '#64748b' }} />
                <span>Staff Role</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="staff-role"
                className="ui-input ui-select"
                value={role}
                onChange={(e) => {
                  const val = e.target.value;
                  setRole(val);
                  setIsCustomRole(val === 'Other');
                }}
                style={{ height: 38 }}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {isCustomRole && (
              <div>
                <label htmlFor="staff-custom-role" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Custom Role Title</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Letters only</span>
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
                    height: 38,
                    borderColor: errors.customRole ? '#ef4444' : undefined,
                    boxShadow: errors.customRole ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                  required
                />
                {errors.customRole && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{errors.customRole}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            <div>
              <label htmlFor="staff-hospital" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Building2 size={14} style={{ color: '#64748b' }} />
                <span>Assigned Hospital</span>
              </label>
              <select
                id="staff-hospital"
                className="ui-input ui-select"
                value={hospitalId}
                onChange={(e) => {
                  setHospitalId(e.target.value);
                  setBranchId('');
                }}
                style={{ height: 38 }}
              >
                <option value="">-- Select Hospital --</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="staff-branch" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <GitBranch size={14} style={{ color: '#64748b' }} />
                <span>Hospital Branch</span>
              </label>
              <select
                id="staff-branch"
                className="ui-input ui-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                style={{ height: 38 }}
              >
                <option value="">-- Select Branch --</option>
                {filteredBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Shift Timing & Schedule */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#fef3c7',
                color: '#b45309',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Clock size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Shift Timing & Schedule
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Select working hours or define custom shift roster
              </div>
            </div>
          </div>

          {/* Form control for Shift Timing */}
          <div style={{ position: 'relative' }}>
            <label
              htmlFor="staff-shift-timing"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 10,
              }}
            >
              <span>Shift Timing</span>
              <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="staff-shift-timing"
              value={shiftTiming}
              onChange={(e) => setShiftTiming(e.target.value)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
              tabIndex={-1}
              aria-label="Shift Timing"
            >
              {SHIFT_TIMINGS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>

          {/* Interactive Shift Selector Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
            }}
          >
            {SHIFT_TIMINGS.map((shift) => {
              const isSelected = shiftTiming === shift.id;
              let Icon = Sun;
              let iconColor = '#f59e0b';
              if (shift.id === 'Evening') {
                Icon = Sunset;
                iconColor = '#ea580c';
              } else if (shift.id === 'Night') {
                Icon = Moon;
                iconColor = '#6366f1';
              } else if (shift.id === 'Custom Shift') {
                Icon = Clock;
                iconColor = '#0284c7';
              }

              return (
                <button
                  type="button"
                  key={shift.id}
                  onClick={() => setShiftTiming(shift.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Icon size={18} style={{ color: iconColor }} />
                    {isSelected && (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#0284c7',
                          color: '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#0369a1' : '#1e293b' }}>
                      {shift.id}
                    </div>
                    <div style={{ fontSize: 11, color: isSelected ? '#0284c7' : '#64748b', marginTop: 2 }}>
                      {shift.period}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {shiftTiming === 'Custom Shift' && (
            <div style={{ marginTop: 12 }}>
              <label htmlFor="staff-custom-shift-details" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Custom Shift Timing Details</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>e.g. 06:00 AM - 02:00 PM</span>
              </label>
              <input
                id="staff-custom-shift-details"
                type="text"
                className="ui-input"
                placeholder="e.g. 06:00 AM - 02:00 PM or 12hr Rotating Roster"
                value={customShiftDetails}
                onChange={handleCustomShiftChange}
                onKeyDown={handleCustomShiftKeyDown}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, customShiftDetails: true }));
                  setErrors((prev) => ({ ...prev, customShiftDetails: validateCustomShift(shiftTiming, customShiftDetails) }));
                }}
                style={{
                  height: 38,
                  borderColor: errors.customShiftDetails ? '#ef4444' : undefined,
                  boxShadow: errors.customShiftDetails ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                }}
                required
              />
              {errors.customShiftDetails && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.customShiftDetails}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Profile Status */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#dcfce7',
                color: '#15803d',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Profile Status
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Control whether this staff member is active on hospital rosters
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              type="button"
              onClick={() => setStatus('ACTIVE')}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: status === 'ACTIVE' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                background: status === 'ACTIVE' ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: status === 'ACTIVE' ? '#16a34a' : '#cbd5e1',
                  boxShadow: status === 'ACTIVE' ? '0 0 0 3px #bbf7d0' : 'none',
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: status === 'ACTIVE' ? '#15803d' : '#334155' }}>
                  Active Profile
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Eligible for duties & shift allocation
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('INACTIVE')}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: status === 'INACTIVE' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                background: status === 'INACTIVE' ? '#fef2f2' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: status === 'INACTIVE' ? '#dc2626' : '#cbd5e1',
                  boxShadow: status === 'INACTIVE' ? '0 0 0 3px #fecaca' : 'none',
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: status === 'INACTIVE' ? '#991b1b' : '#334155' }}>
                  Inactive Profile
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Suspended or on temporary leave
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 5: Document Upload (Store securely in Cloudflare R2) */}
        {!staff && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#f3e8ff',
                  color: '#7e22ce',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <FileUp size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Verification Documents (Cloudflare R2 Storage)
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Upload degrees, council registration, IDs, or resumes securely stored in R2
                </div>
              </div>
            </div>

            {errors.documentFile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: 12,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errors.documentFile}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              <div>
                <label htmlFor="staff-document-title" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Document Title</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Letters, numbers & (._-)</span>
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
                    height: 38,
                    borderColor: errors.documentTitle ? '#ef4444' : undefined,
                    boxShadow: errors.documentTitle ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                  }}
                />
                {errors.documentTitle && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#dc2626', fontSize: 11.5 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{errors.documentTitle}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Document Category
                </label>
                <select
                  className="ui-input ui-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="ID_PROOF">Government ID Proof</option>
                  <option value="CERTIFICATION">Degree / Council Certification</option>
                  <option value="RESUME">Resume / CV</option>
                  <option value="CONTRACT">Employment Contract</option>
                  <option value="OTHER">Other Verification Document</option>
                </select>
              </div>
            </div>

            {/* Stylized File Dropzone */}
            <div
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '22px 16px',
                borderRadius: 12,
                border: selectedFile ? '2px solid #0284c7' : '2px dashed #cbd5e1',
                background: selectedFile ? '#f0f9ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: selectedFile ? '#e0f2fe' : '#ffffff',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                }}
              >
                {selectedFile ? <CheckCircle2 size={24} style={{ color: '#16a34a' }} /> : <UploadCloud size={24} />}
              </div>

              {selectedFile ? (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0369a1' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
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
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#dc2626',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <X size={13} />
                    <span>Choose different file</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>
                    Click to browse or drop document here
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
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
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#475569' }}>
                {selectedFile ? (
                  <span>
                    Selected: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
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
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: selectedFile
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                    : '#f1f5f9',
                  color: selectedFile ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: selectedFile ? 'pointer' : 'not-allowed',
                  boxShadow: selectedFile ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={15} />
                <span>Add Document</span>
              </button>
            </div>

            {/* Staged Documents List */}
            {stagedDocuments.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    Documents to Upload ({stagedDocuments.length})
                  </div>
                  <div style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600 }}>
                    Stored in Cloudflare R2 on registration
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stagedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 13,
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
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 9999,
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {getDocumentTypeLabel(doc.documentType)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
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
                          padding: '6px',
                          borderRadius: 6,
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 6: Administrative Notes */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f1f5f9',
                color: '#475569',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Administrative Remarks
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Optional internal remarks visible only to hospital administrators
              </div>
            </div>
          </div>

          <textarea
            className="ui-input"
            rows={2}
            placeholder="e.g. Certified in ACLS, experienced in ICU triage and medication protocol"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: 64, lineHeight: 1.4 }}
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
          padding: '16px 28px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-subtle"
            disabled={loading}
            style={{ height: 38, padding: '0 16px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ui-btn ui-btn-primary"
            style={{
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 20px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="is-spinning" />
                <span>Saving...</span>
              </>
            ) : staff ? (
              <>
                <CheckCircle2 size={16} />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Register Staff</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  </Modal>
);
}
