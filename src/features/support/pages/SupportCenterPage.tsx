import {
  Button,
  Card,
  Col,
  Input,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../../../utils/errors";
import { adminSupportApi } from "../api/adminSupportApi";
import { SupportTicketDrawer } from "../components/SupportTicketDrawer";
import type {
  AdminAgent,
  SupportMetrics,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "../types/support";
import { KnowledgeBaseTab } from "./KnowledgeBaseTab";

const { Title, Text } = Typography;

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_DOCTOR", label: "Waiting for Doctor" },
  { value: "WAITING_FOR_PATIENT", label: "Waiting for Patient" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "APPOINTMENTS", label: "Appointments & Bookings" },
  { value: "PRESCRIPTIONS", label: "Prescriptions & Clinical Notes" },
  { value: "SCHEDULE_AVAILABILITY", label: "Schedule & Availability" },
  { value: "PATIENT_CONSULTATION", label: "Patient Consultation" },
  { value: "PAYOUTS_SETTLEMENTS", label: "Payouts & Settlements" },
  { value: "MEDICINE_ORDERS", label: "Medicine Orders" },
  { value: "LAB_REPORTS", label: "Lab Reports & Diagnostic Tests" },
  { value: "PAYMENTS", label: "Payments & Invoicing" },
  { value: "TECHNICAL_HELP", label: "Technical Help" },
  { value: "GENERAL_INQUIRY", label: "General Inquiry" },
];

export interface SupportCenterPageProps {
  defaultUserType?: "PATIENT" | "DOCTOR" | "ALL";
}

export const SupportCenterPage: React.FC<SupportCenterPageProps> = ({
  defaultUserType = "ALL",
}) => {
  const [userTypeFilter, setUserTypeFilter] = useState<"PATIENT" | "DOCTOR" | "ALL">(defaultUserType);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AdminAgent[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>(undefined);
  const [assignedFilter, setAssignedFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setUserTypeFilter(defaultUserType);
    setPage(1);
  }, [defaultUserType]);

  const fetchMetrics = useCallback(async () => {
    try {
      const activeType = userTypeFilter === "ALL" ? undefined : userTypeFilter;
      const data = await adminSupportApi.getMetrics(activeType);
      setMetrics(data);
    } catch {
      // silent or degraded
    }
  }, [userTypeFilter]);

  const fetchAgents = useCallback(async () => {
    try {
      const list = await adminSupportApi.getAgents();
      setAgents(Array.isArray(list) ? list : []);
    } catch {
      setAgents([]);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const activeType = userTypeFilter === "ALL" ? undefined : userTypeFilter;
      const res = await adminSupportApi.getTickets({
        userType: activeType,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        assignedTo: assignedFilter,
        search: search.trim() ? search.trim() : undefined,
        page,
        limit,
      });
      setTickets(res.tickets);
      setTotalTickets(res.total);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to load support tickets"));
    } finally {
      setLoading(false);
    }
  }, [userTypeFilter, statusFilter, priorityFilter, categoryFilter, assignedFilter, search, page, limit]);

  useEffect(() => {
    void fetchMetrics();
    void fetchAgents();
  }, [fetchMetrics, fetchAgents]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const handleOpenTicket = (id: string) => {
    setSelectedTicketId(id);
    setDrawerVisible(true);
  };

  const handleInlineAssign = async (ticketId: string, agentId: string | null) => {
    try {
      await adminSupportApi.assignTicket(ticketId, agentId);
      message.success(agentId ? "Assigned agent updated" : "Ticket unassigned");
      await fetchTickets();
      void fetchMetrics();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to assign ticket"));
    }
  };

  // Determine current display info
  const isDoctorView = userTypeFilter === "DOCTOR";
  const isPatientView = userTypeFilter === "PATIENT";

  const columns: ColumnsType<SupportTicket> = [
    {
      title: "Ticket #",
      dataIndex: "ticket_number",
      key: "ticket_number",
      width: 140,
      render: (num: string, record) => {
        const isDoc = record.user_type?.toUpperCase() === "DOCTOR";
        return (
          <Space orientation="horizontal" size={4}>
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 700 }}
              onClick={() => handleOpenTicket(record.id)}
            >
              {num || (isDoc ? "DOC-XXXX" : "TKT-XXXX")}
            </Button>
            {userTypeFilter === "ALL" && (
              <Tag color={isDoc ? "blue" : "cyan"} style={{ fontSize: 10, margin: 0, padding: "0 4px" }}>
                {isDoc ? "DOC" : "PAT"}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: isDoctorView ? "Doctor" : isPatientView ? "Patient" : "Doctor / Patient",
      key: "contact",
      width: 220,
      render: (_, record) => {
        const isDoc = record.user_type?.toUpperCase() === "DOCTOR";
        if (isDoc) {
          const docName = record.doctor_name || record.user_name || "Doctor";
          const formattedDocName = docName.startsWith("Dr.") ? docName : `Dr. ${docName.replace(/^Dr\.?\s*/i, "")}`;
          const subInfo = [record.doctor_specialization, record.doctor_hospital_name]
            .filter(Boolean)
            .join(" • ");
          return (
            <div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Stethoscope size={13} color="#1677ff" />
                <span>{formattedDocName}</span>
              </div>
              {subInfo && (
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  {subInfo}
                </Text>
              )}
              {(record.doctor_phone || record.user_phone) && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.doctor_phone || record.user_phone}
                </Text>
              )}
            </div>
          );
        }

        return (
          <div>
            <div style={{ fontWeight: 600 }}>{record.patient_name || record.user_name || "Patient"}</div>
            {(record.patient_phone || record.user_phone) && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.patient_phone || record.user_phone}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      ellipsis: true,
      render: (subj: string) => <span style={{ fontSize: 13, fontWeight: 500 }}>{subj}</span>,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 170,
      render: (cat: string) => {
        const isDocCategory =
          cat === "SCHEDULE_AVAILABILITY" ||
          cat === "PATIENT_CONSULTATION" ||
          cat === "PAYOUTS_SETTLEMENTS";
        return <Tag color={isDocCategory ? "purple" : "geekblue"}>{cat.replace(/_/g, " ")}</Tag>;
      },
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (p: TicketPriority) => {
        const color =
          p === "URGENT" ? "red" : p === "HIGH" ? "volcano" : p === "MEDIUM" ? "blue" : "default";
        return <Tag color={color}>{p}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (s: TicketStatus) => {
        const color =
          s === "OPEN"
            ? "blue"
            : s === "IN_PROGRESS"
            ? "gold"
            : s === "WAITING_FOR_DOCTOR" || s === "WAITING_FOR_PATIENT"
            ? "purple"
            : s === "RESOLVED"
            ? "green"
            : "default";
        return <Tag color={color}>{s.replace(/_/g, " ")}</Tag>;
      },
    },
    {
      title: "Assigned Agent",
      key: "assigned_to",
      width: 160,
      render: (_, record) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          placeholder="Unassigned"
          allowClear
          value={record.assigned_to ?? undefined}
          onChange={(val) => {
            void handleInlineAssign(record.id, val ?? null);
          }}
          options={(agents || []).map((a) => ({
            value: a.id,
            label: a.name,
          }))}
        />
      ),
    },
    {
      title: "Last Update",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 140,
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(val).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => handleOpenTicket(record.id)}>
          Open
        </Button>
      ),
    },
  ];

  const awaitingResponseCount =
    isDoctorView
      ? (metrics?.awaitingDoctorResponse ?? 0)
      : isPatientView
      ? (metrics?.awaitingPatientResponse ?? 0)
      : (metrics?.awaitingPatientResponse ?? 0) + (metrics?.awaitingDoctorResponse ?? 0);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {isDoctorView ? (
              <Stethoscope size={26} color="#1677ff" />
            ) : (
              <LifeBuoy size={26} color="#1677ff" />
            )}
            {isDoctorView
              ? "Doctor Support Center"
              : isPatientView
              ? "Patient Support Center"
              : "Support Center"}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isDoctorView
              ? "Doctor queries, schedule changes, clinical escalations, and administrative assistance"
              : isPatientView
              ? "AI-powered Help Center, patient triage, and multi-agent incident resolution workspace"
              : "Unified support management workspace for clinic doctors, patients, and healthcare staff"}
          </Text>
        </div>

        {/* View Switcher & Refresh */}
        <Space wrap>
          <Segmented
            value={userTypeFilter}
            onChange={(val) => {
              setUserTypeFilter(val as "PATIENT" | "DOCTOR" | "ALL");
              setPage(1);
            }}
            options={[
              {
                label: (
                  <Space size={6}>
                    <Stethoscope size={14} />
                    <span>Doctor Support</span>
                  </Space>
                ),
                value: "DOCTOR",
              },
              {
                label: (
                  <Space size={6}>
                    <LifeBuoy size={14} />
                    <span>Patient Support</span>
                  </Space>
                ),
                value: "PATIENT",
              },
              {
                label: "All Tickets",
                value: "ALL",
              },
            ]}
          />
          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => {
              void fetchMetrics();
              void fetchTickets();
            }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* KPI Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #1677ff" }}>
            <Statistic
              title="Open Tickets"
              value={metrics?.totalOpenTickets ?? metrics?.openTickets ?? 0}
              prefix={<AlertCircle size={18} color="#1677ff" />}
              valueStyle={{ color: "#1677ff", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #faad14" }}>
            <Statistic
              title="In Progress"
              value={metrics?.inProgressTickets ?? 0}
              prefix={<Clock size={18} color="#faad14" />}
              valueStyle={{ color: "#faad14", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #722ed1" }}>
            <Statistic
              title={
                isDoctorView
                  ? "Awaiting Doctor Reply"
                  : isPatientView
                  ? "Awaiting Patient Reply"
                  : "Awaiting User Reply"
              }
              value={awaitingResponseCount}
              prefix={<UserCheck size={18} color="#722ed1" />}
              valueStyle={{ color: "#722ed1", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #52c41a" }}>
            <Statistic
              title="Resolved Today"
              value={metrics?.resolvedToday ?? 0}
              prefix={<CheckCircle size={18} color="#52c41a" />}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Card
        size="small"
        style={{ borderRadius: 8, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "12px 16px" } }}
      >
        <Tabs
          defaultActiveKey="queue"
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          items={[
            {
              key: "queue",
              label: (
                <Space>
                  <MessageSquare size={16} />
                  <span>
                    {isDoctorView
                      ? `Doctor Tickets (${totalTickets})`
                      : isPatientView
                      ? `Patient Tickets (${totalTickets})`
                      : `All Tickets Queue (${totalTickets})`}
                  </span>
                </Space>
              ),
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
                  {/* Filter Toolbar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <Space wrap>
                      <Input
                        placeholder={
                          isDoctorView
                            ? "Search ticket #, doctor, subject..."
                            : "Search ticket #, patient, doctor, subject..."
                        }
                        prefix={<Search size={15} color="#8c8c8c" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={() => {
                          setPage(1);
                          void fetchTickets();
                        }}
                        style={{ width: 280 }}
                        allowClear
                      />
                      <Select
                        placeholder="All Statuses"
                        allowClear
                        style={{ width: 160 }}
                        value={statusFilter}
                        onChange={(val) => {
                          setPage(1);
                          setStatusFilter(val);
                        }}
                        options={STATUS_OPTIONS}
                      />
                      <Select
                        placeholder="All Priorities"
                        allowClear
                        style={{ width: 130 }}
                        value={priorityFilter}
                        onChange={(val) => {
                          setPage(1);
                          setPriorityFilter(val);
                        }}
                        options={PRIORITY_OPTIONS}
                      />
                      <Select
                        placeholder="All Categories"
                        allowClear
                        style={{ width: 180 }}
                        value={categoryFilter}
                        onChange={(val) => {
                          setPage(1);
                          setCategoryFilter(val);
                        }}
                        options={CATEGORY_OPTIONS}
                      />
                      <Select
                        placeholder="All Agents"
                        allowClear
                        style={{ width: 150 }}
                        value={assignedFilter}
                        onChange={(val) => {
                          setPage(1);
                          setAssignedFilter(val);
                        }}
                        options={(agents || []).map((a) => ({ value: a.id, label: a.name }))}
                      />
                    </Space>
                  </div>

                  {/* Tickets Table */}
                  <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={tickets}
                    columns={columns}
                    scroll={{ y: 'calc(100vh - 430px)', x: 'max-content' }}
                    pagination={{
                      current: page,
                      pageSize: limit,
                      total: totalTickets,
                      onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                      },
                      showSizeChanger: true,
                    }}
                  />
                </div>
              ),
            },
            {
              key: "articles",
              label: (
                <Space>
                  <BookOpen size={16} />
                  <span>Knowledge Base & FAQs</span>
                </Space>
              ),
              children: <KnowledgeBaseTab />,
            },
          ]}
        />
      </Card>

      {/* Ticket Details & Workspace Drawer */}
      <SupportTicketDrawer
        ticketId={selectedTicketId}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onTicketUpdated={() => {
          void fetchTickets();
          void fetchMetrics();
        }}
        agents={agents}
      />
    </div>
  );
};

export default SupportCenterPage;
