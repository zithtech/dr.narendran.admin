import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import React, { useEffect } from 'react';

export interface ChatClearConfirmModalProps {
  open: boolean;
  recipientName: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isClearing?: boolean;
}

export const ChatClearConfirmModal: React.FC<ChatClearConfirmModalProps> = ({
  open,
  recipientName,
  onConfirm,
  onCancel,
  isClearing = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClearing) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel, isClearing]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-chat-title"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isClearing) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mx-auto mb-4 shadow-2xs">
            <Trash2 size={24} />
          </div>

          <h3 id="clear-chat-title" className="text-base font-bold text-slate-900 mb-1.5">
            Clear Chat History?
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to clear the messages in this chat with{' '}
            <strong className="text-slate-800 font-semibold">{recipientName}</strong>?
            All currently displayed messages will be removed from your view.
          </p>

          <div className="mt-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] flex items-center gap-2 text-left">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>This action affects this conversation view and cannot be undone.</span>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isClearing}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isClearing}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {isClearing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Clear Chat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
