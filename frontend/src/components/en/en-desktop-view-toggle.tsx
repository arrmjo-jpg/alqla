'use client';

import { useDesktopView } from '@/lib/desktop-view-context';

// Fork of components/layout/desktop-view-toggle.tsx — identical logic (reuses the same
// DesktopViewProvider/useDesktopView directly; that context has no hardcoded text, so it didn't
// need its own EN fork), English labels only.
interface EnDesktopViewToggleProps {
  className?: string;
}

export function EnDesktopViewToggle({ className = '' }: EnDesktopViewToggleProps) {
  const { isDesktopView, toggleDesktopView, showToggle } = useDesktopView();

  if (!showToggle) return null;

  return (
    <button
      type="button"
      onClick={toggleDesktopView}
      className={`en-desktop-toggle ${className}`}
      aria-label={isDesktopView ? 'Back to mobile version' : 'View full version'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="en-desktop-toggle__icon"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <span>{isDesktopView ? 'Back to mobile version' : 'View full version'}</span>
    </button>
  );
}

// Mobile top banner that remains visible in full desktop mode on mobile — same ~3.41x scale
// compensation values as the AR original (1280px forced viewport / 375px reference mobile width).
export function EnMobileTopToggleBanner() {
  const { isDesktopView, toggleDesktopView, showToggle } = useDesktopView();

  if (!showToggle) return null;

  const containerClass = isDesktopView
    ? 'en-mobile-toggle-banner en-mobile-toggle-banner--desktop'
    : 'en-mobile-toggle-banner';

  const buttonClass = isDesktopView
    ? 'en-mobile-toggle-banner__btn en-mobile-toggle-banner__btn--desktop'
    : 'en-mobile-toggle-banner__btn';

  const iconSize = isDesktopView ? 55 : 16;
  const iconClass = isDesktopView ? 'en-mobile-toggle-banner__icon--desktop' : 'en-mobile-toggle-banner__icon';
  const strokeWidth = isDesktopView ? '8.5' : '2.5';

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={toggleDesktopView}
        className={buttonClass}
        aria-label={isDesktopView ? 'Back to mobile version' : 'View full version'}
      >
        <svg
          width={iconSize}
          height={iconSize}
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
        <span>{isDesktopView ? 'Back to mobile version' : 'View full version'}</span>
      </button>
    </div>
  );
}
