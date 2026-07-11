import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { EnArticleCard } from '@/components/en/en-article-card';
import { EnPagination } from '@/components/en/en-pagination';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { EnWriterCard } from '@/components/en/en-writer-card';
import { EnWritersEmpty } from '@/components/en/en-writers-empty';
import { EnWritersSearch } from '@/components/en/en-writers-search';
import { env } from '@/lib/env';
import { getLatestFeed, getMostReadFeed } from '@/lib/feed';
import { getWriters } from '@/lib/writer';

// English writers directory — mirrors (site)/writers/page.tsx: same getWriters() contract,
// same search/pagination/ItemList-JSON-LD behavior, presentation only.
export const metadata: Metadata = {
  title: 'Writers | Alqalah News',
  description: 'Meet the writers, editors, and correspondents of Alqalah News. Browse their latest articles and coverage.',
  alternates: { canonical: '/en/writers' },
  openGraph: {
    title: 'Writers | Alqalah News',
    description: 'Meet the writers, editors, and correspondents of Alqalah News.',
    url: '/en/writers',
    siteName: 'Alqalah News',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Writers | Alqalah News',
    description: 'Meet the writers, editors, and correspondents of Alqalah News.',
  },
};

export default async function EnWritersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1;
  const q = typeof sp.q === 'string' ? sp.q : undefined;

  const [result, latestFeed, mostReadFeed] = await Promise.all([
    getWriters(page, 24, q, 'en'),
    getLatestFeed('en'),
    getMostReadFeed(5, 'en'),
  ]);

  if (page > 1 && result.items.length === 0) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: result.items.map((writer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${env.siteUrl}/en/author/${writer.id}`,
      name: writer.name,
    })),
  };

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/en/writers${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="en-container" style={{ paddingBottom: 56 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="en-breadcrumb" aria-label="Breadcrumb" style={{ marginTop: 20 }}>
        <Link href="/en">Home</Link>
        <span className="sep" aria-hidden>/</span>
        <span style={{ color: 'var(--en-ink)', fontWeight: 700 }}>Writers</span>
      </nav>

      <header style={{ marginTop: 20, marginBottom: 8 }}>
        <h1 className="en-display">Our Writers</h1>
        <p className="en-body" style={{ marginTop: 8, maxWidth: 640 }}>
          Meet the writers, editors, and correspondents behind Alqalah News.
        </p>
      </header>

      <div style={{ marginTop: 28 }}>
        <Suspense fallback={<div className="en-writers-search" />}>
          <EnWritersSearch />
        </Suspense>
      </div>

      <div style={{ marginTop: 36 }}>
        {result.items.length > 0 ? (
          <>
            <div className="en-grid">
              {result.items.map((writer) => (
                <EnWriterCard key={writer.id} writer={writer} />
              ))}
            </div>
            <EnPagination currentPage={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
          </>
        ) : (
          <EnWritersEmpty searchQuery={q} />
        )}
      </div>

      <div style={{ marginTop: 48 }}>
        <EnSectionHeading title="Latest News" viewAllHref="/en" />
        <div className="en-grid en-grid--4" style={{ marginTop: 24 }}>
          {latestFeed.slice(0, 4).map((it) => (
            <EnArticleCard key={it.id} item={it} variant="standard" />
          ))}
        </div>
      </div>

      {mostReadFeed.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <EnSectionHeading title="Most Read" />
          <div className="en-grid en-grid--4" style={{ marginTop: 24 }}>
            {mostReadFeed.slice(0, 4).map((it) => (
              <EnArticleCard key={it.id} item={it} variant="standard" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
