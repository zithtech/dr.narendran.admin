import { useCallback, useEffect, useRef, useState } from 'react';

export interface FinalizedAudio {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioLevels: number[];
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<FinalizedAudio | null>;
  cancelRecording: () => void;
  clearAudio: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([20, 40, 60, 30, 70, 40, 20]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const finalizedBlobRef = useRef<Blob | null>(null);
  const finalizedUrlRef = useRef<string | null>(null);
  const finalizedDurationRef = useRef<number>(0);

  // Clean up timer and animation frame
  const cleanupVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        void audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Full teardown
  useEffect(() => {
    return () => {
      clearTimer();
      cleanupVisualizer();
      cleanupStream();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [clearTimer, cleanupVisualizer, cleanupStream, audioUrl]);

  // Audio frequency visualizer loop
  const updateVisualizer = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Group into 12 distinct bars normalized between 15% and 100% height
    const barCount = 12;
    const step = Math.floor(dataArray.length / barCount);
    const newLevels: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      const avg = sum / (step || 1);
      const normalized = Math.max(15, Math.min(100, Math.round((avg / 255) * 100)));
      newLevels.push(normalized);
    }

    setAudioLevels(newLevels);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    finalizedBlobRef.current = null;
    if (finalizedUrlRef.current) {
      URL.revokeObjectURL(finalizedUrlRef.current);
      finalizedUrlRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingDuration(0);
    finalizedDurationRef.current = 0;
    audioChunksRef.current = [];

    if (!navigator?.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Select best supported MIME type
      let selectedMime = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          selectedMime = 'audio/ogg;codecs=opus';
        }
      }
      mimeTypeRef.current = selectedMime;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        if (fullBlob.size > 0) {
          const url = URL.createObjectURL(fullBlob);
          setAudioBlob(fullBlob);
          setAudioUrl(url);
        }
        cleanupStream();
        cleanupVisualizer();
      };

      // Set up Web Audio API Analyser for live waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          sourceNodeRef.current = source;

          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        }
      } catch {
        // Fallback: visualizer will maintain pulse default bars
      }

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);

      // Start duration counter
      clearTimer();
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      cleanupStream();
      cleanupVisualizer();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect an audio input device.');
      } else {
        setError('Could not access microphone. Please check your system audio settings.');
      }
    }
  }, [audioUrl, cleanupStream, cleanupVisualizer, clearTimer, updateVisualizer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearTimer();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [clearTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      clearTimer();
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      if (analyserRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      }
    }
  }, [clearTimer, updateVisualizer]);

  const stopRecording = useCallback((): Promise<FinalizedAudio | null> => {
    return new Promise((resolve) => {
      clearTimer();
      const recorder = mediaRecorderRef.current;
      const currentDuration = recordingDuration || finalizedDurationRef.current;

      // If already stopped or no active recorder
      if (!recorder || recorder.state === 'inactive') {
        const blobToUse = finalizedBlobRef.current || audioBlob;
        if (blobToUse && blobToUse.size > 0) {
          const url = finalizedUrlRef.current || audioUrl || URL.createObjectURL(blobToUse);
          resolve({
            blob: blobToUse,
            url,
            duration: currentDuration,
            mimeType: mimeTypeRef.current,
          });
          return;
        }
        setIsRecording(false);
        setIsPaused(false);
        resolve(null);
        return;
      }

      finalizedDurationRef.current = currentDuration;

      // Attach onstop handler to wait for finalized chunks
      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        let url = '';
        if (fullBlob.size > 0) {
          url = URL.createObjectURL(fullBlob);
          finalizedBlobRef.current = fullBlob;
          finalizedUrlRef.current = url;
          setAudioBlob(fullBlob);
          setAudioUrl(url);
        }
        cleanupStream();
        cleanupVisualizer();
        setIsPaused(false);

        if (fullBlob.size > 0) {
          resolve({
            blob: fullBlob,
            url,
            duration: currentDuration,
            mimeType: mimeTypeRef.current,
          });
        } else {
          setIsRecording(false);
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
        setIsRecording(false);
        setIsPaused(false);
        resolve(null);
      }
    });
  }, [clearTimer, recordingDuration, audioBlob, audioUrl, cleanupStream, cleanupVisualizer]);

  const cancelRecording = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Discard recorder events by overriding onstop
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    cleanupStream();
    cleanupVisualizer();
    audioChunksRef.current = [];
    finalizedBlobRef.current = null;
    if (finalizedUrlRef.current) {
      URL.revokeObjectURL(finalizedUrlRef.current);
      finalizedUrlRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    finalizedDurationRef.current = 0;
    setError(null);
  }, [clearTimer, cleanupStream, cleanupVisualizer, audioUrl]);

  const clearAudio = useCallback(() => {
    finalizedBlobRef.current = null;
    if (finalizedUrlRef.current) {
      URL.revokeObjectURL(finalizedUrlRef.current);
      finalizedUrlRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingDuration(0);
    finalizedDurationRef.current = 0;
    setError(null);
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    audioBlob,
    audioUrl,
    audioLevels,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  };
}
