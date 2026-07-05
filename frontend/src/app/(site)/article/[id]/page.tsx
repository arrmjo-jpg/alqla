import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { AdZone } from '@/components/ads/ad-zone';
import { ArticleDetailView } from '@/components/articles/article-detail';
import { CommentSection } from '@/components/articles/comments/comment-section';
import { ViewBeacon } from '@/components/engagement/view-beacon';
import { Container } from '@/components/layout/container';
import { ReadingProgress } from '@/components/reading/reading-progress';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { SubscribeBoxSection } from '@/components/public-forms/subscribe-box-section';
import { TableOfContents } from '@/components/reading/table-of-contents';

// Import our presentation blocks
import { ArticleBreadcrumb } from '@/components/articles/blocks/breadcrumb';
import { FeedSection } from '@/components/articles/blocks/feed-section';
import { StickyShareSidebar } from '@/components/articles/blocks/reading-tools';

import { articleSeoToMetadata, getArticle, getLiveUpdates, type LiveUpdateItem } from '@/lib/articles';
import { getArticleMetrics } from '@/lib/engagement';
import { env } from '@/lib/env';
import { getCategoryFeed, getMostReadFeed, getEditorsPickFeed, getLatestFeed, getAuthorArticles, getTagFeed, type FeedItem } from '@/lib/feed';
import { extractHeadings } from '@/lib/reading';
import { getTtsConfig } from '@/lib/tts';

export const revalidate = 21600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { title: 'مقال' };
  return articleSeoToMetadata(article, `${env.siteUrl}/article/${id}`);
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const article = await getArticle(id);
  if (!article) notFound(); 

  const canonicalId = String(article.id);
  if (canonicalId !== id) {
    permanentRedirect(`/article/${canonicalId}`);
  }

  const slug = id;
  const authorId = article.author?.id;

  // Parallel server-side fetch of all required blocks and feeds
  const [
    metrics,
    liveUpdates,
    categoryFeed,
    mostReadFeed,
    tagFeed,
    editorsPickFeed,
    latestFeed,
    authorArticles,
    ttsConfig,
  ] = await Promise.all([
    getArticleMetrics(article.id),
    article.type === 'live' ? getLiveUpdates(slug) : Promise.resolve<LiveUpdateItem[]>([]),
    article.primaryCategory ? getCategoryFeed(article.primaryCategory.slug, 5) : Promise.resolve<FeedItem[]>([]),
    getMostReadFeed('ar', 5),
    article.tags.length > 0 ? getTagFeed(article.tags[0], 5) : Promise.resolve<FeedItem[]>([]),
    getEditorsPickFeed('ar', 5),
    getLatestFeed('ar'),
    authorId ? getAuthorArticles(authorId, 2) : Promise.resolve<FeedItem[]>([]),
    getTtsConfig(),
  ]);

  const { html, headings } = extractHeadings(article.contentHtml);
  const ttsEnabled = ttsConfig?.enabled ?? false;
  const shareUrl = `${env.siteUrl}${article.href}`;

  // Filter current article from all lists
  const filterCurrent = (items: FeedItem[]) => items.filter((it) => it.href !== article.href);

  const cleanCategory = filterCurrent(categoryFeed).slice(0, 4);
  const cleanMostRead = filterCurrent(mostReadFeed).slice(0, 4);
  
  // Related news fallback chain: Tag -> Category -> Editors' Picks -> Latest
  let relatedNewsRaw = filterCurrent(tagFeed);
  let relatedTitle = 'أخبار ذات صلة';

  if (relatedNewsRaw.length < 3) {
    relatedNewsRaw = filterCurrent(categoryFeed);
    relatedTitle = 'مواضيع مختارة';
  }
  if (relatedNewsRaw.length < 3) {
    relatedNewsRaw = filterCurrent(editorsPickFeed);
    relatedTitle = 'اخترنا لكم';
  }
  if (relatedNewsRaw.length < 3) {
    relatedNewsRaw = filterCurrent(latestFeed);
    relatedTitle = 'آخر الأخبار';
  }

  const cleanRelated = relatedNewsRaw.slice(0, 4);

  const jsonLd = [article.seo?.structured_data, article.seo?.breadcrumbs]
    .filter((x): x is object => Boolean(x) && typeof x === 'object')
    .map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c'));

  return (
    <Container className="py-6 sm:py-8">
      {/* View Beacon tracker */}
      <ViewBeacon type="article" id={article.id} />
      
      {/* Viewport top progress bar */}
      <ReadingProgress targetId="article-content" />

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* 1. Right Share Rail (First in RTL DOM -> Far Right) */}
        <aside className="hidden lg:col-span-1 lg:block print:hidden">
          <StickyShareSidebar
            articleId={article.id}
            url={shareUrl}
            title={article.title}
            initialMetrics={metrics}
          />
        </aside>

        {/* 2. Center Main Article Column */}
        <main className="min-w-0 lg:col-span-8 space-y-3">
          {/* visual Breadcrumb inside the main column flow to align sidebar to the top of the page */}
          <ArticleBreadcrumb
            category={article.primaryCategory}
            title={article.title}
            articleUrl={article.href}
          />

          <ArticleDetailView
            article={article}
            slug={slug}
            metrics={metrics}
            shareUrl={shareUrl}
            liveUpdates={liveUpdates}
            contentHtml={html}
            ttsEnabled={ttsEnabled}
            latestAuthorArticles={authorArticles}
            headings={headings}
          />

          {/* Ad zones */}
          <AdZone zone="aalan_asfl_alkhbr_rym_1" className="mt-8" />
          <AdZone zone="aalan_asfl_alkhbr_rym_2" className="mt-6" />

          {/* WhatsApp Box */}
          <SubscribeBoxSection />

          {/* Comment section */}
          <CommentSection slug={slug} enabled={article.commentsEnabled} />

          {/* Feeds sections */}
          <FeedSection
            id="related-news-heading"
            title={relatedTitle}
            items={cleanRelated}
          />
          
          {article.primaryCategory && (
            <FeedSection
              id="same-category-heading"
              title={`المزيد في قسم ${article.primaryCategory.name}`}
              items={cleanCategory}
            />
          )}

          <FeedSection
            id="most-read-heading"
            title="الأكثر قراءة"
            items={cleanMostRead}
          />
        </main>

        {/* 3. Left Sidebar Column (Third in RTL DOM -> Far Left) */}
        <aside className="hidden lg:col-span-3 lg:block print:hidden">
          <div className="sticky top-24 space-y-6">
            {/* Table of contents scroll-spy (Only for desktop, if >= 2 headings) */}
            {headings.length >= 2 && (
              <div className="border border-border bg-surface p-4">
                <TableOfContents headings={headings} />
              </div>
            )}
            
            <ReadingSidebar />
          </div>
        </aside>
      </div>

      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />
      ))}
    </Container>
  );
}
