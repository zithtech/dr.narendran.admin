import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  Bot,
  CheckCircle2,
  Clock,
  Lock,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../../../utils/errors";
import { adminSupportApi, type TicketDetailsResponse } from "../api/adminSupportApi";
import type { AdminAgent, TicketPriority, TicketStatus } from "../types/support";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface FormattedAiSummary {
  problemSummary?: string;
  troubleshootingAttempted?: string;
  suggestedNextSteps?: string;
  summary?: string;
}

interface SupportTicketDrawerProps {
  ticketId: string | null;
  visible: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
  agents?: AdminAgent[];
}

export const SupportTicketDrawer: React.FC<SupportTicketDrawerProps> = ({
  ticketId,
  visible,
  onClose,
  onTicketUpdated,
  agents = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<TicketDetailsResponse | null>(null);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<FormattedAiSummary | null>(null);
  const [replyStatusChange, setReplyStatusChange] = useState<TicketStatus | undefined>(undefined);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchDetails = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const data = await adminSupportApi.getTicketDetails(ticketId);
      setDetails(data);
      if (data.ticket.resolution_notes) {
        setResolutionNotes(data.ticket.resolution_notes);
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to load ticket details"));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (visible && ticketId) {
       
      void fetchDetails();
      setAiSummary(null);
      setReplyText("");
      setNoteText("");
      setReplyStatusChange(undefined);
    }
  }, [visible, ticketId, fetchDetails]);

  if (!ticketId) return null;

  const ticket = details?.ticket;

  const handleAssignChange = async (agentId: string | null) => {
    if (!ticketId) return;
    try {
      const updated = await adminSupportApi.assignTicket(ticketId, agentId);
      message.success(
        agentId ? "Ticket assigned to support agent" : "Ticket unassigned"
      );
      if (details) {
        setDetails({ ...details, ticket: updated });
      }
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to assign ticket"));
    }
  };

  const handleSendReply = async () => {
    if (!ticketId || !replyText.trim()) {
      message.warning("Please enter a reply message");
      return;
    }
    try {
      setSubmittingReply(true);
      await adminSupportApi.replyToTicket(ticketId, replyText.trim(), replyStatusChange);
      message.success("Reply dispatched to patient with notification");
      setReplyText("");
      setReplyStatusChange(undefined);
      await fetchDetails();
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to send reply"));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!ticketId || !noteText.trim()) {
      message.warning("Please enter note content");
      return;
    }
    try {
      setSubmittingNote(true);
      await adminSupportApi.addInternalNote(ticketId, noteText.trim());
      message.success("Private staff note saved");
      setNoteText("");
      await fetchDetails();
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save internal note"));
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!ticketId) return;
    try {
      setGeneratingSummary(true);
      const res = await adminSupportApi.generateAiSummary(ticketId);
      setAiSummary(res);
      message.success("AI incident summary generated");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to generate AI summary"));
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!ticketId) return;
    try {
      await adminSupportApi.updateTicket(ticketId, {
        status: "RESOLVED",
        resolutionNotes: resolutionNotes.trim() ? resolutionNotes.trim() : "Resolved by support agent",
      });
      message.success("Ticket marked as Resolved");
      setResolutionModalVisible(false);
      await fetchDetails();
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to resolve ticket"));
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;
    try {
      await adminSupportApi.updateTicket(ticketId, { status: "CLOSED" });
      message.success("Ticket closed");
      await fetchDetails();
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to close ticket"));
    }
  };

  const handleReopenTicket = async () => {
    if (!ticketId) return;
    try {
      await adminSupportApi.updateTicket(ticketId, { status: "OPEN" });
      message.success("Ticket reopened");
      await fetchDetails();
      onTicketUpdated();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to reopen ticket"));
    }
  };

  const getPriorityBadgeColor = (p: TicketPriority) => {
    switch (p) {
      case "URGENT":
        return "red";
      case "HIGH":
        return "orange";
      case "MEDIUM":
        return "blue";
      case "LOW":
      default:
        return "default";
    }
  };

  const getStatusTag = (s: TicketStatus) => {
    switch (s) {
      case "OPEN":
        return <Tag color="blue">OPEN</Tag>;
      case "IN_PROGRESS":
        return <Tag color="gold">IN PROGRESS</Tag>;
      case "WAITING_FOR_PATIENT":
        return <Tag color="purple">WAITING FOR PATIENT</Tag>;
      case "RESOLVED":
        return <Tag color="green">RESOLVED</Tag>;
      case "CLOSED":
        return <Tag color="default">CLOSED</Tag>;
      default:
        return <Tag>{s}</Tag>;
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 24 }}>
          <Space  size="middle">
            <span style={{ fontSize: 18, fontWeight: 700, color: "#1677ff" }}>
              {ticket?.ticket_number ?? "Ticket"}
            </span>
            {ticket && getStatusTag(ticket.status)}
            {ticket && <Tag color={getPriorityBadgeColor(ticket.priority)}>{ticket.priority}</Tag>}
            {ticket && <Tag>{ticket.category}</Tag>}
          </Space>
          <Space>
            {ticket?.status !== "RESOLVED" && ticket?.status !== "CLOSED" && (
              <Button
                type="primary"
                style={{ backgroundColor: "#52c41a" }}
                icon={<CheckCircle2 size={15} />}
                onClick={() => setResolutionModalVisible(true)}
              >
                Mark Resolved
              </Button>
            )}
            {ticket?.status === "RESOLVED" && (
              <Button onClick={() => { void handleCloseTicket(); }}>Close Ticket</Button>
            )}
            {(ticket?.status === "RESOLVED" || ticket?.status === "CLOSED") && (
              <Button onClick={() => { void handleReopenTicket(); }} icon={<RefreshCw size={15} />}>
                Reopen Ticket
              </Button>
            )}
          </Space>
        </div>
      }
      placement="right"
      width={780}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : !ticket ? (
        <Empty description="Ticket not found" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Ticket Header & Subject */}
          <Card size="small" style={{ borderRadius: 8, backgroundColor: "#fafafa" }}>
            <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
              {ticket.subject}
            </Title>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Patient Name">
                <Text strong>{ticket.user_name || "Patient"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {ticket.user_phone ? (
                  <Space>
                    <Phone size={13} orientation="horizontal" />
                    <a href={`tel:${ticket.user_phone}`}>{ticket.user_phone}</a>
                  </Space>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                <Space>
                  <Clock size={13} />
                  <span>{new Date(ticket.created_at).toLocaleString()}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Agent">
                <Select
                  style={{ width: "100%", maxWidth: 200 }}
                  placeholder="Unassigned"
                  allowClear
                  value={ticket.assigned_to ?? undefined}
                  onChange={(val) => {
                    void handleAssignChange(val ?? null);
                  }}
                  options={(agents || []).map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.role})`,
                  }))}
                />
              </Descriptions.Item>
              {ticket.related_entity_type && (
                <Descriptions.Item label="Related To">
                  <Tag color="cyan">
                    {ticket.related_entity_type} {ticket.related_entity_id ? `#${ticket.related_entity_id.slice(0, 8)}` : ""}
                  </Tag>
                </Descriptions.Item>
              )}
              {ticket.resolved_at && (
                <Descriptions.Item label="Resolved At">
                  {new Date(ticket.resolved_at).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* AI Incident Summary Card */}
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #d3adf7",
              background: "linear-gradient(135deg, #f9f0ff 0%, #ffffff 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Space>
                <Sparkles size={16} color="#722ed1" />
                <Text strong style={{ color: "#722ed1" }}>
                  AI Incident Summary & Context
                </Text>
              </Space>
              <Button
                size="small"
                type="dashed"
                icon={<Bot size={14} />}
                loading={generatingSummary}
                onClick={() => { void handleGenerateSummary(); }}
              >
                {aiSummary ? "Regenerate Summary" : "Generate Summary"}
              </Button>
            </div>
            {aiSummary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
                {aiSummary.problemSummary && (
                  <div>
                    <Text strong style={{ color: "#531dab", fontSize: 12 }}>Problem Summary:</Text>
                    <Paragraph style={{ margin: "2px 0 0", color: "#391085", fontSize: 13, lineHeight: "1.5" }}>
                      {aiSummary.problemSummary}
                    </Paragraph>
                  </div>
                )}
                {aiSummary.troubleshootingAttempted && (
                  <div>
                    <Text strong style={{ color: "#531dab", fontSize: 12 }}>Troubleshooting Attempted:</Text>
                    <Paragraph style={{ margin: "2px 0 0", color: "#391085", fontSize: 13, lineHeight: "1.5" }}>
                      {aiSummary.troubleshootingAttempted}
                    </Paragraph>
                  </div>
                )}
                {aiSummary.suggestedNextSteps && (
                  <div>
                    <Text strong style={{ color: "#531dab", fontSize: 12 }}>Suggested Next Steps:</Text>
                    <Paragraph style={{ margin: "2px 0 0", color: "#391085", fontSize: 13, lineHeight: "1.5" }}>
                      {aiSummary.suggestedNextSteps}
                    </Paragraph>
                  </div>
                )}
                {aiSummary.summary && !aiSummary.problemSummary && (
                  <Paragraph style={{ margin: 0, color: "#391085", fontSize: 13, lineHeight: "1.6" }}>
                    {aiSummary.summary}
                  </Paragraph>
                )}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Click &ldquo;Generate Summary&rdquo; to produce a grounded incident briefing with Gemini based on patient context and messages.
              </Text>
            )}
          </Card>

          {/* Initial AI Patient-Bot Conversation (if escalated from AI) */}
          {details?.aiConversation && Array.isArray(details.aiConversation.messages) && details.aiConversation.messages.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <Bot size={15} color="#1677ff" />
                  <span>Prior AI Chat Session (Before Escalation)</span>
                </Space>
              }
              style={{ borderRadius: 8, borderColor: "#bae0ff" }}
            >
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 8 }}>
                {details.aiConversation.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender_type === "PATIENT" ? "flex-start" : "flex-end",
                      maxWidth: "85%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: m.sender_type === "PATIENT" ? "#f5f5f5" : "#e6f4ff",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, color: m.sender_type === "PATIENT" ? "#595959" : "#1677ff" }}>
                      {m.sender_type === "PATIENT" ? "Patient" : "AI Assistant"}
                    </div>
                    <div>{m.message}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unified Ticket Timeline */}
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              Conversation & Audit Timeline
            </Title>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxHeight: 380,
                overflowY: "auto",
                padding: "8px 12px",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                backgroundColor: "#fafafa",
              }}
            >
              {(details?.messages || []).map((m) => {
                const isInternalNote = m.message_type === "INTERNAL_NOTE";
                const isPatient = m.sender_type === "PATIENT";
                const isSystem = m.sender_type === "SYSTEM";

                if (isInternalNote) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#fffbe6",
                        border: "1px solid #ffe58f",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <Space>
                          <Lock size={13} color="#d46b08" />
                          <Text strong style={{ color: "#d46b08", fontSize: 12 }}>
                            Internal Staff Note ({m.sender_name ?? "Admin Staff"})
                          </Text>
                          <Tag color="warning" style={{ fontSize: 10 }}>
                            Hidden from Patient
                          </Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(m.created_at).toLocaleString()}
                        </Text>
                      </div>
                      <div style={{ fontSize: 13, color: "#595959" }}>{m.message}</div>
                    </div>
                  );
                }

                if (isSystem) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        textAlign: "center",
                        padding: "4px 8px",
                      }}
                    >
                      <Tag color="default" style={{ fontSize: 11 }}>
                        {m.message} · {new Date(m.created_at).toLocaleTimeString()}
                      </Tag>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isPatient ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        backgroundColor: isPatient ? "#ffffff" : "#1677ff",
                        color: isPatient ? "#262626" : "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        border: isPatient ? "1px solid #e8e8e8" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginBottom: 4,
                          color: isPatient ? "#8c8c8c" : "rgba(255,255,255,0.85)",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span>{isPatient ? ticket.user_name ?? "Patient" : m.sender_name ?? "Support Staff"}</span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action / Reply Composer */}
          <Card size="small" style={{ borderRadius: 8 }}>
            <Tabs
              defaultActiveKey="reply"
              items={[
                {
                  key: "reply",
                  label: (
                    <Space>
                      <MessageSquare size={14} />
                      <span>Reply to Patient</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <TextArea
                        rows={3}
                        placeholder="Write a clear, professional reply to the patient (dispatches in-app notification)..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space>
                          <Text style={{ fontSize: 12 }}>Next Status:</Text>
                          <Select
                            size="small"
                            style={{ width: 160 }}
                            placeholder="Leave Unchanged"
                            allowClear
                            value={replyStatusChange}
                            onChange={(val) => setReplyStatusChange(val)}
                            options={[
                              { value: "WAITING_FOR_PATIENT", label: "Waiting for Patient" },
                              { value: "IN_PROGRESS", label: "In Progress" },
                              { value: "RESOLVED", label: "Resolved" },
                            ]}
                          />
                        </Space>
                        <Button
                          type="primary"
                          icon={<Send size={14} />}
                          loading={submittingReply}
                          onClick={() => { void handleSendReply(); }}
                        >
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "internal_note",
                  label: (
                    <Space>
                      <Lock size={14} color="#d46b08" />
                      <span>Internal Staff Note</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Alert
                        type="warning"
                        showIcon
                        message="Internal notes are strictly confidential to clinic staff and are NEVER visible to the patient."
                      />
                      <TextArea
                        rows={3}
                        placeholder="Record staff observations, doctor instructions, follow-up actions..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          style={{ backgroundColor: "#faad14", color: "#fff" }}
                          icon={<Lock size={14} />}
                          loading={submittingNote}
                          onClick={() => { void handleAddInternalNote(); }}
                        >
                          Save Internal Note
                        </Button>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Resolution Notes Modal */}
      <Modal
        title="Resolve Support Ticket"
        open={resolutionModalVisible}
        onOk={() => { void handleMarkResolved(); }}
        onCancel={() => setResolutionModalVisible(false)}
        okText="Resolve Ticket"
        okButtonProps={{ style: { backgroundColor: "#52c41a" } }}
      >
        <p style={{ fontSize: 13, color: "#595959" }}>
          Please summarize the final resolution or actions taken for this patient. This will update the ticket to RESOLVED and notify the patient.
        </p>
        <TextArea
          rows={3}
          placeholder="Resolution summary (e.g. Appointment rescheduled to Oct 25th 10:00 AM; refund issued)..."
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
        />
      </Modal>
    </Drawer>
  );
};
