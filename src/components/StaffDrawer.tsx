import { App } from 'antd';
import {
  AlertCircle,
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Power,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  DEFAULT_WORK_DAYS,
  formatWorkDays,
  WORK_DAY_OPTIONS,
  type StaffDocument,
  type StaffMember,
  type StaffStatus,
} from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Drawer } from './ui/Drawer';
import { Modal } from './ui/Modal';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

const DRAWER_DOC_TYPE_OPTIONS: SearchableSelectOption[] = [
  { value: 'ID_PROOF', label: 'ID Proof', badge: 'ID' },
  { value: 'CERTIFICATION', label: 'Degree / Certification', badge: 'Cert' },
  { value: 'RESUME', label: 'Resume / CV', badge: 'CV' },
  { value: 'CONTRACT', label: 'Employment Contract', badge: 'Contract' },
  { value: 'OTHER', label: 'Other', badge: 'Other' },
];

interface StaffDrawerProps {
  staff: StaffMember | null;
  onClose: () => void;
  onEdit: (staff: StaffMember) => void;
  onStatusChange: (staff: StaffMember, newStatus: StaffStatus) => void;
  onRefresh: () => void;
  onDelete?: (staff: StaffMember) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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
    return 'Document title can only contain letters, numbers, spaces, and punctuation (._-()&).';
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return 'Document title must contain at least one letter (e.g. ID Card, Certificate).';
  }
  return undefined;
}

