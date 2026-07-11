import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EnArticleCard } from '@/components/en/en-article-card';
import { EnAvatar } from '@/components/en/en-avatar';
import { EnEmpty } from '@/components/en/en-empty';
import { EnPagination } from '@/components/en/en-pagination';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { enRelative } from '@/lib/en';
import { env } from '@/lib/env';
import { getLatestFeed, getMostReadFeed } from '@/lib/feed';
import { getWriterArticles, getWriterProfile } from '@/lib/writer';

// English writer/columnist profile — mirrors (site)/writer/[id]/page.tsx: same data contracts
// (getWriterProfile + getWriterArticles filtered to type='opinion'), same JSON-LD shape,
// presentation only. Writer pages are for opinion columnists specifically, not all bylines —
// that filter is AR's existing convention, reused as-is.
export const revalidate = 300;
const PER_PAGE = 18;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const writer = await getWriterProfile(Number(id), 'en');
  if (!writer) return { title: 'Writer not found' };

  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);
  const title = page > 1 ? `${writer.name} — Page ${page}` : `${writer.name} | Columnist at Alqalah News`;
  const description = writer.bio
    ? writer.bio.slice(0, 155)
    : `Read all articles and opinion pieces by ${writer.name} on Alqalah News.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: writer.avatar ? [{ url: writer.avatar, width: 800, height: 800, alt: writer.name }] : [],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${env.siteUrl}/en/author/${id}${page > 1 ? `?page=${page}` : ''}`,
    },
  };
}

export default async function EnAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const authorId = Number(id);
  if (!authorId) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);

  const [writer, articlesPage, latestFeed, mostReadFeed] = await Promise.all([
    getWriterProfile(authorId, 'en'),
    getWriterArticles(authorId, page, PER_PAGE, 'opinion', 'en'),
    getLatestFeed('en'),
    getMostReadFeed(5, 'en'),
  ]);

  if (!writer) notFound();

  const socials = Object.entries(writer.social).filter(([, url]) => typeof url === 'string' && url.trim());
  const hrefFor = (p: number) => `/en/author/${writer.id}${p > 1 ? `?page=${p}` : ''}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: writer.name,
      jobTitle: 'Columnist',
      worksFor: { '@type': 'Organization', name: 'Alqalah News' },
      image: writer.avatar || undefined,
      description: writer.bio || undefined,
      sameAs: socials.map(([, url]) => url),
      url: `${env.siteUrl}/en/author/${writer.id}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${env.siteUrl}/en` },
        { '@type': 'ListItem', position: 2, name: 'Writers', item: `${env.siteUrl}/en/writers` },
        { '@type': 'ListItem', position: 3, name: writer.name, item: `${env.siteUrl}/en/author/${writer.id}` },
      ],
    },
  ];

  return (
    <div className="en-container" style={{ paddingBottom: 56 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="en-breadcrumb" aria-label="Breadcrumb" style={{ marginTop: 20 }}>
        <Link href="/en">Home</Link>
        <span className="sep" aria-hidden>/</span>
        <Link href="/en/writers">Writers</Link>
        <span className="sep" aria-hidden>/</span>
        <span style={{ color: 'var(--en-ink)', fontWeight: 700 }}>{writer.name}</span>
      </nav>

      <header className="en-author-head" style={{ alignItems: 'flex-start', gap: 22 }}>
        <EnAvatar name={writer.name} src={writer.avatar} size={96} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="en-kicker">Columnist</div>
          <h1 className="en-h1" style={{ fontSize: '2.2rem', marginTop: 4 }}>{writer.name}</h1>
          {writer.bio && <p className="en-body" style={{ marginTop: 10, maxWidth: 720 }}>{writer.bio}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 14 }}>
            {articlesPage.total > 0 && (
              <span className="en-meta">
                <strong style={{ color: 'var(--en-ink)' }}>{articlesPage.total.toLocaleString('en-US')}</strong> opinion piece
                {articlesPage.total === 1 ? '' : 's'} published
              </span>
            )}
            {writer.last_activity_at && <span className="en-meta">Active {enRelative(writer.last_activity_at)}</span>}
            {socials.map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="en-link en-meta"
                style={{ textTransform: 'capitalize' }}
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div style={{ marginTop: 36 }}>
        <EnSectionHeading title="Articles" />

        {articlesPage.items.length === 0 ? (
          <div style={{ paddingTop: 12 }}>
            <EnEmpty title="No articles yet" message={`${writer.name} has no published English articles yet.`} />
          </div>
        ) : (
          <>
            <div className="en-grid en-grid--2" style={{ marginTop: 24 }}>
              {articlesPage.items.map((it) => (
                <EnArticleCard key={it.id} item={it} variant="list" />
              ))}
            </div>
            <EnPagination currentPage={articlesPage.page} totalPages={articlesPage.totalPages} hrefFor={hrefFor} />
          </>
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
