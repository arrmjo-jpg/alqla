'use client';

import { useEffect, useRef, useState } from 'react';

import { LivePulse } from '@/components/ui/live-pulse';
import type { ArticleImage, LiveUpdateItem } from '@/lib/articles';
import { formatRelativeTime } from '@/lib/format';

// عرض التغطية الحيّة (type=live) — يميّزه عن الخبر العاديّ. يبدأ بالخطّ الزمنيّ المُصيَّر خادميّاً (SSR/SEO) ثمّ
// يستطلع BFF كلّ 30 ثانية بـETag/304 (لا يجعل الصفحة ديناميكيّة، يعيد استخدام نظام live-updates المُصمَّم للـpolling).
export function ArticleLiveUpdates({ slug, initial }: { slug: string; initial: LiveUpdateItem[] }) {
  const [items, setItems] = useState<LiveUpdateItem[]>(initial);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers['If-None-Match'] = etagRef.current;
        const res = await fetch(`/api/live-updates?slug=${encodeURIComponent(slug)}`, { headers });
        if (!active || res.status === 304) return;
        const et = res.headers.get('etag');
        if (et) etagRef.current = et;
        const json: unknown = await res.json().catch(() => null);
        const data = (json as { data?: unknown } | null)?.data;
        if (Array.isArray(data)) setItems(data.map(mapRaw));
      } catch {
        /* تجاهل خطأ استطلاع مؤقّت — المحاولة التالية بعد المهلة */
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
    <section aria-label="التغطية الحيّة" className="not-prose">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold text-white"
          style={{ background: '#ff1e1e' }}
        >
          <LivePulse />
          مباشر
        </span>
        <span className="text-sm font-extrabold text-fg">التغطية الخاصّة</span>
        <span className="text-sm text-muted">· {items.length} تحديث</span>
      </div>

      {/* خطّ زمنيّ ببطاقات — خطّ رأسيّ + نقاط (الأحدث مميّز) */}
      <ol className="relative space-y-4 before:absolute before:inset-y-3 before:start-[7px] before:w-0.5 before:bg-border">
        {items.map((u, idx) => (
          <li key={u.id} className="relative ps-7">
            <span
              className={`absolute start-0 top-3 size-4 rounded-full border-[3px] border-bg ${idx === 0 ? 'bg-[#ff1e1e] ring-4 ring-[#ff1e1e]/15' : 'bg-primary'}`}
              aria-hidden
            />
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {idx === 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#ff1e1e]/10 px-1.5 py-0.5 font-bold text-[#ff1e1e]">الأحدث</span>
                )}
                {u.isPinned && <span className="rounded bg-surface-2 px-1.5 py-0.5 font-bold text-fg">مثبّت</span>}
                {u.isBreaking && (
                  <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: '#ff1e1e' }}>عاجل</span>
                )}
                {u.happenedAt && (
                  <time dateTime={u.happenedAt} className="font-semibold">
                    {formatRelativeTime(u.happenedAt)}
                  </time>
                )}
              </div>
              {u.title && <h3 className="mt-2 text-base font-bold text-fg">{u.title}</h3>}
              {u.contentHtml && (
                <div
                  className="tiptap-content mt-2 text-[15px] leading-8 text-fg"
                  dangerouslySetInnerHTML={{ __html: u.contentHtml }}
                />
              )}
              {u.gallery.length > 0 && (
                <div className={`mt-3 grid gap-2 ${u.gallery.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {u.gallery.map((g, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود (سياسة صور الواجهة)
                    <img
                      key={i}
                      src={g.medium ?? g.url}
                      alt={g.alt ?? ''}
                      loading="lazy"
                      decoding="async"
                      className="aspect-video w-full rounded-lg object-cover"
                    />
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

// محوّل عرض client (يثق بشكل الـBFF = شكل الـAPI) — يطابق mapLiveUpdate الخادميّ؛ عرض لا منطق أعمال.
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

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
        return url ? { url, thumb: str(gi.thumb), medium: str(gi.medium), alt: str(gi.alt) } : null;
      })
      .filter((g): g is ArticleImage => g !== null),
  };
}
