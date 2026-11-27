import {
  Briefcase,
  Calendar,
  Check,
  Copy,
  Hash,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { ChatRecipient } from '../types/chat';
import { resolveImageUrl } from '../../../utils/doctorAvatar';

export interface ChatContactDetailsModalProps {
  open: boolean;
  onClose: () => void;
  recipient: ChatRecipient | null;
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

export const ChatContactDetailsModal: React.FC<ChatContactDetailsModalProps> = ({
  open,
  onClose,
  recipient,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !recipient) return null;

  const resolvedAvatar =
    resolveImageUrl(recipient.avatar_url || recipient.profile_image_url) ||
    recipient.avatar_url ||
    recipient.profile_image_url;

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const role = (recipient.role || 'USER').toUpperCase();
  const isDoctor = role === 'DOCTOR';
  const isPatient = role === 'PATIENT';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const roleBadgeClass = isDoctor
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : isPatient
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : isAdmin
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-details-title"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <h2 id="contact-details-title" className="text-sm font-semibold text-slate-800">
              Contact Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close contact details"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Summary Card */}
        <div className="p-6 text-center border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/30">
          <div className="relative inline-block mx-auto mb-3">
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={recipient.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md mx-auto"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-2xl grid place-items-center shadow-md mx-auto">
                {getInitials(recipient.name)}
              </div>
            )}
            <span
              title={recipient.is_online ? 'Online' : 'Offline'}
              className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                recipient.is_online ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>

          <h3 className="text-base font-bold text-slate-900">{recipient.name}</h3>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={`text-[11px] uppercase font-semibold px-2.5 py-0.5 rounded-full border ${roleBadgeClass}`}
            >
              {recipient.role}
            </span>
            <span
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                recipient.is_online ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  recipient.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              {recipient.is_online ? 'Active Now' : 'Offline'}
            </span>
          </div>

          {recipient.specialization && (
            <p className="text-xs font-medium text-slate-600 mt-2">
              {recipient.specialization}
            </p>
          )}
        </div>

        {/* Info Grid / List */}
        <div className="p-5 space-y-3.5 max-h-80 overflow-y-auto text-xs">
          {/* Email */}
          {recipient.email && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Email Address
                  </span>
                  <a
                    href={`mailto:${recipient.email}`}
                    className="text-xs font-medium text-slate-800 hover:text-blue-600 truncate block transition-colors"
                  >
                    {recipient.email}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyToClipboard(recipient.email!, 'email')}
                title="Copy email"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                {copiedField === 'email' ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          )}

          {/* Phone */}
          {recipient.phone && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Phone Number
                  </span>
                  <a
                    href={`tel:${recipient.phone}`}
                    className="text-xs font-medium text-slate-800 hover:text-emerald-600 truncate block transition-colors"
                  >
                    {recipient.phone}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyToClipboard(recipient.phone!, 'phone')}
                title="Copy phone"
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                {copiedField === 'phone' ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          )}

          {/* Specialization / Department */}
          {(recipient.specialization || recipient.subtitle) && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 grid place-items-center shrink-0">
                <Briefcase size={15} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Specialization / Role Info
                </span>
                <span className="text-xs font-medium text-slate-800 truncate block">
                  {recipient.specialization || recipient.subtitle}
                </span>
              </div>
            </div>
          )}

          {/* Age & Gender for Patient */}
          {(recipient.age || recipient.gender) && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                <Calendar size={15} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Demographics
                </span>
                <span className="text-xs font-medium text-slate-800 truncate block">
                  {[recipient.age ? `${recipient.age} Years Old` : null, recipient.gender]
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </div>
            </div>
          )}

          {/* User ID / Account Reference */}
          {(recipient.user_account_id || recipient.id) && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
                  <Hash size={15} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Participant ID
                  </span>
                  <span className="text-xs font-mono text-slate-700 truncate block">
                    {recipient.user_account_id || recipient.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void copyToClipboard(recipient.user_account_id || recipient.id, 'id')
                }
                title="Copy ID"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                {copiedField === 'id' ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
