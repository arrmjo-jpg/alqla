import Link from 'next/link';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

import { EnFeedBadge } from './en-feed-badge';
import { EnHeroMobileCarousel } from './en-hero-mobile-carousel';

// Fork of components/home/featured-hero.tsx — identical structure: lead card (50%, object-fill,
// 500px desktop height) + 2x2 grid (50%, 250px each) on desktop, EnHeroMobileCarousel below
// 1024px. Data source matches AR exactly: getHomepageFeed(locale).hero (is_featured articles).
export function EnFeaturedHero({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return <EnFeaturedHeroEmpty />;

  const [lead, ...rest] = items;
  const grid = rest.slice(0, 4);

  return (
    <div className="en-container" style={{ paddingBlock: 24 }}>
      <EnHeroMobileCarousel items={items.slice(0, 5)} />

      <div className="en-hero-desktop">
        <div className="en-hero-desktop__lead">
          <EnHeroCard item={lead} variant="lead" priority />
        </div>
        {grid.length > 0 && (
          <div className="en-hero-desktop__grid">
            {grid.map((item) => (
              <EnHeroCard key={item.id} item={item} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EnHeroCard({ item, variant, priority = false }: { item: FeedItem; variant: 'lead' | 'grid'; priority?: boolean }) {
  const isLead = variant === 'lead';
  const href = enUrl(item.href);

  return (
    <div className={isLead ? 'en-herocard en-herocard--lead' : 'en-herocard en-herocard--grid'}>
      <Link href={href} className="en-herocard__link" aria-label={item.title} />

      <OptimizedImage
        cover={item.cover}
        src={item.image}
        alt={item.imageAlt}
        priority={priority}
        sizes={isLead ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 1024px) 100vw, 33vw'}
        className="en-herocard__img"
      />

      <div className="en-herocard__scrim" aria-hidden />

      <EnFeedBadge badge={item.badge} />

      <div className={isLead ? 'en-herocard__content en-herocard__content--lead' : 'en-herocard__content'}>
        <div className="en-herocard__meta">
          {item.category &&
            (item.categoryHref ? (
              <Link href={enUrl(item.categoryHref)} className="en-hero-chip">{item.category}</Link>
            ) : (
              <span className="en-hero-chip">{item.category}</span>
            ))}
          {item.publishedAt && <time dateTime={item.publishedAt} className="en-herocard__time">{enRelative(item.publishedAt)}</time>}
        </div>
        <h3 className={isLead ? 'en-herocard__title en-herocard__title--lead' : 'en-herocard__title'}>{item.title}</h3>
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
