import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PenLine, LayoutGrid, ChevronRight } from 'lucide-react';

import { Container } from '@/components/layout/container';
import { Pagination } from '@/components/ui/pagination';
import { HorizontalArticleCard } from '@/components/articles/HorizontalArticleCard';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { FeedSection } from '@/components/articles/blocks/feed-section';
import { getLatestFeed, getMostReadFeed } from '@/lib/feed';
import { getWriterProfile } from '@/lib/writer';
import { getWriterArticles } from '@/lib/writer';
import { env } from '@/lib/env';

export const revalidate = 60; // 60s ISR for articles
const PER_PAGE = 18;

// Translate dynamic roles or provide fallback
function translateRole(role?: string | null): string {
  if (!role) return 'كاتب';
  const roleMap: Record<string, string> = {
    writer: 'كاتب',
    author: 'كاتب',
    editor: 'محرر',
    journalist: 'صحفي',
    guest: 'ضيف',
    agency: 'وكالة',
    team: 'فريق التحرير',
  };
  return roleMap[role.toLowerCase()] || role;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const writer = await getWriterProfile(Number(id));
  if (!writer) return { title: 'الكاتب غير موجود' };
  
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);
  const title = page > 1 ? `${writer.name} — صفحة ${page}` : `${writer.name} | كاتب في القلعة`;
  const description = writer.bio ? writer.bio.slice(0, 155) : `اقرأ جميع مقالات وأخبار الكاتب ${writer.name} على موقع القلعة الإخباري.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: writer.avatar ? [{ url: writer.avatar, width: 800, height: 800, alt: writer.name }] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${env.siteUrl}/writer/${id}${page > 1 ? `?page=${page}` : ''}`,
    },
  };
}

export default async function WriterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[]; [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (isNaN(numericId)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);

  // Parallel fetch: author info + paginated articles + extra feeds to fill the page
  const [writer, articlesPage, latestFeed, mostReadFeed] = await Promise.all([
    getWriterProfile(numericId),
    getWriterArticles(numericId, page, PER_PAGE, 'opinion', 'ar'),
    getLatestFeed('ar'),
    getMostReadFeed(5, 'ar')
  ]);

  // Handle 404 cleanly
  if (!writer) notFound();

  const socials = Object.entries(writer.social).filter(([, url]) => typeof url === 'string' && url.trim());
  const jobTitle = translateRole((writer as unknown as Record<string, unknown>).role as string | undefined);
  const totalArticles = articlesPage.total;



  // URL builder for Pagination
  const buildQuery = (pageNum: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key !== 'page') {
        if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
        else if (value !== undefined) params.append(key, value);
      }
    }
    if (pageNum > 1) params.set('page', String(pageNum));
    const qStr = params.toString();
    return qStr ? `?${qStr}` : '';
  };
  const hrefFor = (p: number) => `/writer/${writer.id}${buildQuery(p)}`;

  // JSON-LD Structured Data
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: writer.name,
      jobTitle: jobTitle,
      worksFor: {
        '@type': 'Organization',
        name: 'القلعة'
      },
      image: writer.avatar || undefined,
      description: writer.bio || undefined,
      sameAs: socials.map(([, url]) => url),
      url: `${env.siteUrl}/writer/${writer.id}`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'الرئيسية',
          item: `${env.siteUrl}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'الكُتّاب',
          item: `${env.siteUrl}/writers`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: writer.name,
          item: `${env.siteUrl}/writer/${writer.id}`
        }
      ]
    }
  ];

  return (
    <>
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-6 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="breadcrumb" className="mb-6 flex items-center text-sm text-muted whitespace-nowrap overflow-x-auto pb-2">
          <Link href="/" className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">الرئيسية</Link>
          <ChevronRight className="size-4 mx-2 shrink-0 opacity-50" aria-hidden="true" />
          <Link href="/writers" className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">الكُتّاب</Link>
          <ChevronRight className="size-4 mx-2 shrink-0 opacity-50" aria-hidden="true" />
          <span className="text-fg font-bold" aria-current="page">{writer.name}</span>
        </nav>

        {/* Simple Writer Header */}
        <div className="mb-8 flex items-center gap-4 border-b border-border pb-6">
          <div className="size-20 sm:size-24 shrink-0 overflow-hidden rounded-full ring-2 ring-border bg-surface-2">
            {writer.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={writer.avatar} alt={writer.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-surface-3 text-muted" aria-hidden="true">
                <PenLine className="size-8" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{jobTitle}</span>
            <h1 className="font-heading text-2xl font-extrabold text-fg sm:text-3xl">{writer.name}</h1>
            {writer.bio && (
              <p className="text-muted leading-relaxed max-w-3xl mt-1 text-sm sm:text-base">
                {writer.bio}
              </p>
            )}
            {socials.length > 0 && (
              <div className="flex items-center gap-4 mt-2">
                {socials.map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted hover:text-primary capitalize transition-colors">
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Layout with ReadingSidebar */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
          
          {/* Main Content Area (Articles) */}
          <main className="lg:col-span-8 min-w-0 space-y-8">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-fg">مقالات الكاتب</h2>
            </div>

            {totalArticles === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-surface-2 rounded-2xl border border-dashed border-border/60">
                <div className="flex size-20 items-center justify-center bg-surface-3 rounded-full mb-4">
                  <LayoutGrid className="size-10 text-muted" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-fg mb-2">لا توجد مقالات بعد</h3>
                <p className="text-sm text-muted max-w-md mx-auto mb-6">
                  هذا الكاتب لم ينشر أي مقالات حتى الآن.
                </p>
              </div>
            ) : (
              <>
                {/* Grid for all articles (no full-width featured) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                  {articlesPage.items.map((item) => (
                    <div key={item.id} className="h-full">
                      <HorizontalArticleCard item={item} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {articlesPage.totalPages > 1 && (
                  <div className="pt-6">
                    <Pagination currentPage={articlesPage.page} totalPages={articlesPage.totalPages} hrefFor={hrefFor} />
                  </div>
                )}
              </>
            )}

            {/* Extra Feeds to make page look rich like article pages */}
            <div className="mt-16 space-y-12">
              <FeedSection
                id="latest-news-heading"
                title="آخر الأخبار"
                items={latestFeed.slice(0, 4)}
              />
              <FeedSection
                id="most-read-heading"
                title="الأكثر قراءة"
                items={mostReadFeed.slice(0, 4)}
              />
            </div>
          </main>

          {/* Sticky Sidebar (Latest News & Ads) */}
          <aside className="hidden lg:col-span-4 lg:block">
            <ReadingSidebar />
          </aside>

        </div>
      </Container>
    </>
  );
}
