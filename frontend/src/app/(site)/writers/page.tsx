import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getWriters } from '@/lib/writer';
import { WriterCard } from '@/components/writers/writer-card';
import { WritersSearchBox } from '@/components/writers/writers-search-box';
import { WritersEmptyState } from '@/components/writers/writers-empty-state';
import { Pagination } from '@/components/ui/pagination'; // Need to verify if this exists. If not, I can create a fallback or use another pagination logic.
import { env } from '@/lib/env';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { FeedSection } from '@/components/articles/blocks/feed-section';
import { getLatestFeed, getMostReadFeed } from '@/lib/feed';

export const metadata: Metadata = {
  title: 'كتاب القلعة | كتاب ومحرري الموقع',
  description: 'تعرف على جميع كتاب ومحرري ومراسلي موقع القلعة نيوز. تصفح أحدث مقالاتهم وتغطياتهم.',
  alternates: {
    canonical: '/writers',
  },
  openGraph: {
    title: 'كتاب القلعة | كتاب ومحرري الموقع',
    description: 'تعرف على جميع كتاب ومحرري ومراسلي موقع القلعة نيوز.',
    url: '/writers',
    siteName: 'القلعة نيوز',
    locale: 'ar_JO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'كتاب القلعة | كتاب ومحرري الموقع',
    description: 'تعرف على جميع كتاب ومحرري ومراسلي موقع القلعة نيوز.',
  },
};

interface WritersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WritersPage(props: WritersPageProps) {
  const searchParams = await props.searchParams;
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const [result, latestFeed, mostReadFeed] = await Promise.all([
    getWriters(page, 24, q),
    getLatestFeed('ar'),
    getMostReadFeed('ar', 5)
  ]);
  
  if (page > 1 && result.items.length === 0) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: result.items.map((writer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${env.siteUrl}${writer.url ?? `/writer/${writer.id}`}`,
      name: writer.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen py-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <nav className="flex items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <ChevronLeft size={16} />
            <span className="text-gray-900 font-medium" aria-current="page">كتاب القلعة</span>
          </nav>
        </div>

        {/* Directory & Sidebar Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Main Content */}
            <div className="min-w-0 lg:col-span-8 space-y-8">
              
              {/* Search Box */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/80">
                <Suspense fallback={<div className="h-14 bg-gray-100 rounded-full animate-pulse w-full" />}>
                  <WritersSearchBox />
                </Suspense>
              </div>

              {result.items.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {result.items.map((writer) => (
                      <WriterCard key={writer.id} writer={writer} />
                    ))}
                  </div>
                  
                  {result.totalPages > 1 && (
                    <div className="flex justify-center mt-12 border-t border-gray-100 pt-8">
                      <Pagination 
                        currentPage={result.page} 
                        totalPages={result.totalPages} 
                        hrefFor={(page) => {
                          const params = new URLSearchParams();
                          if (q) params.set('q', q);
                          if (page > 1) params.set('page', page.toString());
                          const qs = params.toString();
                          return `/writers${qs ? `?${qs}` : ''}`;
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <WritersEmptyState searchQuery={q} />
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
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:col-span-4 lg:block sticky top-24">
              <ReadingSidebar />
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