export default function StaffDrawer({
  staff,
  onClose,
  onEdit,
  onStatusChange,
  onRefresh,
  onDelete,
}: StaffDrawerProps) {
  const { message } = App.useApp();

  // Document upload state inside drawer
  const [isUploading, setIsUploading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docNameError, setDocNameError] = useState<string | null>(null);
  const [docType, setDocType] = useState('ID_PROOF');
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!staff) return null;

  const isActive = staff.status === 'ACTIVE';

  const handleDownloadDocument = async (doc: StaffDocument) => {
    setDownloadingDocId(doc.id);
    try {
      const res = await api.get(`staff/${staff.id}/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: doc.mimeType || 'application/octet-stream' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName || `${doc.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
      message?.success?.(`Downloaded "${doc.name}" successfully.`);
    } catch (err) {
      console.error('Download error:', err);
      if (doc.fileUrl && doc.fileUrl.startsWith('http') && !doc.fileUrl.includes('s3.local')) {
        window.open(doc.fileUrl, '_blank');
      } else {
        message?.error?.(getErrorMessage(err, 'Failed to download staff document.'));
      }
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleViewDocument = async (doc: StaffDocument) => {
    setViewingDocId(doc.id);
    try {
      const res = await api.get(`staff/${staff.id}/documents/${doc.id}/view`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: doc.mimeType || 'application/pdf' });
      const viewUrl = window.URL.createObjectURL(blob);
      window.open(viewUrl, '_blank');
    } catch (err) {
      console.error('View error:', err);
      if (doc.fileUrl && doc.fileUrl.startsWith('http') && !doc.fileUrl.includes('s3.local')) {
        window.open(doc.fileUrl, '_blank');
      } else {
        message?.error?.(getErrorMessage(err, 'Failed to open staff document.'));
      }
    } finally {
      setViewingDocId(null);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      message?.warning?.('Please select a document file to upload.');
      return;
    }

    const titleCandidate = docName.trim() || docFile.name.replace(/\.[^/.]+$/, '').trim();
    const titleErr = validateDocumentTitle(titleCandidate);
    if (titleErr) {
      setDocNameError(titleErr);
      message?.error?.(titleErr);
      return;
    }

    setIsUploading(true);
    setDocNameError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('name', titleCandidate);
      formData.append('documentType', docType);

      await api.post(`staff/${staff.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message?.success?.('Document uploaded and stored securely .');
      setDocFile(null);
      setDocName('');
      setDocType('ID_PROOF');
      setDocNameError(null);
      onRefresh();
    } catch (err: unknown) {
      message?.error?.(getErrorMessage(err, 'Failed to upload staff document.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = (docId: string, docTitle: string) => {
    setDocToDelete({ id: docId, name: docTitle });
  };

  const handleConfirmDeleteDocument = async () => {
    if (!docToDelete || !staff) return;

    setIsDeletingDocId(docToDelete.id);
    try {
      await api.delete(`staff/${staff.id}/documents/${docToDelete.id}`);
      message?.success?.('Document deleted successfully.');
      setDocToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      message?.error?.(getErrorMessage(err, 'Failed to delete document.'));
    } finally {
      setIsDeletingDocId(null);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus: StaffStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    setIsUpdatingStatus(true);
    try {
      await api.patch(`staff/${staff.id}/status`, { status: nextStatus });
      message?.success?.(`Staff profile ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      onStatusChange(staff, nextStatus);
    } catch (err: unknown) {
      message?.error?.(getErrorMessage(err, 'Failed to update staff status.'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const hero = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: '100%',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#0f172a',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 17,
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
            flexShrink: 0,
          }}
        >
          {staff.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17.5,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {staff.name}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              {staff.staffCode}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#334155',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '2px 8px',
                borderRadius: 5,
              }}
            >
              {staff.role}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 5,
                background: isActive ? '#f0fdf4' : '#f8fafc',
                border: isActive ? '1px solid #dcfce7' : '1px solid #e2e8f0',
                color: isActive ? '#15803d' : '#64748b',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isActive ? '#22c55e' : '#94a3b8',
                }}
              />
              {isActive ? 'Active Profile' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={() => onEdit(staff)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            height: 32,
            padding: '0 11px',
          }}
        >
          <Pencil size={13.5} />
          <span>Edit</span>
        </button>

        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={handleToggleStatus}
          disabled={isUpdatingStatus}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            height: 32,
            padding: '0 11px',
            color: isActive ? '#991b1b' : '#166534',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          {isUpdatingStatus ? (
            <Loader2 size={13.5} className="is-spinning" />
          ) : (
            <Power size={13.5} />
          )}
          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
        </button>

        {onDelete && (
          <button
            type="button"
            className="ui-btn ui-btn-neutral"
            onClick={() => onDelete(staff)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              height: 32,
              padding: '0 11px',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              background: '#fef2f2',
            }}
            title="Delete Staff Profile"
          >
            <Trash2 size={13.5} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );

  const stats = [
    {
      label: 'Staff Role',
      value: <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>{staff.role}</span>,
    },
    {
      label: 'Shift Timing',
      value: (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
          {staff.shiftTiming}
          {staff.customShiftDetails ? ` (${staff.customShiftDetails})` : ''}
        </span>
      ),
    },
    {
      label: 'Joining Date',
      value: <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{staff.joiningDate}</span>,
    },
  ];

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 10 }}>
      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        style={{ fontSize: 12.5, height: 35, padding: '0 14px' }}
      >
        Close
      </button>
      <button
        type="button"
        className="ui-btn"
        onClick={() => onEdit(staff)}
        style={{
          fontSize: 12.5,
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          borderRadius: 8,
          padding: '0 16px',
          height: 35,
          cursor: 'pointer',
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.24)',
        }}
      >
        <Pencil size={14} />
        <span>Edit Staff Details</span>
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open={Boolean(staff)}
      onClose={onClose}
      label="Staff Member Profile"
      hero={hero}
      stats={stats}
      footer={footer}
      size="lg"
      className="staff-view-drawer"
      width="min(740px, 100vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Hospital & Branch Placement */}
        <div className="staff-view-card">
          <div className="staff-view-header">
            <div className="staff-view-badge">
              <Building2 size={13.5} style={{ color: '#475569', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="staff-view-title">Hospital & Branch Assignment</div>
              <div className="staff-view-subtitle">Operational location, branch unit, and shift details</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div className="staff-view-item">
              <span className="staff-view-label">Assigned Hospital</span>
              <span className="staff-view-val" style={{ fontWeight: 600 }}>
                {staff.hospitalName || 'Main Hospital System'}
              </span>
            </div>

            <div className="staff-view-item">
              <span className="staff-view-label">Hospital Branch</span>
              <span className="staff-view-val" style={{ fontWeight: 600 }}>
                {staff.branchName || 'Central Campus'}
              </span>
            </div>

            <div className="staff-view-item">
              <span className="staff-view-label">Scheduled Shift</span>
              <span className="staff-view-val" style={{ fontWeight: 600 }}>
                {staff.shiftTiming}
                {staff.customShiftDetails && (
                  <span style={{ display: 'block', fontSize: 11.5, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                    {staff.customShiftDetails}
                  </span>
                )}
              </span>
            </div>

            <div className="staff-view-item">
              <span className="staff-view-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11.5} style={{ color: '#475569' }} />
                <span>Work Days</span>
              </span>
              <span className="staff-view-val" style={{ fontWeight: 600, color: '#0f172a' }}>
                {formatWorkDays(staff.workDays || staff.work_days)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3.5, flexWrap: 'wrap', marginTop: 4 }}>
                {WORK_DAY_OPTIONS.map((day) => {
                  const rawDays = staff.workDays || staff.work_days;
                  const daysList: string[] = Array.isArray(rawDays)
                    ? rawDays
                    : typeof rawDays === 'string'
                      ? rawDays.split(',').map((s) => s.trim()).filter(Boolean)
                      : DEFAULT_WORK_DAYS;
                  const isWorking = daysList.includes(day.id);
                  return (
                    <span
                      key={day.id}
                      style={{
                        fontSize: 10,
                        fontWeight: isWorking ? 700 : 500,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: isWorking ? '#f1f5f9' : '#f8fafc',
                        border: isWorking ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                        color: isWorking ? '#0f172a' : '#94a3b8',
                      }}
                    >
                      {day.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="staff-view-item">
              <span className="staff-view-label">Date of Joining</span>
              <span className="staff-view-val" style={{ fontWeight: 600 }}>
                {staff.joiningDate}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="staff-view-card">
          <div className="staff-view-header">
            <div className="staff-view-badge">
              <User size={13.5} style={{ color: '#475569', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="staff-view-title">Contact Information</div>
              <div className="staff-view-subtitle">Direct communication channels and physical address</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div className="staff-view-item">
              <span className="staff-view-label">Phone Number</span>
              <a
                href={`tel:${staff.phone}`}
                className="staff-view-val"
                style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
              >
                {staff.phone}
              </a>
            </div>

            <div className="staff-view-item">
              <span className="staff-view-label">Email Address</span>
              {staff.email ? (
                <a
                  href={`mailto:${staff.email}`}
                  className="staff-view-val"
                  style={{ color: '#2563eb', textDecoration: 'none' }}
                >
                  {staff.email}
                </a>
              ) : (
                <span className="staff-view-val" style={{ color: '#94a3b8' }}>
                  Not provided
                </span>
              )}
            </div>

            {staff.address && (
              <div className="staff-view-item" style={{ gridColumn: '1 / -1' }}>
                <span className="staff-view-label">Residential Address</span>
                <span className="staff-view-val" style={{ lineHeight: 1.5 }}>
                  {staff.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Staff Documents (Stored in R2 / S3) */}
        <div className="staff-view-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="staff-view-badge">
                <FileText size={13.5} style={{ color: '#475569', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="staff-view-title">Staff Documents & Certifications</div>
                <div className="staff-view-subtitle">Verified attachments stored</div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#334155',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '2px 8px',
                borderRadius: 9999,
              }}
            >
              {staff.documents?.length || 0} Files
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* List existing documents */}
            {staff.documents && staff.documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.documents.map((doc) => {
                  const isDeleting = isDeletingDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 9,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
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
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11,
                              color: '#64748b',
                              marginTop: 2,
                            }}
                          >
                            <span style={{ textTransform: 'capitalize' }}>
                              {doc.documentType.replace('_', ' ').toLowerCase()}
                            </span>
                            <span>·</span>
                            <span>{formatBytes(doc.fileSize)}</span>
                            {doc.uploadedAt && (
                              <>
                                <span>·</span>
                                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Document Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <a
                          href={doc.fileUrl || `/api/staff/${staff.id}/documents/${doc.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="ui-icon-btn"
                          title="View / Open Document"
                          onClick={(e) => {
                            e.preventDefault();
                            void handleViewDocument(doc);
                          }}
                          style={{ width: 28, height: 28 }}
                        >
                          {viewingDocId === doc.id ? (
                            <Loader2 size={13} className="is-spinning" />
                          ) : (
                            <ExternalLink size={13.5} />
                          )}
                        </a>

                        <a
                          href={`/api/staff/${staff.id}/documents/${doc.id}/download`}
                          download={doc.fileName || `${doc.name}.pdf`}
                          className="ui-icon-btn"
                          title="Download Document"
                          onClick={(e) => {
                            e.preventDefault();
                            void handleDownloadDocument(doc);
                          }}
                          style={{ width: 28, height: 28 }}
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 size={13} className="is-spinning" />
                          ) : (
                            <Download size={13.5} />
                          )}
                        </a>

                        <button
                          type="button"
                          className="ui-icon-btn ui-icon-btn-danger"
                          title="Delete Document"
                          disabled={isDeleting}
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          style={{ width: 28, height: 28 }}
                        >
                          {isDeleting ? <Loader2 size={13} className="is-spinning" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: '#64748b',
                }}
              >
                No documents uploaded yet for this staff member.
              </div>
            )}

            {/* Upload New Document Form */}
            <form
              onSubmit={handleUploadDocument}
              style={{
                marginTop: 4,
                padding: '14px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                Upload New Document
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label
                    htmlFor="staff-drawer-doc-title"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span>Document Title</span>
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>Letters & numbers</span>
                  </label>
                  <input
                    id="staff-drawer-doc-title"
                    type="text"
                    className="ui-input"
                    placeholder="e.g. Nursing Council License"
                    value={docName}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Backspace' ||
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        e.key === 'Delete' ||
                        e.key === 'Escape' ||
                        e.key.startsWith('Arrow') ||
                        e.ctrlKey ||
                        e.metaKey
                      ) {
                        return;
                      }
                      if (!/^[a-zA-Z0-9\s._()&/ -]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s._()&/ -]/g, '');
                      setDocName(cleaned);
                      if (docNameError) {
                        setDocNameError(validateDocumentTitle(cleaned) ?? null);
                      }
                    }}
                    onBlur={() => {
                      if (docName.trim()) {
                        setDocNameError(validateDocumentTitle(docName) ?? null);
                      }
                    }}
                    style={{
                      height: 34,
                      fontSize: 12.5,
                      borderColor: docNameError ? '#ef4444' : undefined,
                      boxShadow: docNameError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {docNameError && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                        color: '#dc2626',
                        fontSize: 11.5,
                      }}
                    >
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{docNameError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="staff-drawer-doc-type"
                    style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}
                  >
                    Category
                  </label>
                  <SearchableSelect
                    id="staff-drawer-doc-type"
                    name="docType"
                    aria-label="Category"
                    options={DRAWER_DOC_TYPE_OPTIONS}
                    value={docType}
                    onChange={(val) => setDocType(val)}
                    searchable={false}
                    size="sm"
                    placeholder="Select category..."
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="staff-drawer-file-input"
                  style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}
                >
                  File (PDF, PNG, JPG, DOCX)
                </label>
                <input
                  id="staff-drawer-file-input"
                  type="file"
                  className="ui-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDocFile(file);
                    if (file && !docName) {
                      setDocName(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  style={{ height: 34, fontSize: 12, padding: '4px 8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
                  disabled={isUploading || !docFile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12.5,
                    height: 34,
                    padding: '0 14px',
                  }}
                >
                  {isUploading ? (
                    <Loader2 size={13.5} className="is-spinning" />
                  ) : (
                    <Upload size={13.5} />
                  )}
                  <span>Upload Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Administrative Notes */}
        {staff.notes && (
          <div className="staff-view-card">
            <div className="staff-view-header">
              <div className="staff-view-badge">
                <FileText size={13.5} style={{ color: '#475569', display: 'block', margin: 'auto' }} />
              </div>
              <div>
                <div className="staff-view-title">Internal Administrative Remarks</div>
                <div className="staff-view-subtitle">Staff management records and internal notes</div>
              </div>
            </div>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12.5,
                color: '#334155',
                lineHeight: 1.5,
              }}
            >
              {staff.notes}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#94a3b8',
            borderTop: '1px solid #e2e8f0',
            paddingTop: 8,
          }}
        >
          <span>Created: {new Date(staff.createdAt).toLocaleString()}</span>
          <span>ID: {staff.id}</span>
        </div>
      </div>

      <style>{`
        .staff-view-drawer {
          width: min(740px, 100vw) !important;
          max-width: 740px !important;
          box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
        }
        .staff-view-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .staff-view-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .staff-view-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0;
        }
        .staff-view-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .staff-view-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 1px;
        }
        .staff-view-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 8px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }
        .staff-view-label {
          font-size: 11px;
          color: #64748b;
        }
        .staff-view-val {
          color: #0f172a;
          font-size: 12.5px;
        }
        .delete-doc-modal {
          max-width: 480px !important;
          border-radius: 14px !important;
          overflow: hidden !important;
        }
        .delete-doc-modal .ui-modal-head {
          padding: 18px 24px 16px !important;
          border-bottom: 1px solid #f1f5f9;
        }
        .delete-doc-modal .ui-modal-body {
          padding: 22px 24px !important;
          background: #ffffff;
        }
        .delete-doc-modal .ui-modal-foot {
          padding: 14px 24px !important;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }
      `}</style>
    </Drawer>

    {/* Delete Document Confirmation Modal */}
    <Modal
      open={docToDelete !== null}
      onClose={isDeletingDocId !== null ? () => undefined : () => setDocToDelete(null)}
      size="sm"
      className="delete-doc-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Trash2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Delete Document
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Permanently remove staff credential document
            </div>
          </div>
        </div>
      }
    >
      <div
        className="ui-modal-body"
        style={{
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#ffffff',
        }}
      >
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
          Are you sure you want to permanently delete{' '}
          <strong style={{ color: '#0f172a' }}>"{docToDelete?.name}"</strong>? This will remove the file from storage and cannot be undone.
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            fontSize: 12,
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>This action cannot be undone.</span>
        </div>
      </div>

      <div
        className="ui-modal-foot"
        style={{
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          onClick={() => setDocToDelete(null)}
          disabled={isDeletingDocId !== null}
          style={{ height: 36, padding: '0 16px', fontSize: 12.5 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-danger"
          disabled={isDeletingDocId !== null}
          onClick={handleConfirmDeleteDocument}
          style={{
            height: 36,
            padding: '0 16px',
            fontSize: 12.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          {isDeletingDocId !== null ? (
            <>
              <Loader2 size={13} className="is-spinning" />
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 size={13} />
              <span>Delete Permanently</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  </>
  );
}
