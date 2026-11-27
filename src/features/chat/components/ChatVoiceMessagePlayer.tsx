import { AlertCircle, Download, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { resolveImageUrl } from '../../../utils/doctorAvatar';
import type { ChatMessage } from '../types/chat';
import { formatDuration } from '../utils/attachmentUtils';

export interface ChatVoiceMessagePlayerProps {
  message: ChatMessage;
  mine: boolean;
}

export const ChatVoiceMessagePlayer: React.FC<ChatVoiceMessagePlayerProps> = ({
  message,
  mine,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const rawUrl = message.attachment_url || message.attachmentUrl;
  const resolvedUrl = rawUrl ? resolveImageUrl(rawUrl) || rawUrl : '';
  const initialDuration = message.duration ? Number(message.duration) : 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Sync initial duration if updated from props
  useEffect(() => {
    if (initialDuration > 0 && duration === 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setHasError(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (isLoading) setIsLoading(false);
    };
    const handleLoadedMetadata = () => {
      setIsLoading(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
    };

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isLoading]);

  const togglePlay = () => {
    if (!audioRef.current || hasError || !resolvedUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
        setHasError(true);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || hasError) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const target = percentage * (duration || 1);
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex]!;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleRetry = () => {
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  const totalDuration = duration > 0 ? duration : initialDuration;
  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  if (!resolvedUrl) {
    return (
      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
        mine ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-100 text-slate-500'
      }`}>
        <AlertCircle size={14} className="text-amber-400 shrink-0" />
        <span>Voice note unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={`relative min-w-[210px] max-w-[280px] sm:max-w-[320px] py-1 select-none transition-all ${
        mine ? 'text-white' : 'text-slate-800'
      }`}
    >
      <audio ref={audioRef} src={resolvedUrl} preload="metadata" />

      {hasError ? (
        <div className="flex items-center justify-between gap-2 text-xs py-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle size={14} className={mine ? 'text-rose-300' : 'text-rose-500'} />
            <span className="truncate text-[11px]">Failed to load audio</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            title="Retry loading audio"
            className={`p-1 rounded text-xs flex items-center gap-1 cursor-pointer ${
              mine ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <RotateCcw size={12} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading && !isPlaying}
            title={isPlaying ? 'Pause' : 'Play voice message'}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-95 cursor-pointer ${
              mine
                ? 'bg-white hover:bg-blue-50 text-blue-600'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={15} className={mine ? 'fill-blue-600' : 'fill-white'} />
            ) : (
              <Play size={15} className={`${mine ? 'fill-blue-600' : 'fill-white'} translate-x-0.5`} />
            )}
          </button>

          {/* Waveform / Progress Scrub Area */}
          <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
            <div
              ref={progressBarRef}
              onClick={handleSeek}
              className={`relative h-2 rounded-full cursor-pointer overflow-hidden ${
                mine ? 'bg-blue-500/60' : 'bg-slate-200'
              }`}
              title="Click or tap to seek"
            >
              <div
                className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-75 ${
                  mine ? 'bg-white' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Time Indicator & Controls */}
            <div
              className={`flex items-center justify-between text-[10px] font-medium tabular-nums ${
                mine ? 'text-blue-100' : 'text-slate-500'
              }`}
            >
              <span>{formatDuration(isPlaying || currentTime > 0 ? currentTime : totalDuration)}</span>

              <div className="flex items-center gap-2">
                {/* Speed toggle pill */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  title={`Speed: ${playbackSpeed}x (click to change)`}
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold tracking-tight transition-colors cursor-pointer ${
                    mine
                      ? 'bg-blue-700/80 hover:bg-blue-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {playbackSpeed}x
                </button>

                {/* Direct download icon */}
                <a
                  href={resolvedUrl}
                  download={message.attachment_name || `voice_${message.id}.webm`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download voice note"
                  className={`hover:opacity-100 opacity-70 transition-opacity ${
                    mine ? 'text-white' : 'text-slate-500'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
