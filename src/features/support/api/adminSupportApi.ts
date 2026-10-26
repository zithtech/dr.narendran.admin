import api from "../../../utils/api";
import type {
  AdminAgent,
  SupportKnowledgeArticle,
  SupportMetrics,
  SupportTicket,
  SupportTicketAuditLog,
  SupportTicketMessage,
  TicketFilterParams,
  TicketStatus,
} from "../types/support";

export interface TicketDetailsResponse {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
  auditLogs: SupportTicketAuditLog[];
  aiConversation?: {
    id: string;
    messages: {
      id: string;
      sender_type: string;
      message: string;
      created_at: string;
    }[];
  } | null;
}

export const adminSupportApi = {
  async getMetrics(): Promise<SupportMetrics> {
    const res = await api.get<SupportMetrics>("admin/support/metrics");
    return res.data;
  },

  async getTickets(params: TicketFilterParams = {}): Promise<{ tickets: SupportTicket[]; total: number }> {
    const res = await api.get<{ tickets: SupportTicket[]; total: number }>("admin/support/tickets", { params });
    return res.data;
  },

  async getTicketDetails(id: string): Promise<TicketDetailsResponse> {
    const res = await api.get<TicketDetailsResponse>(`admin/support/tickets/${id}`);
    return res.data;
  },

  async assignTicket(id: string, agentId: string | null): Promise<SupportTicket> {
    const res = await api.post<SupportTicket>(`admin/support/tickets/${id}/assign`, { agentId });
    return res.data;
  },

  async updateTicket(
    id: string,
    updates: { status?: TicketStatus; priority?: string; category?: string; resolutionNotes?: string }
  ): Promise<SupportTicket> {
    const res = await api.patch<SupportTicket>(`admin/support/tickets/${id}`, updates);
    return res.data;
  },

  async replyToTicket(id: string, message: string, statusChange?: TicketStatus): Promise<SupportTicketMessage> {
    const res = await api.post<SupportTicketMessage>(`admin/support/tickets/${id}/messages`, {
      message,
      statusChange,
    });
    return res.data;
  },

  async addInternalNote(id: string, note: string): Promise<SupportTicketMessage> {
    const res = await api.post<SupportTicketMessage>(`admin/support/tickets/${id}/internal-notes`, {
      note,
    });
    return res.data;
  },

  async generateAiSummary(id: string): Promise<{
    summary?: string;
    problemSummary?: string;
    troubleshootingAttempted?: string;
    suggestedNextSteps?: string;
  }> {
    const res = await api.post<{
      summary?: string;
      problemSummary?: string;
      troubleshootingAttempted?: string;
      suggestedNextSteps?: string;
    }>(`admin/support/tickets/${id}/ai-summary`);
    return res.data;
  },

  async getAgents(): Promise<AdminAgent[]> {
    const res = await api.get<AdminAgent[] | { agents: AdminAgent[] }>("admin/support/agents");
    if (res.data && Array.isArray((res.data as { agents?: AdminAgent[] }).agents)) {
      return (res.data as { agents: AdminAgent[] }).agents;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  async getArticles(params?: { category?: string | undefined; search?: string | undefined }): Promise<SupportKnowledgeArticle[]> {
    const res = await api.get<SupportKnowledgeArticle[] | { articles: SupportKnowledgeArticle[] }>("admin/support/articles", { params });
    if (res.data && Array.isArray((res.data as { articles?: SupportKnowledgeArticle[] }).articles)) {
      return (res.data as { articles: SupportKnowledgeArticle[] }).articles;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  async createArticle(data: {
    title: string;
    slug?: string;
    category: string;
    content: string;
    keywords?: string[];
    isFaq?: boolean;
    status?: string;
  }): Promise<SupportKnowledgeArticle> {
    const res = await api.post<SupportKnowledgeArticle>("admin/support/articles", data);
    return res.data;
  },

  async updateArticle(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      category: string;
      content: string;
      keywords: string[];
      isFaq: boolean;
      status: string;
    }>
  ): Promise<SupportKnowledgeArticle> {
    const res = await api.put<SupportKnowledgeArticle>(`admin/support/articles/${id}`, data);
    return res.data;
  },

  async deleteArticle(id: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`admin/support/articles/${id}`);
    return res.data;
  },
};
