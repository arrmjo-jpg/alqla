import type { FeedItem } from '@/lib/feed';

import { EnFeedGridCard } from './en-feed-grid-card';
import { EnSectionHeading } from './en-section-heading';

// "Latest News" homepage section, true chronological order (getLatestFeed) — AR's homepage has no
// such section either; that feed only powers the sitewide ticker and AR's dedicated /latest page.
// Mirrors that page's card grid, sized down for a homepage section. Same card as EnMostPopular,
// without the rank badge. Takes items as a prop — fetched once in page.tsx.
export function EnLatestNews({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="en-section" aria-label="Latest News">
      <EnSectionHeading title="Latest News" />
      <div className="en-grid">
        {items.map((item) => (
          <EnFeedGridCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
