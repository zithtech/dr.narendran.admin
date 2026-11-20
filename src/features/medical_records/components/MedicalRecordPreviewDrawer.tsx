import { Button, Drawer, Space, Tag, Typography } from 'antd';
import { Calendar, Download, ExternalLink, FileText, Stethoscope, User } from 'lucide-react';
import React from 'react';
import { getAuthenticatedFileUrl } from '@/utils/fileUrl';
import type { MedicalRecord } from '../types/medicalRecords';

const { Text, Title } = Typography;

export interface MedicalRecordPreviewDrawerProps {
  record: MedicalRecord | null;
  open: boolean;
  onClose: () => void;
}

export const MedicalRecordPreviewDrawer: React.FC<MedicalRecordPreviewDrawerProps> = ({
  record,
  open,
  onClose,
}) => {
  if (!record) return null;

  const isPdf =
    record.fileType.toLowerCase().includes('pdf') ||
    record.fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    record.fileType.toLowerCase().includes('image') ||
    Boolean(record.fileName.match(/\.(png|jpe?g|webp|gif)$/i));

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const rawUrl = record.documentUrl || `/api/medical-records/${record.id}/file`;
  const viewUrl = getAuthenticatedFileUrl(rawUrl, false);
  const downloadUrl = getAuthenticatedFileUrl(rawUrl, true);

  const handleOpenNewTab = () => {
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <style>{`
        .medical-record-preview-drawer {
          max-width: 100vw !important;
        }
        .medical-record-preview-drawer .ant-drawer-header {
          padding: 12px 14px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }
        .medical-record-preview-drawer .ant-drawer-body {
          padding: 14px 14px !important;
          background: #f8fafc !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          overflow-y: auto !important;
        }
        .medical-record-preview-drawer .ant-drawer-footer {
          padding: 10px 14px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }
        @media (min-width: 640px) {
          .medical-record-preview-drawer .ant-drawer-header {
            padding: 16px 24px !important;
          }
          .medical-record-preview-drawer .ant-drawer-body {
            padding: 20px 24px !important;
            gap: 16px !important;
          }
          .medical-record-preview-drawer .ant-drawer-footer {
            padding: 14px 24px !important;
          }
        }
      `}</style>
      <Drawer
        open={open}
        onClose={onClose}
        width="min(1040px, 98vw)"
        destroyOnClose
        className="medical-record-preview-drawer"
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full pr-1 sm:pr-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  flexShrink: 0,
                }}
              >
                <FileText size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {record.testName || record.fileName || 'Medical Document'}
                </Title>
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  {record.fileName} • {formatFileSize(record.fileSize)}
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag color={record.isExternal ? 'purple' : 'blue'} style={{ margin: 0, fontSize: 11 }}>
                {record.isExternal ? 'External Record' : 'Prescribed Lab Test'}
              </Tag>
              <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>Uploaded by {record.uploadedBy}</Tag>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2 flex-wrap w-full">
            <Button onClick={onClose}>Close</Button>
            <Space wrap>
              <Button
                icon={<ExternalLink size={14} />}
                onClick={handleOpenNewTab}
                aria-label="Open document in new tab"
              >
                <span className="hidden sm:inline">Open in New Tab</span>
                <span className="sm:hidden">Open</span>
              </Button>
              <Button
                type="primary"
                icon={<Download size={14} />}
                onClick={handleDownload}
                aria-label="Download document"
              >
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">Download</span>
              </Button>
            </Space>
          </div>
        }
      >
        {/* Patient & Metadata Card */}
        <div
          className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap gap-2.5 sm:gap-4 items-center"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <User size={14} style={{ color: '#64748b' }} />
            <Text strong style={{ color: '#475569', fontSize: 12 }}>Patient:</Text>
            <Text style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{record.patientName}</Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Calendar size={14} style={{ color: '#64748b' }} />
            <Text strong style={{ color: '#475569', fontSize: 12 }}>Report Date:</Text>
            <Text style={{ color: '#0f172a', fontSize: 12 }}>{record.reportDate}</Text>
          </div>

          {record.doctorName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Stethoscope size={14} style={{ color: '#64748b' }} />
              <Text strong style={{ color: '#475569', fontSize: 12 }}>Doctor:</Text>
              <Text style={{ color: '#0f172a', fontSize: 12 }}>{record.doctorName}</Text>
            </div>
          )}

          {record.notes && (
            <div style={{ width: '100%', marginTop: 2, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
              <Text strong style={{ color: '#475569', fontSize: 12 }}>Clinical Notes: </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.notes}</Text>
            </div>
          )}
        </div>

        {/* Document Content Preview Frame */}
        <div
          style={{
            flex: 1,
            minHeight: 'calc(100vh - 320px)',
            background: '#0f172a',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #334155',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.2)',
          }}
        >
          {isPdf ? (
            <iframe
              src={`${viewUrl}#toolbar=1`}
              title={record.testName}
              style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 320px)', border: 'none' }}
            />
          ) : isImage ? (
            <img
              src={viewUrl}
              alt={record.testName}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 330px)',
                objectFit: 'contain',
                padding: 8,
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              <FileText size={48} style={{ marginBottom: 12, opacity: 0.6 }} />
              <p style={{ fontSize: 14, marginBottom: 14 }}>Preview not available for this file format.</p>
              <Button type="primary" icon={<Download size={15} />} onClick={handleDownload}>
                Download Document
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

// Backwards compatibility alias
export const MedicalRecordPreviewModal = MedicalRecordPreviewDrawer;
export type MedicalRecordPreviewModalProps = MedicalRecordPreviewDrawerProps;
