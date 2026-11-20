import { App, Button, Modal } from 'antd';
import { FileUp, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { medicalHistoryApi } from '../services/medicalHistoryApi';
import {
  MEDICAL_DOCUMENT_TYPES,
  type MedicalDocumentType,
  type PatientMedicalDocument,
} from '../types/medicalHistory.types';

const DOCUMENT_TYPE_OPTIONS: SearchableSelectOption[] = MEDICAL_DOCUMENT_TYPES.map((type) => ({
  value: type,
  label: type,
}));

interface UploadPatientDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  medicalHistoryId?: string | null;
  onSuccess: (newDoc: PatientMedicalDocument) => void;
}

export function UploadPatientDocumentModal({
  isOpen,
  onClose,
  patientId,
  medicalHistoryId,
  onSuccess,
}: UploadPatientDocumentModalProps) {
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState<MedicalDocumentType>('Previous Medical Report');
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        message.error('File size exceeds the 25MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
        setTitle(cleanName);
      }
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        message.error('File size exceeds the 25MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
        setTitle(cleanName);
      }
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Document title is required.';
    }
    if (!selectedFile) {
      newErrors.file = 'Please select a document file to upload.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('title', title.trim());
      formData.append('document_date', documentDate || '');
      formData.append('notes', notes.trim());
      if (medicalHistoryId) {
        formData.append('medical_history_id', medicalHistoryId);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const created = await medicalHistoryApi.uploadDocument(patientId, formData);
      message.success('Medical document uploaded successfully.');
      onSuccess(created);
      onClose();
      // Reset form
      setTitle('');
      setSelectedFile(null);
      setNotes('');
      setErrors({});
    } catch (err: any) {
      message.error(err.response?.data?.error || err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 650 }}>
          <FileUp size={18} style={{ color: '#2563eb' }} />
          <span>Upload Medical Document &amp; Report</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={560}
      centered
    >
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        {/* Document Category Dropdown */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Document Category <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <SearchableSelect
            searchable={true}
            searchPlaceholder="Search category..."
            options={DOCUMENT_TYPE_OPTIONS}
            value={documentType}
            onChange={(val) => setDocumentType(val as MedicalDocumentType)}
            placeholder="Select document category..."
          />
        </div>

        {/* Title / Report Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Document Title / Test Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className="patient-form-input"
            style={{ width: '100%', height: 38, borderRadius: 6, borderColor: errors.title ? '#ef4444' : '#cbd5e1' }}
            placeholder="e.g. Chest X-Ray PA View, Lipid Profile, Discharge Summary..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
          />
          {errors.title && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.title}</p>}
        </div>

        {/* Document Date */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Report / Examination Date
          </label>
          <input
            type="date"
            className="patient-form-input"
            style={{ width: '100%', height: 38, borderRadius: 6, borderColor: '#cbd5e1' }}
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
        </div>

        {/* Drag and Drop File Upload Area */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Select or Drop Document File <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${errors.file ? '#ef4444' : '#94a3b8'}`,
              borderRadius: 8,
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            />
            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{selectedFile.name}</span>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={28} style={{ color: '#64748b', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  Click to browse or drag &amp; drop file here
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Supports PDF, PNG, JPG, WEBP, DOC, DOCX up to 25MB
                </div>
              </div>
            )}
          </div>
          {errors.file && <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.file}</p>}
        </div>

        {/* Clinical Notes / Findings */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Clinical Notes &amp; Observations
          </label>
          <textarea
            className="patient-form-input"
            rows={3}
            style={{ width: '100%', borderRadius: 6, borderColor: '#cbd5e1', resize: 'vertical' }}
            placeholder="Add relevant notes, diagnostic impressions, or doctor remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={uploading} style={{ backgroundColor: '#2563eb' }}>
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
