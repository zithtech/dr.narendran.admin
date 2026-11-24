export type SenderType = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'STAFF' | string;
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | string;
export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'BLOCKED' | string;

export interface ChatRecipient {
  id: string;
  name: string;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'STAFF' | string;
  subtitle?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  profile_image_url?: string;
  is_online?: boolean;
  online_status?: 'online' | 'offline';
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
  user_account_id?: string;
  gender?: string;
  age?: number | string;
  status?: string;
}

export interface ChatConversation {
  id: string;
  conversation_id?: string;
  patient_id?: string;
  doctor_id?: string;
  status: ConversationStatus;
  last_message_id?: string | null;
  last_message_at?: string | null;
  last_message?: string | null;
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  patient_name?: string;
  doctor_avatar?: string;
  patient_avatar?: string;
  doctor_online?: boolean;
  patient_online?: boolean;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  conversationId?: string;
  sender_id: string;
  senderId?: string;
  sender_role?: string;
  senderRole?: string;
  sender_type?: SenderType;
  senderType?: SenderType;
  recipient_id?: string;
  recipientId?: string;
  message: string;
  content?: string;
  message_type?: string;
  messageType?: string;
  status?: MessageStatus;
  sent_at?: string;
  sentAt?: string;
  delivered_at?: string | null;
  deliveredAt?: string | null;
  read_at?: string | null;
  readAt?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  attachment_url?: string | null;
  attachmentUrl?: string | null;
  attachment_name?: string | null;
  attachmentName?: string | null;
  attachment_type?: string | null;
  attachmentType?: string | null;
  attachment_size?: number | null;
  attachmentSize?: number | null;
  reply_to_message_id?: string | null;
  replyToMessageId?: string | null;
}

export interface SendMessagePayload {
  conversationId: string;
  message: string;
  messageType?: string | undefined;
  recipientId?: string | undefined;
  replyToMessageId?: string | null | undefined;
}
