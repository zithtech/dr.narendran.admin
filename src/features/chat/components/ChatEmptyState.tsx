import React from 'react';
import { MessageSquare, Sparkles, Users } from 'lucide-react';

export interface ChatEmptyStateProps {
  onStartNewChat?: () => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ onStartNewChat }) => {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-slate-50/40 select-none">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Empty State Vector Illustration */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-100 via-sky-50 to-blue-50/40 border border-blue-100/80 flex items-center justify-center shadow-sm">
            <div className="relative">
              <MessageSquare size={44} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="absolute -bottom-2 -left-3 w-10 h-10 rounded-2xl bg-white shadow-md border border-slate-200/80 grid place-items-center text-blue-600">
            <Users size={18} />
          </div>

          <div className="absolute -top-2 -right-3 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md grid place-items-center">
            <Sparkles size={14} />
          </div>
        </div>

        {/* Text Messaging Info */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
          No Data Found
        </h3>
        
        <p className="text-sm font-medium text-slate-500 mt-1">
          No records available to display at this time.
        </p>

        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          Select a user or conversation to start chatting. You can browse doctors, patients, or administrators from the sidebar.
        </p>

        {onStartNewChat && (
          <button
            type="button"
            onClick={onStartNewChat}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare size={14} />
            <span>Browse Contacts</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatEmptyState;
