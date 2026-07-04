'use client';

import type { ArticleImage } from '@/lib/articles';
import { editorialTypography } from '@/lib/design-tokens';

interface HeroImageProps {
  cover: ArticleImage | null;
  defaultTitle: string;
  layout?: 'float' | 'full';
}

export function ArticleHero({ cover, defaultTitle, layout = 'full' }: HeroImageProps) {
  if (!cover || !cover.url) return null;

  // Determine aspect ratio to set height pad percentage (for zero CLS)
  const width = cover.width ?? 1600;
  const height = cover.height ?? 900;
  const padPercentage = (height / width) * 100;
  
  // Dynamic media aspect check
  const isVertical = height > width;
  
  let containerClass = '';
  if (layout === 'float') {
    containerClass = 'w-full my-6 lg:my-0 lg:mb-4 overflow-hidden border border-border/80 bg-surface-2 editorial-float-left';
  } else {
    containerClass = isVertical 
      ? 'max-w-[420px] mx-auto my-6 overflow-hidden border border-border/80 shadow-sm bg-surface-2' 
      : 'w-full my-6 overflow-hidden border border-border/80 bg-surface-2';
  }

  const hasCreditInfo = cover.caption || cover.photographer || cover.source;

  return (
    <figure className={containerClass}>
      {/* Zero-CLS Container wrapper */}
      <div 
        className="relative w-full overflow-hidden bg-surface-3 transition-colors duration-300"
        style={{ paddingBottom: `${padPercentage}%` }}
      >
        {/* Skeleton animation layered behind image */}
        <div className="absolute inset-0 animate-pulse bg-surface-3" />
        
        {/* eslint-disable-next-line @next/next/no-img-element -- <img> high performance above-the-fold */}
        <img
          src={cover.url}
          alt={cover.alt ?? defaultTitle}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={(e) => {
            // Remove pulse animation wrapper once loaded if desired, or let browser transition smoothly
            e.currentTarget.style.opacity = '1';
          }}
          style={{ opacity: 0 }} // Starts transparent, fades in once cached/loaded to prevent flash
        />
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
