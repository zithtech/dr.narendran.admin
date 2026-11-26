import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import React, { useState } from 'react';

import { resolveImageUrl } from '../../../utils/doctorAvatar';
import type { AttachmentCategory, ChatMessage } from '../types/chat';
import { formatFileSize, getFileCategory } from '../utils/attachmentUtils';
import { ChatImageLightboxModal } from './ChatImageLightboxModal';

export interface ChatMessageAttachmentProps {
  message: ChatMessage;
  mine: boolean;
  onOpenImage?: (imageUrl: string, fileName?: string) => void;
}

function renderCategoryIcon(category: AttachmentCategory, mine: boolean) {
  switch (category) {
    case 'pdf':
      return <FileText size={20} className={mine ? 'text-rose-300' : 'text-rose-500'} />;
    case 'spreadsheet':
      return <FileSpreadsheet size={20} className={mine ? 'text-emerald-300' : 'text-emerald-600'} />;
    case 'document':
      return <FileText size={20} className={mine ? 'text-sky-200' : 'text-blue-600'} />;
    default:
      return <File size={20} className={mine ? 'text-blue-200' : 'text-slate-500'} />;
  }
}

export const ChatMessageAttachment: React.FC<ChatMessageAttachmentProps> = ({
  message,
  mine,
  onOpenImage,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rawUrl = message.attachment_url || message.attachmentUrl;
  const fileName =
    message.attachment_name ||
    message.attachmentName ||
    message.file_name ||
    message.fileName ||
    'Attachment';
  const fileType =
    message.attachment_type ||
    message.attachmentType ||
    message.mime_type ||
    message.mimeType ||
    message.message_type ||
    message.messageType;
  const fileSize =
    message.attachment_size ??
    message.attachmentSize ??
    message.file_size ??
    message.fileSize;

  if (!rawUrl) {
    return null;
  }

  const resolvedUrl = resolveImageUrl(rawUrl) || rawUrl;
  const category = getFileCategory(fileName, fileType);
  const isImage = category === 'image' && !imageError;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImageClick = () => {
    if (onOpenImage) {
      onOpenImage(resolvedUrl, fileName);
    } else {
      setIsLightboxOpen(true);
    }
  };

  // Image Attachment Rendering
  if (isImage) {
    return (
      <div className="mt-1 mb-1">
        <div
          onClick={handleImageClick}
          className="relative group rounded-xl overflow-hidden border border-black/10 bg-black/5 cursor-pointer max-w-[280px] sm:max-w-[320px] shadow-xs"
        >
          <img
            src={resolvedUrl}
            alt={fileName}
            onError={() => setImageError(true)}
            className="w-full max-h-[220px] object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />

          {/* Hover overlay with action icons */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 text-white">
            <span className="text-[11px] truncate max-w-[180px] drop-shadow-sm font-medium">
              {fileName}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                title="Download"
                className="p-1 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white transition-colors cursor-pointer"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={handleImageClick}
                title="Preview"
                className="p-1 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white transition-colors cursor-pointer"
              >
                <Eye size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal lightbox fallback */}
        {!onOpenImage && (
          <ChatImageLightboxModal
            open={isLightboxOpen}
            onClose={() => setIsLightboxOpen(false)}
            imageUrl={resolvedUrl}
            fileName={fileName}
          />
        )}
      </div>
    );
  }

  // Document / Spreadsheet Attachment Card
  return (
    <div
      onClick={handleDownload}
      className={`mt-1.5 mb-1 p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-[300px] sm:max-w-[340px] transition-all cursor-pointer select-none group shadow-2xs ${
        mine
          ? 'bg-blue-700/60 hover:bg-blue-700/80 border-blue-400/30 text-white'
          : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            mine
              ? 'bg-blue-800/60 border-blue-400/30 text-white'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          {renderCategoryIcon(category, mine)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold truncate mb-0.5 leading-tight ${
              mine ? 'text-white' : 'text-slate-900'
            }`}
            title={fileName}
          >
            {fileName}
          </p>
          <div
            className={`flex items-center gap-1.5 text-[10px] ${
              mine ? 'text-blue-100' : 'text-slate-400'
            }`}
          >
            <span>{formatFileSize(fileSize)}</span>
            <span>•</span>
            <span className="uppercase font-semibold tracking-wider text-[9px]">
              {category}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        title={`Download ${fileName}`}
        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
          mine
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-white border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600'
        }`}
      >
        <Download size={14} />
      </button>
    </div>
  );
};
