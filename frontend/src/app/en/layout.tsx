import type { Metadata } from 'next';

import './en-skin.css';
import { EnBreakingNewsBar } from '@/components/en/en-breaking-news-bar';
import { EnFooter } from '@/components/en/en-footer';
import { EnHeader } from '@/components/en/en-header';
import { getBreakingFeed } from '@/lib/feed';
import { getSiteSettings } from '@/lib/site-settings';

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
  const [settings, breaking] = await Promise.all([
    getSiteSettings('en'),
    getBreakingFeed(5, 'en'),
  ]);

  return (
    <div className="en-skin" dir="ltr" lang="en">
      <EnHeader settings={settings} />
      {/* Site-wide, matching AR's placement in (site)/layout.tsx — appears on every EN page,
          not just the homepage, gated on is_breaking content existing for this locale. */}
      <EnBreakingNewsBar items={breaking.map((i) => ({ id: i.id, title: i.title, href: i.href }))} />
      <main>{children}</main>
      <EnFooter settings={settings} />
    </div>
  );
}
