import Link from 'next/link';

import { EnAvatar } from '@/components/en/en-avatar';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { enBadgeLabel, enDate, enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Premium newspaper card with editorial variants. Consumes the shared FeedItem
// (locale-aware data layer) and only adapts presentation + English hrefs/labels.
type Variant = 'hero' | 'feature' | 'standard' | 'list' | 'compact';

function Kicker({ item, opinion }: { item: FeedItem; opinion?: boolean }) {
  if (opinion) return <span className="en-kicker en-kicker--opinion">Opinion</span>;
  if (!item.category) return null;
  const label = <span className="en-kicker">{item.category}</span>;
  return item.categoryHref ? (
    <Link href={enUrl(item.categoryHref)} className="en-headline-link">{label}</Link>
  ) : (
    label
  );
}

// Byline-forward treatment for opinion pieces — the author leads, not the topic.
function OpinionByline({ item }: { item: FeedItem }) {
  if (!item.author?.name) return null;
  return (
    <div className="en-opinion-byline">
      <EnAvatar name={item.author.name} src={item.author.avatar} size={30} />
      <span className="en-opinion-byline-name">{item.author.name}</span>
    </div>
  );
}

function Badge({ item }: { item: FeedItem }) {
  if (!item.badge) return null;
  return <span className={`en-badge en-badge--${item.badge.kind}`}>{enBadgeLabel(item.badge.kind)}</span>;
}

function Meta({ item, relative, hideAuthor }: { item: FeedItem; relative?: boolean; hideAuthor?: boolean }) {
  const date = relative ? enRelative(item.publishedAt) : enDate(item.publishedAt);
  const showAuthor = !hideAuthor && item.author?.name;
  if (!showAuthor && !date) return null;
  return (
    <div className="en-article-meta-row en-card__meta">
      {showAuthor && <span>By {item.author!.name}</span>}
      {showAuthor && date && <span className="dot" aria-hidden />}
      {date && <time dateTime={item.publishedAt ?? undefined}>{date}</time>}
    </div>
  );
}

export function EnArticleCard({ item, variant = 'standard' }: { item: FeedItem; variant?: Variant }) {
  const href = enUrl(item.href);
  const isOpinion = item.type === 'opinion';

  if (variant === 'compact') {
    return (
      <article className="en-card">
        <Kicker item={item} opinion={isOpinion} />
        <h3 className="en-h3 en-clamp-3" style={{ marginTop: 4, fontSize: '1.02rem' }}>
          <Link href={href} className="en-headline-link">{item.title}</Link>
        </h3>
        <Meta item={item} relative />
      </article>
    );
  }

  if (variant === 'list') {
    return (
      <article className="en-card" style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <Link href={href} className="en-figure en-ratio-4-3" style={{ flex: '0 0 118px', width: 118 }}>
          <OptimizedImage cover={item.cover} src={item.image} alt={item.imageAlt} sizes="120px" />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker item={item} opinion={isOpinion} />
          <h3 className="en-h3 en-clamp-3" style={{ marginTop: 4, fontSize: '1.05rem' }}>
            <Link href={href} className="en-headline-link">{item.title}</Link>
          </h3>
          <Meta item={item} relative />
        </div>
      </article>
    );
  }

  if (variant === 'hero') {
    return (
      <article className={isOpinion ? 'en-card en-card--opinion' : 'en-card'}>
        <Link href={href} className="en-figure en-ratio-3-2">
          <Badge item={item} />
          <OptimizedImage cover={item.cover} src={item.image} alt={item.imageAlt} priority sizes="(max-width: 1024px) 100vw, 62vw" />
        </Link>
        <div className="en-card__body">
          <Kicker item={item} opinion={isOpinion} />
          {isOpinion && <OpinionByline item={item} />}
          <h2 className="en-h1 en-clamp-3" style={{ marginTop: 8 }}>
            <Link href={href} className="en-headline-link">{item.title}</Link>
          </h2>
          {item.excerpt && <p className="en-lead en-clamp-3" style={{ marginTop: 12 }}>{item.excerpt}</p>}
          <Meta item={item} hideAuthor={isOpinion} />
        </div>
      </article>
    );
  }

  if (variant === 'feature') {
    return (
      <article className={isOpinion ? 'en-card en-card--opinion' : 'en-card'}>
        <Link href={href} className="en-figure en-ratio-16-9">
          <Badge item={item} />
          <OptimizedImage cover={item.cover} src={item.image} alt={item.imageAlt} sizes="(max-width: 768px) 100vw, 40vw" />
        </Link>
        <div className="en-card__body">
          <Kicker item={item} opinion={isOpinion} />
          {isOpinion && <OpinionByline item={item} />}
          <h2 className="en-h2 en-clamp-3" style={{ marginTop: 6 }}>
            <Link href={href} className="en-headline-link">{item.title}</Link>
          </h2>
          {item.excerpt && <p className="en-card__excerpt en-clamp-2">{item.excerpt}</p>}
          <Meta item={item} hideAuthor={isOpinion} />
        </div>
      </article>
    );
  }

  // standard
  return (
    <article className={isOpinion ? 'en-card en-card--opinion' : 'en-card'}>
      <Link href={href} className="en-figure en-ratio-16-9">
        <Badge item={item} />
        <OptimizedImage cover={item.cover} src={item.image} alt={item.imageAlt} sizes="(max-width: 768px) 50vw, 25vw" />
      </Link>
      <div className="en-card__body">
        <Kicker item={item} opinion={isOpinion} />
        {isOpinion && <OpinionByline item={item} />}
        <h3 className="en-h3 en-clamp-3" style={{ marginTop: 6 }}>
          <Link href={href} className="en-headline-link">{item.title}</Link>
        </h3>
        <Meta item={item} relative hideAuthor={isOpinion} />
      </div>
    </article>
  );
}
