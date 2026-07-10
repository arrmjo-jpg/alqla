import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { env } from './env';
import { SeoSchema, type ArticleSeo } from './articles';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const apiCache = (((globalThis as unknown) as Record<string, unknown>)._apiCache as Map<string, CacheEntry>) || new Map<string, CacheEntry>();
((globalThis as unknown) as Record<string, unknown>)._apiCache = apiCache;

async function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === 'production') {
    return fetcher();
  }
  const cached = apiCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const value = await fetcher();
  if (value) {
    apiCache.set(key, { value, expiresAt: now + ttlMs });
  }
  return value;
}


// عنصر ريل جاهز للعرض (view-model) — لا يتسرّب شكل الـAPI الخام إلى العارض.
export interface ReelItem {
  id: number;
  title: string;
  slug: string;
  href: string; // /reels/{id}-{slug} (بلا بادئة لغة)
  poster: string | null;
  hls: string | null;
  mp4: string | null; // أفضل rendition تقدّميّ (fallback)
  description: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  isFeatured: boolean;
  metrics: { views: number; likes: number; dislikes: number; favorites: number };
  seo?: ArticleSeo;
}

const MediaSchema = z
  .object({
    poster: z.string().nullish(),
    hls: z.string().nullish(),
    renditions: z.record(z.string(), z.string().nullish()).nullish(),
    processing_status: z.string().nullish(),
  })
  .nullish();

const MetricsSchema = z
  .object({
    views: z.number().nullish(),
    likes: z.number().nullish(),
    dislikes: z.number().nullish(),
    favorites: z.number().nullish(),
  })
  .nullish();

export const ReelSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string().nullish(),
    description: z.string().nullish(),
    duration_seconds: z.number().nullish(),
    is_featured: z.boolean().nullish(),
    published_at: z.string().nullish(),
    canonical_path: z.string().nullish(),
    share_image: z.string().nullish(),
    media: MediaSchema,
    metrics: MetricsSchema,
    seo: z.lazy(() => SeoSchema).nullish(),
  })
  .passthrough();

type Reel = z.infer<typeof ReelSchema>;

const CursorSchema = z
  .object({ next_cursor: z.string().nullish(), has_more: z.boolean().nullish() })
  .nullish();

const FeedEnvelope = z
  .object({
    data: z.array(ReelSchema).nullish(),
    meta: z.object({ cursor: CursorSchema }).nullish(),
  })
  .passthrough();

const DetailEnvelope = z.object({ data: ReelSchema.nullish() }).passthrough();

// نزع بادئة اللغة من canonical_path (الواجهة العامة بلا /ar|/en).
function localeless(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  return path.replace(/^\/[a-z]{2}(?=\/)/, '') || fallback;
}

// أفضل MP4 احتياطيّ (إن فشل HLS): 720p ثمّ 480 ثمّ 1080 ثمّ master ثمّ 360.
function bestMp4(rend: Record<string, string | null | undefined> | null | undefined): string | null {
  if (!rend) return null;
  return rend['720p'] || rend['480p'] || rend['1080p'] || rend['master'] || rend['360p'] || null;
}

export function mapReel(r: Reel): ReelItem {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug ?? String(r.id),
    href: localeless(r.canonical_path, `/reels/${r.id}`),
    poster: r.media?.poster ?? r.share_image ?? null,
    hls: r.media?.hls ?? null,
    mp4: bestMp4(r.media?.renditions),
    description: r.description ?? null,
    durationSeconds: r.duration_seconds ?? null,
    publishedAt: r.published_at ?? null,
    isFeatured: !!r.is_featured,
    metrics: {
      views: r.metrics?.views ?? 0,
      likes: r.metrics?.likes ?? 0,
      dislikes: r.metrics?.dislikes ?? 0,
      favorites: r.metrics?.favorites ?? 0,
    },
    seo: r.seo ?? undefined,
  };
}

export interface ReelsPage {
  items: ReelItem[];
  nextCursor: string | null;
}

// خلاصة الريلز (cursor للتمرير اللانهائيّ). ISR 60s (feed REALTIME)؛ فشل ⇒ صفحة فارغة.
export const getReelsFeed = cache(async (cursor: string | null = null, locale = 'ar'): Promise<ReelsPage> => {
  const empty: ReelsPage = { items: [], nextCursor: null };
  return getCached(`reels-feed:${locale}:${cursor ?? ''}`, 60000, async () => {
    if (!env.apiBaseUrl) return empty;
    try {
      const qs = new URLSearchParams({ paginate: 'cursor', per_page: '10' });
      if (cursor) qs.set('cursor', cursor);
      const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/reels?${qs.toString()}`, {
        headers: env.internalHeaders,
        // وسم القاموس الموحَّد (يطابق FrontendCacheTags::reel) — إبطال حدثيّ من الباك إند.
        next: { revalidate: 60, tags: [`reel-feed:${locale}`] },
      });
      if (!res.ok) return empty;
      const parsed = FeedEnvelope.safeParse(await res.json());
      if (!parsed.success) return empty;
      const c = parsed.data.meta?.cursor;
      return {
        items: (parsed.data.data ?? []).map(mapReel),
        nextCursor: c?.has_more ? (c?.next_cursor ?? null) : null,
      };
    } catch {
      return empty;
    }
  });
});

// ريل واحد بالـ{id-slug} (للرابط العميق). فشل/غير موجود ⇒ null.
export const getReelByIdSlug = cache(async (idSlug: string, locale = 'ar'): Promise<ReelItem | null> => {
  if (!env.apiBaseUrl) return null;
  // الرابط القانونيّ {id}-{slug} يصل مُرمَّزاً من Next؛ نقطة تفاصيل الريل في الباك إند تقبل **السلَغ
  // المجرَّد** فقط ⇒ فُكّ الترميز ثمّ اقشر بادئة المعرّف (^\d+-). نفس نمط صفحة الفيديو (bareSlug).
  let slug = idSlug;
  try {
    slug = decodeURIComponent(idSlug);
  } catch {
    /* مقطع غير صالح الترميز — نُبقي الخام */
  }
  slug = slug.replace(/^\d+-/, '');
  try {
    const res = await fetch(
      `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/reels/${encodeURIComponent(slug)}`,
      // وسم تفاصيل الريل (قاموس موحَّد) — تعديل الريل يبطل صفحته + الخلاصة (يرسلهما الباك إند معًا).
      { headers: env.internalHeaders, next: { revalidate: 60, tags: [`reel:${locale}:${slug}`] } },
    );
    if (!res.ok) return null;
    const parsed = DetailEnvelope.safeParse(await res.json());
    if (!parsed.success || !parsed.data.data) return null;
    return mapReel(parsed.data.data);
  } catch {
    return null;
  }
});
