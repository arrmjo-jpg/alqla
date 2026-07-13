import type { Metadata } from 'next';

import './en-skin.css';
import { EnBreakingNewsBar } from '@/components/en/en-breaking-news-bar';
import { EnMobileTopToggleBanner } from '@/components/en/en-desktop-view-toggle';
import { EnFooter } from '@/components/en/en-footer';
import { EnHeader } from '@/components/en/en-header';
import { EnMobileBottomNav } from '@/components/en/en-mobile-bottom-nav';
import { EnNewsTicker } from '@/components/en/en-news-ticker';
import { getBreakingFeed, getLatestFeed } from '@/lib/feed';
import { getSiteSettings } from '@/lib/site-settings';
import { DesktopViewProvider } from '@/lib/desktop-view-context';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings('en');
  const name = s?.site_name?.trim() || 'AlphaCMS';
  return {
    title: { default: name, template: `%s — ${name}` },
    description: s?.description?.trim() || undefined,
    alternates: { canonical: '/en' },
  };
}

// English (LTR) shell — matched to the Arabic «القلعة نيوز» look (Cairo type,
// red palette, red-bordered frame, dark footer). The root <html> is RTL/Arabic;
// this wrapper flips direction + language for the English subtree. Cairo is
// already loaded globally by the root layout (--font-cairo).
export default async function EnLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, breaking, latest] = await Promise.all([
    getSiteSettings('en'),
    getBreakingFeed(5, 'en'),
    getLatestFeed('en'),
  ]);

  return (
    <DesktopViewProvider>
      <div className="en-skin" dir="ltr" lang="en">
        <EnMobileTopToggleBanner />
        <EnHeader settings={settings} />
        {/* Site-wide, matching AR's placement in (site)/layout.tsx — appears on every EN page, not
            just the homepage. Ticker sits above the breaking bar, same order as AR's layout. */}
        <EnNewsTicker items={latest.slice(0, 10).map((i) => ({ id: i.id, title: i.title, href: i.href }))} />
        <EnBreakingNewsBar items={breaking.map((i) => ({ id: i.id, title: i.title, href: i.href }))} />
        <main>{children}</main>
        <EnFooter settings={settings} />

        {/* Spacer so the fixed bottom nav doesn't cover the footer's last content — mirrors AR's
            <div className="h-14 lg:hidden" /> in (site)/layout.tsx. */}
        <div className="h-14 lg:hidden" aria-hidden />
        <EnMobileBottomNav />
      </div>
    </DesktopViewProvider>
  );
}
