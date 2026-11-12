import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Calendar,
  Download,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { EditMedicalRecordModal } from '../components/EditMedicalRecordModal';
import { MedicalRecordPreviewModal } from '../components/MedicalRecordPreviewModal';
import { PatientDossierView } from '../components/PatientDossierView';
import { UploadMedicalRecordModal } from '../components/UploadMedicalRecordModal';
import { medicalRecordsApi } from '../services/medicalRecordsApi';
import type {
  MedicalRecord,
  PatientDossier,
  PrescribedPendingTest,
} from '../types/medicalRecords';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function MedicalRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { patientId: routePatientId } = useParams<{ patientId?: string }>();

  // Selected Patient State for Dossier Mode
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    routePatientId || searchParams.get('patientId') || null
  );

  useEffect(() => {
    if (routePatientId) {
      setSelectedPatientId(routePatientId);
    } else if (searchParams.get('patientId')) {
      setSelectedPatientId(searchParams.get('patientId'));
    }
  }, [routePatientId, searchParams]);
  const [dossier, setDossier] = useState<PatientDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Patient Quick Search Autocomplete
  const [patientSearchOptions, setPatientSearchOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  // All Records Table State
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRESCRIBED' | 'EXTERNAL'>('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Modals State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activePrescribedTest, setActivePrescribedTest] =
    useState<PrescribedPendingTest | null>(null);
  const [previewRecord, setPreviewRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);

  // Load Patient Dossier
  const loadDossier = useCallback(async (pId: string) => {
    setLoadingDossier(true);
    try {
      const data = await medicalRecordsApi.getPatientDossier(pId);
      setDossier(data);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to load patient dossier');
      setDossier(null);
    } finally {
      setLoadingDossier(false);
    }
  }, []);

  // Fetch All Records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        type: typeFilter,
      };

      if (search.trim()) params.search = search.trim();
      if (uploaderFilter !== 'ALL') params.uploadedBy = uploaderFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.fromDate = dateRange[0].format('YYYY-MM-DD');
        params.toDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await medicalRecordsApi.getMedicalRecords(params);
      setRecords(res.records || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to fetch medical records');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter, uploaderFilter, dateRange]);

  // Synchronize URL param with state
  useEffect(() => {
    const urlPatientId = searchParams.get('patientId');
    if (urlPatientId) {
      setSelectedPatientId(urlPatientId);
      void loadDossier(urlPatientId);
    } else {
      setSelectedPatientId(null);
      setDossier(null);
      void fetchRecords();
    }
  }, [searchParams, loadDossier, fetchRecords]);

  // Patient Quick Search in Header
  useEffect(() => {
    void (async () => {
      try {
        const results = await medicalRecordsApi.getAllPatients();
        setPatientSearchOptions(
          results.map((p) => ({
            value: p.id,
            label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
          }))
        );
      } catch {
        // ignore
      }
    })();
  }, []);

  const handlePatientSearch = async (val: string) => {
    setPatientSearchLoading(true);
    try {
      const results = val.trim()
        ? await medicalRecordsApi.searchPatients(val)
        : await medicalRecordsApi.getAllPatients();
      setPatientSearchOptions(
        results.map((p) => ({
          value: p.id,
          label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
        }))
      );
    } catch {
      // ignore
    } finally {
      setPatientSearchLoading(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSearchParams({ patientId });
    void loadDossier(patientId);
  };

  const handleClearPatient = () => {
    setSelectedPatientId(null);
    setDossier(null);
    setSearchParams({});
    void fetchRecords();
  };

  // Delete Action
  const handleDeleteRecord = async (rec: MedicalRecord) => {
    try {
      await medicalRecordsApi.deleteMedicalRecord(rec.id);
      message.success(`Medical record "${rec.testName}" deleted`);
      if (selectedPatientId) {
        void loadDossier(selectedPatientId);
      } else {
        void fetchRecords();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to delete record');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // All Records Table Columns
  const columns: ColumnsType<MedicalRecord> = [
    {
      title: 'Report Date',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 120,
      render: (date) => (
        <Space size={4}>
          <Calendar size={14} className="text-slate-400" />
          <span>{date || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Patient',
      key: 'patient',
      width: 220,
      render: (_, record) => (
        <div>
          <Text
            strong
            style={{ color: '#0284c7', cursor: 'pointer' }}
            onClick={() => handleSelectPatient(record.patientId)}
            title="Click to view patient records dossier"
          >
            {record.patientName}
          </Text>
          {record.patientPhone && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.patientPhone}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Test / Document Name',
      key: 'testName',
      render: (_, record) => (
        <div>
          <Text
            strong
            style={{ color: '#1e293b', cursor: 'pointer' }}
            onClick={() => setPreviewRecord(record)}
          >
            {record.testName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.fileName} • {formatFileSize(record.fileSize)}
            </Text>
          </div>
          {record.notes && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" italic style={{ fontSize: 11 }}>
                {record.notes}
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
            onClick={() => setPreviewRecord(record)}
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
            onClick={() => setEditingRecord(record)}
          />
          <Popconfirm
            title="Delete Medical Record"
            description="Are you sure you want to permanently delete this medical record?"
            okText="Delete"
            okType="danger"
            onConfirm={() => handleDeleteRecord(record)}
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
    <div style={{ padding: '4px 0 24px 0' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} className="text-primary-600" />
            <span>Medical Records Management</span>
          </Title>
          <Text type="secondary">
            Upload, manage, and review patient lab reports and medical records directly
          </Text>
        </div>

        <Space wrap>
          {/* Patient Quick Selector */}
          <div style={{ width: 280 }}>
            <Select
              showSearch
              allowClear
              placeholder="Filter by Patient..."
              options={patientSearchOptions}
              onSearch={handlePatientSearch}
              onChange={(val) => {
                if (val) handleSelectPatient(val);
                else handleClearPatient();
              }}
              value={selectedPatientId || undefined}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              loading={patientSearchLoading}
            />
          </div>

          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => {
              if (selectedPatientId) loadDossier(selectedPatientId);
              else fetchRecords();
            }}
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<Upload size={16} />}
            onClick={() => {
              setActivePrescribedTest(null);
              setIsUploadOpen(true);
            }}
          >
            Upload Medical Record
          </Button>
        </Space>
      </div>

      {/* View Switch: Patient Dossier vs All Records */}
      {selectedPatientId && loadingDossier ? (
        <Card loading style={{ borderColor: '#e2e8f0', minHeight: 320 }} />
      ) : selectedPatientId && dossier ? (
        <PatientDossierView
          dossier={dossier}
          onClose={handleClearPatient}
          onUploadClick={(prescribedTest) => {
            setActivePrescribedTest(prescribedTest || null);
            setIsUploadOpen(true);
          }}
          onPreviewClick={(record) => setPreviewRecord(record)}
          onEditClick={(record) => setEditingRecord(record)}
          onDeleteClick={(record) => handleDeleteRecord(record)}
        />
      ) : (
        <Card style={{ borderColor: '#e2e8f0' }}>
          {/* Filters Bar */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={7}>
              <Input
                placeholder="Search record name, file, or patient..."
                prefix={<Search size={16} className="text-slate-400" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={12} sm={6} md={5}>
              <Select
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Record Types' },
                  { value: 'PRESCRIBED', label: 'Prescribed Lab Tests' },
                  { value: 'EXTERNAL', label: 'External Medical Docs' },
                ]}
              />
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Select
                value={uploaderFilter}
                onChange={(val) => setUploaderFilter(val)}
                style={{ width: '100%' }}
                options={[
                  { value: 'ALL', label: 'All Uploaders' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'DOCTOR', label: 'Doctor' },
                  { value: 'LAB', label: 'Lab' },
                  { value: 'PATIENT', label: 'Patient' },
                ]}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Col>

            <Col xs={24} sm={12} md={2}>
              <Button
                style={{ width: '100%' }}
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
                  setUploaderFilter('ALL');
                  setDateRange(null);
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </Col>
          </Row>

          {/* Records Table */}
          <Table
            rowKey="id"
            columns={columns}
            dataSource={records}
            loading={loading}
            pagination={{
              current: page,
              pageSize: limit,
              total: totalCount,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              onChange: (p, s) => {
                setPage(p);
                setLimit(s);
              },
            }}
            locale={{ emptyText: 'No medical records found.' }}
          />
        </Card>
      )}

      {/* Upload Modal */}
      <UploadMedicalRecordModal
        open={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setActivePrescribedTest(null);
        }}
        onSuccess={() => {
          if (selectedPatientId) {
            void loadDossier(selectedPatientId);
          } else {
            void fetchRecords();
          }
        }}
        defaultPatient={
          selectedPatientId && dossier
            ? { id: dossier.patient.id, name: dossier.patient.name }
            : null
        }
        defaultPrescribedTest={activePrescribedTest}
      />

      {/* Preview Modal */}
      <MedicalRecordPreviewModal
        record={previewRecord}
        open={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
      />

      {/* Edit Metadata Modal */}
      <EditMedicalRecordModal
        record={editingRecord}
        open={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        onSuccess={() => {
          if (selectedPatientId) {
            void loadDossier(selectedPatientId);
          } else {
            void fetchRecords();
          }
        }}
      />
    </div>
  );
}
