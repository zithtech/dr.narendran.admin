import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '../../../components/ui/primitives';
import type {
  MedicalRecord,
  PatientDossier,
  PrescribedPendingTest,
} from '../types/medicalRecords';

const { Text, Title } = Typography;

interface PatientDossierViewProps {
  dossier: PatientDossier;
  onClose: () => void;
  onUploadClick: (prescribedTest?: PrescribedPendingTest) => void;
  onPreviewClick: (record: MedicalRecord) => void;
  onEditClick: (record: MedicalRecord) => void;
  onDeleteClick: (record: MedicalRecord) => void;
}

export const PatientDossierView: React.FC<PatientDossierViewProps> = ({
  dossier,
  onClose,
  onUploadClick,
  onPreviewClick,
  onEditClick,
  onDeleteClick,
}) => {
  const navigate = useNavigate();
  const { patient, pendingPrescribedTests, records } = dossier;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Prescribed Lab Tests Table Columns
  const prescribedColumns: ColumnsType<PrescribedPendingTest> = [
    {
      title: 'Prescribed Test',
      key: 'testName',
      render: (_, item) => (
        <div>
          <Text strong>{item.testName}</Text>
          {item.instructions && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Instructions: {item.instructions}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Prescription Date',
      dataIndex: 'prescriptionDate',
      key: 'prescriptionDate',
      width: 150,
      render: (date) => (
        <Space size={4}>
          <Calendar size={14} className="text-slate-400" />
          <span>{date || 'Not specified'}</span>
        </Space>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      width: 180,
      render: (_, item) => (
        <div>
          <Text>{item.doctorName || 'Dr. Narendran'}</Text>
          {item.doctorSpecialization && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {item.doctorSpecialization}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, item) =>
        item.status === 'Uploaded' ? (
          <Tag color="success" icon={<CheckCircle2 size={12} style={{ marginRight: 4 }} />}>
            Uploaded ({item.reportsCount})
          </Tag>
        ) : (
          <Tag color="warning" icon={<Clock size={12} style={{ marginRight: 4 }} />}>
            Pending Upload
          </Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, item) => (
        <Button
          type="primary"
          size="small"
          icon={<Upload size={13} />}
          onClick={() => onUploadClick(item)}
        >
          Upload Report
        </Button>
      ),
    },
  ];

  // Uploaded Records Table Columns
  const recordsColumns: ColumnsType<MedicalRecord> = [
    {
      title: 'Report Date',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: 'Record / Test Name',
      key: 'testName',
      render: (_, record) => (
        <div>
          <Text strong style={{ cursor: 'pointer', color: '#0284c7' }} onClick={() => onPreviewClick(record)}>
            {record.testName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.fileName} • {formatFileSize(record.fileSize)}
            </Text>
          </div>
          {record.notes && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" italic style={{ fontSize: 12 }}>
                Notes: {record.notes}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      width: 160,
      render: (_, record) => (
        <Tag color={record.isExternal ? 'purple' : 'blue'}>
          {record.isExternal ? 'External Record' : 'Prescribed Lab Test'}
        </Tag>
      ),
    },
    {
      title: 'Uploaded By',
      key: 'uploadedBy',
      width: 160,
      render: (_, record) => (
        <div>
          <Tag color="cyan">{record.uploadedBy}</Tag>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.uploaderName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      align: 'right',
      render: (_, record) => (
        <Space orientation="horizontal" size={4}>
          <Button
            size="small"
            type="text"
            icon={<Eye size={15} className="text-primary-600" />}
            title="Preview Document"
            onClick={() => onPreviewClick(record)}
          />
          <Button
            size="small"
            type="text"
            icon={<Download size={15} className="text-slate-600" />}
            title="Download Document"
            onClick={() => window.open(record.documentUrl, '_blank')}
          />
          <Button
            size="small"
            type="text"
            icon={<Pencil size={15} className="text-amber-600" />}
            title="Edit Metadata"
            onClick={() => onEditClick(record)}
          />
          <Popconfirm
            title="Delete Medical Record"
            description="Are you sure you want to permanently delete this medical record?"
            okText="Delete"
            okType="danger"
            onConfirm={() => onDeleteClick(record)}
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<Trash2 size={15} />}
              title="Delete Record"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Patient Header Card */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderColor: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar src={patient.profileImageUrl} name={patient.name} size={56} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {patient.name}
                </Title>
                {patient.gender && <Tag color="geekblue">{patient.gender}</Tag>}
                {patient.bloodGroup && <Tag color="volcano">{patient.bloodGroup}</Tag>}
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {patient.phone && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    📞 {patient.phone}
                  </Text>
                )}
                {patient.email && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ✉️ {patient.email}
                  </Text>
                )}
                {patient.dateOfBirth && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    🎂 DOB: {patient.dateOfBirth}
                  </Text>
                )}
                {patient.address && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    📍 {patient.address}
                  </Text>
                )}
              </div>
            </div>
          </div>

          <Space wrap>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => onUploadClick()}
            >
              Upload Medical Record
            </Button>
            <Button
              icon={<History size={16} />}
              onClick={() => navigate(`/patient-timelines/${patient.id}`)}
            >
              Patient Timeline
            </Button>
            <Button icon={<X size={16} />} onClick={onClose}>
              Close Patient Dossier
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabs: Prescribed Tests & Uploaded Records */}
      <Tabs
        defaultActiveKey="records"
        items={[
          {
            key: 'records',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} />
                <span>Uploaded Medical Records ({records.length})</span>
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                dataSource={records}
                columns={recordsColumns}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'No medical records uploaded for this patient yet.' }}
              />
            ),
          },
          {
            key: 'prescribed',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} />
                <span>Doctor Prescribed Tests ({pendingPrescribedTests.length})</span>
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                dataSource={pendingPrescribedTests}
                columns={prescribedColumns}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'No lab tests prescribed by doctors for this patient.' }}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
