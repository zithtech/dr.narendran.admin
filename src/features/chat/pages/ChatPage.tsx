import {
  HeartPulse,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import { chatApi } from '../api/chatApi';
import { ChatConversationDrawer } from '../components/ChatConversationDrawer';
import type { ChatRecipient } from '../types/chat';

export type ChatTabType = 'doctors' | 'patients' | 'others';

export function ChatPage() {
  const { roleName } = usePermission();

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

  // Determine available tabs based on user role:
  // Admin: Doctors, Patients, Others
  // Doctor: Doctors, Others / Admins
  // Patient: Doctors, Others / Admins
  const tabs = useMemo<{ key: ChatTabType; label: string; icon: React.ReactNode }[]>(() => {
    if (effectiveRole === 'ADMIN') {
      return [
        { key: 'doctors', label: 'Doctors', icon: <Stethoscope size={16} /> },
        { key: 'patients', label: 'Patients', icon: <HeartPulse size={16} /> },
        { key: 'others', label: 'Others', icon: <Users size={16} /> },
      ];
    }
    return [
      { key: 'doctors', label: 'Doctors', icon: <Stethoscope size={16} /> },
      { key: 'others', label: 'Others / Admins', icon: <Shield size={16} /> },
    ];
  }, [effectiveRole]);

  const [activeTab, setActiveTab] = useState<ChatTabType>('doctors');
  const [searchQuery, setSearchQuery] = useState('');

  // Lists state
  const [doctors, setDoctors] = useState<ChatRecipient[]>([]);
  const [patients, setPatients] = useState<ChatRecipient[]>([]);
  const [otherUsers, setOtherUsers] = useState<ChatRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active chat drawer state
  const [selectedRecipient, setSelectedRecipient] = useState<ChatRecipient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (effectiveRole === 'ADMIN') {
        const [docs, pts, others] = await Promise.all([
          chatApi.getDoctors(),
          chatApi.getPatients(),
          chatApi.getOtherUsers(),
        ]);
        setDoctors(docs);
        setPatients(pts);
        setOtherUsers(others);
      } else {
        const [docs, others] = await Promise.all([
          chatApi.getDoctors(),
          chatApi.getOtherUsers(),
        ]);
        setDoctors(docs);
        setOtherUsers(others);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load recipients list.');
    } finally {
      setLoading(false);
    }
  }, [effectiveRole]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Make sure active tab stays valid if role changes
  useEffect(() => {
    if (!tabs.some((t) => t.key === activeTab)) {
      setActiveTab('doctors');
    }
  }, [tabs, activeTab]);

  // Recipient filtering based on logged in user and search query
  const displayedRecipients = useMemo(() => {
    let sourceList: ChatRecipient[] = [];

    if (activeTab === 'doctors') {
      sourceList = doctors;
      // If logged in as doctor, exclude self
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
      // If logged in as admin or staff, exclude self from Others list
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

  const handleOpenChat = (recipient: ChatRecipient) => {
    setSelectedRecipient(recipient);
    setIsDrawerOpen(true);
  };

  const handleCloseChat = () => {
    setIsDrawerOpen(false);
    setSelectedRecipient(null);
  };

  const getInitials = (name: string): string => {
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return `${first[0]}${second[0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <MessageSquare size={20} />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chat
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Direct real-time messaging and communication with doctors, patients, and staff.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl space-x-1" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Recipients Table / Card Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading recipients...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <p className="text-sm font-semibold">{error}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : displayedRecipients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No recipients found</p>
              <p className="text-xs text-slate-400">
                {searchQuery ? 'Try adjusting your search query.' : `No ${activeTab} currently available for chat.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Recipient</th>
                    <th className="py-3.5 px-4">Role / Details</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {displayedRecipients.map((recipient) => {
                    const initials = getInitials(recipient.name);
                    return (
                      <tr
                        key={recipient.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {recipient.avatar_url ? (
                                <img
                                  src={recipient.avatar_url}
                                  alt={recipient.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs grid place-items-center">
                                  {initials}
                                </div>
                              )}
                              {recipient.is_online && (
                                <span
                                  title="Online"
                                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {recipient.name}
                              </div>
                              {recipient.last_message && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                  {recipient.last_message}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role / Subtitle / Specialization */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">
                              {recipient.specialization || recipient.subtitle || recipient.role}
                            </span>
                            {recipient.gender && (
                              <span className="text-[11px] text-slate-400">
                                {recipient.age ? `${recipient.age} yrs • ` : ''}
                                {recipient.gender}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {recipient.phone && (
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <Phone size={12} className="text-slate-400" />
                                {recipient.phone}
                              </span>
                            )}
                            {recipient.email && (
                              <span className="text-slate-500 truncate max-w-xs">
                                {recipient.email}
                              </span>
                            )}
                            {!recipient.phone && !recipient.email && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Online / Active Status */}
                        <td className="py-3.5 px-4 text-center">
                          {recipient.is_online ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Offline
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenChat(recipient)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-2xs border border-indigo-200/70 hover:border-indigo-600 cursor-pointer"
                          >
                            <MessageSquare size={14} />
                            Chat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Chat Drawer */}
      <ChatConversationDrawer
        open={isDrawerOpen}
        onClose={handleCloseChat}
        recipient={selectedRecipient}
        currentUserId={currentUserId}
        currentUserRole={effectiveRole}
      />
    </div>
  );
}

export default ChatPage;
