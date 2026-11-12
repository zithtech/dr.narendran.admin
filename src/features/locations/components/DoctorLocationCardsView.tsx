import {
  Avatar,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { locationsApi } from '../services/locationsApi';
import type {
  DoctorLocation,
  DoctorSummaryWithLocations,
} from '../types/locations';
import { LocationModal } from './LocationModal';

const { Title, Text } = Typography;

interface DoctorLocationCardsViewProps {
  doctorId?: string; // If in Admin mode, doctor's specific ID
  doctorProfile?: DoctorSummaryWithLocations | null;
  isDoctorRole?: boolean;
}

export const DoctorLocationCardsView: React.FC<DoctorLocationCardsViewProps> = ({
  doctorId,
  doctorProfile,
  isDoctorRole = false,
}) => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<DoctorLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<DoctorLocation | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await locationsApi.getLocations(doctorId);
      setLocations(data);
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Failed to load locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const handleMakePrimary = async (record: DoctorLocation) => {
    if (record.is_primary) return;
    try {
      setActionLoading(`primary-${record.id}`);
      await locationsApi.setPrimaryLocation(record.id, doctorId);
      message.success(`"${record.location_name}" set as primary location`);
      await fetchLocations();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Failed to update primary location');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (record: DoctorLocation) => {
    if (record.is_primary) {
      message.error('Cannot delete primary location. Set another location as primary first.');
      return;
    }
    try {
      setActionLoading(`delete-${record.id}`);
      await locationsApi.deleteLocation(record.id, doctorId);
      message.success(`Location "${record.location_name}" deleted successfully`);
      await fetchLocations();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Cannot delete primary location. Set another location as primary first.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const openEditModal = (loc: DoctorLocation) => {
    setEditingLocation(loc);
    setModalOpen(true);
  };

  const doctorDisplayName = doctorProfile?.name
    ? doctorProfile.name.startsWith('Dr.')
      ? doctorProfile.name
      : `Dr. ${doctorProfile.name}`
    : isDoctorRole
    ? 'My Practice Locations'
    : 'Doctor Locations';

  const columns: ColumnsType<DoctorLocation> = [
    {
      title: 'Location / Clinic',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-base">
              {record.location_name}
            </span>
            {record.is_primary && (
              <Tag
                color="gold"
                className="px-2 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1 border-amber-300"
              >
                <Star size={12} className="fill-amber-500 text-amber-500" />
                Primary Location
              </Tag>
            )}
          </div>
          {record.address ? (
            <div className="flex items-start gap-1 text-xs text-gray-600 mt-1 max-w-lg">
              <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{record.address}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic mt-0.5">No street address provided</div>
          )}
        </div>
      ),
    },
    {
      title: 'Map Link',
      dataIndex: 'map_link',
      key: 'map_link',
      width: 140,
      render: (map_link) => {
        if (!map_link) {
          return <span className="text-xs text-gray-400">—</span>;
        }
        return (
          <a
            href={map_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <span>View on Map</span>
            <ExternalLink size={13} />
          </a>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status) => {
        const isActive = !status || status.toUpperCase() === 'ACTIVE';
        return (
          <Tag color={isActive ? 'success' : 'default'} className="rounded-full px-2.5 text-xs font-medium">
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      align: 'right',
      render: (_, record) => {
        const isCurrentPrimary = Boolean(record.is_primary);
        return (
          <Space orientation="horizontal" size={8}>
            {!isCurrentPrimary && (
              <Button
                size="small"
                icon={<Star size={13} />}
                onClick={() => handleMakePrimary(record)}
                loading={actionLoading === `primary-${record.id}`}
                className="text-xs"
              >
                Make Primary
              </Button>
            )}

            <Button
              size="small"
              icon={<Pencil size={13} />}
              onClick={() => openEditModal(record)}
              className="text-xs"
            >
              Edit
            </Button>

            {isCurrentPrimary ? (
              <Tooltip title="Cannot delete primary location. Set another location as primary first.">
                <Button size="small" danger disabled icon={<Trash2 size={13} />} className="text-xs">
                  Delete
                </Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title="Delete Location"
                description={`Are you sure you want to delete "${record.location_name}"?`}
                onConfirm={() => handleDelete(record)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: actionLoading === `delete-${record.id}` }}
              >
                <Button size="small" danger icon={<Trash2 size={13} />} className="text-xs">
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {!isDoctorRole && (
              <Button
                icon={<ArrowLeft size={16} />}
                onClick={() => navigate('/locations')}
                className="flex items-center"
              >
                All Doctors
              </Button>
            )}

            <div className="flex items-center gap-3">
              {doctorProfile && (
                <Avatar
                  size={50}
                  src={doctorProfile.profile_image_url || undefined}
                  icon={!doctorProfile.profile_image_url ? <User size={24} /> : undefined}
                  className="bg-primary-100 text-primary-700 font-semibold"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Title level={4} style={{ margin: 0 }}>
                    {doctorDisplayName}
                  </Title>
                  {doctorProfile?.specialization && (
                    <Tag color="blue" className="rounded-full text-xs">
                      {doctorProfile.specialization}
                    </Tag>
                  )}
                </div>
                <Text type="secondary" className="text-sm">
                  {isDoctorRole
                    ? 'Manage your practice locations, consultation chambers, and clinic timings.'
                    : `Managing clinical practice locations for ${doctorDisplayName}.`}
                </Text>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<RefreshCw size={15} />}
              onClick={() => fetchLocations()}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={openAddModal}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Add New Location
            </Button>
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <Card className="shadow-xs rounded-xl border border-gray-100" bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Spin size="large" tip="Loading practice locations..." />
          </div>
        ) : locations.length === 0 ? (
          <div className="py-16 text-center">
            <Empty
              image={<Building2 size={48} className="mx-auto text-gray-300" />}
              description={
                <div className="mt-2">
                  <div className="text-gray-600 font-medium text-base">No practice locations found</div>
                  <div className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    {isDoctorRole
                      ? "You haven't added any practice locations yet. Click 'Add New Location' to set up your primary clinic."
                      : "This doctor doesn't have any registered practice locations yet."}
                  </div>
                </div>
              }
            >
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={openAddModal}
                className="bg-primary-600 hover:bg-primary-700 mt-3"
              >
                Add First Location
              </Button>
            </Empty>
          </div>
        ) : (
          <Table<DoctorLocation>
            columns={columns}
            dataSource={locations}
            rowKey="id"
            pagination={false}
          />
        )}
      </Card>

      {/* Add / Edit Location Modal */}
      <LocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void fetchLocations()}
        editingLocation={editingLocation}
        doctorId={doctorId}
        doctorName={doctorDisplayName}
      />
    </div>
  );
};

