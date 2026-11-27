import api from '../../../utils/api';
import type { ChatConversation, ChatMessage, ChatRecipient } from '../types/chat';

export const chatApi = {
  /**
   * Get doctors list for chat with presence and last message
   */
  getDoctors: async (speciality?: string, search?: string): Promise<ChatRecipient[]> => {
    try {
      const res = await api.get('chat/doctors', {
        params: { speciality, search },
      });
      const data = res.data?.data || res.data?.doctors || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name?.startsWith('Dr.') ? d.name : `Dr. ${d.name || 'Doctor'}`,
          role: 'DOCTOR',
          subtitle: d.specialization || d.specialty || 'General Medicine',
          specialization: d.specialization || d.specialty || 'General Medicine',
          phone: d.phone,
          email: d.email,
          avatar_url: d.profile_image_url || d.avatar_url,
          is_online: Boolean(d.is_online || d.online_status === 'online'),
          unread_count: d.unread_count || 0,
          last_message: d.last_message,
          last_message_at: d.last_message_at,
          user_account_id: d.user_account_id || d.userAccountId,
          status: d.status || 'ACTIVE',
        }));
      }
    } catch {
      // Fallback to standard doctors endpoint if chat/doctors is not ready
    }

    try {
      const fallbackRes = await api.get('doctors');
      const fallbackData = fallbackRes.data?.data || fallbackRes.data?.doctors || fallbackRes.data || [];
      return (Array.isArray(fallbackData) ? fallbackData : []).map((d: any) => ({
        id: d.id,
        name: d.name?.startsWith('Dr.') ? d.name : `Dr. ${d.name || 'Doctor'}`,
        role: 'DOCTOR',
        subtitle: d.specialization || 'General Medicine',
        specialization: d.specialization || 'General Medicine',
        phone: d.phone,
        email: d.email,
        avatar_url: d.profile_image_url,
        is_online: false,
        unread_count: 0,
        user_account_id: d.user_account_id,
        status: d.status || 'ACTIVE',
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get patients list for chat
   */
  getPatients: async (search?: string): Promise<ChatRecipient[]> => {
    try {
      const res = await api.get('patients', { params: { search } });
      const data = res.data?.data || res.data?.patients || res.data || [];
      return (Array.isArray(data) ? data : []).map((p: any) => {
        const displayName = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';
        const ageGender = [p.age ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' • ');
        return {
          id: p.id,
          name: displayName,
          role: 'PATIENT',
          subtitle: ageGender || p.phone || p.mrn || 'Patient',
          phone: p.phone,
          email: p.email,
          age: p.age,
          gender: p.gender,
          avatar_url: p.profile_image_url || p.avatar_url,
          is_online: false,
          user_account_id: p.user_account_id || p.user_id,
          status: p.status || 'ACTIVE',
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Get eligible other users (Admins, Staff, etc.)
   */
  getOtherUsers: async (search?: string): Promise<ChatRecipient[]> => {
    try {
      const res = await api.get('chat/others', { params: { search } });
      const data = res.data?.data || res.data?.users || res.data?.others || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        return data.map((u: any) => ({
          id: u.id,
          name: u.name || u.username || 'Admin User',
          role: (u.role || 'ADMIN').toUpperCase(),
          subtitle: `${u.role || 'Admin'} Account`,
          email: u.email,
          phone: u.phone,
          avatar_url: u.avatar_url || u.profile_image_url,
          is_online: Boolean(u.is_online || u.online_status === 'online'),
          unread_count: u.unread_count || 0,
          last_message: u.last_message,
          last_message_at: u.last_message_at,
          user_account_id: u.user_account_id || u.id,
          status: u.status || 'ACTIVE',
        }));
      }
    } catch {
      // Fallback below
    }

    // Fallback: query user-accounts and staff
    try {
      const [usersRes, staffRes] = await Promise.allSettled([
        api.get('user-accounts', { params: { search } }),
        api.get('staff', { params: { search } }),
      ]);
      const usersList =
        usersRes.status === 'fulfilled'
          ? usersRes.value.data?.data || usersRes.value.data?.users || usersRes.value.data || []
          : [];
      const staffList =
        staffRes.status === 'fulfilled'
          ? staffRes.value.data?.data || staffRes.value.data?.staff || staffRes.value.data || []
          : [];

      const combined: ChatRecipient[] = [];
      const seen = new Set<string>();

      (Array.isArray(usersList) ? usersList : []).forEach((u: any) => {
        if (!u || !u.id) return;
        const key = String(u.username || u.email || u.id).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        combined.push({
          id: u.id,
          name: u.username || u.name || 'User',
          role: (u.role || 'ADMIN').toUpperCase(),
          subtitle: `${u.role || 'Admin'} Account`,
          email: u.email,
          phone: u.phone,
          is_online: false,
          user_account_id: u.id,
          status: u.status || 'ACTIVE',
        });
      });

      (Array.isArray(staffList) ? staffList : []).forEach((s: any) => {
        if (!s || !s.id) return;
        const key = String(s.email || s.name || s.id).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        combined.push({
          id: s.id,
          name: s.name || 'Staff Member',
          role: (s.role || 'STAFF').toUpperCase(),
          subtitle: s.department || s.role || 'Hospital Staff',
          email: s.email,
          phone: s.phone,
          is_online: false,
          user_account_id: s.user_account_id || s.id,
          status: s.status || 'ACTIVE',
        });
      });

      return combined;
    } catch {
      return [];
    }
  },

  /**
   * Get list of conversations
   */
  getConversations: async (): Promise<ChatConversation[]> => {
    try {
      const res = await api.get('chat/conversations');
      const data = res.data?.data || res.data?.conversations || res.data || [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Find or create conversation with a recipient
   */
  getOrCreateConversation: async (params: {
    doctor_id?: string | undefined;
    patient_id?: string | undefined;
    recipient_id?: string | undefined;
  }): Promise<ChatConversation> => {
    const payload: Record<string, string | undefined> = {};
    if (params.doctor_id) {
      payload['doctor_id'] = params.doctor_id;
      payload['doctorId'] = params.doctor_id;
    }
    if (params.patient_id) {
      payload['patient_id'] = params.patient_id;
      payload['patientId'] = params.patient_id;
    }
    if (params.recipient_id) {
      payload['recipient_id'] = params.recipient_id;
      payload['recipientId'] = params.recipient_id;
    }
    const res = await api.post('chat/conversations', payload);
    const data = res.data?.data || res.data;
    return {
      ...data,
      id: data?.id || data?.conversation_id,
    };
  },

  /**
   * Get message history for a conversation
   */
  getMessages: async (
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<ChatMessage[]> => {
    try {
      const res = await api.get(`chat/conversations/${conversationId}/messages`, {
        params: { limit, before },
      });
      const data = res.data?.data || res.data?.messages || res.data || [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Mark messages as read in conversation
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      await api.post(`chat/conversations/${conversationId}/read`);
    } catch {
      // Ignore background read receipt failure
    }
  },

  /**
   * Upload an attachment to a conversation
   */
  uploadAttachment: async (
    conversationId: string,
    file: File,
    caption?: string,
    replyToMessageId?: string,
    duration?: number,
  ): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
      formData.append('message', caption.trim());
    }
    if (replyToMessageId) {
      formData.append('replyToMessageId', replyToMessageId);
      formData.append('reply_to_message_id', replyToMessageId);
    }
    if (duration !== undefined && duration !== null && !isNaN(duration)) {
      formData.append('duration', String(duration));
    }

    const res = await api.post(`chat/conversations/${conversationId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data?.data || res.data;
  },

  /**
   * Upload a recorded voice note
   */
  uploadVoiceNote: async (
    conversationId: string,
    audioBlob: Blob,
    duration: number,
    fileName = `voice_note_${Date.now()}.webm`,
    replyToMessageId?: string,
  ): Promise<ChatMessage> => {
    const file = new File([audioBlob], fileName, {
      type: audioBlob.type || 'audio/webm',
    });
    return chatApi.uploadAttachment(
      conversationId,
      file,
      undefined,
      replyToMessageId,
      duration,
    );
  },

  /**
   * Get fresh signed download URL for an attachment
   */
  getAttachmentDownloadUrl: async (
    conversationId: string,
    messageId: string,
  ): Promise<{ downloadUrl: string; fileName: string; mimeType: string }> => {
    const res = await api.get(
      `chat/conversations/${conversationId}/messages/${messageId}/attachment`,
    );
    return res.data?.data || res.data;
  },

  /**
   * Search messages within a conversation
   */
  searchMessages: async (
    conversationId: string,
    query: string,
    limit = 30,
    offset = 0,
  ): Promise<{ results: ChatMessage[]; total: number; query: string }> => {
    if (!query || !query.trim()) {
      return { results: [], total: 0, query: '' };
    }
    const res = await api.get(`chat/conversations/${conversationId}/search`, {
      params: { q: query.trim(), limit, offset },
    });
    const data = res.data?.data || res.data || {};
    const results = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    return {
      results,
      total: typeof data.total === 'number' ? data.total : results.length,
      query: data.query || query,
    };
  },
};
