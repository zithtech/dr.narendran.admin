import {
  ChevronDown,
  ChevronRight,
  Hash,
  HeartPulse,
  MessageSquare,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SquarePen,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import { chatApi } from '../api/chatApi';
import { ChatConversationView } from '../components/ChatConversationView';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { chatSocket } from '../services/chatSocket';
import type { ChatConversation, ChatMessage, ChatRecipient } from '../types/chat';

export type ChatTabType = 'doctors' | 'patients' | 'others';

function formatConversationTime(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getMessagePreviewText(msg: any): string {
  const hasAttachment = Boolean(
    msg.attachment_url ||
      msg.attachmentUrl ||
      msg.file_name ||
      msg.fileName ||
      ['IMAGE', 'PDF', 'DOCUMENT', 'SPREADSHEET'].includes(msg.message_type) ||
      ['IMAGE', 'PDF', 'DOCUMENT', 'SPREADSHEET'].includes(msg.messageType),
  );
  const text = msg.message || msg.content || '';
  if (hasAttachment) {
    const fileName = msg.file_name || msg.fileName || '';
    if (!text || text === fileName) {
      return `📎 ${fileName || 'Attachment'}`;
    }
    return `📎 ${text}`;
  }
  return text;
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

export function ChatPage() {
  const { roleName, isSystemAdmin, canView, canCreate, hasPermission } = usePermission();

  // Normalize role
  const effectiveRole = useMemo(() => {
    const raw = (roleName || localStorage.getItem('adminRole') || 'ADMIN').toUpperCase();
    if (raw.includes('DOCTOR') || raw.includes('PHYSICIAN') || raw.includes('CLINICIAN')) {
      return 'DOCTOR';
    }
    if (raw.includes('PATIENT')) {
      return 'PATIENT';
    }
    return 'ADMIN';
  }, [roleName]);

  // RBAC permissions for chat actions
  const canSendMessage = useMemo(() => {
    if (isSystemAdmin) return true;
    return (
      canCreate('CHAT', ['SUPPORT', 'PATIENT_SUPPORT', 'DOCTOR_SUPPORT']) ||
      hasPermission('CHAT', 'write', ['SUPPORT', 'PATIENT_SUPPORT', 'DOCTOR_SUPPORT'])
    );
  }, [isSystemAdmin, canCreate, hasPermission]);

  const canViewPatientsTab = useMemo(() => {
    return isSystemAdmin || canView('PATIENTS');
  }, [isSystemAdmin, canView]);

  const currentUserId = useMemo(() => {
    return (
      localStorage.getItem('adminUserId') ||
      localStorage.getItem('adminUsername') ||
      localStorage.getItem('adminEmail') ||
      ''
    );
  }, []);

  const currentUsername = useMemo(() => {
    return (
      localStorage.getItem('adminUsername') ||
      localStorage.getItem('adminFullName') ||
      ''
    );
  }, []);

  // Category Tabs
  const tabs = useMemo<{ key: ChatTabType; label: string; icon: React.ReactNode }[]>(() => {
    if (effectiveRole === 'ADMIN') {
      const tabList: { key: ChatTabType; label: string; icon: React.ReactNode }[] = [
        { key: 'doctors', label: 'Doctors', icon: <Stethoscope size={15} /> },
      ];
      if (canViewPatientsTab) {
        tabList.push({ key: 'patients', label: 'Patients', icon: <HeartPulse size={15} /> });
      }
      tabList.push({ key: 'others', label: 'Others', icon: <Users size={15} /> });
      return tabList;
    }
    return [
      { key: 'doctors', label: 'Doctors', icon: <Stethoscope size={15} /> },
      { key: 'others', label: 'Others / Admins', icon: <Shield size={15} /> },
    ];
  }, [effectiveRole, canViewPatientsTab]);

  const [activeTab, setActiveTab] = useState<ChatTabType>('doctors');
  const [searchQuery, setSearchQuery] = useState('');

  // Directory lists
  const [doctors, setDoctors] = useState<ChatRecipient[]>([]);
  const [patients, setPatients] = useState<ChatRecipient[]>([]);
  const [otherUsers, setOtherUsers] = useState<ChatRecipient[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Conversations (Direct Messages) list
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Section collapse states in sidebar
  const [isCategorySectionOpen, setIsCategorySectionOpen] = useState(true);
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(true);

  // Active chat state (integrated conversation in main chat area)
  const [selectedRecipient, setSelectedRecipient] = useState<ChatRecipient | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Fetch directory data
  const loadDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    try {
      if (effectiveRole === 'ADMIN') {
        const [docs, pts, others] = await Promise.all([
          chatApi.getDoctors(),
          canViewPatientsTab ? chatApi.getPatients() : Promise.resolve([]),
          chatApi.getOtherUsers(),
        ]);
        setDoctors(Array.isArray(docs) ? docs : []);
        setPatients(Array.isArray(pts) ? pts : []);
        setOtherUsers(Array.isArray(others) ? others : []);
      } else {
        const [docs, others] = await Promise.all([
          chatApi.getDoctors(),
          chatApi.getOtherUsers(),
        ]);
        setDoctors(Array.isArray(docs) ? docs : []);
        setOtherUsers(Array.isArray(others) ? others : []);
      }
    } catch (err) {
      console.error('Failed to load chat directories', err);
    } finally {
      setLoadingDirectory(false);
    }
  }, [effectiveRole, canViewPatientsTab]);

  // Fetch active conversations list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const convs = await chatApi.getConversations();
      // Sort with most recently messaged/updated at top
      const sorted = (Array.isArray(convs) ? convs : []).slice().sort((a, b) => {
        const timeA = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      });
      setConversations(sorted);
    } catch (err) {
      console.error('Failed to load chat conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
    void loadConversations();
    chatSocket.connect();
  }, [loadDirectory, loadConversations]);

  // Global socket listener for real-time conversation reordering
  useEffect(() => {
    const handleIncomingMessage = (msg: any) => {
      const convId = msg.conversation_id || msg.conversationId;
      if (!convId) return;

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId);
        const now = msg.sent_at || msg.sentAt || new Date().toISOString();
        const msgText = getMessagePreviewText(msg);

        if (index !== -1) {
          const current = prev[index]!;
          const isViewingThis = activeConversationId === convId;
          const updatedConv: ChatConversation = {
            ...current,
            last_message: msgText,
            last_message_at: now,
            unread_count: isViewingThis ? 0 : (current.unread_count || 0) + 1,
          };
          // Move to top of the list!
          const rest = prev.filter((_, i) => i !== index);
          return [updatedConv, ...rest];
        }

        // New conversation arrived: refresh list
        void loadConversations();
        return prev;
      });
    };

    chatSocket.on('chat:message', handleIncomingMessage);
    return () => {
      chatSocket.off('chat:message', handleIncomingMessage);
    };
  }, [activeConversationId, loadConversations]);

  // Filter directory users
  const displayedDirectoryUsers = useMemo(() => {
    let sourceList: ChatRecipient[] = [];

    if (activeTab === 'doctors') {
      sourceList = doctors;
      if (effectiveRole === 'DOCTOR') {
        sourceList = sourceList.filter((d) => {
          if (currentUserId && (d.id === currentUserId || d.user_account_id === currentUserId)) {
            return false;
          }
          if (currentUsername && d.name.toLowerCase().includes(currentUsername.toLowerCase())) {
            return false;
          }
          return true;
        });
      }
    } else if (activeTab === 'patients') {
      sourceList = patients;
    } else if (activeTab === 'others') {
      sourceList = otherUsers;
      // Exclude logged in user
      sourceList = sourceList.filter((u) => {
        if (currentUserId && (u.id === currentUserId || u.user_account_id === currentUserId)) {
          return false;
        }
        if (currentUsername && u.name.toLowerCase() === currentUsername.toLowerCase()) {
          return false;
        }
        return true;
      });
    }

    if (!searchQuery.trim()) return sourceList;

    const q = searchQuery.trim().toLowerCase();
    return sourceList.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.subtitle && r.subtitle.toLowerCase().includes(q)) ||
        (r.specialization && r.specialization.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q))
      );
    });
  }, [activeTab, doctors, patients, otherUsers, effectiveRole, currentUserId, currentUsername, searchQuery]);

  // Handle clicking a user from Category Tabs
  const handleSelectUser = async (user: ChatRecipient) => {
    setSelectedRecipient(user);

    // Check if an existing conversation exists in loaded list
    const existing = conversations.find((c) => {
      const otherId = c.recipient_id || c.recipientId || (c.doctor_id === user.id ? c.doctor_id : c.patient_id);
      return otherId === user.id || c.doctor_name === user.name || c.patient_name === user.name;
    });

    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      setActiveConversationId(null);
    }
  };

  // Handle clicking a conversation in Direct Messages
  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConversationId(conv.id);

    // Resolve recipient details from conversation
    const recipientName =
      conv.recipient_name ||
      conv.other_participant_name ||
      conv.name ||
      (conv.doctor_name && conv.doctor_name !== 'Doctor' ? conv.doctor_name : conv.patient_name) ||
      'User';

    const recipientId =
      conv.recipient_id ||
      conv.recipientId ||
      conv.doctor_id ||
      conv.patient_id ||
      conv.id;

    const role =
      conv.role ||
      (conv.doctor_name && conv.doctor_name === recipientName
        ? 'DOCTOR'
        : conv.patient_name === recipientName
          ? 'PATIENT'
          : 'ADMIN');

    const recipient: ChatRecipient = {
      id: recipientId,
      name: recipientName,
      role,
      avatar_url: conv.avatar_url || conv.recipient_avatar || conv.doctor_avatar || conv.patient_avatar,
      is_online: Boolean(conv.is_online || conv.doctor_online || conv.patient_online),
      specialization: conv.specialization,
    };

    setSelectedRecipient(recipient);

    // Reset unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
    );
  };

  // When a message is sent from ChatConversationView:
  // Move or add this conversation to the top of Direct Messages!
  const handleMessageSent = (msg: ChatMessage) => {
    const convId = msg.conversation_id || msg.conversationId || activeConversationId;
    if (!convId || !selectedRecipient) return;

    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === convId);
      const now = msg.sent_at || msg.sentAt || new Date().toISOString();
      const msgText = getMessagePreviewText(msg);

      if (index !== -1) {
        const current = prev[index]!;
        const updated: ChatConversation = {
          ...current,
          last_message: msgText,
          last_message_at: now,
          unread_count: 0,
        };
        const rest = prev.filter((_, i) => i !== index);
        return [updated, ...rest];
      }

      // Add newly initiated conversation to the top
      const newConv: ChatConversation = {
        id: convId,
        conversation_id: convId,
        conversationId: convId,
        status: 'ACTIVE',
        last_message: msgText,
        last_message_at: now,
        created_at: now,
        updated_at: now,
        recipient_id: selectedRecipient.id,
        recipientId: selectedRecipient.id,
        recipient_name: selectedRecipient.name,
        name: selectedRecipient.name,
        avatar_url: selectedRecipient.avatar_url,
        role: selectedRecipient.role,
        is_online: selectedRecipient.is_online,
        unread_count: 0,
      };

      return [newConv, ...prev];
    });
  };

  return (
    <div className="flex-1 w-full h-[calc(100vh-4rem)] bg-slate-100 flex overflow-hidden border-t border-slate-200">
      {/* ======================================================== */}
      {/* 1. Chat Sidebar / Conversation Panel (ZithConnect Style) */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200 ${selectedRecipient ? 'hidden md:flex' : 'flex'
          }`}
      >
        {/* Sidebar Header: App Title & Action Icons */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-blue-600 text-white grid place-items-center shadow-xs">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight tracking-tight">
                Messenger
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">Real-time messaging</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-slate-400">
            <button
              type="button"
              title="Panel Layout"
              className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <PanelLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCategorySectionOpen(true);
                setActiveTab('doctors');
              }}
              title="New message"
              className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <SquarePen size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                void loadDirectory();
                void loadConversations();
              }}
              title="Refresh"
              className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loadingConversations ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
          {/* A. User Category Tabs & Directory (Positioned above Channels, Reference Image 2) */}
          <div className="p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setIsCategorySectionOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {isCategorySectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Directory</span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium">
                {displayedDirectoryUsers.length} users
              </span>
            </div>

            {isCategorySectionOpen && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* Three Tabs: Doctors, Patients, Others */}
                <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold text-slate-600">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${isActive
                            ? 'bg-white text-blue-600 shadow-2xs font-bold'
                            : 'hover:text-slate-900 text-slate-500'
                          }`}
                      >
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Directory Search */}
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full bg-white border border-slate-200/90 rounded-lg pl-7 pr-6 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Directory Users List */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {loadingDirectory ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Loading {activeTab}...</span>
                    </div>
                  ) : displayedDirectoryUsers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No {activeTab} found
                    </div>
                  ) : (
                    displayedDirectoryUsers.map((user) => {
                      const isSelected = selectedRecipient?.id === user.id;
                      return (
                        <div
                          key={user.id}
                          onClick={() => void handleSelectUser(user)}
                          className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${isSelected
                              ? 'bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs'
                              : 'hover:bg-slate-100/90 text-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-[10px] grid place-items-center">
                                  {getInitials(user.name)}
                                </div>
                              )}
                              {user.is_online && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate leading-tight group-hover:text-blue-600 transition-colors">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {user.specialization || user.subtitle || user.role}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            title={canSendMessage ? 'Chat' : 'View chat conversation (Read-only)'}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSelectUser(user);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 transition-colors shrink-0"
                          >
                            {canSendMessage ? 'Chat' : 'View'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* B. Channels Section (Reference Image 2) */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setIsChannelsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer mb-1.5"
            >
              <div className="flex items-center gap-1.5">
                {isChannelsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Channels</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">0</span>
            </button>

            {isChannelsOpen && (
              <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                <div className="py-2.5 px-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 flex items-center gap-2 text-slate-400 text-xs">
                  <Hash size={14} className="text-slate-300" />
                  <span>No channels yet</span>
                </div>
              </div>
            )}
          </div>

          {/* C. Direct Messages Section (Reference Image 2 & 3) */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setIsDirectMessagesOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {isDirectMessagesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Direct Messages</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">
                  {conversations.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategorySectionOpen(true);
                  }}
                  title="New message"
                  className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {isDirectMessagesOpen && (
              <div className="space-y-1 animate-in fade-in duration-150">
                {loadingConversations ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                    <span>Loading conversations...</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-6 px-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="font-medium text-slate-600 mb-0.5">No active chats yet</p>
                    <p className="text-[11px] text-slate-400">
                      Select a doctor, patient, or staff member from the directory above to start chatting.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isSelected = activeConversationId === conv.id;
                    const recipientName =
                      conv.recipient_name ||
                      conv.other_participant_name ||
                      conv.name ||
                      (conv.doctor_name && conv.doctor_name !== 'Doctor' ? conv.doctor_name : conv.patient_name) ||
                      'User';

                    const isOnline = Boolean(conv.is_online || conv.doctor_online || conv.patient_online);
                    const time = formatConversationTime(conv.last_message_at || conv.updated_at || conv.created_at);
                    const unread = conv.unread_count || 0;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${isSelected
                            ? 'bg-blue-50/90 text-blue-950 font-medium border-l-3 border-blue-600 shadow-2xs'
                            : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {conv.avatar_url || conv.doctor_avatar || conv.patient_avatar ? (
                            <img
                              src={conv.avatar_url || conv.doctor_avatar || conv.patient_avatar}
                              alt={recipientName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs grid place-items-center">
                              {getInitials(recipientName)}
                            </div>
                          )}
                          {isOnline && (
                            <span
                              title="Online"
                              className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"
                            />
                          )}
                        </div>

                        {/* Middle Text: Name & Last message */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-semibold truncate text-slate-800">
                              {recipientName}
                            </h4>
                            {time && (
                              <span className="text-[10px] text-slate-400 shrink-0">{time}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-[11px] text-slate-500 truncate">
                              {conv.last_message || 'Start a conversation'}
                            </p>
                            {unread > 0 && (
                              <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Main Chat Area: Empty State or Conversation View      */}
      {/* ======================================================== */}
      <div
        className={`flex-1 h-full flex flex-col overflow-hidden bg-white ${!selectedRecipient ? 'hidden md:flex' : 'flex'
          }`}
      >
        {selectedRecipient ? (
          <ChatConversationView
            recipient={selectedRecipient}
            conversationId={activeConversationId}
            onConversationIdResolved={(id) => setActiveConversationId(id)}
            currentUserId={currentUserId}
            currentUserRole={effectiveRole}
            canSend={canSendMessage}
            onBack={() => {
              setSelectedRecipient(null);
              setActiveConversationId(null);
            }}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <ChatEmptyState
            onStartNewChat={() => {
              setIsCategorySectionOpen(true);
              setActiveTab('doctors');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ChatPage;
