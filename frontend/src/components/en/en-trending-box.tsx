import { Flame } from 'lucide-react';
import Link from 'next/link';

import { LivePulse } from '@/components/ui/live-pulse';
import { enBadgeLabel, enUrl } from '@/lib/en';
import { getEditorsPickFeed } from '@/lib/feed';

// Fork of the TrendingBox portion of components/home/trending-latest-mostread.tsx — same
// red-gradient ranked-list design (editors_pick data), English strings. The sibling
// WritersRow columns (categoryId 20/57, VIP writer carousels) are AR-only categories with no
// EN equivalent (confirmed via the categories API) — out of scope, "Trending" alone was asked for.
export async function EnTrendingBox() {
  const items = (await getEditorsPickFeed(5, 'en')).slice(0, 5);
  if (items.length === 0) return null;

  return (
    <div className="en-trending">
      <div className="en-trending__head">
        <span className="en-trending__icon" aria-hidden>
          <Flame size={16} color="#f4c22b" />
        </span>
        <h2 className="en-trending__title">Trending</h2>
      </div>
      <div className="en-trending__list">
        {items.map((item, i) => (
          <Link key={item.id} href={enUrl(item.href)} className="en-trending__row">
            <div className="en-trending__text">
              {item.badge && (
                <span className="en-trending__tag">
                  {item.badge.kind === 'live' && <LivePulse />}
                  {enBadgeLabel(item.badge.kind)}
                </span>
              )}
              <h3 className="en-trending__row-title">{item.title}</h3>
            </div>
            <div className="en-trending__thumb-wrap">
              <div className="en-trending__thumb">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- performance list image
                  <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
                ) : (
                  <div className="en-trending__thumb-empty" aria-hidden />
                )}
              </div>
              <span className="en-trending__rank">{i + 1}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
