'use client';

import { useDesktopView } from '@/lib/desktop-view-context';

interface DesktopViewToggleProps {
  className?: string;
}

export function DesktopViewToggle({ className = '' }: DesktopViewToggleProps) {
  const { isDesktopView, toggleDesktopView, showToggle } = useDesktopView();

  if (!showToggle) return null;

  return (
    <button
      type="button"
      onClick={toggleDesktopView}
      className={`inline-flex items-center justify-center gap-2 rounded-none border border-border/80 bg-surface-2 px-4 py-2.5 text-sm font-extrabold text-fg transition-all hover:bg-surface-3 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary ${className}`}
      aria-label={isDesktopView ? 'العودة إلى نسخة الجوال' : 'عرض النسخة الكاملة'}
    >
      {/* monitor icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 text-primary shrink-0"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <span>{isDesktopView ? 'العودة إلى نسخة الجوال' : 'عرض النسخة الكاملة'}</span>
    </button>
  );
}

// Mobile top banner that remains visible in full desktop mode on mobile
// Features exact layout scale compensation (~3.41x multiplier) to match physical dimensions perfectly in 1280px viewport
export function MobileTopToggleBanner() {
  const { isDesktopView, toggleDesktopView, showToggle } = useDesktopView();

  if (!showToggle) return null;

  // ~3.41x scale compensation values (1280px forced viewport / 375px reference mobile width)
  const containerClass = isDesktopView
    ? "w-full bg-surface-2 border-b-[3.75px] border-border/80 px-[51px] py-[34px] flex justify-center items-center print:hidden select-none"
    : "w-full bg-surface-2 border-b border-border/80 px-4 py-2.5 flex justify-center items-center print:hidden select-none";

  const buttonClass = isDesktopView
    ? "w-full text-center py-[34px] text-[47px] leading-none font-extrabold inline-flex items-center justify-center gap-[26px] rounded-none border-[3.75px] border-border/80 bg-surface px-[51px] text-fg transition-all hover:bg-surface-3 hover:border-primary/50 focus-visible:outline-none"
    : "w-full text-center py-2.5 text-sm font-extrabold inline-flex items-center justify-center gap-2 rounded-none border border-border/80 bg-surface px-4 text-fg transition-all hover:bg-surface-3 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary";

  const iconWidth = isDesktopView ? 55 : 16;
  const iconHeight = isDesktopView ? 55 : 16;
  const iconClass = isDesktopView ? "w-[55px] h-[55px] text-primary shrink-0" : "size-4 text-primary shrink-0";
  const strokeWidth = isDesktopView ? "8.5" : "2.5";

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={toggleDesktopView}
        className={buttonClass}
        aria-label={isDesktopView ? 'العودة إلى نسخة الجوال' : 'عرض النسخة الكاملة'}
      >
        <svg
          width={iconWidth}
          height={iconHeight}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>{isDesktopView ? 'العودة إلى نسخة الجوال' : 'عرض النسخة الكاملة'}</span>
      </button>
    </div>
  );
}
