import { AdZone } from '@/components/ads/ad-zone';
import type { FeedItem } from '@/lib/feed';

import { EnHeroDesktopCarousel } from './en-hero-desktop-carousel';
import { EnHeroMobileCarousel } from './en-hero-mobile-carousel';

// Fork of components/home/featured-hero.tsx — identical 9+3 grid layout:
// Mobile: swipe carousel (EnHeroMobileCarousel, below 1024px).
// Desktop: 9 cols carousel + 3 cols ad (≥1024px), matching AR exactly.
export function EnFeaturedHero({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return <EnFeaturedHeroEmpty />;

  return (
    <div className="en-container" style={{ paddingBlock: 24 }}>
      {/* Mobile: swipe carousel */}
      <EnHeroMobileCarousel items={items.slice(0, 5)} />

      {/* Desktop (≥1024px): 9 cols carousel + 3 cols ad — same as AR */}
      <div className="en-hero-desktop-new">
        <div className="en-hero-desktop-grid">
          <div className="en-hero-desktop-grid__carousel">
            <EnHeroDesktopCarousel items={items.slice(0, 5)} />
          </div>
          <div className="en-hero-desktop-grid__ad">
            <AdZone zone="aalan_kbyr_asfl_alhyrw_1410" className="en-hero-ad" />
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
