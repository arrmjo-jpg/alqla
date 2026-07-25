'use client';

import { useEffect, useState } from 'react';

import { isForcedDesktop, setForcedDesktop } from '@/lib/site-view';

// Fork of components/layout/mobile-view-banner.tsx — identical logic, English labels.
export function EnMobileViewBanner() {
  const [forced, setForced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setForced(isForcedDesktop());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`flex justify-center border-b border-border bg-surface-2 px-4 py-2 ${forced ? '' : 'lg:hidden'}`}
    >
      <button
        type="button"
        onClick={() => setForcedDesktop(!forced)}
        className="text-sm font-bold text-primary transition-opacity hover:opacity-80"
      >
        {forced ? 'View mobile version' : 'View full version'}
      </button>
    </div>
  );
}
