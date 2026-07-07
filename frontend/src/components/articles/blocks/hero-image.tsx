'use client';

import { useState } from 'react';
import type { ArticleImage } from '@/lib/articles';
import { editorialTypography } from '@/lib/design-tokens';
import { LivePulse } from '@/components/ui/live-pulse';
import { Play } from 'lucide-react';

interface HeroImageProps {
  cover: ArticleImage | null;
  defaultTitle: string;
  layout?: 'float' | 'full';
  isLive?: boolean;
  breaking?: boolean;
  featured?: boolean;
  hasVideo?: boolean;
  videoUrl?: string;
}

export function ArticleHero({
  cover,
  defaultTitle,
  layout = 'full',
  isLive = false,
  breaking = false,
  featured = false,
  hasVideo = false,
  videoUrl = '',
}: HeroImageProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!cover || !cover.url) return null;

  // Determine aspect ratio to set height pad percentage (for zero CLS)
  const width = cover.width ?? 1600;
  const height = cover.height ?? 900;
  const padPercentage = layout === 'float' ? 71.6 : (height / width) * 100;
  
  // Dynamic media aspect check
  const isVertical = height > width;
  
  let containerClass = '';
  if (layout === 'float') {
    containerClass = 'w-full my-6 lg:my-0 lg:mb-4 overflow-hidden border border-border/80 bg-surface-2 editorial-float-left group cursor-pointer';
  } else {
    containerClass = isVertical 
      ? 'max-w-[420px] mx-auto my-6 overflow-hidden border border-border/80 shadow-sm bg-surface-2 group cursor-pointer' 
      : 'w-full my-6 overflow-hidden border border-border/80 bg-surface-2 group cursor-pointer';
  }

  const hasCreditInfo = cover.caption || cover.photographer || cover.source;

  return (
    <figure 
      className={containerClass}
      onClick={() => { if (videoUrl) setIsPlaying(true); }}
    >
      {/* Zero-CLS Container wrapper */}
      <div 
        className="relative w-full overflow-hidden bg-surface-3 transition-colors duration-300"
        style={{ paddingBottom: `${padPercentage}%` }}
      >
        {isPlaying && videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full object-contain bg-black z-20"
          />
        ) : (
          <>
            {/* Skeleton animation layered behind image */}
            <div className="absolute inset-0 animate-pulse bg-surface-3" />
            
            {/* eslint-disable-next-line @next/next/no-img-element -- <img> high performance above-the-fold */}
            <img
              src={cover.url}
              alt={cover.alt ?? defaultTitle}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            {/* Badges overlaid on top right of the image */}
            {(isLive || breaking || featured) && (
              <div className="absolute top-3 right-3 z-20 flex flex-wrap gap-1.5 print:hidden">
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-primary">
                    <LivePulse />
                    <span>مباشر الآن</span>
                  </span>
                )}
                {breaking && (
                  <span className="px-3 py-1 text-xs font-bold text-white bg-[#dc2626] animate-pulse">
                    عاجل
                  </span>
                )}
                {featured && (
                  <span className="px-3 py-1 text-xs font-bold text-white bg-primary">
                    تغطية خاصة
                  </span>
                )}
              </div>
            )}

            {/* Play button overlay in the center if article has video */}
            {hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="size-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary">
                  <Play className="size-8 fill-white translate-x-[2px]" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Credit captions bar */}
      {hasCreditInfo && (
        <figcaption className={`${editorialTypography.caption} editorial-caption`}>
          {/* Caption */}
          {cover.caption && (
            <span className="font-semibold text-fg text-[13px]">{cover.caption}</span>
          )}
          
          {/* Photographer / Source */}
          <div className="flex flex-wrap items-center gap-1.5 text-muted shrink-0 text-[11px]">
            {cover.photographer && (
              <span>
                عدسة: <span className="font-bold text-fg">{cover.photographer}</span>
              </span>
            )}
            {cover.photographer && cover.source && (
              <span className="text-border mx-1 select-none">|</span>
            )}
            {cover.source && (
              <span>
                المصدر: <span className="font-bold text-fg">{cover.source}</span>
              </span>
            )}
          </div>
        </figcaption>
      )}
    </figure>
  );
}
