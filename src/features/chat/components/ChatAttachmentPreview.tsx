import {
  File,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import React from 'react';

import type { AttachmentCategory, StagedAttachment } from '../types/chat';
import { formatFileSize } from '../utils/attachmentUtils';

export interface ChatAttachmentPreviewProps {
  attachments: StagedAttachment[];
  onRemove: (id: string) => void;
  onAddMore?: () => void;
  isUploading?: boolean;
}

function renderCategoryIcon(category: AttachmentCategory) {
  switch (category) {
    case 'pdf':
      return <FileText size={18} className="text-rose-500 shrink-0" />;
    case 'spreadsheet':
      return <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />;
    case 'document':
      return <FileText size={18} className="text-blue-600 shrink-0" />;
    default:
      return <File size={18} className="text-slate-500 shrink-0" />;
  }
}

export const ChatAttachmentPreview: React.FC<ChatAttachmentPreviewProps> = ({
  attachments,
  onRemove,
  onAddMore,
  isUploading = false,
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="relative p-2.5 bg-slate-50 border-t border-x border-slate-200 rounded-t-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Uploading overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 rounded-t-xl flex items-center justify-center gap-2 text-xs font-semibold text-blue-700">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span>Uploading attachment{attachments.length > 1 ? 's' : ''}...</span>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-thin">
        {attachments.map((item) => {
          const isImage = item.category === 'image';

          if (isImage && item.previewUrl) {
            return (
              <div
                key={item.id}
                className="relative group shrink-0 w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs"
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  disabled={isUploading}
                  title={`Remove ${item.name}`}
                  className="absolute top-1 right-1 w-5 h-5 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  <X size={11} />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-[9px] text-white px-1 truncate text-center">
                  {formatFileSize(item.size)}
                </span>
              </div>
            );
          }

          // Document / Spreadsheet chip
          return (
            <div
              key={item.id}
              className="relative group shrink-0 max-w-[210px] bg-white border border-slate-200 rounded-xl p-2 pr-7 flex items-center gap-2 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                {renderCategoryIcon(item.category)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-medium text-slate-800 truncate mb-0 leading-tight"
                  title={item.name}
                >
                  {item.name}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {formatFileSize(item.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={isUploading}
                title={`Remove ${item.name}`}
                className="absolute top-2 right-1.5 w-5 h-5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}

        {/* Add more button */}
        {onAddMore && !isUploading && (
          <button
            type="button"
            onClick={onAddMore}
            title="Add more attachments"
            className="shrink-0 h-16 px-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span className="text-[10px]">Add more</span>
          </button>
        )}
      </div>
    </div>
  );
};
