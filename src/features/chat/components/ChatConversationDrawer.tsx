import {
  AlertCircle,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { chatApi } from '../api/chatApi';
import { chatSocket } from '../services/chatSocket';
import type { ChatMessage, ChatRecipient } from '../types/chat';

export interface ChatConversationDrawerProps {
  open: boolean;
  onClose: () => void;
  recipient: ChatRecipient | null;
  initialConversationId?: string | null;
  currentUserId?: string;
  currentUserRole?: string;
  canSend?: boolean;
}

function formatMessageTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  const clean = name.replace(/^Dr\.\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'U';
}

export const ChatConversationDrawer: React.FC<ChatConversationDrawerProps> = ({
  open,
  onClose,
  recipient,
  initialConversationId,
  currentUserId = '',
  currentUserRole = 'ADMIN',
  canSend = true,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Initialize or fetch conversation
  const initConversation = useCallback(async () => {
    if (!recipient) return;
    setLoading(true);
    setError(null);

    try {
      let convId = initialConversationId;

      if (!convId) {
        let doctorId: string | undefined = undefined;
        let patientId: string | undefined = undefined;
        let recipientId: string | undefined = recipient.id;

        if (recipient.role === 'DOCTOR') {
          doctorId = recipient.id;
        } else if (recipient.role === 'PATIENT') {
          patientId = recipient.id;
        }

        const conv = await chatApi.getOrCreateConversation({
          doctor_id: doctorId,
          patient_id: patientId,
          recipient_id: recipientId,
        });

        convId = conv.id;
      }

      setConversationId(convId);

      if (convId) {
        // Fetch message history
        const history = await chatApi.getMessages(convId);
        setMessages(Array.isArray(history) ? history : (history as any)?.messages || []);

        // Connect socket & join room
        chatSocket.connect();
        chatSocket.joinConversation(convId);

        // Mark as read
        void chatApi.markAsRead(convId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversation history.');
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [recipient, initialConversationId, scrollToBottom]);

  useEffect(() => {
    if (open && recipient) {
      void initConversation();
    } else {
      if (conversationId) {
        chatSocket.leaveConversation(conversationId);
      }
      setConversationId(null);
      setMessages([]);
      setInputText('');
      setError(null);
    }
  }, [open, recipient, initConversation]);

  // Real-time socket message listeners
  useEffect(() => {
    if (!open || !conversationId) return;

    const handleIncomingMessage = (incomingMsg: any) => {
      const msgConvId = incomingMsg.conversation_id || incomingMsg.conversationId;
      if (msgConvId === conversationId) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === incomingMsg.id)) {
            return prev.map((m) => (m.id === incomingMsg.id ? { ...m, ...incomingMsg } : m));
          }
          return [...prev, incomingMsg];
        });

        // Mark incoming message as read
        void chatApi.markAsRead(conversationId);
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    const handleReadReceipt = (data: any) => {
      const targetConv = data?.conversationId || data?.conversation_id;
      const messageIds: string[] = data?.messageIds || [];
      if (targetConv === conversationId && messageIds.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: 'READ' } : m)),
        );
      }
    };

    const handleDeliveryReceipt = (data: any) => {
      const targetConv = data?.conversationId || data?.conversation_id;
      const messageIds: string[] = data?.messageIds || [];
      if (targetConv === conversationId && messageIds.length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m.id) && m.status !== 'READ' ? { ...m, status: 'DELIVERED' } : m,
          ),
        );
      }
    };

    chatSocket.on('chat:message', handleIncomingMessage);
    chatSocket.on('chat:message:read', handleReadReceipt);
    chatSocket.on('chat:read', handleReadReceipt);
    chatSocket.on('chat:message:delivered', handleDeliveryReceipt);
    chatSocket.on('chat:delivery', handleDeliveryReceipt);

    return () => {
      chatSocket.off('chat:message', handleIncomingMessage);
      chatSocket.off('chat:message:read', handleReadReceipt);
      chatSocket.off('chat:read', handleReadReceipt);
      chatSocket.off('chat:message:delivered', handleDeliveryReceipt);
      chatSocket.off('chat:delivery', handleDeliveryReceipt);
    };
  }, [open, conversationId, scrollToBottom]);

  // Focus input on open
  useEffect(() => {
    if (open && !loading) {
      inputRef.current?.focus();
    }
  }, [open, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    const trimmed = inputText.trim();
    if (!trimmed || sending || !conversationId) return;

    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      conversationId,
      sender_id: currentUserId || 'me',
      senderId: currentUserId || 'me',
      sender_role: currentUserRole,
      senderRole: currentUserRole,
      message: trimmed,
      content: trimmed,
      status: 'SENT',
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setTimeout(() => scrollToBottom(true), 20);

    try {
      chatSocket.sendMessage(
        {
          conversationId,
          message: trimmed,
          messageType: 'TEXT',
          recipientId: recipient?.id,
        },
        (res) => {
          const data = res?.data;
          if (res?.success && data) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, ...data, id: data.id } : m)),
            );
          }
        },
      );
    } catch {
      // Message rendered optimistically
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!open || !recipient) return null;

  const isMe = (m: ChatMessage) => {
    const sId = String(m.sender_id || m.senderId || '');
    const myId = String(currentUserId || '');
    if (myId && sId === myId) return true;
    if (sId === 'me') return true;

    // Check sender type vs user role
    const sType = String(m.sender_type || m.senderType || '').toUpperCase();
    const myRole = String(currentUserRole || '').toUpperCase();
    if (myRole.includes('DOCTOR') && sType === 'DOCTOR') return true;
    if (myRole.includes('PATIENT') && sType === 'PATIENT') return true;
    if (myRole.includes('ADMIN') && (sType === 'ADMIN' || sType === 'STAFF')) return true;

    return false;
  };

  const renderStatusIcon = (status?: string) => {
    const s = String(status || 'SENT').toUpperCase();
    if (s === 'READ') {
      return (
        <span title="Read">
          <CheckCheck size={14} className="text-sky-400" />
        </span>
      );
    }
    if (s === 'DELIVERED') {
      return (
        <span title="Delivered">
          <CheckCheck size={14} className="text-slate-300" />
        </span>
      );
    }
    return (
      <span title="Sent">
        <Check size={14} className="text-slate-300" />
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${recipient.name}`}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end"
    >
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {recipient.avatar_url ? (
                <img
                  src={recipient.avatar_url}
                  alt={recipient.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm grid place-items-center">
                  {getInitials(recipient.name)}
                </div>
              )}
              {recipient.is_online ? (
                <span
                  title="Online"
                  className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
                />
              ) : (
                <span
                  title="Offline"
                  className="absolute bottom-0 right-0 w-3 h-3 bg-slate-300 border-2 border-white rounded-full"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {recipient.name}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {recipient.role}
                </span>
                {!canSend && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                    Read-only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {recipient.subtitle || recipient.specialization || recipient.email || recipient.phone || 'Available for chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void initConversation()}
              title="Refresh conversation"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close chat"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 py-16">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <span className="text-xs">Loading conversation history...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle size={16} />
                Failed to load messages
              </div>
              <p className="text-xs text-rose-600">{error}</p>
              <button
                type="button"
                onClick={() => void initConversation()}
                className="mt-1 self-start px-3 py-1 bg-rose-600 text-white rounded-md text-xs font-medium hover:bg-rose-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 grid place-items-center mb-3">
                <MessageSquare size={24} />
              </div>
              <p className="text-sm font-medium text-slate-700">No messages yet</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Start a direct conversation with {recipient.name}. Messages are synced in real time.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = isMe(m);
              const text = m.message || m.content || '';
              const time = formatMessageTime(m.sent_at || m.sentAt || m.created_at || m.createdAt);

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'} transition-opacity`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs break-words ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {!mine && (
                      <span className="block text-[11px] font-semibold text-blue-600 mb-0.5">
                        {recipient.name}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                    <div
                      className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                        mine ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      <span>{time}</span>
                      {mine && renderStatusIcon(m.status)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !canSend
                ? 'You have read-only access to this chat.'
                : `Message ${recipient.name}...`
            }
            disabled={!canSend || loading || Boolean(error)}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend || !inputText.trim() || sending || loading || Boolean(error)}
            className="w-10 h-10 rounded-full bg-blue-600 text-white grid place-items-center hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            title={!canSend ? 'Read-only access' : 'Send message'}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};
