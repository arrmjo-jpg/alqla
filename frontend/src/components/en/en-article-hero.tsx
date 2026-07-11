'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

import { LivePulse } from '@/components/ui/live-pulse';
import type { ArticleImage } from '@/lib/articles';

// Fork of components/articles/blocks/hero-image.tsx (AR) — identical structure/behavior:
// zero-CLS padding-box sizing, skeleton, badge overlay, click-to-play inline video, credit bar.
// English strings + LTR float side (AR floats right via editorial-float-left in RTL context;
// mirrored to float left here so text wraps the same way relative to reading direction).
interface EnArticleHeroProps {
  cover: ArticleImage | null;
  defaultTitle: string;
  layout?: 'float' | 'full';
  isLive?: boolean;
  breaking?: boolean;
  featured?: boolean;
  hasVideo?: boolean;
  videoUrl?: string;
}

export function EnArticleHero({
  cover,
  defaultTitle,
  layout = 'full',
  isLive = false,
  breaking = false,
  featured = false,
  hasVideo = false,
  videoUrl = '',
}: EnArticleHeroProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!cover || !cover.url) return null;

  const width = cover.width ?? 1600;
  const height = cover.height ?? 900;
  const padPercentage = (height / width) * 100;
  const isVertical = height > width;

  const figureClass = [
    'en-hero-figure',
    layout === 'float' ? 'en-hero-figure--float' : 'en-hero-figure--full',
    layout !== 'float' && isVertical ? 'en-hero-figure--vertical' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasCreditInfo = cover.caption || cover.photographer || cover.source;

  return (
    <figure
      className={figureClass}
      style={videoUrl ? { cursor: 'pointer' } : undefined}
      onClick={() => { if (videoUrl) setIsPlaying(true); }}
    >
      <div className="en-hero-figure__frame" style={{ paddingBottom: `${padPercentage}%` }}>
        {isPlaying && videoUrl ? (
          <video src={videoUrl} controls autoPlay className="en-hero-figure__video" />
        ) : (
          <>
            <div className="en-hero-figure__skeleton" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element -- <img> high performance above-the-fold */}
            <img
              src={cover.url}
              alt={cover.alt ?? defaultTitle}
              className="en-hero-figure__img"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            {(isLive || breaking || featured) && (
              <div className="en-hero-figure__badges">
                {isLive && (
                  <span className="en-badge en-badge--live" style={{ position: 'static' }}>
                    <LivePulse />
                    Live Now
                  </span>
                )}
                {breaking && <span className="en-badge en-badge--breaking" style={{ position: 'static' }}>Breaking</span>}
                {featured && !isLive && (
                  <span className="en-badge en-badge--live" style={{ position: 'static' }}>Special Coverage</span>
                )}
              </div>
            )}

            {hasVideo && (
              <div className="en-hero-figure__play">
                <div className="en-hero-figure__play-btn">
                  <Play size={32} fill="#fff" style={{ marginInlineStart: 2 }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {hasCreditInfo && (
        <figcaption className="en-figcaption en-hero-figure__caption">
          {cover.caption && <span style={{ fontWeight: 600, color: 'var(--en-ink)' }}>{cover.caption}</span>}
          <div className="en-hero-figure__credit">
            {cover.photographer && (
              <span>Photo: <b style={{ color: 'var(--en-ink)' }}>{cover.photographer}</b></span>
            )}
            {cover.photographer && cover.source && <span style={{ color: 'var(--en-line)' }}>|</span>}
            {cover.source && (
              <span>Source: <b style={{ color: 'var(--en-ink)' }}>{cover.source}</b></span>
            )}
          </div>
        </figcaption>
      )}
    </figure>
  );
}
