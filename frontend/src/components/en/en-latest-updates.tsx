import Link from 'next/link';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enUrl } from '@/lib/en';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';

import { EnFeedBadge } from './en-feed-badge';
import { EnSectionHeader, EnSectionMore } from './en-section-header';

// Fork of components/home/latest-updates.tsx ("Local News" on AR's homepage, categoryId=2) —
// identical category-by-id lookup + lead/grid split, English strings. Hides when the category
// doesn't exist for this locale or has no articles (same defensive behavior as AR — confirmed
// via curl that EN has no category id=2 yet; renders automatically once one exists, no code change).
export async function EnLatestUpdates({ categoryId, fallbackTitle }: { categoryId: number; fallbackTitle?: string }) {
  const category = await getCategoryById(categoryId, 'en');
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, 9, 'en');
  if (items.length === 0) return null;

  const title = category.name.trim() || fallbackTitle || 'Local News';
  const moreHref = enUrl(`/category-${category.id}/${encodeURIComponent(category.slug)}`);
  const [lead, ...rest] = items;
  const grid = rest.slice(0, 8);

  return (
    <section className="en-localnews" aria-labelledby="en-local-news-heading">
      <div className="en-container">
        <EnSectionHeader title={title} headingId="en-local-news-heading" href={moreHref} />

        <div className="en-localnews__layout">
          <div className="en-localnews__lead">
            <EnLeadCard item={lead} />
          </div>
          {grid.length > 0 && (
            <ul className="en-localnews__grid">
              {grid.map((item) => (
                <li key={item.id} className="en-localnews__grid-item">
                  <EnListCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <EnSectionMore href={moreHref} />
      </div>
    </section>
  );
}

function EnLeadCard({ item }: { item: FeedItem }) {
  const href = enUrl(item.href);
  return (
    <div className="en-localnews-lead">
      <Link href={href} className="en-localnews-lead__link" aria-label={item.title} />

      <OptimizedImage
        cover={item.cover}
        src={item.image}
        alt={item.imageAlt}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="en-localnews-lead__img"
      />

      <div className="en-localnews-lead__scrim" aria-hidden />

      <EnFeedBadge badge={item.badge} />

      <div className="en-localnews-lead__content">
        <div className="en-localnews-lead__meta">
          {item.category &&
            (item.categoryHref ? (
              <Link href={enUrl(item.categoryHref)} className="en-hero-chip">{item.category}</Link>
            ) : (
              <span className="en-hero-chip">{item.category}</span>
            ))}
        </div>
        <h3 className="en-localnews-lead__title">{item.title}</h3>
      </div>
    </div>
  );
}

function EnListCard({ item }: { item: FeedItem }) {
  const href = enUrl(item.href);
  return (
    <div className="en-localnews-item">
      <Link href={href} className="en-localnews-item__link" aria-label={item.title} />

      <div className="en-localnews-item__thumb">
        <OptimizedImage cover={item.cover} src={item.image} alt={item.imageAlt} sizes="84px" className="en-localnews-item__img" />
      </div>

      <div className="en-localnews-item__body">
        <h3 className="en-localnews-item__title">{item.title}</h3>
        {item.category &&
          (item.categoryHref ? (
            <Link href={enUrl(item.categoryHref)} className="en-localnews-item__cat">{item.category}</Link>
          ) : (
            <span className="en-localnews-item__cat">{item.category}</span>
          ))}
      </div>
    </div>
  );
}
