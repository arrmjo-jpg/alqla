import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EnArticleCard } from '@/components/en/en-article-card';
import { EnAvatar } from '@/components/en/en-avatar';
import { EnEmpty } from '@/components/en/en-empty';
import { getAuthorArticles } from '@/lib/feed';

// English author page — the author's published English work. Reuses the
// locale-aware author-articles layer (author identity derived from the feed).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const articles = await getAuthorArticles(Number(id), 1, 'en');
  return { title: articles[0]?.author?.name ?? 'Author' };
}

export default async function EnAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorId = Number(id);
  if (!authorId) notFound();

  const articles = await getAuthorArticles(authorId, 24, 'en');
  const author = articles[0]?.author ?? null;

  return (
    <div className="en-container" style={{ paddingBottom: 56 }}>
      <header className="en-author-head">
        <EnAvatar name={author?.name ?? 'Author'} src={author?.avatar ?? null} size={72} />
        <div>
          <div className="en-kicker">{author?.isWriter ? 'Columnist' : 'Author'}</div>
          <h1 className="en-h1" style={{ fontSize: '2.2rem', marginTop: 2 }}>
            {author?.name ?? 'Author'}
          </h1>
        </div>
      </header>

      {articles.length === 0 ? (
        <div style={{ paddingTop: 44 }}>
          <EnEmpty
            title="No articles yet"
            message="This author has no published English articles yet."
          />
        </div>
      ) : (
        <div className="en-grid" style={{ marginTop: 32 }}>
          {articles.map((it) => (
            <EnArticleCard key={it.id} item={it} variant="standard" />
          ))}
        </div>
      )}
    </div>
  );
}
