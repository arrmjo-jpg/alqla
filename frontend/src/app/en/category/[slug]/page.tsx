import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EnArticleCard } from '@/components/en/en-article-card';
import { EnEmpty } from '@/components/en/en-empty';
import { EnSidebar } from '@/components/en/en-sidebar';
import { enCategoryUrl } from '@/lib/en';
import { getCategoryBySlug, getCategoryPage, getMostReadFeed } from '@/lib/feed';

// English category listing (Public News / Articles / …). Reuses the locale-aware
// paginated category layer. ISR 300s.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug, 'en');
  return { title: cat?.name ?? 'Category', alternates: { canonical: enCategoryUrl(slug) } };
}

export default async function EnCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);

  const cat = await getCategoryBySlug(slug, 'en');
  if (!cat) notFound();

  const [pageData, mostRead] = await Promise.all([
    getCategoryPage(slug, page, 18, 'en'),
    getMostReadFeed('en', 6),
  ]);

  return (
    <div className="en-container">
      <header className="en-section-head" style={{ marginTop: 30 }}>
        <h1 className="en-section-title" style={{ fontSize: '2.1rem' }}>{cat.name}</h1>
      </header>

      <div className="en-main">
        <div>
          {pageData.items.length === 0 ? (
            <EnEmpty title={`No stories in ${cat.name} yet`} />
          ) : (
            <>
              <div className="en-grid">
                {pageData.items.map((it) => (
                  <EnArticleCard key={it.id} item={it} variant="standard" />
                ))}
              </div>

              {pageData.totalPages > 1 && (
                <nav className="en-pagination" aria-label="Pagination">
                  {page > 1 ? (
                    <Link href={`${enCategoryUrl(slug)}?page=${page - 1}`} className="en-page-link">
                      ← Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="en-meta">Page {page} of {pageData.totalPages}</span>
                  {page < pageData.totalPages ? (
                    <Link href={`${enCategoryUrl(slug)}?page=${page + 1}`} className="en-page-link">
                      Next →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </div>

        <EnSidebar mostRead={mostRead} editorsPicks={[]} />
      </div>
    </div>
  );
}
