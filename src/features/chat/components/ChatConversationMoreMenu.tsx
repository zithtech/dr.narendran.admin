import {
  Bell,
  BellOff,
  RefreshCw,
  Search,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';

export interface ChatConversationMoreMenuProps {
  open: boolean;
  onClose: () => void;
  onViewContact: () => void;
  onSearch: () => void;
  onRefresh: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  canClearChat: boolean;
  onClearChat: () => void;
  onCloseConversation: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const ChatConversationMoreMenu: React.FC<ChatConversationMoreMenuProps> = ({
  open,
  onClose,
  onViewContact,
  onSearch,
  onRefresh,
  isMuted,
  onToggleMute,
  canClearChat,
  onClearChat,
  onCloseConversation,
  buttonRef,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside and escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!buttonRef?.current || !buttonRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, buttonRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      aria-label="More options"
      className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none divide-y divide-slate-100"
    >
      {/* 1. Main Interaction Group */}
      <div className="py-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onViewContact();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <User size={15} className="text-slate-400 group-hover:text-blue-600" />
          <span>View Contact Details</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onSearch();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <Search size={15} className="text-slate-400" />
          <span>Search Messages</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onRefresh();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <RefreshCw size={15} className="text-slate-400" />
          <span>Refresh Conversation</span>
        </button>
      </div>

      {/* 2. Notification & Management Group */}
      <div className="py-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onToggleMute();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          {isMuted ? (
            <>
              <Bell size={15} className="text-amber-500" />
              <span>Unmute Notifications</span>
            </>
          ) : (
            <>
              <BellOff size={15} className="text-slate-400" />
              <span>Mute Notifications</span>
            </>
          )}
        </button>

        {canClearChat && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onClearChat();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
          >
            <Trash2 size={15} className="text-rose-500" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* 3. Navigation Group */}
      <div className="py-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onCloseConversation();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <XCircle size={15} className="text-slate-400" />
          <span>Close Conversation</span>
        </button>
      </div>
    </div>
  );
};
