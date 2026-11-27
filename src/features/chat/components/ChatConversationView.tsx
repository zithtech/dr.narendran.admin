import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Bold,
  Check,
  CheckCheck,
  Italic,
  Loader2,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Strikethrough,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import { chatApi } from '../api/chatApi';
import { chatSocket } from '../services/chatSocket';
import type { ChatMessage, ChatRecipient, StagedAttachment } from '../types/chat';
import {
  ACCEPT_FILE_TYPES,
  getFileCategory,
  validateAttachment,
} from '../utils/attachmentUtils';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { ChatAttachmentPreview } from './ChatAttachmentPreview';
import { ChatClearConfirmModal } from './ChatClearConfirmModal';
import { ChatContactDetailsModal } from './ChatContactDetailsModal';
import { ChatConversationMoreMenu } from './ChatConversationMoreMenu';
import { ChatConversationSearch } from './ChatConversationSearch';
import { ChatImageLightboxModal } from './ChatImageLightboxModal';
import { ChatMessageAttachment } from './ChatMessageAttachment';
import { ChatMessageContent } from './ChatMessageContent';
import {
  ChatRichTextEditor,
  type ChatRichTextEditorRef,
  type FormattingState,
} from './ChatRichTextEditor';
import { ChatVoicePreview } from './ChatVoicePreview';
import { ChatVoiceRecorder } from './ChatVoiceRecorder';
import { getAuthenticatedUser, isMessageFromMe } from '../utils/userUtils';

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
  const authUser = useMemo(() => getAuthenticatedUser(), []);
  const resolvedCurrentUserId = currentUserId || authUser.id;
  const resolvedCurrentUserRole = currentUserRole || authUser.role || 'ADMIN';

  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [activeStyles, setActiveStyles] = useState<FormattingState>({
    bold: false,
    italic: false,
    strikethrough: false,
  });
  const [sending, setSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Attachment states
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name?: string | undefined } | null>(null);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // More Options menu and modal states
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const moreMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const permissionContext = usePermission();
  const canClearChat = useMemo(() => {
    const role = (currentUserRole || permissionContext?.roleName || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
    if (permissionContext?.canDelete?.('CHAT')) return true;
    return false;
  }, [currentUserRole, permissionContext]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ChatRichTextEditorRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Audio recording hook
  const {
    isRecording,
    isPaused,
    recordingDuration,
    audioBlob,
    audioUrl,
    audioLevels,
    error: recorderError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  } = useAudioRecorder();

  // Surface recorder permission / device errors in error banner
  useEffect(() => {
    if (recorderError) {
      setUploadError(recorderError);
    }
  }, [recorderError]);

  // Update conversationId if changed externally
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId);
      cancelRecording();
      clearAudio();
      editorRef.current?.clear();
      setInputText('');
      setActiveStyles({ bold: false, italic: false, strikethrough: false });
    }
  }, [initialConversationId, cancelRecording, clearAudio]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      stagedAttachments.forEach((att) => {
        if (att.previewUrl && att.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(att.previewUrl);
        }
      });
    };
  }, [stagedAttachments]);

  // Reset search and menu states when switching conversations
  useEffect(() => {
    setIsSearchOpen(false);
    setHighlightedMessageId(null);
    setIsMoreMenuOpen(false);
    setIsContactDetailsOpen(false);
    setIsClearConfirmOpen(false);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    if (conversationId) {
      try {
        const raw = localStorage.getItem('chat_muted_conversations');
        const mutedList: string[] = raw ? JSON.parse(raw) : [];
        setIsMuted(mutedList.includes(conversationId));
      } catch {
        setIsMuted(false);
      }
    } else {
      setIsMuted(false);
    }
  }, [conversationId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
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
        setConversationId(conv.id);
        if (conv.id && onConversationIdResolved) {
          onConversationIdResolved(conv.id);
        }
      }

      if (convId) {
        // Fetch message history
        const history = await chatApi.getMessages(convId);
        let historyList: ChatMessage[] = Array.isArray(history) ? history : (history as any)?.messages || [];
        try {
          const clearedAtStr = localStorage.getItem(`chat_cleared_at_${convId}`);
          if (clearedAtStr) {
            const clearedAt = new Date(clearedAtStr).getTime();
            historyList = historyList.filter((m) => {
              const msgTime = new Date(m.created_at || m.sent_at || 0).getTime();
              return msgTime > clearedAt;
            });
          }
        } catch {
          // ignore
        }
        setMessages(historyList);

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
      editorRef.current?.clear();
      setInputText('');
      setActiveStyles({ bold: false, italic: false, strikethrough: false });
      setStagedAttachments([]);
      setUploadError(null);
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
          // Avoid duplicate between optimistic temp message and incoming socket message
          const optimisticMatch = prev.find(
            (m) =>
              m.id.startsWith('temp-') &&
              ((msg.attachment_url && m.attachment_url === msg.attachment_url) ||
                (msg.storage_key && m.storage_key === msg.storage_key) ||
                (m.message_type === msg.message_type &&
                  m.attachment_name &&
                  m.attachment_name === msg.attachment_name) ||
                (m.message === msg.message &&
                  m.message_type === msg.message_type &&
                  Math.abs(
                    new Date(m.created_at || m.sent_at || '').getTime() -
                      new Date(msg.created_at || msg.sent_at || '').getTime(),
                  ) < 6000)),
          );
          if (optimisticMatch) {
            return prev.map((m) =>
              m.id === optimisticMatch.id ? { ...m, ...msg, id: msg.id } : m,
            );
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
      editorRef.current?.focus();
    }
  }, [loading, canSend]);

  // Validate and stage file attachments
  const handleStageFiles = useCallback((files: FileList | File[]) => {
    setUploadError(null);
    const newStaged: StagedAttachment[] = [];

    Array.from(files).forEach((file) => {
      const validation = validateAttachment(file);
      if (!validation.valid) {
        setUploadError(validation.error || `File "${file.name}" cannot be attached.`);
        return;
      }

      const category = getFileCategory(file.name, file.type);
      const previewUrl = category === 'image' ? URL.createObjectURL(file) : undefined;

      newStaged.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        category,
      });
    });

    if (newStaged.length > 0) {
      setStagedAttachments((prev) => [...prev, ...newStaged]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleStageFiles(e.target.files);
    }
    // Clear input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveStaged = useCallback((id: string) => {
    setStagedAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canSend || loading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canSend || loading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleStageFiles(e.dataTransfer.files);
    }
  };

  const handleDoneVoiceRecording = async () => {
    if (sending || !conversationId) return;

    const finalDuration = recordingDuration;
    if (finalDuration < 0.5 && !audioBlob) {
      setUploadError('Voice note is too short. Please speak before sending.');
      cancelRecording();
      return;
    }

    setSending(true);
    setUploadError(null);

    let tempId = '';

    try {
      // 1. Stop recording and await finalized audio Blob from onstop
      const audioData = await stopRecording();
      if (!audioData || !audioData.blob || audioData.blob.size === 0) {
        throw new Error('Recorded audio is empty or could not be processed.');
      }

      const durationToSend = audioData.duration > 0 ? audioData.duration : finalDuration;
      const mime = audioData.blob.type || 'audio/webm';
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `voice_note_${Date.now()}.${ext}`;

      // 2. Optimistic voice message in current conversation
      tempId = `temp-voice-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        conversationId,
        sender_id: resolvedCurrentUserId || 'me',
        senderId: resolvedCurrentUserId || 'me',
        sender_role: resolvedCurrentUserRole,
        senderRole: resolvedCurrentUserRole,
        message_type: 'VOICE',
        messageType: 'VOICE',
        message: 'Voice message',
        content: 'Voice message',
        status: 'SENT',
        sent_at: now,
        created_at: now,
        attachment_url: audioData.url || undefined,
        attachmentUrl: audioData.url || undefined,
        attachment_name: fileName,
        attachmentName: fileName,
        attachment_type: mime,
        attachmentType: mime,
        attachment_size: audioData.blob.size,
        attachmentSize: audioData.blob.size,
        duration: durationToSend,
      };

      setMessages((prev) => {
        const withoutFailed = prev.filter(
          (m) => !(m.id.startsWith('temp-voice-') && m.status === 'FAILED'),
        );
        return [...withoutFailed, optimisticMessage];
      });
      setTimeout(() => scrollToBottom(true), 20);

      if (onMessageSent) {
        onMessageSent(optimisticMessage);
      }

      // 3. Upload voice note and create message
      const serverMsg = await chatApi.uploadVoiceNote(
        conversationId,
        audioData.blob,
        durationToSend,
        fileName,
      );

      if (serverMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, ...serverMsg, id: serverMsg.id } : m)),
        );
        if (onMessageSent) {
          onMessageSent(serverMsg);
        }
      }

      // 4. Close recording interface ONLY after successful upload and send
      cancelRecording();
    } catch (uploadErr: any) {
      console.error('Voice note upload failed:', uploadErr);
      const errMsg =
        uploadErr?.response?.data?.message ||
        uploadErr?.message ||
        'Failed to upload voice note. Please try again.';
      setUploadError(errMsg);
      if (tempId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'FAILED' } : m)),
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleCancelVoiceRecording = () => {
    cancelRecording();
    setUploadError(null);
    setMessages((prev) =>
      prev.filter((m) => !(m.id.startsWith('temp-voice-') && m.status === 'FAILED')),
    );
  };

  const handleMicClick = async () => {
    if (isRecording) {
      void handleDoneVoiceRecording();
    } else {
      setUploadError(null);
      await startRecording();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend || sending || loading || Boolean(error) || !conversationId) return;

    if (audioBlob) {
      await handleDoneVoiceRecording();
      return;
    }

    const formatted = editorRef.current ? editorRef.current.getFormattedMessage() : inputText.trim();
    const plain = editorRef.current ? editorRef.current.getPlainText() : inputText.trim();
    if (!plain && stagedAttachments.length === 0) return;

    setSending(true);
    setUploadError(null);

    // If sending with attachments:
    if (stagedAttachments.length > 0) {
      const toUpload = [...stagedAttachments];
      let hasError = false;

      try {
        for (let i = 0; i < toUpload.length; i++) {
          const item = toUpload[i]!;
          // Use formatted text as caption for the first attachment, subsequent ones without caption
          const caption = i === 0 ? formatted : '';

          const tempId = `temp-${Date.now()}-${i}`;
          const optimisticMessage: ChatMessage = {
            id: tempId,
            conversation_id: conversationId,
            conversationId,
            sender_id: resolvedCurrentUserId || 'me',
            senderId: resolvedCurrentUserId || 'me',
            sender_role: resolvedCurrentUserRole,
            senderRole: resolvedCurrentUserRole,
            message: caption || item.name,
            content: caption || item.name,
            message_type:
              item.category === 'image'
                ? 'IMAGE'
                : item.category === 'pdf'
                  ? 'PDF'
                  : item.category === 'spreadsheet'
                    ? 'SPREADSHEET'
                    : 'DOCUMENT',
            attachment_url: item.previewUrl || URL.createObjectURL(item.file),
            attachment_name: item.name,
            attachment_type: item.type,
            attachment_size: item.size,
            status: 'SENT',
            created_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, optimisticMessage]);
          setTimeout(() => scrollToBottom(true), 20);

          try {
            const savedMessage = await chatApi.uploadAttachment(
              conversationId,
              item.file,
              caption || undefined,
            );

            if (savedMessage) {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, ...savedMessage, id: savedMessage.id } : m)),
              );
              if (onMessageSent) {
                onMessageSent(savedMessage);
              }
            }
          } catch (uploadErr: any) {
            hasError = true;
            console.error('Attachment upload failed:', uploadErr);
            // Mark optimistic message as failed
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, status: 'FAILED' } : m)),
            );
            const errDetail =
              uploadErr?.response?.data?.error ||
              uploadErr?.message ||
              `Failed to upload "${item.name}".`;
            setUploadError(errDetail);
            break;
          }
        }

        if (!hasError) {
          // Cleanup object URLs and reset state
          toUpload.forEach((item) => {
            if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(item.previewUrl);
            }
          });
          setStagedAttachments([]);
          editorRef.current?.clear();
          setInputText('');
          setActiveStyles({ bold: false, italic: false, strikethrough: false });
          setIsEmojiPickerOpen(false);
        }
      } catch (err: any) {
        setUploadError(err?.message || 'Error occurred during attachment upload.');
      } finally {
        setSending(false);
        setTimeout(() => editorRef.current?.focus(), 10);
      }
      return;
    }

    // Standard text-only message sending
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      conversationId,
      sender_id: resolvedCurrentUserId || 'me',
      senderId: resolvedCurrentUserId || 'me',
      sender_role: resolvedCurrentUserRole,
      senderRole: resolvedCurrentUserRole,
      message: formatted,
      content: formatted,
      status: 'SENT',
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    editorRef.current?.clear();
    setInputText('');
    setActiveStyles({ bold: false, italic: false, strikethrough: false });
    setIsEmojiPickerOpen(false);
    setTimeout(() => scrollToBottom(true), 20);

    if (onMessageSent) {
      onMessageSent(optimisticMessage);
    }

    try {
      chatSocket.sendMessage(
        {
          conversationId,
          message: formatted,
          messageType: 'TEXT',
          senderId: resolvedCurrentUserId,
          sender_id: resolvedCurrentUserId,
          senderRole: resolvedCurrentUserRole,
          sender_role: resolvedCurrentUserRole,
          recipientId: recipient?.id,
          recipient_id: recipient?.id,
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
      setTimeout(() => editorRef.current?.focus(), 10);
    }
  };

  const isMe = useCallback(
    (m: ChatMessage) => {
      return isMessageFromMe(m, recipient, resolvedCurrentUserId, resolvedCurrentUserRole);
    },
    [recipient, resolvedCurrentUserId, resolvedCurrentUserRole],
  );

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
    if (s === 'FAILED') {
      return (
        <span title="Failed to deliver">
          <AlertCircle size={14} className="text-rose-400" />
        </span>
      );
    }
    return (
      <span title="Sent">
        <Check size={14} className="text-slate-200" />
      </span>
    );
  };

  // Navigate to and highlight searched message
  const handleSelectSearchedMessage = useCallback(
    async (searchedMsg: ChatMessage) => {
      const targetId = searchedMsg.id;
      setHighlightedMessageId(targetId);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      const doScroll = () => {
        const el = document.getElementById(`chat-msg-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      const exists = messages.some((m) => m.id === targetId);
      if (!exists && conversationId) {
        try {
          const history = await chatApi.getMessages(conversationId, 100);
          const historyList = Array.isArray(history) ? history : (history as any)?.messages || [];
          if (historyList.some((m: ChatMessage) => m.id === targetId)) {
            setMessages(historyList);
          } else {
            setMessages((prev) => {
              if (prev.some((m) => m.id === targetId)) return prev;
              const combined = [...prev, searchedMsg];
              return combined.sort((a, b) => {
                const dateA = new Date(a.created_at || a.sent_at || 0).getTime();
                const dateB = new Date(b.created_at || b.sent_at || 0).getTime();
                return dateA - dateB;
              });
            });
          }
          setTimeout(doScroll, 100);
        } catch (err) {
          console.error('Failed to load message history for search item:', err);
          setMessages((prev) => {
            if (prev.some((m) => m.id === targetId)) return prev;
            const combined = [...prev, searchedMsg];
            return combined.sort((a, b) => {
              const dateA = new Date(a.created_at || a.sent_at || 0).getTime();
              const dateB = new Date(b.created_at || b.sent_at || 0).getTime();
              return dateA - dateB;
            });
          });
          setTimeout(doScroll, 100);
        }
      } else {
        setTimeout(doScroll, 50);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3500);
    },
    [conversationId, messages],
  );

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!conversationId) return;
    try {
      const raw = localStorage.getItem('chat_muted_conversations');
      const mutedList: string[] = raw ? JSON.parse(raw) : [];
      let updated: string[];
      let nextState: boolean;
      if (mutedList.includes(conversationId)) {
        updated = mutedList.filter((id) => id !== conversationId);
        nextState = false;
      } else {
        updated = [...mutedList, conversationId];
        nextState = true;
      }
      localStorage.setItem('chat_muted_conversations', JSON.stringify(updated));
      setIsMuted(nextState);
      showToast(
        'info',
        nextState
          ? `Notifications muted for ${recipient?.name || 'this conversation'}`
          : `Notifications unmuted for ${recipient?.name || 'this conversation'}`,
      );
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  }, [conversationId, recipient?.name, showToast]);

  const handleClearChat = useCallback(async () => {
    setIsClearingChat(true);
    try {
      setMessages([]);
      if (conversationId) {
        try {
          localStorage.setItem(`chat_cleared_at_${conversationId}`, new Date().toISOString());
        } catch {
          // ignore
        }
      }
      setIsClearConfirmOpen(false);
      showToast('success', 'Chat history cleared successfully');
    } catch (err: any) {
      console.error('Failed to clear chat:', err);
      showToast('error', err?.message || 'Failed to clear chat history');
    } finally {
      setIsClearingChat(false);
    }
  }, [conversationId, showToast]);

  const handleCloseConversation = useCallback(() => {
    setIsMoreMenuOpen(false);
    if (onBack) {
      onBack();
    } else {
      setConversationId(null);
      setMessages([]);
    }
  }, [onBack]);

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
  const canSubmit =
    canSend &&
    (inputText.trim().length > 0 || stagedAttachments.length > 0 || Boolean(audioBlob)) &&
    !sending &&
    !loading &&
    !error;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 h-full flex flex-col bg-white overflow-hidden select-text transition-colors ${
        isDragOver ? 'ring-2 ring-blue-500/50 ring-inset bg-blue-50/20' : ''
      }`}
    >
      {/* Hidden File Input for Paperclip */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_FILE_TYPES}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="chat-file-input"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-blue-600/10 backdrop-blur-[1px] border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="p-4 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-2">
            <UploadCloud size={32} className="text-blue-600 animate-bounce" />
            <p className="text-sm font-semibold text-slate-800 mb-0">Drop files to attach</p>
            <p className="text-xs text-slate-500 mb-0">Images, PDFs, documents, or spreadsheets</p>
          </div>
        </div>
      )}

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
              {isMuted && (
                <>
                  <span className="text-slate-300">•</span>
                  <span
                    title="Notifications muted"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600"
                  >
                    <BellOff size={11} />
                    <span>Muted</span>
                  </span>
                </>
              )}
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
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title={isSearchOpen ? 'Close search' : 'Search conversation'}
            aria-label="Search conversation"
            aria-expanded={isSearchOpen}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
            }`}
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
          <div className="relative">
            <button
              ref={moreMenuButtonRef}
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              title="More options"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={isMoreMenuOpen}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isMoreMenuOpen
                  ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <MoreVertical size={17} />
            </button>

            <ChatConversationMoreMenu
              open={isMoreMenuOpen}
              onClose={() => setIsMoreMenuOpen(false)}
              onViewContact={() => setIsContactDetailsOpen(true)}
              onSearch={() => setIsSearchOpen(true)}
              onRefresh={() => {
                void initConversation();
                showToast('success', 'Conversation refreshed');
              }}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              canClearChat={canClearChat}
              onClearChat={() => setIsClearConfirmOpen(true)}
              onCloseConversation={handleCloseConversation}
              buttonRef={moreMenuButtonRef}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-none"
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-500'
                : toast.type === 'error'
                  ? 'bg-rose-600/95 text-white border-rose-500'
                  : 'bg-slate-800/95 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <Check size={14} className="text-emerald-200" />
            ) : toast.type === 'error' ? (
              <AlertCircle size={14} className="text-rose-200" />
            ) : (
              <Bell size={14} className="text-amber-300" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1.5 In-Conversation Collapsible Search Bar */}
      {isSearchOpen && (
        <ChatConversationSearch
          open={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          conversationId={conversationId}
          currentUserId={currentUserId}
          onSelectMessage={handleSelectSearchedMessage}
          selectedMessageId={highlightedMessageId}
        />
      )}

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
                const hasAttachment = Boolean(m.attachment_url || m.attachmentUrl || m.message_type === 'VOICE' || m.messageType === 'VOICE');
                const attachmentName = m.attachment_name || m.attachmentName;
                const isVoice = m.message_type === 'VOICE' || m.messageType === 'VOICE';
                const isOnlyAttachmentName = Boolean(
                  hasAttachment && (text === attachmentName || (isVoice && text === 'Voice message')),
                );

                return (
                  <div
                    key={m.id}
                    id={`chat-msg-${m.id}`}
                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'} transition-all duration-300 ${
                      highlightedMessageId === m.id
                        ? 'p-1.5 -m-1.5 rounded-2xl bg-amber-100/70 ring-2 ring-amber-400 ring-offset-2'
                        : ''
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs break-words ${
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

                      {/* Attachment render if present */}
                      {hasAttachment && (
                        <ChatMessageAttachment
                          message={m}
                          mine={mine}
                          onOpenImage={(url, name) => setLightboxImage({ url, name })}
                        />
                      )}

                      {/* Text content / caption */}
                      {text && !isOnlyAttachmentName && (
                        <div className={`whitespace-pre-wrap leading-relaxed ${hasAttachment ? 'mt-1' : ''}`}>
                          <ChatMessageContent content={text} />
                        </div>
                      )}

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

      {/* 3. Message Composer (Fixed Bottom) */}
      <div className="border-t border-slate-200 bg-white shrink-0">
        {/* Upload Error Banner */}
        {uploadError && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span className="truncate">{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="p-1 text-rose-500 hover:text-rose-800 rounded cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Staged Attachments Preview Area */}
        <ChatAttachmentPreview
          attachments={stagedAttachments}
          onRemove={handleRemoveStaged}
          onAddMore={() => fileInputRef.current?.click()}
          isUploading={sending}
        />

        <div className="p-3">
          {/* Emoji Bar Popover */}
          {isEmojiPickerOpen && (
            <div className="mb-2 p-1.5 bg-slate-100 rounded-xl flex items-center gap-1.5 text-lg animate-in fade-in duration-150">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editorRef.current?.insertEmoji(emoji);
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorRef.current?.toggleBold()}
                disabled={!canSend || sending || loading}
                title={activeStyles.bold ? 'Bold (Active)' : 'Bold'}
                aria-pressed={activeStyles.bold}
                className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                  activeStyles.bold
                    ? 'text-blue-700 bg-blue-100 font-bold shadow-xs'
                    : 'hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorRef.current?.toggleItalic()}
                disabled={!canSend || sending || loading}
                title={activeStyles.italic ? 'Italic (Active)' : 'Italic'}
                aria-pressed={activeStyles.italic}
                className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                  activeStyles.italic
                    ? 'text-blue-700 bg-blue-100 font-bold shadow-xs'
                    : 'hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorRef.current?.toggleStrikethrough()}
                disabled={!canSend || sending || loading}
                title={activeStyles.strikethrough ? 'Strikethrough (Active)' : 'Strikethrough'}
                aria-pressed={activeStyles.strikethrough}
                className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                  activeStyles.strikethrough
                    ? 'text-blue-700 bg-blue-100 font-bold shadow-xs'
                    : 'hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Strikethrough size={15} />
              </button>

              <span className="w-px h-4 bg-slate-200 mx-1" />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canSend || sending || loading}
                title="Attach files (images, documents, spreadsheets)"
                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 text-slate-600 rounded-md transition-colors cursor-pointer disabled:opacity-40"
              >
                <Paperclip size={15} />
              </button>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                title="Add emoji"
                className="p-1.5 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <Smile size={15} />
              </button>

              {/* Voice Note / Microphone Button */}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={!canSend || sending || loading}
                title={isRecording ? 'Stop recording' : 'Record voice note'}
                className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                  isRecording
                    ? 'text-rose-600 bg-rose-50'
                    : 'hover:text-blue-600 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Mic size={15} />
              </button>

              {stagedAttachments.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {stagedAttachments.length} file{stagedAttachments.length > 1 ? 's' : ''} attached
                </span>
              )}
            </div>

            {/* Composer Input & Send Action */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <ChatVoiceRecorder
                  isRecording={isRecording}
                  isPaused={isPaused}
                  duration={recordingDuration}
                  audioLevels={audioLevels}
                  onPause={pauseRecording}
                  onResume={resumeRecording}
                  onDone={() => void handleDoneVoiceRecording()}
                  onCancel={handleCancelVoiceRecording}
                  isSending={sending}
                  error={uploadError}
                  onRetry={() => void handleDoneVoiceRecording()}
                />
              ) : audioBlob && audioUrl ? (
                <ChatVoicePreview
                  audioUrl={audioUrl}
                  duration={recordingDuration}
                  onDiscard={clearAudio}
                  onSend={() => void handleDoneVoiceRecording()}
                  isUploading={sending}
                />
              ) : (
                <>
                  <ChatRichTextEditor
                    ref={editorRef}
                    placeholder={
                      !canSend
                        ? 'You have read-only access to this chat.'
                        : stagedAttachments.length > 0
                          ? 'Add an optional caption...'
                          : 'Type a message...'
                    }
                    disabled={!canSend || loading || Boolean(error)}
                    onChange={(_, plain) => setInputText(plain)}
                    onSend={() => void handleSend()}
                    onActiveStylesChange={setActiveStyles}
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
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
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      <ChatImageLightboxModal
        open={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        fileName={lightboxImage?.name}
      />

      {/* Contact Details Modal */}
      <ChatContactDetailsModal
        open={isContactDetailsOpen}
        onClose={() => setIsContactDetailsOpen(false)}
        recipient={recipient}
      />

      {/* Clear Chat Confirmation Modal */}
      <ChatClearConfirmModal
        open={isClearConfirmOpen}
        recipientName={recipient.name}
        onConfirm={handleClearChat}
        onCancel={() => setIsClearConfirmOpen(false)}
        isClearing={isClearingChat}
      />
    </div>
  );
};

export default ChatConversationView;
