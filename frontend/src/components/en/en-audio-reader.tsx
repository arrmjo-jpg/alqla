'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Square, Volume2 } from 'lucide-react';

import { getClientId } from '@/lib/client-id';

// Fork of components/reading/audio-reader.tsx — identical TTS fetch/playback logic
// (POST /api/tts, same request/response shape), English labels, .en-* styling.
const RATES = [0.8, 1, 1.2, 1.5] as const;
type State = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function EnAudioReader({ targetId }: { targetId: string }) {
  const [state, setState] = useState<State>('idle');
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const ensureAudio = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.onended = () => setState('idle');
      audio.onerror = () => setState('error');
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const play = async () => {
    const audio = ensureAudio();
    if (audio.src) {
      try {
        await audio.play();
        setState('playing');
      } catch {
        setState('error');
      }
      return;
    }

    const el = document.getElementById(targetId);
    const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000);
    if (!text) return;

    setState('loading');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
        body: JSON.stringify({ text }),
      });
      const data: { success?: boolean; audio?: string | null } = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.audio) {
        setState('error');
        return;
      }
      audio.src = data.audio;
      audio.playbackRate = rate;
      await audio.play();
      setState('playing');
    } catch {
      setState('error');
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setState('paused');
  };
  const resume = async () => {
    try {
      await audioRef.current?.play();
      setState('playing');
    } catch {
      setState('error');
    }
  };
  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState('idle');
  };
  const changeRate = (r: number) => {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {state === 'loading' && (
        <span className="en-tool-btn en-tool-btn--wide" aria-live="polite">
          <Loader2 size={15} className="en-spin" aria-hidden /> Preparing…
        </span>
      )}

      {state === 'idle' && (
        <button type="button" onClick={() => void play()} className="en-tool-btn en-tool-btn--wide">
          <Volume2 size={15} aria-hidden /> Listen
        </button>
      )}

      {state === 'error' && (
        <button type="button" onClick={() => void play()} title="Couldn't generate audio, retry" className="en-tool-btn en-tool-btn--wide">
          <Volume2 size={15} aria-hidden /> Retry
        </button>
      )}

      {state === 'playing' && (
        <button type="button" onClick={pause} className="en-tool-btn en-tool-btn--wide">
          <Pause size={15} aria-hidden /> Pause
        </button>
      )}

      {state === 'paused' && (
        <button type="button" onClick={() => void resume()} className="en-tool-btn en-tool-btn--wide">
          <Play size={15} aria-hidden /> Resume
        </button>
      )}

      {(state === 'playing' || state === 'paused') && (
        <button type="button" onClick={stop} className="en-tool-btn" aria-label="Stop">
          <Square size={15} aria-hidden />
        </button>
      )}

      <select
        value={rate}
        onChange={(e) => changeRate(Number(e.target.value))}
        className="en-tool-btn"
        aria-label="Playback speed"
        style={{ width: 'auto', borderRadius: 8, padding: '0 8px' }}
      >
        {RATES.map((r) => (
          <option key={r} value={r}>{r}×</option>
        ))}
      </select>
    </div>
  );
}
