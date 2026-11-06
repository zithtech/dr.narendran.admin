import { App } from 'antd';
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import type { StaffDocument, StaffMember, StaffStatus } from '../types/staff';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Drawer } from './ui/Drawer';
import { Badge } from './ui/primitives';

interface StaffDrawerProps {
  staff: StaffMember | null;
  onClose: () => void;
  onEdit: (staff: StaffMember) => void;
  onStatusChange: (staff: StaffMember, newStatus: StaffStatus) => void;
  onRefresh: () => void;
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
}: StaffDrawerProps) {
  const { message } = App.useApp();

  // Document upload state inside drawer
  const [isUploading, setIsUploading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docNameError, setDocNameError] = useState<string | null>(null);
  const [docType, setDocType] = useState('ID_PROOF');
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
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

      message?.success?.('Document uploaded and stored securely in R2/S3.');
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

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"? This will permanently remove it from storage.`)) {
      return;
    }

    setIsDeletingDocId(docId);
    try {
      await api.delete(`staff/${staff.id}/documents/${docId}`);
      message?.success?.('Document deleted successfully.');
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 18,
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
            flexShrink: 0,
          }}
        >
          {staff.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ui-text, #0f172a)' }}>
              {staff.name}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {staff.staffCode}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Badge tone="blue">{staff.role}</Badge>
            <Badge tone={isActive ? 'green' : 'neutral'}>
              {isActive ? 'Active Profile' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="ui-btn ui-btn-subtle"
          onClick={() => onEdit(staff)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
        >
          <Pencil size={14} />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isUpdatingStatus}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            padding: '6px 12px',
            borderRadius: 7,
            fontWeight: 600,
            cursor: 'pointer',
            border: isActive ? '1px solid #fecaca' : '1px solid #bbf7d0',
            background: isActive ? '#fef2f2' : '#f0fdf4',
            color: isActive ? '#dc2626' : '#16a34a',
          }}
        >
          {isUpdatingStatus ? (
            <Loader2 size={14} className="is-spinning" />
          ) : (
            <Power size={14} />
          )}
          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
        </button>
      </div>
    </div>
  );

  const stats = [
    {
      label: 'Staff Role',
      value: <span style={{ fontWeight: 600, color: '#1e293b' }}>{staff.role}</span>,
    },
    {
      label: 'Shift Timing',
      value: (
        <span style={{ fontWeight: 600, color: '#0369a1' }}>
          {staff.shiftTiming}
          {staff.customShiftDetails ? ` (${staff.customShiftDetails})` : ''}
        </span>
      ),
    },
    {
      label: 'Joining Date',
      value: <span style={{ fontWeight: 600, color: '#1e293b' }}>{staff.joiningDate}</span>,
    },
  ];

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 10 }}>
      <button type="button" className="ui-btn" onClick={onClose}>
        Close
      </button>
      <button
        type="button"
        className="ui-btn ui-btn-primary"
        onClick={() => onEdit(staff)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Pencil size={15} />
        <span>Edit Staff Details</span>
      </button>
    </div>
  );

  return (
    <Drawer
      open={Boolean(staff)}
      onClose={onClose}
      label="Staff Member Profile"
      hero={hero}
      stats={stats}
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hospital & Branch Placement */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Building2 size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Hospital & Branch Assignment
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Operational location, branch unit, and shift details
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <Building2 size={16} style={{ color: '#0284c7', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assigned Hospital
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                  {staff.hospitalName || 'Main Hospital System'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <GitBranch size={16} style={{ color: '#0284c7', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hospital Branch
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                  {staff.branchName || 'Central Campus'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <Clock size={16} style={{ color: '#0284c7', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Scheduled Shift
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                  {staff.shiftTiming}
                  {staff.customShiftDetails && (
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 400 }}>{staff.customShiftDetails}</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <Calendar size={16} style={{ color: '#0284c7', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Date of Joining
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                  {staff.joiningDate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Contact & Address
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Direct communication channels and physical address
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
              <Phone size={15} style={{ color: '#0284c7' }} />
              <a
                href={`tel:${staff.phone}`}
                style={{ fontSize: 13.5, fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}
              >
                {staff.phone}
              </a>
            </div>

            {staff.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <Mail size={15} style={{ color: '#0284c7' }} />
                <a
                  href={`mailto:${staff.email}`}
                  style={{ fontSize: 13.5, color: '#0284c7', textDecoration: 'none' }}
                >
                  {staff.email}
                </a>
              </div>
            )}

            {staff.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <MapPin size={15} style={{ color: '#64748b', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  {staff.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Staff Documents (Stored in R2 / S3) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <FileText size={15} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Staff Documents & Certifications
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Verified attachments stored in Cloudflare R2
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: 9999,
              }}
            >
              {staff.documents?.length || 0} Files
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: '#f1f5f9',
                            color: '#0284c7',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {doc.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
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
                        >
                          {viewingDocId === doc.id ? (
                            <Loader2 size={14} className="is-spinning" />
                          ) : (
                            <ExternalLink size={15} />
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
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 size={14} className="is-spinning" />
                          ) : (
                            <Download size={15} />
                          )}
                        </a>

                        <button
                          type="button"
                          className="ui-icon-btn ui-icon-btn-danger"
                          title="Delete Document"
                          disabled={isDeleting}
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        >
                          {isDeleting ? <Loader2 size={14} className="is-spinning" /> : <Trash2 size={14} />}
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
                  fontSize: 13,
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
                marginTop: 8,
                padding: '14px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Upload New Document (Cloudflare R2 / S3)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label htmlFor="staff-drawer-doc-title" style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Document Title</span>
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: '#94a3b8' }}>Letters & numbers</span>
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
                      borderColor: docNameError ? '#ef4444' : undefined,
                      boxShadow: docNameError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : undefined,
                    }}
                  />
                  {docNameError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#dc2626', fontSize: 11.5 }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      <span>{docNameError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="staff-drawer-doc-type" style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    id="staff-drawer-doc-type"
                    className="ui-input ui-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="ID_PROOF">ID Proof</option>
                    <option value="CERTIFICATION">Degree / Certification</option>
                    <option value="RESUME">Resume / CV</option>
                    <option value="CONTRACT">Employment Contract</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="staff-drawer-file-input" style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
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
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
                  disabled={isUploading || !docFile}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                >
                  {isUploading ? (
                    <Loader2 size={14} className="is-spinning" />
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>Upload Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Administrative Notes */}
        {staff.notes && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <FileText size={15} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Internal Administrative Remarks
              </div>
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 13,
                color: '#334155',
                lineHeight: 1.5,
              }}
            >
              {staff.notes}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ fontSize: 11.5, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
          Created: {new Date(staff.createdAt).toLocaleString()} · ID: {staff.id}
        </div>
      </div>
    </Drawer>
  );
}
