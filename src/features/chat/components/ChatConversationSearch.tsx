import { Calendar, ChevronRight, Loader2, Paperclip, Search, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { chatApi } from '../api/chatApi';
import type { ChatMessage } from '../types/chat';
import { stripFormatting } from '../utils/formattingUtils';
import { isMessageFromMe } from '../utils/userUtils';

export interface ChatConversationSearchProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  currentUserId?: string;
  onSelectMessage: (message: ChatMessage) => void;
  selectedMessageId?: string | null;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function formatSearchResultTime(dateString?: string): string {
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
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const ChatConversationSearch: React.FC<ChatConversationSearchProps> = ({
  open,
  onClose,
  conversationId,
  currentUserId,
  onSelectMessage,
  selectedMessageId,
}) => {
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setLastSearchedQuery('');
      setResults([]);
      setError(null);
    }
  }, [open]);

  // Reset when conversation changes
  useEffect(() => {
    setQuery('');
    setLastSearchedQuery('');
    setResults([]);
    setError(null);
  }, [conversationId]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed || !conversationId) {
        setResults([]);
        setLastSearchedQuery('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setLastSearchedQuery(trimmed);

      try {
        const response = await chatApi.searchMessages(
          conversationId,
          trimmed,
          50,
          0,
        );
        const matched = Array.isArray(response)
          ? response
          : (response as any)?.results || [];
        setResults(matched);
      } catch (err: any) {
        console.error('Message search failed:', err);
        setError(err?.message || 'Failed to search messages in this conversation.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  // Debounced typing handler
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setLastSearchedQuery('');
      setError(null);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void performSearch(val);
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const val = inputRef.current?.value ?? query;
    void performSearch(val);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery('');
    setLastSearchedQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="bg-slate-50 border-b border-slate-200/90 px-4 py-2.5 transition-all animate-in slide-in-from-top-2 duration-150 shrink-0"
    >
      {/* Top Search Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search messages or attachments in this chat..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear search"
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-2xs"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <span>Search</span>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close search"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <X size={16} />
        </button>
      </form>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-slate-500">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span>Searching conversation...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Empty results state */}
      {!isLoading && !error && lastSearchedQuery && results.length === 0 && (
        <div className="py-6 text-center text-slate-400">
          <div className="w-9 h-9 rounded-full bg-slate-200/70 text-slate-500 grid place-items-center mx-auto mb-2">
            <Search size={16} />
          </div>
          <p className="text-xs font-semibold text-slate-700">No matching messages</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            No messages in this chat contain &quot;{lastSearchedQuery}&quot;. Try different keywords.
          </p>
        </div>
      )}

      {/* Search results list dropdown */}
      {!isLoading && results.length > 0 && (
        <div className="mt-2.5 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
          <div className="px-3.5 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>
              Found <strong className="text-slate-800 font-semibold">{results.length}</strong> matching{' '}
              {results.length === 1 ? 'message' : 'messages'}
            </span>
            <span className="text-[10px] text-slate-400">Click a message to view in chat</span>
          </div>

          {results.map((msg) => {
            const isMe = isMessageFromMe(msg, null, currentUserId);
            const senderName = isMe
              ? 'You'
              : msg.sender_name || msg.sender_role || 'Participant';
            const cleanMessage = stripFormatting(msg.message || msg.content || '');
            const timeLabel = formatSearchResultTime(msg.created_at || msg.sent_at);
            const isSelected = selectedMessageId === msg.id;

            return (
              <div
                key={msg.id}
                role="button"
                tabIndex={0}
                data-testid={`search-result-${msg.id}`}
                onClick={() => onSelectMessage(msg)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectMessage(msg);
                }}
                className={`p-3 text-left transition-colors cursor-pointer group flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/90 border-l-3 border-blue-600'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {senderName}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Calendar size={11} className="text-slate-300" />
                      {timeLabel}
                    </span>
                  </div>

                  {cleanMessage && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed break-words">
                      <HighlightText text={cleanMessage} query={lastSearchedQuery} />
                    </p>
                  )}

                  {msg.attachment_name && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md mt-0.5">
                      <Paperclip size={12} className="shrink-0" />
                      <span className="truncate max-w-[220px]">
                        <HighlightText text={msg.attachment_name} query={lastSearchedQuery} />
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors mt-1">
                  <ChevronRight size={15} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
