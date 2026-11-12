import { Avatar, Button, Card, Col, Input, Row, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Building2, MapPin, RefreshCw, Search, Stethoscope, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { locationsApi } from '../services/locationsApi';
import type { DoctorSummaryWithLocations } from '../types/locations';

const { Title, Text } = Typography;

export const DoctorLocationsTable: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorSummaryWithLocations[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchDoctors = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await locationsApi.getDoctors(searchTerm);
      setDoctors(data);
    } catch {
      // Error handled silently or empty list set
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDoctors(search);
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    void fetchDoctors(value);
  };

  const filteredDoctors = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.toLowerCase().trim();
    return doctors.filter(
      (doc) =>
        doc.name?.toLowerCase().includes(q) ||
        doc.specialty?.toLowerCase().includes(q) ||
        doc.specialization?.toLowerCase().includes(q) ||
        doc.phone?.toLowerCase().includes(q) ||
        doc.email?.toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const columns: ColumnsType<DoctorSummaryWithLocations> = [
    {
      title: 'Doctor',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => {
        const initials = record.name
          ? record.name
              .replace(/^Dr\.\s*/i, '')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : 'DR';

        return (
          <Space orientation="horizontal" size={12}>
            <Avatar
              size={44}
              src={record.profile_image_url || undefined}
              icon={!record.profile_image_url ? <User size={20} /> : undefined}
              className="bg-primary-100 text-primary-700 font-semibold"
            >
              {!record.profile_image_url ? initials : null}
            </Avatar>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">
                {record.name.startsWith('Dr.') ? record.name : `Dr. ${record.name}`}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {record.phone || record.email || 'No contact provided'}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Specialization',
      dataIndex: 'specialization',
      key: 'specialization',
      render: (_, record) => {
        const spec = record.specialization || record.specialty || 'General Medicine';
        return (
          <Space>
            <Stethoscope size={15} className="text-blue-500" />
            <span className="font-medium text-gray-800">{spec}</span>
          </Space>
        );
      },
    },
    {
      title: 'Qualification',
      dataIndex: 'qualification',
      key: 'qualification',
      render: (qualification) => (
        <span className="text-gray-600 text-sm">
          {qualification || 'MBBS'}
        </span>
      ),
    },
    {
      title: 'Registered Locations',
      dataIndex: 'locations_count',
      key: 'locations_count',
      align: 'center',
      render: (count) => {
        const num = Number(count || 0);
        return (
          <Tag
            color={num > 0 ? 'blue' : 'default'}
            className="px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1"
          >
            <Building2 size={12} />
            <span>
              {num} {num === 1 ? 'Location' : 'Locations'}
            </span>
          </Tag>
        );
      },
      sorter: (a, b) => Number(a.locations_count || 0) - Number(b.locations_count || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        const isActive = !status || status.toUpperCase() === 'ACTIVE';
        return (
          <Tag color={isActive ? 'success' : 'error'} className="rounded-full px-2 text-xs">
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<MapPin size={15} />}
          onClick={() => navigate(`/locations/${record.id}`)}
          className="bg-primary-600 hover:bg-primary-700 text-xs font-medium"
        >
          Manage Locations
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex orientation-horizontal items-center orientation-horizontal gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                <MapPin size={22} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Location Management
                </Title>
                <Text type="secondary" className="text-sm">
                  View and manage clinical practice locations and consultation chambers for registered doctors.
                </Text>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<RefreshCw size={15} />}
              onClick={() => fetchDoctors(search)}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Row gutter={[16, 16]} className="mt-6">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search doctor by name or specialization..."
              prefix={<Search size={16} className="text-gray-400" />}
              allowClear
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
            />
          </Col>
        </Row>
      </div>

      {/* Doctors Table */}
      <Card className="shadow-xs rounded-xl border border-gray-100" bodyStyle={{ padding: 0 }}>
        <Table<DoctorSummaryWithLocations>
          columns={columns}
          dataSource={filteredDoctors}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} doctors`,
          }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <Building2 size={40} className="mx-auto text-gray-300 mb-2" />
                <div className="text-gray-500 font-medium">No doctors found</div>
                <div className="text-xs text-gray-400">
                  Try adjusting your search criteria.
                </div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

