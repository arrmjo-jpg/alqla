import Link from 'next/link';

import { TripleChevron } from '@/components/ui/section-more-link';
import { enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of components/home/latest-header-list.tsx — same "Latest Updates" list (is_header flag,
// site-wide) beside the hero carousel, English labels + enUrl()-prefixed hrefs.
export function EnLatestHeaderList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="en-latest-header-list">
      <div className="en-latest-header-list__bar" aria-hidden />

      <div className="en-latest-header-list__head">
        <h2 className="en-latest-header-list__title">Latest Updates</h2>
        <Link href={enUrl('/latest')} className="en-latest-header-list__more">
          <span>More</span>
          <TripleChevron className="en-latest-header-list__more-icon" />
        </Link>
      </div>

      <div className="en-latest-header-list__items">
        {items.slice(0, 6).map((item) => (
          <Link key={item.id} href={enUrl(item.href)} className="en-latest-header-list__item">
            <div className="en-latest-header-list__item-text">
              <h3 className="en-latest-header-list__item-title">{item.title}</h3>
              {item.category && <span className="en-latest-header-list__item-cat">{item.category}</span>}
            </div>

            <div className="en-latest-header-list__item-photo">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
              ) : (
                <div className="en-latest-header-list__item-photo-empty" aria-hidden />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
