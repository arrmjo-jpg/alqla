import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { ReadingSidebar } from '@/components/reading/reading-sidebar';
import { Pagination } from '@/components/ui/pagination';
import { EnArticleCard } from '@/components/en/en-article-card';
import { getCategoryById, getCategoryPage } from '@/lib/feed';

export const revalidate = 21600;
const PER_PAGE = 18;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; name?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  if (isNaN(numericId)) return { title: 'Category' };
  const category = await getCategoryById(numericId, 'en');
  return { title: category?.name ?? 'Category' };
}

export default async function EnCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; name?: string }>;
  searchParams: Promise<{ page?: string | string[]; [key: string]: string | string[] | undefined }>;
}) {
  const { id, name } = await params;
  const numericId = Number(id);
  if (isNaN(numericId)) notFound();

  const category = await getCategoryById(numericId, 'en');
  if (!category) notFound();

  // Canonical redirect check:
  const decodedName = name ? decodeURIComponent(name) : '';
  if (category.slug.normalize('NFC') !== decodedName.normalize('NFC')) {
    permanentRedirect(`/en/category-${category.id}/${category.slug}`);
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);

  const result = await getCategoryPage(category.slug, page, PER_PAGE, 'en');

  // Choose the featured hero item:
  const featuredItem = result.items.find((it) => it.is_featured === true) || result.items[0] || null;
  const gridItems = featuredItem ? result.items.filter((it) => it.id !== featuredItem.id) : [];

  // Helper to preserve all other query filters/parameters during navigation
  const buildQuery = (pageNum: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key !== 'page') {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else if (value !== undefined) {
          params.append(key, value);
        }
      }
    }
    if (pageNum > 1) {
      params.set('page', String(pageNum));
    }
    const qStr = params.toString();
    return qStr ? `?${qStr}` : '';
  };

  const hrefFor = (p: number) => `/en/category-${category.id}/${category.slug}${buildQuery(p)}`;

  return (
    <Container className="py-8 sm:py-10">
      {/* Category Header Section */}
      <div className="mb-8 flex items-center gap-3 border-b border-border pb-4">
        <span className="h-8 w-1 shrink-0 bg-primary rounded-full animate-pulse" aria-hidden />
        <h1 className="font-heading text-2xl font-extrabold text-fg sm:text-3xl">{category.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <main className="min-w-0 lg:col-span-8 space-y-8">
          {result.total === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 border border-dashed border-border/80 bg-surface-2 px-6 py-24 text-center rounded-3xl"
            >
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/60 text-lg font-bold">!</div>
              <h2 className="font-heading text-xl font-bold text-fg">No articles in this section yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">Articles for «{category.name}» will appear here as soon as they are published.</p>
            </div>
          ) : (
            <>
              {/* Featured Category Hero Article */}
              {featuredItem && (
                <div className="w-full">
                  <EnArticleCard item={featuredItem} variant="feature" />
                </div>
              )}

              {/* Responsive Grid of remaining articles */}
              {gridItems.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
                  {gridItems.map((item) => (
                    <div key={item.id} className="h-full">
                      <EnArticleCard item={item} variant="list" />
                    </div>
                  ))}
                </div>
              )}

              {/* Premium Pagination Bar */}
              <Pagination currentPage={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
            </>
          )}
        </main>
        
        {/* Sidebar Column */}
        <aside className="hidden lg:col-span-4 lg:block">
          <ReadingSidebar locale="en" />
        </aside>
      </div>
    </Container>
  );
}
