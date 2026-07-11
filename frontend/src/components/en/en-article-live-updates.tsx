'use client';

import { useEffect, useRef, useState } from 'react';

import { LivePulse } from '@/components/ui/live-pulse';
import type { ArticleImage, LiveUpdateItem } from '@/lib/articles';
import { enRelative } from '@/lib/en';

// English-language fork of ArticleLiveUpdates (components/articles/article-live-updates.tsx) —
// same polling contract (30s, ETag/304) and LiveUpdateItem shape, English copy + .en-* classes.
// Forked rather than parameterized: the AR component's strings are hardcoded JSX text, not props.
export function EnArticleLiveUpdates({ slug, initial }: { slug: string; initial: LiveUpdateItem[] }) {
  const [items, setItems] = useState<LiveUpdateItem[]>(initial);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers['If-None-Match'] = etagRef.current;
        const res = await fetch(`/api/live-updates?slug=${encodeURIComponent(slug)}&locale=en`, { headers });
        if (!active || res.status === 304) return;
        const et = res.headers.get('etag');
        if (et) etagRef.current = et;
        const json: unknown = await res.json().catch(() => null);
        const data = (json as { data?: unknown } | null)?.data;
        if (Array.isArray(data)) setItems(data.map(mapRaw));
      } catch {
        /* ignore a transient poll failure — retried on the next interval */
      }
    };
    const interval = window.setInterval(poll, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [slug]);

  if (items.length === 0) return null;

  return (
    <section aria-label="Live coverage" className="en-live-updates">
      <div className="en-live-updates__head">
        <span className="en-badge en-badge--live" style={{ position: 'static' }}>
          <LivePulse />
          Live
        </span>
        <span className="en-h3" style={{ fontSize: '1rem' }}>Live Coverage</span>
        <span className="en-meta">· {items.length} update{items.length === 1 ? '' : 's'}</span>
      </div>

      <ol className="en-live-updates__list">
        {items.map((u, idx) => (
          <li key={u.id} className="en-live-updates__item">
            <span className={`en-live-updates__dot${idx === 0 ? ' en-live-updates__dot--latest' : ''}`} aria-hidden />
            <div className="en-live-updates__card">
              <div className="en-live-updates__meta">
                {idx === 0 && <span className="en-live-updates__tag en-live-updates__tag--latest">Latest</span>}
                {u.isPinned && <span className="en-live-updates__tag">Pinned</span>}
                {u.isBreaking && <span className="en-live-updates__tag en-live-updates__tag--breaking">Breaking</span>}
                {u.happenedAt && <time dateTime={u.happenedAt}>{enRelative(u.happenedAt)}</time>}
              </div>
              {u.title && <h3 className="en-h3" style={{ marginTop: 8, fontSize: '1.02rem' }}>{u.title}</h3>}
              {u.contentHtml && (
                <div
                  className="en-body"
                  style={{ marginTop: 8, fontSize: '0.95rem' }}
                  dangerouslySetInnerHTML={{ __html: u.contentHtml }}
                />
              )}
              {u.gallery.length > 0 && (
                <div className={`en-live-updates__gallery${u.gallery.length === 1 ? '' : ' en-live-updates__gallery--2col'}`}>
                  {u.gallery.map((g, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- absolute backend URL, no next/image config
                    <img key={i} src={g.medium ?? g.url} alt={g.alt ?? ''} loading="lazy" decoding="async" />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

// Client-side view mapper (trusts the BFF shape = API shape) — matches the server mapLiveUpdate.
function mapRaw(raw: unknown): LiveUpdateItem {
  const u = (raw ?? {}) as Record<string, unknown>;
  const media = (u.media ?? {}) as Record<string, unknown>;
  const author = (u.author ?? {}) as Record<string, unknown>;
  const gallery = Array.isArray(media.gallery) ? media.gallery : [];
  return {
    id: typeof u.id === 'number' ? u.id : 0,
    title: str(u.title),
    contentHtml: typeof u.content_html === 'string' ? u.content_html : '',
    isPinned: u.is_pinned === true,
    isBreaking: u.is_breaking === true,
    happenedAt: str(u.happened_at),
    authorName: str(author.name),
    gallery: gallery
      .map((g): ArticleImage | null => {
        const gi = (g ?? {}) as Record<string, unknown>;
        const url = str(gi.url);
        return url
          ? {
              url,
              thumb: str(gi.thumb),
              medium: str(gi.medium),
              alt: str(gi.alt),
              caption: str(gi.caption),
              photographer: str(gi.photographer),
              source: str(gi.source),
              width: typeof gi.width === 'number' ? gi.width : null,
              height: typeof gi.height === 'number' ? gi.height : null,
            }
          : null;
      })
      .filter((g): g is ArticleImage => g !== null),
  };
}
