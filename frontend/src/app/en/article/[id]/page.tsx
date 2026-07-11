import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { EnArticleBody } from '@/components/en/en-article-body';
import { EnArticleHero } from '@/components/en/en-article-hero';
import { EnArticleLiveUpdates } from '@/components/en/en-article-live-updates';
import { EnArticleMetadata } from '@/components/en/en-article-metadata';
import { EnBreadcrumb } from '@/components/en/en-breadcrumb';
import { EnCommentSection } from '@/components/en/en-comment-section';
import { EnFeedSection } from '@/components/en/en-feed-section';
import { EnMobileShareBar, EnStickyShareSidebar } from '@/components/en/en-share-tools';
import { EnOpinionAuthorCard } from '@/components/en/en-opinion-author-card';
import { EnSubscribeBoxSection } from '@/components/en/en-subscribe-box';
import { EnTableOfContents } from '@/components/en/en-table-of-contents';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { ReadingProgress } from '@/components/reading/reading-progress';
import { AdZone } from '@/components/ads/ad-zone';
import { ViewBeacon } from '@/components/engagement/view-beacon';
import { LivePulse } from '@/components/ui/live-pulse';
import { articleSeoToMetadata, getArticle, getLiveUpdates, type LiveUpdateItem } from '@/lib/articles';
import { getArticleMetrics } from '@/lib/engagement';
import { env } from '@/lib/env';
import {
  getAuthorArticles,
  getCategoryFeed,
  getEditorsPickFeed,
  getLatestFeed,
  getMostReadFeed,
  getTagFeed,
  type FeedItem,
} from '@/lib/feed';
import { extractHeadings } from '@/lib/reading';
import { getTtsConfig } from '@/lib/tts';

// English article detail page — structural/behavioral mirror of (site)/article/[id]/page.tsx:
// same 3-col grid (share rail / main / sidebar), same ad zones, same sidebar news widget, same
// feed sections (related / same-category / most-read), same comments/subscribe placement. Arabic
// is the functional reference; only the visual identity (typeface/colors/copy) changes here.
export const revalidate = 21600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id, 'en');
  if (!article) return { title: 'Article' };
  return articleSeoToMetadata(article, `${env.siteUrl}/en/article/${id}`);
}

