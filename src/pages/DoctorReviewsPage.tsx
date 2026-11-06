import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Input,
  message,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Flag,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';

import api from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export interface DoctorReviewItem {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_specialty?: string;
  patient_name?: string;
  patient_phone?: string;
  scheduled_start?: string;
  rating: number;
  review_comment?: string | null;
  communication_rating?: number | null;
  experience_rating?: number | null;
  professionalism_rating?: number | null;
  waiting_time_rating?: number | null;
  satisfaction_rating?: number | null;
  status: 'ACTIVE' | 'HIDDEN' | 'FLAGGED';
  moderated_by?: string | null;
  moderated_at?: string | null;
  moderation_action?: string | null;
  moderation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationLog {
  id: string;
  review_id: string;
  admin_id: string;
  action: 'FLAG' | 'HIDE' | 'RESTORE';
  reason: string;
  created_at: string;
}

export interface DoctorRatingSummary {
  doctor_id: string;
  doctor_name: string;
  specialization?: string;
  total_reviews: number;
  active_reviews: number;
  hidden_reviews: number;
  flagged_reviews: number;
  average_rating: number;
}

export default function DoctorReviewsPage() {
  const [reviews, setReviews] = useState<DoctorReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Doctors list for dropdown & summary
  const [doctorSummaries, setDoctorSummaries] = useState<DoctorRatingSummary[]>([]);

  // Moderation modal states
  const [selectedReview, setSelectedReview] = useState<DoctorReviewItem | null>(null);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [moderationAction, setModerationAction] = useState<'FLAG' | 'HIDE' | 'RESTORE'>('FLAG');
  const [moderationReason, setModerationReason] = useState<string>('');
  const [moderating, setModerating] = useState<boolean>(false);

  // Fetch doctors ratings summaries
  const fetchDoctorSummaries = useCallback(async () => {
    try {
      const res = await api.get('admin/reviews/doctor-summary');
      if (res.data?.data) {
        setDoctorSummaries(res.data.data);
      }
    } catch {
      // Fallback silently if not available
    }
  }, []);

  // Fetch reviews list
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        status: statusFilter,
      };

      if (search.trim()) params.search = search.trim();
      if (ratingFilter) params.rating = ratingFilter;
      if (doctorFilter) params.doctor_id = doctorFilter;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }

      const res = await api.get('admin/reviews', { params });
      if (res.data?.data) {
        setReviews(res.data.data);
        setTotalCount(res.data.pagination?.totalCount || res.data.data.length);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to load doctor reviews');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search, ratingFilter, doctorFilter, dateRange]);

  useEffect(() => {
    void fetchDoctorSummaries();
  }, [fetchDoctorSummaries]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  // Open details & moderation modal
  const openModerationModal = async (review: DoctorReviewItem, defaultAction?: 'FLAG' | 'HIDE' | 'RESTORE') => {
    setSelectedReview(review);
    setModerationAction(defaultAction || (review.status === 'ACTIVE' ? 'HIDE' : 'RESTORE'));
    setModerationReason('');
    setIsModalOpen(true);

    try {
      const res = await api.get(`admin/reviews/${review.id}`);
      if (res.data?.data?.moderationLogs) {
        setModerationLogs(res.data.data.moderationLogs);
      } else {
        setModerationLogs([]);
      }
    } catch {
      setModerationLogs([]);
    }
  };

  // Submit moderation action
  const handleModerateSubmit = async () => {
    if (!selectedReview) return;
    if (!moderationReason.trim() || moderationReason.trim().length < 2) {
      message.warning('Please enter a clear reason for this moderation action.');
      return;
    }

    setModerating(true);
    try {
      await api.patch(`admin/reviews/${selectedReview.id}/status`, {
        action: moderationAction,
        reason: moderationReason.trim(),
      });

      message.success(
        `Review successfully ${moderationAction === 'HIDE' ? 'hidden from public view' : moderationAction === 'FLAG' ? 'flagged' : 'restored to active status'
        }.`,
      );

      setIsModalOpen(false);
      void fetchReviews();
      void fetchDoctorSummaries();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to execute moderation action.');
    } finally {
      setModerating(false);
    }
  };

  // Aggregated quick metrics
  const totalReviewsCount = doctorSummaries.reduce((sum, d) => sum + (d.total_reviews || 0), 0);
  const totalActiveCount = doctorSummaries.reduce((sum, d) => sum + (d.active_reviews || 0), 0);
  const totalHiddenCount = doctorSummaries.reduce((sum, d) => sum + (d.hidden_reviews || 0), 0);
  const totalFlaggedCount = doctorSummaries.reduce((sum, d) => sum + (d.flagged_reviews || 0), 0);
  const averageRatingOverall =
    doctorSummaries.length > 0
      ? (
        doctorSummaries.reduce((sum, d) => sum + Number(d.average_rating || 0), 0) / doctorSummaries.length
      ).toFixed(1)
      : '0.0';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setRatingFilter(undefined);
    setDoctorFilter(undefined);
    setDateRange(null);
    setPage(1);
  };

  const columns: ColumnsType<DoctorReviewItem> = [
    {
      title: 'Consultation Date / Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (val, record) => (
        <div>
          <div className="font-medium text-gray-800 text-sm">
            {val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </div>
          <div className="text-xs text-gray-400">
            {val ? new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
          {record.scheduled_start && (
            <div className="text-[11px] text-teal-700 mt-1">
              Visit: {new Date(record.scheduled_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
      width: 170,
      render: (val, record) => (
        <div>
          <div className="font-semibold text-gray-900">{val || 'Dr. Narendran'}</div>
          <div className="text-xs text-teal-700">{record.doctor_specialty || 'Specialist'}</div>
        </div>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      width: 150,
      render: (val, record) => (
        <div>
          <div className="font-medium text-gray-800">{val || 'Verified Patient'}</div>
          {record.patient_phone && <div className="text-xs text-gray-500">{record.patient_phone}</div>}
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 140,
      render: (rating) => (
        <div className="flex items-center gap-1.5">
          <Rate disabled defaultValue={rating} style={{ fontSize: 13, color: '#f59e0b' }} />
          <span className="font-semibold text-amber-800 text-sm">{rating}.0</span>
        </div>
      ),
    },
    {
      title: 'Review Comment & Categories',
      dataIndex: 'review_comment',
      key: 'review_comment',
      render: (comment, record) => {
        const hasCategories =
          record.communication_rating ||
          record.experience_rating ||
          record.professionalism_rating ||
          record.waiting_time_rating;

        return (
          <div className="space-y-1">
            {comment ? (
              <Paragraph
                ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                className="!mb-1 text-sm text-gray-700 italic"
              >
                "{comment}"
              </Paragraph>
            ) : (
              <span className="text-gray-400 text-xs italic">No written comment provided</span>
            )}
            {hasCategories && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {record.communication_rating && (
                  <Tag color="cyan" className="text-[11px] !m-0">
                    Comm: {record.communication_rating}★
                  </Tag>
                )}
                {record.experience_rating && (
                  <Tag color="blue" className="text-[11px] !m-0">
                    Exp: {record.experience_rating}★
                  </Tag>
                )}
                {record.professionalism_rating && (
                  <Tag color="purple" className="text-[11px] !m-0">
                    Prof: {record.professionalism_rating}★
                  </Tag>
                )}
                {record.waiting_time_rating && (
                  <Tag color="orange" className="text-[11px] !m-0">
                    Wait: {record.waiting_time_rating}★
                  </Tag>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        if (status === 'ACTIVE') {
          return (
            <Tag color="success" icon={<CheckCircle className="w-3 h-3 inline mr-1" />}>
              ACTIVE
            </Tag>
          );
        }
        if (status === 'FLAGGED') {
          return (
            <Tag color="warning" icon={<Flag className="w-3 h-3 inline mr-1" />}>
              FLAGGED
            </Tag>
          );
        }
        return (
          <Tag color="error" icon={<EyeOff className="w-3 h-3 inline mr-1" />}>
            HIDDEN
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View details & moderation history">
            <Button
              size="small"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => openModerationModal(record)}
            />
          </Tooltip>

          {record.status === 'ACTIVE' ? (
            <>
              <Tooltip title="Hide review from public profile">
                <Button
                  size="small"
                  danger
                  icon={<EyeOff className="w-3.5 h-3.5" />}
                  onClick={() => openModerationModal(record, 'HIDE')}
                />
              </Tooltip>
              <Tooltip title="Flag review for attention">
                <Button
                  size="small"
                  className="text-amber-600 border-amber-300"
                  icon={<Flag className="w-3.5 h-3.5" />}
                  onClick={() => openModerationModal(record, 'FLAG')}
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Restore review to Active status">
              <Button
                size="small"
                type="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => openModerationModal(record, 'RESTORE')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-y-auto p-6 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Title level={3} className="!mb-1 text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
            Doctor Ratings & Reviews Management
          </Title>
          <Text type="secondary" className="text-sm">
            Monitor verified patient reviews, inspect consultation feedback ratings, and moderate public visibility.
          </Text>
        </div>

        <Button
          icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          onClick={() => {
            void fetchReviews();
            void fetchDoctorSummaries();
          }}
        >
          Refresh Data
        </Button>
      </div>

      {/* Top Statistic Metrics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-xs border-gray-200">
            <Statistic
              title={<span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Overall Doctor Rating</span>}
              value={averageRatingOverall}
              precision={1}
              prefix={<Star className="w-5 h-5 text-amber-500 fill-amber-400 mr-1" />}
              suffix="/ 5.0"
              valueStyle={{ color: '#0f766e', fontWeight: 700 }}
            />
            <div className="text-xs text-gray-400 mt-2">Across all active verified reviews</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-xs border-gray-200">
            <Statistic
              title={<span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Total Verified Reviews</span>}
              value={totalReviewsCount || totalCount}
              prefix={<MessageSquare className="w-5 h-5 text-teal-600 mr-1" />}
              valueStyle={{ color: '#111827', fontWeight: 700 }}
            />
            <div className="text-xs text-teal-600 mt-2 font-medium">{totalActiveCount} Active on public profiles</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-xs border-gray-200">
            <Statistic
              title={<span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Flagged for Review</span>}
              value={totalFlaggedCount}
              prefix={<Flag className="w-5 h-5 text-amber-500 mr-1" />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
            <div className="text-xs text-gray-400 mt-2">Requires administrator verification</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-xs border-gray-200">
            <Statistic
              title={<span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Hidden Reviews</span>}
              value={totalHiddenCount}
              prefix={<EyeOff className="w-5 h-5 text-rose-500 mr-1" />}
              valueStyle={{ color: '#e11d48', fontWeight: 700 }}
            />
            <div className="text-xs text-gray-400 mt-2">Excluded from doctor ratings & profiles</div>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs border-gray-200">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search patient, doctor, comment..."
              prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
              value={search}
              allowClear
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
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
                { value: 'FLAGGED', label: 'Flagged Only' },
                { value: 'HIDDEN', label: 'Hidden Only' },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              className="w-full"
              placeholder="Filter by Star Rating"
              value={ratingFilter}
              allowClear
              onChange={(val) => {
                setRatingFilter(val);
                setPage(1);
              }}
              options={[
                { value: 5, label: '5 Stars ★★★★★' },
                { value: 4, label: '4 Stars ★★★★☆' },
                { value: 3, label: '3 Stars ★★★☆☆' },
                { value: 2, label: '2 Stars ★★☆☆☆' },
                { value: 1, label: '1 Star ★☆☆☆☆' },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Select
              className="w-full"
              placeholder="Filter by Doctor"
              value={doctorFilter}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(val) => {
                setDoctorFilter(val);
                setPage(1);
              }}
              options={doctorSummaries.map((d) => ({
                value: d.doctor_id,
                label: `${d.doctor_name} (${d.average_rating}★ · ${d.total_reviews} rev)`,
              }))}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <RangePicker
              className="w-full"
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as any);
                setPage(1);
              }}
            />
          </Col>
        </Row>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Showing <span className="font-semibold">{reviews.length}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> reviews
          </div>

          <Button size="small" type="link" onClick={resetFilters}>
            Reset all filters
          </Button>
        </div>
      </Card>

      {/* Reviews Table */}
      <Card className="shadow-xs border-gray-200" bodyStyle={{ padding: 0 }}>
        <Table<DoctorReviewItem>
          columns={columns}
          dataSource={reviews}
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
        />
      </Card>

      {/* Moderation & Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Review Details & Moderation Action
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger={moderationAction === 'HIDE'}
            className={
              moderationAction === 'RESTORE'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : moderationAction === 'FLAG'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : ''
            }
            loading={moderating}
            onClick={handleModerateSubmit}
          >
            Confirm {moderationAction === 'HIDE' ? 'Hide Review' : moderationAction === 'FLAG' ? 'Flag Review' : 'Restore to Active'}
          </Button>,
        ]}
        width={680}
      >
        {selectedReview && (
          <div className="space-y-4 py-2">
            {/* Metadata Overview */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Doctor:
                  </Text>
                  <div className="font-medium text-gray-800">{selectedReview.doctor_name || 'Dr. Narendran'}</div>
                  <div className="text-xs text-teal-700">{selectedReview.doctor_specialty || 'Doctor'}</div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Patient:
                  </Text>
                  <div className="font-medium text-gray-800">{selectedReview.patient_name || 'Verified Patient'}</div>
                  <div className="text-xs text-gray-500">{selectedReview.patient_phone || 'Phone not available'}</div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Rating:
                  </Text>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Rate disabled value={selectedReview.rating} style={{ fontSize: 14, color: '#f59e0b' }} />
                    <span className="font-bold text-gray-800">{selectedReview.rating}.0 / 5.0</span>
                  </div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" className="text-xs">
                    Current Status:
                  </Text>
                  <div className="mt-0.5">
                    {selectedReview.status === 'ACTIVE' && <Tag color="success">ACTIVE (Visible on public doctor profile)</Tag>}
                    {selectedReview.status === 'FLAGGED' && <Tag color="warning">FLAGGED (Under review)</Tag>}
                    {selectedReview.status === 'HIDDEN' && <Tag color="error">HIDDEN (Excluded from public profile & score)</Tag>}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Patient Written Comment */}
            <div>
              <Text className="text-xs uppercase font-semibold text-gray-500">Patient Review Comment</Text>
              <div className="mt-1 p-3 bg-white border border-gray-200 rounded-md text-sm text-gray-800">
                {selectedReview.review_comment ? (
                  `"${selectedReview.review_comment}"`
                ) : (
                  <span className="text-gray-400 italic">No comment text written.</span>
                )}
              </div>
            </div>

            {/* Category Ratings Breakdown */}
            <div>
              <Text className="text-xs uppercase font-semibold text-gray-500">Category Specific Ratings</Text>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                <div className="p-2 border border-gray-100 rounded bg-gray-50 text-center">
                  <div className="text-[11px] text-gray-500">Communication</div>
                  <div className="font-bold text-gray-800">{selectedReview.communication_rating ? `${selectedReview.communication_rating}★` : '—'}</div>
                </div>
                <div className="p-2 border border-gray-100 rounded bg-gray-50 text-center">
                  <div className="text-[11px] text-gray-500">Consultation</div>
                  <div className="font-bold text-gray-800">{selectedReview.experience_rating ? `${selectedReview.experience_rating}★` : '—'}</div>
                </div>
                <div className="p-2 border border-gray-100 rounded bg-gray-50 text-center">
                  <div className="text-[11px] text-gray-500">Professionalism</div>
                  <div className="font-bold text-gray-800">{selectedReview.professionalism_rating ? `${selectedReview.professionalism_rating}★` : '—'}</div>
                </div>
                <div className="p-2 border border-gray-100 rounded bg-gray-50 text-center">
                  <div className="text-[11px] text-gray-500">Waiting Time</div>
                  <div className="font-bold text-gray-800">{selectedReview.waiting_time_rating ? `${selectedReview.waiting_time_rating}★` : '—'}</div>
                </div>
              </div>
            </div>

            <Divider className="!my-3" />

            {/* Moderation Action Form */}
            <div className="space-y-3 bg-amber-50/60 p-4 rounded-lg border border-amber-200">
              <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Select Moderation Action
              </div>

              <div>
                <Text type="secondary" className="text-xs">
                  Action to take:
                </Text>
                <Select
                  className="w-full mt-1"
                  value={moderationAction}
                  onChange={(val) => setModerationAction(val)}
                  options={[
                    { value: 'HIDE', label: 'Hide Review (Remove from public profile & score)' },
                    { value: 'FLAG', label: 'Flag Review (Mark for attention/monitoring)' },
                    { value: 'RESTORE', label: 'Restore Review (Make active and visible on public profile)' },
                  ]}
                />
              </div>

              <div>
                <Text type="secondary" className="text-xs">
                  Moderation Reason (Required for audit trail):
                </Text>
                <Input.TextArea
                  rows={3}
                  className="mt-1"
                  placeholder="Explain why this moderation action is being taken (e.g. Contains profanity, Inappropriate content, Policy compliance verified, etc.)"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                />
              </div>
            </div>

            {/* Moderation History Audit Log */}
            {moderationLogs.length > 0 && (
              <div>
                <Text className="text-xs uppercase font-semibold text-gray-500">Moderation Audit Trail</Text>
                <div className="mt-1 space-y-2 max-h-36 overflow-y-auto">
                  {moderationLogs.map((log) => (
                    <div key={log.id} className="p-2 rounded bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex justify-between items-center text-gray-700">
                        <span className="font-semibold">
                          Action: <Tag color={log.action === 'HIDE' ? 'error' : log.action === 'FLAG' ? 'warning' : 'success'}>{log.action}</Tag>
                        </span>
                        <span className="text-gray-400">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">Reason: {log.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}