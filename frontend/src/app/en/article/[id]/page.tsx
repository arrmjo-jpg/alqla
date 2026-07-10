import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import { EnArticleCard } from '@/components/en/en-article-card';
import { EnAuthorCard } from '@/components/en/en-author-card';
import { EnAvatar } from '@/components/en/en-avatar';
import { EnBreadcrumb } from '@/components/en/en-breadcrumb';
import { EnReadingTools } from '@/components/en/en-reading-tools';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { ViewBeacon } from '@/components/engagement/view-beacon';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { articleSeoToMetadata, getArticle } from '@/lib/articles';
import { enAuthorUrl, enCategoryUrl, enDate, readingLabel } from '@/lib/en';
import { env } from '@/lib/env';
import {
  getCategoryFeed,
  getEditorsPickFeed,
  getLatestFeed,
  getMostReadFeed,
  getTagFeed,
  type FeedItem,
} from '@/lib/feed';

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id, 'en');
  if (!article) return { title: 'Article' };
  return articleSeoToMetadata(article, `${env.siteUrl}/en/article/${id}`);
}

export default async function EnArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id, 'en');
  if (!article) notFound();

  // Canonical redirect to the article's real id (English path).
  const canonicalId = String(article.id);
  if (canonicalId !== id) {
    permanentRedirect(`/en/article/${canonicalId}`);
  }

  const authorId = article.author?.id ?? null;
  const [categoryFeed, tagFeed, editors, latest, mostRead] = await Promise.all([
    article.primaryCategory
      ? getCategoryFeed(article.primaryCategory.slug, 5, 'en')
      : Promise.resolve<FeedItem[]>([]),
    article.tags.length ? getTagFeed(article.tags[0], 5, 'en') : Promise.resolve<FeedItem[]>([]),
    getEditorsPickFeed(5, 'en'),
    getLatestFeed('en'),
    getMostReadFeed(5, 'en'),
  ]);

  const notCurrent = (items: FeedItem[]) => items.filter((it) => it.href !== article.href);
  // Related fallback chain: tag → category → editor's picks → latest.
  let related = notCurrent(tagFeed);
  if (related.length < 3) related = notCurrent(categoryFeed);
  if (related.length < 3) related = notCurrent(editors);
  if (related.length < 3) related = notCurrent(latest);
  related = related.slice(0, 4);
  const mostReadClean = notCurrent(mostRead).slice(0, 4);

  const jsonLd = [article.seo?.structured_data, article.seo?.breadcrumbs]
    .filter((x): x is object => Boolean(x) && typeof x === 'object')
    .map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c'));

  const dateStr = enDate(article.publishedAt);
  const cover = article.cover;

  return (
    <div className="en-container en-article-wrap">
      <ViewBeacon type="article" id={article.id} />

      <article>
        <header className="en-article-header">
          <EnBreadcrumb category={article.primaryCategory} />

          {article.primaryCategory && (
            <div style={{ marginTop: 16 }}>
              <Link href={enCategoryUrl(article.primaryCategory.id, article.primaryCategory.slug)}>
                <span className="en-kicker" style={{ fontSize: '0.78rem' }}>
                  {article.primaryCategory.name}
                </span>
              </Link>
            </div>
          )}

          <h1 className="en-display" style={{ marginTop: 10, fontSize: 'clamp(2rem, 3.6vw, 3.1rem)' }}>
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="en-lead" style={{ marginTop: 16 }}>{article.subtitle}</p>
          )}

          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, flexWrap: 'wrap' }}
          >
            {article.author?.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <EnAvatar name={article.author.name} src={article.author.avatar} size={44} />
                <div>
                  <div className="en-meta" style={{ color: 'var(--en-ink)', fontWeight: 600 }}>
                    {authorId ? (
                      <Link href={enAuthorUrl(authorId)} className="en-headline-link">
                        {article.author.name}
                      </Link>
                    ) : (
                      article.author.name
                    )}
                  </div>
                  {article.author.role && <div className="en-caption">{article.author.role}</div>}
                </div>
              </div>
            )}
            <div className="en-article-meta-row" style={{ marginLeft: 'auto' }}>
              {dateStr && <time dateTime={article.publishedAt ?? undefined}>{dateStr}</time>}
              {dateStr && <span className="dot" aria-hidden />}
              <span>{readingLabel(article.readingTime)}</span>
              {article.viewsCount > 0 && (
                <>
                  <span className="dot" aria-hidden />
                  <span>{article.viewsCount.toLocaleString('en-US')} views</span>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              borderTop: '1px solid var(--en-line)',
              borderBottom: '1px solid var(--en-line)',
              padding: '12px 0',
            }}
          >
            <span className="en-meta">Share this story</span>
            <EnReadingTools title={article.title} />
          </div>
        </header>

        {cover && (
          <figure style={{ margin: '28px auto 0', maxWidth: 960 }}>
            <div className="en-figure en-ratio-16-9">
              <OptimizedImage
                cover={{ url: cover.url, thumb: cover.thumb, medium: cover.medium, alt: cover.alt }}
                src={cover.url}
                alt={cover.alt ?? article.title}
                priority
                sizes="(max-width: 1000px) 100vw, 960px"
              />
            </div>
            {(cover.caption || cover.photographer || cover.source) && (
              <figcaption className="en-figcaption">
                {cover.caption}
                {(cover.photographer || cover.source) && (
                  <>
                    {cover.caption ? ' · ' : ''}
                    <b>{[cover.photographer, cover.source].filter(Boolean).join(' / ')}</b>
                  </>
                )}
              </figcaption>
            )}
          </figure>
        )}

        <div
          className="en-prose"
          style={{ marginTop: 32 }}
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {article.tags.length > 0 && (
          <div
            style={{ maxWidth: 720, margin: '32px auto 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            {article.tags.map((t) => (
              <span
                key={t}
                className="en-meta"
                style={{ border: '1px solid var(--en-line-strong)', padding: '4px 12px', borderRadius: 999 }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {article.author?.name && (
          <div style={{ maxWidth: 720, margin: '36px auto 0' }}>
            <EnAuthorCard author={article.author} />
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="en-article-related" aria-label="Related articles">
          <EnSectionHeading title="Related Articles" />
          <div className="en-grid en-grid--4">
            {related.map((it) => (
              <EnArticleCard key={it.id} item={it} variant="standard" />
            ))}
          </div>
        </section>
      )}

      {mostReadClean.length > 0 && (
        <section className="en-section" aria-label="Most Read">
          <EnSectionHeading title="Most Read" />
          <div className="en-grid en-grid--4">
            {mostReadClean.map((it) => (
              <EnArticleCard key={it.id} item={it} variant="standard" />
            ))}
          </div>
        </section>
      )}

      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />
      ))}
    </div>
  );
}
