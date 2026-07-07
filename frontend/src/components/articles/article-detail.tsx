import { PenLine, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { type ArticleDetail, type LiveUpdateItem } from '@/lib/articles';
import type { EngagementMetrics } from '@/lib/engagement';
import type { FeedItem } from '@/lib/feed';
import type { Heading } from '@/lib/reading';
import { LivePulse } from '@/components/ui/live-pulse';
import { SiteLogo } from '@/components/branding/site-logo';

// Import our presentation blocks and design tokens
import { ArticleHeader } from './blocks/article-header';
import { ArticleMetadata } from './blocks/metadata-row';
import { ReadingToolsBar } from './blocks/reading-tools';
import { ArticleHero } from './blocks/hero-image';
import { ArticleBody } from './blocks/article-body';
import { ArticleCard } from '@/components/articles/article-card';
import { TableOfContents } from '@/components/reading/table-of-contents';
import { editorialTypography, editorialSpacing } from '@/lib/design-tokens';

import { ArticleLiveUpdates } from './article-live-updates';

interface ArticleDetailViewProps {
  article: ArticleDetail;
  slug: string;
  metrics: EngagementMetrics;
  shareUrl: string;
  liveUpdates: LiveUpdateItem[];
  contentHtml?: string;
  ttsEnabled?: boolean;
  latestAuthorArticles?: FeedItem[];
  headings?: Heading[];
}

function translateRole(role: string | null | undefined): string {
  if (!role) return 'كاتب';
  const mapping: Record<string, string> = {
    super_admin: 'مدير النظام',
    editor: 'محرر رئيسي',
    reviewer: 'مراجع المحتوى',
    moderator: 'مشرف القسم',
    social_media_manager: 'مسؤول شبكات التواصل',
    journalist: 'صحفي كاتب',
    contributor: 'مساهم',
    writer: 'كاتب مقال',
  };
  return mapping[role] ?? 'كاتب';
}

export function ArticleDetailView({
  article,
  slug,
  metrics,
  shareUrl,
  liveUpdates,
  contentHtml,
  ttsEnabled = false,
  latestAuthorArticles = [],
  headings = [],
}: ArticleDetailViewProps) {
  const isOpinion = article.type === 'opinion' || article.primaryCategory?.slug === 'opinion';
  const isLive = article.type === 'live';
  
  // Resolve page layouts to exactly TWO main templates: opinion or standard
  const template = isOpinion ? 'opinion' : 'standard';

  const bodyHtml = stripTitleFromHtml(contentHtml ?? article.contentHtml, article.title, article.subtitle);
  const writerHref = article.author?.isWriter && article.author.id ? `/writer/${article.author.id}` : null;

  const cleanExcerpt = (() => {
    if (!article.excerpt) return null;
    const exc = article.excerpt.trim().toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');
    const title = article.title.trim().toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');
    const sub = (article.subtitle || '').trim().toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');
    
    // Check for exact matches
    if (exc === title || exc === sub) return null;
    
    // Check for substring matches (if long enough to avoid false matches)
    if (title.length > 8 && (exc.includes(title) || title.includes(exc))) return null;
    if (sub.length > 8 && (exc.includes(sub) || sub.includes(exc))) return null;
    
    return article.excerpt;
  })();

  return (
    <article className="min-w-0 w-full">
      {/* Print-only Website Header */}
      <div className="hidden print:flex justify-center border-b-2 border-primary pb-4 mb-6">
        <SiteLogo variant="light" className="h-16 w-auto" />
      </div>

      {/* 1. Opinion Template Layout */}
      {template === 'opinion' && (
        <div className="space-y-6">
          {/* Header Block */}
          <ArticleHeader
            title={article.title}
            subtitle={article.subtitle}
            isLive={isLive}
            isOpinion={true}
            breaking={article.flags.breaking}
            featured={article.flags.featured}
          />

          {/* Metadata */}
          <ArticleMetadata
            publishedAt={article.publishedAt}
            readingTime={article.readingTime}
            author={article.author}
          />

          {/* Cover image vs Author avatar top banner */}
          {article.cover && article.cover.url ? (
            <div className="my-6">
              <ArticleHero cover={article.cover} defaultTitle={article.title} layout="full" hasVideo={article.hasVideo} videoUrl={article.video[0]?.url} />
            </div>
          ) : (
            <div className="bg-surface-2 border border-border/80 p-6 my-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 font-sans">
              <div className="size-20 sm:size-24 rounded-full overflow-hidden bg-surface-3 ring-4 ring-background shrink-0 select-none">
                {article.author?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- author avatar
                  <img src={article.author.avatar} alt={article.author.name} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted" aria-hidden>
                    <PenLine className="size-10" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-right">
                <span className={`${editorialTypography.aside} text-primary px-2.5 py-0.5 bg-primary/10 rounded-full inline-block`}>
                  {translateRole(article.author?.role)}
                </span>
                <h2 className="text-xl font-extrabold text-fg mt-2">{article.author?.name}</h2>
                {article.author?.bio && (
                  <p className="text-sm text-muted mt-2 leading-relaxed">{article.author.bio}</p>
                )}
                {writerHref && (
                  <Link href={writerHref} className="text-xs font-bold text-primary mt-3 inline-flex items-center gap-1 hover:underline min-h-[44px]">
                    <span>بروفيل الكاتب ومقالاته</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Reading tools & Content Area */}
          <div className="w-full space-y-6">
            <ReadingToolsBar
              articleId={article.id}
              url={shareUrl}
              title={article.title}
              initialMetrics={metrics}
              ttsEnabled={ttsEnabled}
            />

            <div className={editorialSpacing.readingColumn}>
              <ArticleBody contentHtml={bodyHtml} excerpt={cleanExcerpt} />
            </div>
          </div>

          {/* Latest Columnist Articles */}
          {latestAuthorArticles.length > 0 && (
            <div className="mt-12 border-t border-border pt-8">
              <h3 className={`${editorialTypography.aside} mb-6 block`}>أحدث كتابات الكاتب:</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {latestAuthorArticles.map((art) => (
                  <ArticleCard key={art.href} item={art} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Standard News Template Layout (News, Live updates, and Special coverages) */}
      {template === 'standard' && (
        <div className="space-y-2">
          {/* 1. Metadata Row with top border */}
          <div className="border-t border-border/80 pt-1">
            <ArticleMetadata
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
              author={article.author} // Restored author name inside metadata row
            />
          </div>

          {/* 2. Title with 22px font size */}
          <h1 className="text-[22px] font-extrabold leading-snug text-primary !mt-2 !mb-2 py-0">
            {article.subtitle || article.title}
          </h1>

          {/* 4. Reading tools, Cover Image, and Body */}
          <div className="w-full space-y-2 pt-0">
            <ReadingToolsBar
              articleId={article.id}
              url={shareUrl}
              title={article.title}
              initialMetrics={metrics}
              ttsEnabled={ttsEnabled}
            />

            {/* Body wrapper containing Floated Image and Wrapping paragraphs */}

            <div className="mt-2 mb-6 block overflow-hidden">
              {article.cover && article.cover.url ? (
                <ArticleHero 
                  cover={article.cover} 
                  defaultTitle={article.title} 
                  layout="float" 
                  isLive={isLive}
                  breaking={article.flags.breaking}
                  featured={article.flags.featured}
                  hasVideo={article.hasVideo}
                  videoUrl={article.video[0]?.url}
                />
              ) : (
                /* Badges above the body if there is no cover image */
                (isLive || article.flags.breaking || article.flags.featured) && (
                  <div className="flex flex-wrap gap-1.5 mb-4 justify-start print:hidden">
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-primary">
                        <LivePulse />
                        <span>مباشر الآن</span>
                      </span>
                    )}
                    {article.flags.breaking && (
                      <span className="px-3 py-1 text-xs font-bold text-white bg-[#dc2626] animate-pulse">
                        عاجل
                      </span>
                    )}
                    {article.flags.featured && (
                      <span className="px-3 py-1 text-xs font-bold text-white bg-primary">
                        تغطية خاصة
                      </span>
                    )}
                  </div>
                )
              )}
              
              <ArticleBody contentHtml={bodyHtml} excerpt={cleanExcerpt} />
            </div>

            {/* Collapsible mobile TOC if headings exist */}
            {headings.length >= 2 && (
              <div className="lg:hidden mb-6 border border-border bg-surface-2 p-4 print:hidden">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-fg text-sm list-none select-none">
                    <span>فهرس محتويات المقال</span>
                    <span className="transition-transform duration-200 group-open:rotate-180">
                      <ChevronDown className="size-4 text-muted" />
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <TableOfContents headings={headings} />
                  </div>
                </details>
              </div>
            )}

            {/* Live Updates chronological block */}
            {isLive && liveUpdates.length > 0 && (
              <div className="mb-8 border-t border-border/80 pt-6">
                <ArticleLiveUpdates slug={slug} initial={liveUpdates} />
              </div>
            )}
            {/* Author Card omitted for standard news per public presentation rules */}
          </div>
        </div>
      )}

      {/* Tags Block */}
      {article.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 lg:max-w-[720px] lg:mx-auto lg:pr-14 print:hidden">
          {article.tags.map((t) => (
            <span key={t} className="bg-surface-2 border border-border px-2.5 py-1 text-xs text-muted font-semibold hover:text-primary hover:border-primary transition-colors cursor-pointer select-none">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function stripTitleFromHtml(html: string, title: string, subtitle: string | null): string {
  if (!html) return html;
  
  let currentHtml = html.trim();
  const cleanTitle = title.trim().toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');
  const cleanSub = (subtitle || '').trim().toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');
  const blockSeparatorRegex = /(<\/p>|<br\s*\/?>|<\/div>|<\/h[1-6]>|\n\n)/i;

  for (let i = 0; i < 2; i++) {
    const parts = currentHtml.split(blockSeparatorRegex);
    if (parts.length === 0) break;

    const firstBlock = parts[0];
    const innerText = firstBlock.replace(/<[^>]*>/g, '').trim();
    const cleanInner = innerText.toLowerCase().replace(/[-\s\u200b-\u200d\ufeff]/g, '');

    if (
      cleanInner &&
      (cleanInner === cleanTitle ||
       cleanInner === cleanSub ||
       (cleanTitle.includes(cleanInner) && cleanInner.length > 8) ||
       (cleanInner.includes(cleanTitle) && cleanTitle.length > 8))
    ) {
      const separator = parts[1] || '';
      currentHtml = currentHtml.substring(firstBlock.length + separator.length).trim();
    } else {
      break;
    }
  }
  return currentHtml;
}
