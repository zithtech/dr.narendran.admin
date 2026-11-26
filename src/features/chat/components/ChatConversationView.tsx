import {
  AlertCircle,
  ArrowLeft,
  Bold,
  Check,
  CheckCheck,
  Italic,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Strikethrough,
  Video,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { chatApi } from '../api/chatApi';
import { chatSocket } from '../services/chatSocket';
import type { ChatMessage, ChatRecipient } from '../types/chat';

export interface ChatConversationViewProps {
  recipient: ChatRecipient | null;
  conversationId: string | null;
  onConversationIdResolved?: (id: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
  canSend?: boolean;
  onBack?: () => void;
  onMessageSent?: (msg: ChatMessage) => void;
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

function formatGroupDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

export const ChatConversationView: React.FC<ChatConversationViewProps> = ({
  recipient,
  conversationId: initialConversationId,
  onConversationIdResolved,
  currentUserId = '',
  currentUserRole = 'ADMIN',
  canSend = true,
  onBack,
  onMessageSent,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Update conversationId if changed externally
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId);
    }
  }, [initialConversationId]);

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
        setConversationId(conv.id);
        if (conv.id && onConversationIdResolved) {
          onConversationIdResolved(conv.id);
        }
      }

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
  }, [recipient, initialConversationId, onConversationIdResolved, scrollToBottom]);

  useEffect(() => {
    if (recipient) {
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
  }, [recipient, initConversation]);

  // Real-time socket message listeners
  useEffect(() => {
    if (!conversationId) return;

    const handleIncomingMessage = (msg: any) => {
      const incomingConvId = msg.conversation_id || msg.conversationId;
      if (incomingConvId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
          }
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(true), 30);
        void chatApi.markAsRead(conversationId);
      }
    };

    const handleReadReceipt = (data: any) => {
      const incomingConvId = data.conversation_id || data.conversationId;
      if (incomingConvId === conversationId) {
        const readIds: string[] = data.messageIds || data.message_ids || [];
        setMessages((prev) =>
          prev.map((m) => {
            if (readIds.length === 0 || readIds.includes(m.id)) {
              return { ...m, status: 'READ' };
            }
            return m;
          }),
        );
      }
    };

    const handleDeliveryReceipt = (data: any) => {
      const incomingConvId = data.conversation_id || data.conversationId;
      if (incomingConvId === conversationId) {
        const deliveredIds: string[] = data.messageIds || data.message_ids || [];
        setMessages((prev) =>
          prev.map((m) => {
            if (
              (deliveredIds.length === 0 || deliveredIds.includes(m.id)) &&
              m.status !== 'READ'
            ) {
              return { ...m, status: 'DELIVERED' };
            }
            return m;
          }),
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
  }, [conversationId, scrollToBottom]);

  // Auto focus input when ready
  useEffect(() => {
    if (!loading && canSend) {
      inputRef.current?.focus();
    }
  }, [loading, canSend]);

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
    setIsEmojiPickerOpen(false);
    setTimeout(() => scrollToBottom(true), 20);

    if (onMessageSent) {
      onMessageSent(optimisticMessage);
    }

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
      // Optimistic message already rendered
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

  const isMe = useCallback((m: ChatMessage) => {
    const sId = String(m.sender_id || m.senderId || '');
    const myId = String(currentUserId || '');
    if (myId && sId === myId) return true;
    if (sId === 'me') return true;

    const sType = String(m.sender_type || m.senderType || '').toUpperCase();
    const myRole = String(currentUserRole || '').toUpperCase();
    if (myRole.includes('DOCTOR') && sType === 'DOCTOR') return true;
    if (myRole.includes('PATIENT') && sType === 'PATIENT') return true;
    if (myRole.includes('ADMIN') && (sType === 'ADMIN' || sType === 'STAFF')) return true;

    return false;
  }, [currentUserId, currentUserRole]);

  const renderStatusIcon = (status?: string) => {
    const s = String(status || 'SENT').toUpperCase();
    if (s === 'READ') {
      return (
        <span title="Read">
          <CheckCheck size={14} className="text-sky-300" />
        </span>
      );
    }
    if (s === 'DELIVERED') {
      return (
        <span title="Delivered">
          <CheckCheck size={14} className="text-slate-200" />
        </span>
      );
    }
    return (
      <span title="Sent">
        <Check size={14} className="text-slate-200" />
      </span>
    );
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const dateKey = formatGroupDate(msg.sent_at || msg.sentAt || msg.created_at || msg.createdAt);
      const existing = groups.find((g) => g.dateLabel === dateKey);
      if (existing) {
        existing.items.push(msg);
      } else {
        groups.push({ dateLabel: dateKey, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  if (!recipient) {
    return null;
  }

  const commonEmojis = ['👋', '👍', '😊', '🙏', '🩺', '💊', '✅', '❤️'];

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden select-text">
      {/* 1. Conversation Header (Fixed Top) */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back to conversation list"
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="relative shrink-0">
            {recipient.avatar_url ? (
              <img
                src={recipient.avatar_url}
                alt={recipient.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm grid place-items-center shadow-xs">
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
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5">
              {recipient.is_online ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">Offline</span>
              )}
              <span className="text-slate-300">•</span>
              <span className="truncate">
                {recipient.specialization || recipient.subtitle || recipient.phone || recipient.email || 'Direct Conversation'}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Audio call"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Phone size={17} />
          </button>
          <button
            type="button"
            title="Video call"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Video size={17} />
          </button>
          <button
            type="button"
            title="Search conversation"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            onClick={() => void initConversation()}
            title="Refresh history"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            title="More options"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <MoreVertical size={17} />
          </button>
        </div>
      </div>

      {/* 2. Message History Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 py-16">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading conversation messages...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex flex-col gap-2 max-w-md mx-auto my-8">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={16} />
              Failed to load messages
            </div>
            <p className="text-xs text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => void initConversation()}
              className="mt-1 self-start px-3 py-1 bg-rose-600 text-white rounded-md text-xs font-medium hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mb-3 shadow-2xs border border-blue-100/80">
              <MessageSquare size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
              Start a direct conversation with {recipient.name}. Messages, delivery receipts, and online status are synced in real time.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              {/* Date Header Pill */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-200/80 text-slate-600 shadow-2xs">
                  {group.dateLabel}
                </span>
              </div>

              {group.items.map((m) => {
                const mine = isMe(m);
                const text = m.message || m.content || '';
                const time = formatMessageTime(m.sent_at || m.sentAt || m.created_at || m.createdAt);

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'} transition-opacity`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-xs break-words ${
                        mine
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
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
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message Composer (Fixed Bottom, ZithConnect Reference) */}
      <div className="border-t border-slate-200 bg-white p-3 shrink-0">
        {/* Emoji Bar Popover */}
        {isEmojiPickerOpen && (
          <div className="mb-2 p-1.5 bg-slate-100 rounded-xl flex items-center gap-1.5 text-lg animate-in fade-in duration-150">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="p-1 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-2">
          {/* Toolbar */}
          <div className="flex items-center gap-1 text-slate-500">
            <button
              type="button"
              onClick={() => {
                setInputText((prev) => prev + '**bold**');
                inputRef.current?.focus();
              }}
              title="Bold"
              className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText((prev) => prev + '_italic_');
                inputRef.current?.focus();
              }}
              title="Italic"
              className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText((prev) => prev + '~strikethrough~');
                inputRef.current?.focus();
              }}
              title="Strikethrough"
              className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Strikethrough size={15} />
            </button>
            <span className="w-px h-4 bg-slate-200 mx-1" />
            <button
              type="button"
              title="Attach file"
              className="p-1.5 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Paperclip size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              title="Add emoji"
              className="p-1.5 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Smile size={15} />
            </button>
          </div>

          {/* Composer Input & Send Action */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !canSend
                  ? 'You have read-only access to this chat.'
                  : `Type a message...`
              }
              disabled={!canSend || loading || Boolean(error)}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canSend || !inputText.trim() || sending || loading || Boolean(error)}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer"
              title={!canSend ? 'Read-only access' : 'Send message'}
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatConversationView;
