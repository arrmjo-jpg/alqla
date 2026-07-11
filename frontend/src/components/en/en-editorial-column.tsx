import Link from 'next/link';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of WritersRow's "Premium Light Design" card (components/home/trending-latest-mostread.tsx)
// — same white rounded card with a red top accent, title+"More" header, and compact thumb+title
// rows. AR has no single 3-column block combining Articles/Most Popular/Latest News (see
// [[english-frontend-phase1]] memory), so this reuses AR's existing boxed-list-column visual
// language for all three, one shared shell per column, instead of inventing a new design.
export function EnEditorialColumn({
  title,
  items,
  viewAllHref,
  showRank,
}: {
  title: string;
  items: FeedItem[];
  viewAllHref?: string | null;
  showRank?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="en-editorial-col">
      <div className="en-editorial-col__head">
        <h2 className="en-editorial-col__title">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="en-editorial-col__more">
            More
          </Link>
        )}
      </div>

      <div className="en-editorial-col__list">
        {items.map((item, i) => (
          <Link key={item.id} href={enUrl(item.href)} className="en-editorial-col__row">
            <div className="en-editorial-col__text">
              <h3 className="en-editorial-col__row-title">
                {showRank && <span className="en-editorial-col__rank">{i + 1}.</span>}
                {item.title}
              </h3>
              {item.publishedAt && (
                <time dateTime={item.publishedAt} className="en-editorial-col__date">
                  {enRelative(item.publishedAt)}
                </time>
              )}
            </div>

            <div className="en-editorial-col__thumb">
              <OptimizedImage
                cover={item.cover}
                src={item.image}
                alt={item.imageAlt}
                sizes="90px"
                className="en-editorial-col__img"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
