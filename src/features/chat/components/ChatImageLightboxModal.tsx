import { Download, X } from 'lucide-react';
import React, { useEffect } from 'react';

import { resolveImageUrl } from '../../../utils/doctorAvatar';

export interface ChatImageLightboxModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string | undefined;
}

export const ChatImageLightboxModal: React.FC<ChatImageLightboxModalProps> = ({
  open,
  onClose,
  imageUrl,
  fileName = 'Image',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !imageUrl) return null;

  const resolved = resolveImageUrl(imageUrl) || imageUrl;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = resolved;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-transparent select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls Bar */}
        <div className="w-full flex items-center justify-between gap-3 text-white mb-2 px-2">
          <span className="text-xs font-medium truncate max-w-sm drop-shadow">
            {fileName}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              title="Download image"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center max-h-[80vh]">
          <img
            src={resolved}
            alt={fileName}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
