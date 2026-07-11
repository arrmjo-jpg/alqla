import type { FeedItem } from '@/lib/feed';

import { EnFeedGridCard } from './en-feed-grid-card';
import { EnSectionHeading } from './en-section-heading';

// "Most Popular" homepage section. AR's homepage has no such section — the most-read concept
// only exists as AR's dedicated /trending page — so this mirrors that page's card+rank-badge grid
// instead, sized down for a homepage section. Takes items as a prop (the same mostRead data
// EnSidebar already fetches via getMostReadFeed) rather than fetching again.
export function EnMostPopular({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="en-section" aria-label="Most Popular">
      <EnSectionHeading title="Most Popular" />
      <div className="en-grid">
        {items.map((item, i) => (
          <EnFeedGridCard key={item.id} item={item} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
