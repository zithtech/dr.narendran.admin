export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_PATIENT" | "RESOLVED" | "CLOSED";

export type TicketPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export type TicketCategory =
  | "APPOINTMENTS"
  | "PRESCRIPTIONS"
  | "MEDICINE_ORDERS"
  | "LAB_REPORTS"
  | "PAYMENTS"
  | "TECHNICAL_HELP"
  | "GENERAL_INQUIRY";

export interface AdminAgent {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_phone?: string | null;
  user_email?: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string | null;
  assigned_agent_name?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  ai_conversation_id?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_messages_count?: number;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "PATIENT" | "SUPPORT_AGENT" | "SYSTEM";
  sender_id?: string | null;
  sender_name?: string | null;
  message_type: "MESSAGE" | "INTERNAL_NOTE" | "STATUS_CHANGE";
  message: string;
  attachments?: unknown[] | null;
  created_at: string;
}

export interface SupportTicketAuditLog {
  id: string;
  ticket_id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
}

export interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  avgFirstResponseMinutes: number;
  satisfactionRate: number;
}

export interface SupportKnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: TicketCategory;
  content: string;
  keywords?: string[];
  is_faq: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface TicketFilterParams {
  status?: TicketStatus | undefined;
  category?: TicketCategory | undefined;
  priority?: TicketPriority | undefined;
  assignedTo?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
