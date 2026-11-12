import { Button, Modal, Space, Tag, Typography } from 'antd';
import { Calendar, Download, ExternalLink, FileText, User } from 'lucide-react';
import React from 'react';
import type { MedicalRecord } from '../types/medicalRecords';

const { Text, Title } = Typography;

interface MedicalRecordPreviewModalProps {
  record: MedicalRecord | null;
  open: boolean;
  onClose: () => void;
}

export const MedicalRecordPreviewModal: React.FC<MedicalRecordPreviewModalProps> = ({
  record,
  open,
  onClose,
}) => {
  if (!record) return null;

  const isPdf = record.fileType.toLowerCase().includes('pdf') || record.fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    record.fileType.toLowerCase().includes('image') ||
    record.fileName.match(/\.(png|jpe?g|webp|gif)$/i);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    window.open(record.documentUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={850}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={20} className="text-primary-600" />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {record.testName}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {record.fileName} • {formatFileSize(record.fileSize)}
            </Text>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color={record.isExternal ? 'purple' : 'blue'}>
              {record.isExternal ? 'External Record' : 'Prescribed Lab Test'}
            </Tag>
            <Tag color="cyan">Uploaded by {record.uploadedBy}</Tag>
          </Space>
          <Space>
            <Button icon={<ExternalLink size={16} />} onClick={handleDownload}>
              Open in New Tab
            </Button>
            <Button
              type="primary"
              icon={<Download size={16} />}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      {/* Patient & Metadata Bar */}
      <div
        style={{
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={15} style={{ color: '#64748b' }} />
          <Text strong>Patient:</Text>
          <Text>{record.patientName}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={15} style={{ color: '#64748b' }} />
          <Text strong>Report Date:</Text>
          <Text>{record.reportDate}</Text>
        </div>
        {record.doctorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong>Doctor:</Text>
            <Text>{record.doctorName}</Text>
          </div>
        )}
        {record.notes && (
          <div style={{ width: '100%', marginTop: 4 }}>
            <Text strong>Notes: </Text>
            <Text type="secondary">{record.notes}</Text>
          </div>
        )}
      </div>

      {/* Document Content Preview */}
      <div
        style={{
          height: 520,
          background: '#0f172a',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isPdf ? (
          <iframe
            src={`${record.documentUrl}#toolbar=1`}
            title={record.testName}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : isImage ? (
          <img
            src={record.documentUrl}
            alt={record.testName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={48} style={{ marginBottom: 12, opacity: 0.6 }} />
            <p>Preview not available for this file type.</p>
            <Button type="primary" icon={<Download size={16} />} onClick={handleDownload}>
              Download Document
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

