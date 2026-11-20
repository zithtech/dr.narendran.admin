import { Button, Drawer, Space, Tag, Typography } from 'antd';
import { Calendar, Download, ExternalLink, FileText, Stethoscope, User } from 'lucide-react';
import React from 'react';
import { getAuthenticatedFileUrl } from '../../../utils/fileUrl';
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
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1040px, 96vw)"
      destroyOnClose
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '20px 24px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Title level={5} style={{ margin: 0, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {record.testName || record.fileName || 'Medical Document'}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.fileName} • {formatFileSize(record.fileSize)}
              </Text>
            </div>
          </div>
          <Space>
            <Tag color={record.isExternal ? 'purple' : 'blue'}>
              {record.isExternal ? 'External Record' : 'Prescribed Lab Test'}
            </Tag>
            <Tag color="cyan">Uploaded by {record.uploadedBy}</Tag>
          </Space>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={onClose}>Close</Button>
          <Space>
            <Button icon={<ExternalLink size={15} />} onClick={handleOpenNewTab}>
              Open in New Tab
            </Button>
            <Button
              type="primary"
              icon={<Download size={15} />}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Space>
        </div>
      }
    >
      {/* Patient & Metadata Card */}
      <div
        style={{
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <User size={15} style={{ color: '#64748b' }} />
          <Text strong style={{ color: '#475569' }}>Patient:</Text>
          <Text style={{ fontWeight: 600, color: '#0f172a' }}>{record.patientName}</Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Calendar size={15} style={{ color: '#64748b' }} />
          <Text strong style={{ color: '#475569' }}>Report Date:</Text>
          <Text style={{ color: '#0f172a' }}>{record.reportDate}</Text>
        </div>

        {record.doctorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Stethoscope size={15} style={{ color: '#64748b' }} />
            <Text strong style={{ color: '#475569' }}>Doctor:</Text>
            <Text style={{ color: '#0f172a' }}>{record.doctorName}</Text>
          </div>
        )}

        {record.notes && (
          <div style={{ width: '100%', marginTop: 2, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
            <Text strong style={{ color: '#475569' }}>Clinical Notes: </Text>
            <Text type="secondary">{record.notes}</Text>
          </div>
        )}
      </div>

      {/* Document Content Preview Frame */}
      <div
        style={{
          flex: 1,
          minHeight: 'calc(100vh - 290px)',
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
            style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 290px)', border: 'none' }}
          />
        ) : isImage ? (
          <img
            src={viewUrl}
            alt={record.testName}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 310px)',
              objectFit: 'contain',
              padding: 12,
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
            <FileText size={52} style={{ marginBottom: 14, opacity: 0.6 }} />
            <p style={{ fontSize: 15, marginBottom: 16 }}>Preview not available for this file format.</p>
            <Button type="primary" icon={<Download size={16} />} onClick={handleDownload}>
              Download Document
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
};

// Backwards compatibility alias
export const MedicalRecordPreviewModal = MedicalRecordPreviewDrawer;
export type MedicalRecordPreviewModalProps = MedicalRecordPreviewDrawerProps;
