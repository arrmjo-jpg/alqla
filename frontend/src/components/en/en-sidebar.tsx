import Link from 'next/link';

import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

import { EnArticleCard } from './en-article-card';

// Sidebar widgets: a numbered Most Read list + Editor's Picks. Each hides when empty.
export function EnSidebar({
  mostRead,
  editorsPicks,
}: {
  mostRead: FeedItem[];
  editorsPicks: FeedItem[];
}) {
  if (mostRead.length === 0 && editorsPicks.length === 0) return null;

  return (
    <aside className="en-sidebar-sticky">
      {mostRead.length > 0 && (
        <section className="en-widget" aria-labelledby="en-most-read">
          <h2 id="en-most-read" className="en-widget__head">Most Read</h2>
          <ol className="en-divlist" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {mostRead.map((it, i) => (
              <li key={it.id} className="en-rank">
                <span className="en-rank__num" aria-hidden>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <h3 className="en-h3 en-clamp-3" style={{ fontSize: '1rem', lineHeight: 1.3 }}>
                    <Link href={enUrl(it.href)} className="en-headline-link">{it.title}</Link>
                  </h3>
                  {it.publishedAt && (
                    <div className="en-meta" style={{ marginTop: 4 }}>{enRelative(it.publishedAt)}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {editorsPicks.length > 0 && (
        <section className="en-widget" aria-labelledby="en-editors">
          <h2 id="en-editors" className="en-widget__head">Editor&rsquo;s Picks</h2>
          <div className="en-divlist">
            {editorsPicks.map((it) => (
              <EnArticleCard key={it.id} item={it} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
