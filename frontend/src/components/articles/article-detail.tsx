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
  const photo = article.cover?.url || article.author?.avatar || null;

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

          {/* Reading tools & Content Area */}
          <div className="w-full space-y-6 pt-4">
            <ReadingToolsBar
              articleId={article.id}
              url={shareUrl}
              title={article.title}
              initialMetrics={metrics}
              ttsEnabled={ttsEnabled}
            />

            <div className={`${editorialSpacing.readingColumn} block overflow-hidden`}>
              {/* الحاوية العائمة على اليسار (الصورة + شريط الكاتب) */}
              <div className="float-none mx-auto w-full max-w-[320px] mb-8 sm:float-left sm:ml-0 sm:mr-8 sm:mb-6 flex flex-col">
                
                {/* الصورة لحالها وبدون صناديق ضخمة */}
                <div className="relative w-full rounded-[16px] overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10 mb-4 bg-surface-2 transition-transform duration-500 hover:scale-[1.02]">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={article.author?.name || 'صورة الكاتب'} className="w-full h-auto object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center text-muted" aria-hidden>
                      <PenLine className="size-16 opacity-30" />
                    </div>
                  )}
                </div>

                {/* أيقونة الكاتب مع اسمه تحته باللون الأحمر الخاص بالموقع */}
                <div className="flex items-center gap-3 w-full rounded-xl bg-gradient-to-br from-primary to-[#a30b13] p-3 shadow-lg ring-1 ring-primary/50">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                    <PenLine className="size-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-0.5">
                      {translateRole(article.author?.role)}
                    </span>
                    {writerHref ? (
                      <Link href={writerHref} className="text-[15px] font-extrabold text-white hover:text-white/80 transition-colors leading-tight truncate">
                        {article.author?.name}
                      </Link>
                    ) : (
                      <span className="text-[15px] font-extrabold text-white leading-tight truncate">
                        {article.author?.name}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* نبذة عن الكاتب (إن وجدت) */}
                {article.author?.bio && (
                  <p className="mt-3 text-[13px] text-muted leading-relaxed text-center px-1">
                    {article.author.bio}
                  </p>
                )}
              </div>

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

          {/* 2. Title with 18px font size (as requested) */}
          <h1 className="text-[18px] font-extrabold leading-snug text-fg !mt-2 py-0">
            {article.title}
          </h1>

          {/* 3. Subtitle in red if it exists */}
          {article.subtitle && (
            <h2 className="text-[16px] sm:text-[18px] font-bold leading-snug text-primary mt-2 mb-2 py-0">
              {article.subtitle}
            </h2>
          )}

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
