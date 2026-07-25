import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { SeoSchema, type ArticleSeo } from './articles';
import { getCached } from './dev-cache';
import { env } from './env';


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

// خلاصة الريلز (cursor للتمرير اللانهائيّ). ISR = سقف أمان 36000s (10 ساعات)؛ التحديث الفعليّ حدثيّ
// عبر revalidateTag('reel-feed:{locale}') (مُضمَّنة على الرئيسية عبر getReelsFeed — كانت 60s تسحب
// الـeffective revalidate للرئيسية بأكملها تحتها، راجع §14). فشل ⇒ صفحة فارغة.
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
        next: { revalidate: 36000, tags: [`reel-feed:${locale}`] },
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

// تفاصيل الريل: ISR = سقف أمان 36000s (10 ساعات)؛ التحديث الفعليّ حدثيّ عبر revalidateTag('reel:{id}').
const DETAIL_REVALIDATE = 36000;

// ريل واحد بالـ{id-slug} (للرابط العميق). فشل/غير موجود ⇒ null.
export const getReelByIdSlug = cache(async (idSlug: string, locale = 'ar'): Promise<ReelItem | null> => {
  if (!env.apiBaseUrl) return null;
  // الرابط القانونيّ {id}-{slug} يصل مُرمَّزاً من Next؛ نقطة تفاصيل الريل في الباك إند تقبل **السلَغ
  // المجرَّد** فقط ⇒ فُكّ الترميز ثمّ اقشر بادئة المعرّف (^\d+-). نفس نمط صفحة الفيديو (bareSlug).
  let decoded = idSlug;
  try {
    decoded = decodeURIComponent(idSlug);
  } catch {
    /* مقطع غير صالح الترميز — نُبقي الخام */
  }
  const idMatch = decoded.match(/^(\d+)-/);
  const slug = decoded.replace(/^\d+-/, '');
  // وسم بالـid الثابت (2026-07-24: كان بالـslug، ينكسر الإبطال عند إعادة تسمية الريل) — مطابق
  // لـFrontendCacheTags::reel(). لا بادئة رقمية (رابط قديم/مشوَّه) ⇒ وسم احتياطيّ بالسلَغ.
  const tag = idMatch ? `reel:${idMatch[1]}` : `reel:slug-fallback:${locale}:${slug}`;
  try {
    const res = await fetch(
      `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/reels/${encodeURIComponent(slug)}`,
      { headers: env.internalHeaders, next: { revalidate: DETAIL_REVALIDATE, tags: [tag] } },
    );
    if (!res.ok) return null;
    const parsed = DetailEnvelope.safeParse(await res.json());
    if (!parsed.success || !parsed.data.data) return null;
    return mapReel(parsed.data.data);
  } catch {
    return null;
  }
});
