export type SenderType = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'STAFF' | string;
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | string;
export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'BLOCKED' | string;

export interface ChatRecipient {
  id: string;
  name: string;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'STAFF' | string;
  subtitle?: string | undefined;
  specialization?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  avatar_url?: string | undefined;
  profile_image_url?: string | undefined;
  is_online?: boolean | undefined;
  online_status?: 'online' | 'offline' | undefined;
  unread_count?: number | undefined;
  last_message?: string | undefined;
  last_message_at?: string | undefined;
  user_account_id?: string | undefined;
  gender?: string | undefined;
  age?: number | string | undefined;
  status?: string | undefined;
}

export interface ChatConversation {
  id: string;
  conversation_id?: string | undefined;
  conversationId?: string | undefined;
  patient_id?: string | undefined;
  patientId?: string | undefined;
  doctor_id?: string | undefined;
  doctorId?: string | undefined;
  status: ConversationStatus;
  last_message_id?: string | null | undefined;
  last_message_at?: string | null | undefined;
  last_message?: string | null | undefined;
  lastMessage?: string | null | undefined;
  created_at: string;
  updated_at: string;
  doctor_name?: string | undefined;
  patient_name?: string | undefined;
  doctor_avatar?: string | undefined;
  patient_avatar?: string | undefined;
  doctor_online?: boolean | undefined;
  patient_online?: boolean | undefined;
  unread_count?: number | undefined;
  unreadCount?: number | undefined;
  recipient_id?: string | undefined;
  recipientId?: string | undefined;
  recipient_name?: string | undefined;
  recipient_avatar?: string | undefined;
  other_participant_name?: string | undefined;
  name?: string | undefined;
  avatar_url?: string | undefined;
  is_online?: boolean | undefined;
  role?: string | undefined;
  specialization?: string | undefined;
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
