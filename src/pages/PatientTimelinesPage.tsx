import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  message,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ChevronRight,
  Clock,
  History,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '../components/ui/primitives';
import { patientTimelinesApi } from '../features/timelines/services/patientTimelinesApi';
import type { AdminPatientListItem } from '../features/timelines/types/patientTimelines';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function PatientTimelinesPage() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<AdminPatientListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (genderFilter !== 'ALL') params.gender = genderFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.registeredFrom = dateRange[0].startOf('day').toISOString();
        params.registeredTo = dateRange[1].endOf('day').toISOString();
      }

      const res = await patientTimelinesApi.getPatients(params);
      if (res && res.data) {
        setPatients(res.data);
        setTotalCount(res.pagination?.totalCount || res.data.length);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to load registered patients');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, genderFilter, statusFilter, dateRange]);

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  const resetFilters = () => {
    setSearch('');
    setGenderFilter('ALL');
    setStatusFilter('ALL');
    setDateRange(null);
    setPage(1);
  };

  const calculateAge = (dobStr?: string | null) => {
    if (!dobStr) return null;
    try {
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  };

  const columns: ColumnsType<AdminPatientListItem> = [
    {
      title: 'Patient ID',
      dataIndex: 'id',
      key: 'id',
      width: 130,
      render: (id: string) => (
        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
          #{id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Patient Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar
              name={name}
              src={record.profile_image_url}
              size={36}
            />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{name}</div>
              <div className="text-xs text-gray-400 truncate">
                {record.hospital_name || 'Dr. Narendran Hospital'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      render: (gender: string | null) => {
        if (!gender) return <span className="text-gray-400 text-xs">—</span>;
        const g = gender.toUpperCase();
        return (
          <Tag color={g === 'FEMALE' ? 'magenta' : g === 'MALE' ? 'blue' : 'default'} className="text-xs font-medium capitalize">
            {gender.toLowerCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Age / DOB',
      dataIndex: 'date_of_birth',
      key: 'date_of_birth',
      width: 140,
      render: (dob: string | null) => {
        const age = calculateAge(dob);
        return (
          <div>
            <div className="font-medium text-gray-800 text-xs">
              {age !== null ? `${age} yrs` : '—'}
            </div>
            <div className="text-[11px] text-gray-400">
              {dob ? new Date(dob).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'DOB not set'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Mobile Number',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone: string | null) => (
        <span className="text-xs font-medium text-gray-700">
          {phone || <span className="text-gray-400 italic">No phone</span>}
        </span>
      ),
    },
    {
      title: 'Registered Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (createdAt: string) => (
        <div>
          <div className="text-xs font-medium text-gray-800">
            {new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 inline" />
            {new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'} className="font-semibold text-xs">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ChevronRight className="w-3.5 h-3.5" />}
          iconPosition="end"
          className="bg-teal-700 hover:bg-teal-800 text-xs font-semibold"
          onClick={() => navigate(`/patient-timelines/${record.id}`)}
        >
          View Timeline
        </Button>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-y-auto p-6 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Title level={3} className="!mb-1 text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-700" />
            Patient Timelines
          </Title>
          <Text type="secondary" className="text-sm">
            View and explore the complete medical history, consultations, prescriptions, and lab investigations of registered patients.
          </Text>
        </div>

        <Button
          icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          onClick={() => void fetchPatients()}
        >
          Refresh Patients
        </Button>
      </div>

      {/* Filter and Search Card */}
      <Card className="shadow-xs border-gray-200">
        <Row gutter={[16, 16]} align="middle">
          {/* Search Input */}
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by name, ID, phone, email..."
              prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
              value={search}
              allowClear
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>

          {/* Gender Filter */}
          <Col xs={24} sm={12} md={5}>
            <Select
              className="w-full"
              placeholder="Filter by Gender"
              value={genderFilter}
              onChange={(val) => {
                setGenderFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Genders' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </Col>

          {/* Status Filter */}
          <Col xs={24} sm={12} md={5}>
            <Select
              className="w-full"
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
            />
          </Col>

          {/* Registered Date Range */}
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              className="w-full"
              value={dateRange}
              placeholder={['Registered From', 'Registered To']}
              onChange={(dates) => {
                setDateRange(dates as any);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{patients.length}</span> of{' '}
            <span className="font-semibold text-gray-700">{totalCount}</span> registered patients
          </div>

          <Button size="small" type="link" onClick={resetFilters}>
            Reset all filters
          </Button>
        </div>
      </Card>

      {/* Patients Table */}
      <Card className="shadow-xs border-gray-200" bodyStyle={{ padding: 0 }}>
        <Table<AdminPatientListItem>
          columns={columns}
          dataSource={patients}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/patient-timelines/${record.id}`),
            className: 'cursor-pointer hover:bg-gray-50/80 transition-colors',
          })}
        />
      </Card>
    </div>
  );
}
