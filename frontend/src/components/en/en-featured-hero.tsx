import type { FeedItem } from '@/lib/feed';

import { EnHeroDesktopCarousel } from './en-hero-desktop-carousel';
import { EnHeroMobileCarousel } from './en-hero-mobile-carousel';
import { EnLatestHeaderList } from './en-latest-header-list';

// Fork of components/home/featured-hero.tsx — same 8+4 grid layout (was 9+3 ad-beside-hero;
// AR replaced that ad with the "Latest Updates" list, so this mirrors that):
// Mobile: swipe carousel (EnHeroMobileCarousel, below 1024px).
// Desktop: 8 cols carousel + 4 cols "Latest Updates" list (≥1024px), matching AR exactly.
export function EnFeaturedHero({ items, headerItems = [] }: { items: FeedItem[]; headerItems?: FeedItem[] }) {
  if (items.length === 0) return <EnFeaturedHeroEmpty />;

  return (
    <div className="en-container" style={{ paddingBlock: 24 }}>
      {/* Mobile: swipe carousel */}
      <EnHeroMobileCarousel items={items.slice(0, 5)} />

      {/* Desktop (≥1024px): 8 cols carousel + 4 cols "Latest Updates" list — same as AR */}
      <div className="en-hero-desktop-new">
        <div className="en-hero-desktop-grid">
          <div className="en-hero-desktop-grid__carousel">
            <EnHeroDesktopCarousel items={items.slice(0, 5)} />
          </div>
          <div className="en-hero-desktop-grid__list">
            <EnLatestHeaderList items={headerItems} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EnFeaturedHeroEmpty() {
  return (
    <div className="en-container" style={{ paddingBlock: 24 }}>
      <div className="en-hero-empty">
        <h2 className="en-h2">No featured stories yet</h2>
        <p className="en-body" style={{ marginTop: 4 }}>Featured stories will appear here once flagged in the editorial dashboard.</p>
      </div>
    </div>
  );
}
