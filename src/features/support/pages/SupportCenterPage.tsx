import {
  Button,
  Card,
  Col,
  Input,
  message,
  Row,
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
  ShieldCheck,
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
  { value: "APPOINTMENTS", label: "Appointments" },
  { value: "PRESCRIPTIONS", label: "Prescriptions" },
  { value: "MEDICINE_ORDERS", label: "Medicine Orders" },
  { value: "LAB_REPORTS", label: "Lab Reports" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "TECHNICAL_HELP", label: "Technical Help" },
  { value: "GENERAL_INQUIRY", label: "General Inquiry" },
];

export const SupportCenterPage: React.FC = () => {
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

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await adminSupportApi.getMetrics();
      setMetrics(data);
    } catch {
      // silent or degraded
    }
  }, []);

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
      const res = await adminSupportApi.getTickets({
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
  }, [statusFilter, priorityFilter, categoryFilter, assignedFilter, search, page, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMetrics();
    void fetchAgents();
  }, [fetchMetrics, fetchAgents]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const columns: ColumnsType<SupportTicket> = [
    {
      title: "Ticket #",
      dataIndex: "ticket_number",
      key: "ticket_number",
      render: (num: string, record) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 700 }}
          onClick={() => handleOpenTicket(record.id)}
        >
          {num || "TKT-XXXX"}
        </Button>
      ),
    },
    {
      title: "Patient",
      key: "patient",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.user_name || "Patient"}</div>
          {record.user_phone && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.user_phone}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      ellipsis: true,
      render: (subj: string) => <span style={{ fontSize: 13 }}>{subj}</span>,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat: string) => <Tag color="geekblue">{cat}</Tag>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (p: TicketPriority) => {
        const color = p === "URGENT" ? "red" : p === "HIGH" ? "volcano" : p === "MEDIUM" ? "blue" : "default";
        return <Tag color={color}>{p}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: TicketStatus) => {
        const color =
          s === "OPEN"
            ? "blue"
            : s === "IN_PROGRESS"
            ? "gold"
            : s === "WAITING_FOR_PATIENT"
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
      render: (_, record) => (
        <Select
          size="small"
          style={{ width: 150 }}
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
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(val).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button size="small" onClick={() => handleOpenTicket(record.id)}>
          Open
        </Button>
      ),
    },
  ];

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <LifeBuoy size={24} color="#1677ff" />
            Support Center
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            AI-powered Help Center, patient triage, and multi-agent incident resolution workspace
          </Text>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          onClick={() => {
            void fetchMetrics();
            void fetchTickets();
          }}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #1677ff" }}>
            <Statistic
              title="Open Tickets"
              value={metrics?.openTickets ?? 0}
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
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #52c41a" }}>
            <Statistic
              title="Resolved Today"
              value={metrics?.resolvedToday ?? 0}
              prefix={<CheckCircle size={18} color="#52c41a" />}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: "4px solid #722ed1" }}>
            <Statistic
              title="Avg Response Time"
              value={metrics?.avgFirstResponseMinutes ? `${metrics.avgFirstResponseMinutes}m` : "< 15m"}
              prefix={<ShieldCheck size={18} color="#722ed1" />}
              valueStyle={{ color: "#722ed1", fontWeight: 700 }}
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
                  <span>Tickets Queue ({totalTickets})</span>
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
                        placeholder="Search ticket #, patient, subject..."
                        prefix={<Search size={15} color="#8c8c8c" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={() => {
                          setPage(1);
                          void fetchTickets();
                        }}
                        style={{ width: 250 }}
                        allowClear
                      />
                      <Select
                        placeholder="All Statuses"
                        allowClear
                        style={{ width: 140 }}
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
                        style={{ width: 160 }}
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
                  <span>Knowledge Base & AI RAG</span>
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
