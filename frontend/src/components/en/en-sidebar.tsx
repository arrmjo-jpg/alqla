import Link from 'next/link';

import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Sidebar: a numbered Most Read list. Editor's Picks moved to a main-content "Featured News"
// section (app/en/page.tsx) — showing it twice on the same page was redundant.
export function EnSidebar({ mostRead }: { mostRead: FeedItem[] }) {
  if (mostRead.length === 0) return null;

  return (
    <aside className="en-sidebar-sticky">
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
    </aside>
  );
}
