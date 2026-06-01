'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface SermonTrack {
  id: string;
  title: string;
  speaker?: string | null;
  description?: string | null;
  audioUrl?: string | null;
  seriesName?: string | null;
  preachedAt?: string | null;
  durationSec?: number | null;
}

interface SermonPlayerContextValue {
  queue: SermonTrack[];
  current: SermonTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  setQueue: (tracks: SermonTrack[]) => void;
  play: (track: SermonTrack, queue?: SermonTrack[]) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
}

const SermonPlayerContext = createContext<SermonPlayerContextValue | null>(null);

const PROGRESS_KEY = 'spirify-progress';

function loadProgress(sermonId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY}:${sermonId}`);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

function saveProgress(sermonId: string, seconds: number) {
  try {
    localStorage.setItem(`${PROGRESS_KEY}:${sermonId}`, String(seconds));
  } catch {
    /* ignore */
  }
}

export function SermonPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueueState] = useState<SermonTrack[]>([]);
  const [current, setCurrent] = useState<SermonTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onTime = () => {
      if (!audioRef.current || !current) return;
      setProgress(audioRef.current.currentTime);
      if (audioRef.current.currentTime > 2) {
        saveProgress(current.id, audioRef.current.currentTime);
      }
    };
    const onMeta = () => {
      if (audioRef.current) setDuration(audioRef.current.duration || 0);
    };
    const onEnd = () => {
      setIsPlaying(false);
      if (current) saveProgress(current.id, 0);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const playTrack = useCallback(async (track: SermonTrack, newQueue?: SermonTrack[]) => {
    if (!track.audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (newQueue?.length) setQueueState(newQueue);

    const isSame = current?.id === track.id;
    setCurrent(track);

    if (!isSame) {
      audio.src = track.audioUrl;
      const saved = loadProgress(track.id);
      audio.currentTime = saved;
      setProgress(saved);
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, [current?.id]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else if (current) playTrack(current);
  }, [isPlaying, pause, current, playTrack]);

  const next = useCallback(() => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const nextTrack = queue[(idx + 1) % queue.length];
    if (nextTrack?.audioUrl) playTrack(nextTrack);
  }, [current, queue, playTrack]);

  const prev = useCallback(() => {
    if (!current || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === current.id);
    const prevTrack = queue[(idx - 1 + queue.length) % queue.length];
    if (prevTrack?.audioUrl) playTrack(prevTrack);
  }, [current, queue, playTrack]);

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = Math.max(0, Math.min(1, ratio)) * duration;
    audio.currentTime = t;
    setProgress(t);
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const value = useMemo(
    () => ({
      queue,
      current,
      isPlaying,
      progress,
      duration,
      volume,
      setQueue: setQueueState,
      play: playTrack,
      toggle,
      pause,
      next,
      prev,
      seek,
      setVolume,
    }),
    [queue, current, isPlaying, progress, duration, volume, playTrack, toggle, pause, next, prev, seek, setVolume],
  );

  return <SermonPlayerContext.Provider value={value}>{children}</SermonPlayerContext.Provider>;
}

export function useSermonPlayer() {
  const ctx = useContext(SermonPlayerContext);
  if (!ctx) throw new Error('useSermonPlayer must be used within SermonPlayerProvider');
  return ctx;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
