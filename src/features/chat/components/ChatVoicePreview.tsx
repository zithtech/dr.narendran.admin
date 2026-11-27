import { Loader2, Pause, Play, Send, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { formatDuration } from '../utils/attachmentUtils';

export interface ChatVoicePreviewProps {
  audioUrl: string;
  duration: number;
  onDiscard: () => void;
  onSend: () => void;
  isUploading?: boolean;
}

export const ChatVoicePreview: React.FC<ChatVoicePreviewProps> = ({
  audioUrl,
  duration,
  onDiscard,
  onSend,
  isUploading = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);

  useEffect(() => {
    setActualDuration(duration);
  }, [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setActualDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekPercentage = Math.max(0, Math.min(1, clickX / width));
    const targetTime = seekPercentage * (actualDuration || duration || 1);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const totalDuration = actualDuration > 0 ? actualDuration : duration;
  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div className="flex-1 flex items-center justify-between gap-3 bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-2 text-slate-800 animate-in fade-in duration-150 select-none">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Left: Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isUploading}
        title={isPlaying ? 'Pause preview' : 'Play voice preview'}
        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isPlaying ? (
          <Pause size={14} className="fill-white" />
        ) : (
          <Play size={14} className="fill-white translate-x-0.5" />
        )}
      </button>

      {/* Center: Waveform progress bar & Time indicator */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative h-2 bg-blue-200/60 rounded-full cursor-pointer overflow-hidden group"
          title="Click to seek"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-blue-600 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium tabular-nums">
          <span>{formatDuration(currentTime)}</span>
          <span className="text-slate-400">/</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Right Controls: Discard, Send */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Discard Button */}
        <button
          type="button"
          onClick={onDiscard}
          disabled={isUploading}
          title="Discard voice note"
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isUploading}
          title="Send voice note"
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send size={13} />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
