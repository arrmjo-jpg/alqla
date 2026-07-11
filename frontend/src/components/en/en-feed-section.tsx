import Link from 'next/link';

import type { FeedItem } from '@/lib/feed';
import { enRelative, enUrl } from '@/lib/en';

// Fork of components/articles/blocks/feed-section.tsx + article-card.tsx — identical structure:
// 3-item minimum threshold (hides below it, same as AR), 2/3/4-col responsive grid, same card
// shape (16:9 image, extrabold 2-line title, opinion-only subtitle, relative time). English copy,
// accent bar mirrored to the LTR-native left edge.
export function EnFeedSection({
  title,
  items,
  id,
  cols = 'responsive',
  minItems = 3,
}: {
  title: string;
  items: FeedItem[];
  id?: string;
  /** 'responsive' (2/3/4, default — related/category/most-read) or fixed 2 (AR's columnist grid: sm:grid-cols-2, never wider). */
  cols?: 'responsive' | 2;
  /** AR's shared FeedSection hides below 3 items; the columnist grid is a separate, bespoke
   *  block in the opinion template that only checks length > 0 — pass minItems={1} for that case. */
  minItems?: number;
}) {
  if (items.length < minItems) return null;

  return (
    <section className="en-feed-section" aria-labelledby={id}>
      {title && (
        <h2 id={id} className="en-feed-section__title">{title}</h2>
      )}

      <div className={cols === 2 ? 'en-feed-section__grid en-feed-section__grid--2' : 'en-feed-section__grid'}>
        {items.map((item) => (
          <article key={item.href} className="en-feed-card">
            <Link href={enUrl(item.href)} className="en-feed-card__figure">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- performance list image
                <img src={item.image} alt={item.imageAlt ?? item.title} loading="lazy" decoding="async" />
              ) : (
                <div className="en-feed-card__figure-empty" aria-hidden />
              )}
            </Link>
            <div className="en-feed-card__body">
              <h3 className="en-feed-card__title">
                <Link href={enUrl(item.href)}>{item.title}</Link>
              </h3>
              {item.type === 'opinion' && item.subtitle && (
                <p className="en-feed-card__subtitle">{item.subtitle}</p>
              )}
              {item.publishedAt && (
                <time dateTime={item.publishedAt} className="en-feed-card__time">{enRelative(item.publishedAt)}</time>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
