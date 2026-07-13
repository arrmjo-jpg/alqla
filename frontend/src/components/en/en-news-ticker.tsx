'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

// Fork of components/layout/news-ticker.tsx — identical typewriter/prev-pause-next logic.
// Chevron directions swapped from the AR original: AR (RTL) uses ChevronRight for "previous" and
// ChevronLeft for "next" (reading flows right-to-left, so "back" points right); this LTR version
// uses ChevronLeft for "previous" and ChevronRight for "next" instead.
export interface EnTickerItem {
  id: number;
  title: string;
  href: string;
}

export function EnNewsTicker({ items }: { items: EnTickerItem[] }) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<'type' | 'pause' | 'delete'>('type');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleNext = useCallback(() => {
    setIdx((prev) => (prev + 1) % items.length);
    setLen(0);
    setPhase('type');
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setIdx((prev) => (prev - 1 + items.length) % items.length);
    setLen(0);
    setPhase('type');
  }, [items.length]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (items.length === 0) return;
    if (!isPlaying || isHovered) return;

    let t: ReturnType<typeof setTimeout>;
    const cur = items[idx % items.length];
    const full = cur.title;

    if (phase === 'type') {
      t = setTimeout(
        () => {
          if (len < full.length) {
            setLen(len + 1);
          } else {
            setPhase('pause');
          }
        },
        len < full.length ? 45 : 60,
      );
    } else if (phase === 'pause') {
      t = setTimeout(() => {
        setPhase('delete');
      }, 2200);
    } else if (phase === 'delete') {
      if (len > 0) {
        t = setTimeout(() => {
          setLen(len - 1);
        }, 22);
      } else {
        setIdx((prev) => (prev + 1) % items.length);
        setPhase('type');
      }
    }

    return () => clearTimeout(t);
  }, [phase, len, idx, isPlaying, isHovered, items]);

  if (items.length === 0) return null;

  const currentItem = items[((idx % items.length) + items.length) % items.length];

  return (
    <div className="en-newsticker" dir="ltr">
      <div
        className="en-newsticker__text-wrap"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className="en-newsticker__badge"
          style={{ background: '#000', color: '#C9A227', position: 'relative', overflow: 'hidden' }}
        >
          <span
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(120deg, transparent 0%, rgba(201,162,39,0.5) 50%, transparent 100%)',
              animation: 'ticker-badge-shimmer 3s ease-in-out infinite',
            }}
            aria-hidden
          />
          <span
            aria-hidden
            className="animate-ping"
            style={{
              position: 'relative', zIndex: 1,
              display: 'inline-block', width: 8, height: 8,
              borderRadius: '50%', background: '#C9A227', opacity: 0.85,
              flexShrink: 0,
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>Latest News</span>
        </span>

        <div className="en-newsticker__headline-wrap">
          <Link href={currentItem.href} className="en-newsticker__headline">
            {currentItem.title.slice(0, len)}
            <span className="en-newsticker__cursor" aria-hidden>
              ▌
            </span>
          </Link>
        </div>

        {/* Continuous marquee of every headline — mobile only. Replaces the typewriter headline,
            which the fixed-width badge/controls squeeze to near-zero width on small screens. */}
        <div className="en-newsticker__marquee">
          <div className="en-newsticker__marquee-track">
            {items.map((it) => (
              <span key={`a-${it.id}`} className="en-newsticker__marquee-item-wrap">
                <Link href={it.href} className="en-newsticker__marquee-item">{it.title}</Link>
                <span className="en-newsticker__marquee-sep" aria-hidden>•</span>
              </span>
            ))}
            {items.map((it) => (
              <span key={`b-${it.id}`} className="en-newsticker__marquee-item-wrap" aria-hidden>
                <Link href={it.href} className="en-newsticker__marquee-item" tabIndex={-1}>{it.title}</Link>
                <span className="en-newsticker__marquee-sep" aria-hidden>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="en-newsticker__controls">
        <button onClick={handlePrev} className="en-newsticker__btn" title="Previous" aria-label="Previous">
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={togglePlay}
          className="en-newsticker__btn"
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button onClick={handleNext} className="en-newsticker__btn" title="Next" aria-label="Next">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