export default async function EnArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id, 'en');
  if (!article) notFound();

  const canonicalId = String(article.id);
  if (canonicalId !== id) {
    permanentRedirect(`/en/article/${canonicalId}`);
  }

  const slug = canonicalId;
  const authorId = article.author?.id ?? null;
  const isOpinion = article.type === 'opinion';
  const isLive = article.type === 'live';

  const [
    metrics,
    liveUpdates,
    categoryFeed,
    mostReadFeed,
    tagFeed,
    editorsPickFeed,
    latestFeed,
    columnistArticles,
    ttsConfig,
  ] = await Promise.all([
    getArticleMetrics(article.id),
    isLive ? getLiveUpdates(slug, 'en') : Promise.resolve<LiveUpdateItem[]>([]),
    article.primaryCategory ? getCategoryFeed(article.primaryCategory.slug, 5, 'en') : Promise.resolve<FeedItem[]>([]),
    getMostReadFeed(5, 'en'),
    article.tags.length > 0 ? getTagFeed(article.tags[0], 5, 'en') : Promise.resolve<FeedItem[]>([]),
    getEditorsPickFeed(5, 'en'),
    getLatestFeed('en'),
    isOpinion && authorId ? getAuthorArticles(authorId, 4, 'en', 'opinion') : Promise.resolve<FeedItem[]>([]),
    getTtsConfig(),
  ]);

  const { html, headings } = extractHeadings(article.contentHtml);
  const ttsEnabled = ttsConfig?.enabled ?? false;
  const shareUrl = `${env.siteUrl}${article.href}`;

  const filterCurrent = (items: FeedItem[]) => items.filter((it) => it.href !== article.href);

  const cleanCategory = filterCurrent(categoryFeed).slice(0, 4);
  const cleanMostRead = filterCurrent(mostReadFeed).slice(0, 4);
  const cleanColumnist = filterCurrent(columnistArticles).slice(0, 4);

  // Related fallback chain: tag -> category -> editor's picks -> latest (same order as AR).
  let relatedRaw = filterCurrent(tagFeed);
  let relatedTitle = 'Related Articles';
  if (relatedRaw.length < 3) {
    relatedRaw = filterCurrent(categoryFeed);
    relatedTitle = 'Selected Topics';
  }
  if (relatedRaw.length < 3) {
    relatedRaw = filterCurrent(editorsPickFeed);
    relatedTitle = 'Editor’s Picks';
  }
  if (relatedRaw.length < 3) {
    relatedRaw = filterCurrent(latestFeed);
    relatedTitle = 'Latest News';
  }
  const cleanRelated = relatedRaw.slice(0, 4);

  const jsonLd = [article.seo?.structured_data, article.seo?.breadcrumbs]
    .filter((x): x is object => Boolean(x) && typeof x === 'object')
    .map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c'));

  const shareProps = { articleId: article.id, url: shareUrl, title: article.title, initialMetrics: metrics };
  const cover = article.cover;

  return (
    <div className="en-container">
      <ViewBeacon type="article" id={article.id} />
      <ReadingProgress targetId="en-article-content" />

      <div className="en-article-grid">
        {/* Share rail — desktop only */}
        <aside className="en-article-grid__rail">
          <EnStickyShareSidebar {...shareProps} />
        </aside>

        {/* Main column */}
        <main className="en-article-grid__main">
          <EnBreadcrumb category={article.primaryCategory} title={article.title} articleUrl={article.href} />

          {isOpinion ? (
            <div style={{ marginTop: 12 }}>
              {/* Opinion template: flags row, title, metadata, floated columnist card + body */}
              <OpinionFlags isLive={isLive} breaking={article.flags.breaking} featured={article.flags.featured} />

              <h1 className="en-h1" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.5 }}>{article.title}</h1>
              {article.subtitle && <h2 className="en-h2" style={{ fontSize: 16, fontWeight: 700, color: 'var(--en-primary)', marginTop: 8, lineHeight: 1.5 }}>{article.subtitle}</h2>}

              <EnArticleMetadata publishedAt={article.publishedAt} readingTime={article.readingTime} />
              <EnMobileShareBar {...shareProps} ttsEnabled={ttsEnabled} />

              {article.author?.name ? (
                <div className="en-opinion-body" style={{ marginTop: 16 }}>
                  <div className="en-authorcard-float">
                    <EnOpinionAuthorCard author={article.author} />
                  </div>
                  <EnArticleBody contentHtml={html} excerpt={article.excerpt} />
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <EnArticleBody contentHtml={html} excerpt={article.excerpt} />
                </div>
              )}

              <EnFeedSection
                id="en-columnist-heading"
                title={`More from ${article.author?.name ?? 'this columnist'}`}
                items={cleanColumnist}
                cols={2}
                minItems={1}
              />
            </div>
          ) : (
            <div style={{ marginTop: 4 }}>
              {/* Standard template: metadata, title, reading tools, floated cover + body */}
              <EnArticleMetadata publishedAt={article.publishedAt} readingTime={article.readingTime} />

              <h1 className="en-h1" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4, marginTop: 8 }}>{article.title}</h1>
              {article.subtitle && <h2 className="en-h2" style={{ fontSize: 16, fontWeight: 700, color: 'var(--en-primary)', marginTop: 8, marginBottom: 8, lineHeight: 1.4 }}>{article.subtitle}</h2>}

              <EnMobileShareBar {...shareProps} ttsEnabled={ttsEnabled} />

              <div style={{ marginTop: 8, marginBottom: 24, overflow: 'hidden' }}>
                {cover?.url ? (
                  <EnArticleHero
                    cover={cover}
                    defaultTitle={article.title}
                    layout="float"
                    isLive={isLive}
                    breaking={article.flags.breaking}
                    featured={article.flags.featured}
                    hasVideo={article.hasVideo}
                    videoUrl={article.video[0]?.url}
                  />
                ) : (
                  <OpinionFlags isLive={isLive} breaking={article.flags.breaking} featured={article.flags.featured} />
                )}

                <EnArticleBody contentHtml={html} excerpt={article.excerpt} />
              </div>

              {headings.length >= 2 && (
                <details className="en-toc-mobile">
                  <summary className="en-toc-mobile__summary">Table of Contents</summary>
                  <div className="en-toc-mobile__body">
                    <EnTableOfContents headings={headings} />
                  </div>
                </details>
              )}

              {isLive && liveUpdates.length > 0 && (
                <EnArticleLiveUpdates slug={slug} initial={liveUpdates} />
              )}
            </div>
          )}

          {article.tags.length > 0 && (
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {article.tags.map((t) => (
                <span key={t} className="en-meta" style={{ border: '1px solid var(--en-surface-3)', padding: '4px 12px', borderRadius: 999 }}>#{t}</span>
              ))}
            </div>
          )}

          <AdZone zone="aalan_asfl_alkhbr_rym_1" className="en-adzone" />
          <AdZone zone="aalan_asfl_alkhbr_rym_2" className="en-adzone" />

          <EnCommentSection slug={slug} enabled={article.commentsEnabled} />

          <EnFeedSection id="en-related-heading" title={relatedTitle} items={cleanRelated} />
          {article.primaryCategory && (
            <EnFeedSection id="en-category-heading" title={`More in ${article.primaryCategory.name}`} items={cleanCategory} />
          )}
          <EnFeedSection id="en-mostread-heading" title="Most Read" items={cleanMostRead} />

          <EnSubscribeBoxSection />
        </main>

        {/* Sidebar — desktop only */}
        <aside className="en-article-grid__sidebar">
          <div className="en-article-grid__sidebar-inner">
            {headings.length >= 2 && (
              <div style={{ border: '1px solid var(--en-line)', background: 'var(--en-paper)', padding: 16 }}>
                <EnTableOfContents headings={headings} />
              </div>
            )}
            <ReadingSidebar locale="en" />
          </div>
        </aside>
      </div>

      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />
      ))}
    </div>
  );
}

function OpinionFlags({ isLive, breaking, featured }: { isLive: boolean; breaking: boolean; featured: boolean }) {
  if (!isLive && !breaking && !featured) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {isLive && (
        <span className="en-badge en-badge--live" style={{ position: 'static' }}><LivePulse />Live Now</span>
      )}
      {breaking && <span className="en-badge en-badge--breaking" style={{ position: 'static' }}>Breaking</span>}
      {featured && !isLive && <span className="en-badge en-badge--live" style={{ position: 'static' }}>Special Coverage</span>}
    </div>
  );
}
