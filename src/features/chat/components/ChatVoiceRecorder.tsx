import { Loader2, Pause, Play, RotateCcw, Send, Trash2 } from 'lucide-react';
import React from 'react';

import { formatDuration } from '../utils/attachmentUtils';

export interface ChatVoiceRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevels: number[];
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
  onCancel: () => void;
  isSending?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ChatVoiceRecorder: React.FC<ChatVoiceRecorderProps> = ({
  isRecording,
  isPaused,
  duration,
  audioLevels,
  onPause,
  onResume,
  onDone,
  onCancel,
  isSending = false,
  error,
  onRetry,
}) => {
  if (!isRecording) return null;

  return (
    <div className={`flex-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-slate-800 animate-in fade-in duration-150 select-none border transition-colors ${
      error
        ? 'bg-rose-50 border-rose-300'
        : isSending
          ? 'bg-blue-50/70 border-blue-200'
          : 'bg-rose-50/70 border-rose-200/80'
    }`}>
      {/* Left: Indicator & Status / Duration */}
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <div className="relative flex items-center justify-center">
          {isSending ? (
            <Loader2 size={15} className="animate-spin text-blue-600" />
          ) : !isPaused ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative" />
            </>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`text-xs font-bold tracking-wider tabular-nums font-mono ${
            isSending ? 'text-blue-700' : 'text-rose-700'
          }`}>
            {formatDuration(duration)}
          </span>
          <span className={`text-[10px] font-medium leading-none truncate max-w-[140px] sm:max-w-[200px] ${
            error
              ? 'text-rose-600 font-semibold'
              : isSending
                ? 'text-blue-600'
                : 'text-rose-500'
          }`}>
            {error
              ? 'Failed to send'
              : isSending
                ? 'Sending voice note...'
                : isPaused
                  ? 'Recording paused'
                  : 'Recording voice note...'}
          </span>
        </div>
      </div>

      {/* Center: Live Waveform / Audio Visualizer Bars */}
      <div className="flex-1 flex items-center justify-center gap-1 h-7 max-w-[180px] sm:max-w-xs mx-auto overflow-hidden">
        {audioLevels.map((level, idx) => (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-75 ${
              isSending
                ? 'bg-blue-400 animate-pulse'
                : isPaused
                  ? 'bg-rose-300'
                  : 'bg-rose-500'
            }`}
            style={{
              height: isPaused || isSending ? '8px' : `${Math.max(6, Math.min(26, (level / 100) * 26))}px`,
            }}
          />
        ))}
      </div>

      {/* Right Controls: Pause/Resume, Cancel, Done / Retry */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Pause / Resume Button */}
        {!isSending && !error && (
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            disabled={isSending}
            title={isPaused ? 'Resume recording' : 'Pause recording'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            {isPaused ? <Play size={16} className="text-emerald-600 fill-emerald-600" /> : <Pause size={16} />}
          </button>
        )}

        {/* Cancel / Discard Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSending}
          title="Cancel and discard recording"
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>

        {/* Done / Retry Button */}
        <button
          type="button"
          onClick={error && onRetry ? onRetry : onDone}
          disabled={isSending || (!error && duration === 0)}
          title={isSending ? 'Sending voice note...' : error ? 'Retry sending' : 'Send voice note'}
          className={`px-3 py-1.5 rounded-lg text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'bg-amber-600 hover:bg-amber-700'
              : isSending
                ? 'bg-blue-600'
                : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isSending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Sending...</span>
            </>
          ) : error ? (
            <>
              <RotateCcw size={13} />
              <span>Retry</span>
            </>
          ) : (
            <>
              <Send size={13} />
              <span>Done</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
