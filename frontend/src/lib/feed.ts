import 'server-only';
import { cache } from 'react';
import { z } from 'zod';

import { getCached } from './dev-cache';
import { env } from './env';


// عنصر تغذية جاهز للعرض (view-model) — لا يتسرّب شكل الـAPI الخام إلى العارض.
export interface FeedItem {
  id: number;
  type: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  href: string;
  image: string | null;
  imageAlt: string;
  category: string | null;
  categoryHref: string | null;
  is_featured?: boolean;
  is_squares?: boolean;
  author: { id: number | null; name: string; avatar: string | null; isWriter: boolean } | null;
  publishedAt: string | null;
  badge: { kind: 'live' | 'breaking'; label: string } | null;
  cover?: {
    url: string;
    thumb?: string | null;
    medium?: string | null;
    alt?: string | null;
  } | null;
}

// اسم متوافق مع المستهلك القديم (الهيرو).
export type HeroItem = FeedItem;

const CoverSchema = z
  .object({
    url: z.string().nullish(),
    medium: z.string().nullish(),
    thumb: z.string().nullish(),
    alt: z.string().nullish(),
  })
  .nullish();

export const ItemSchema = z
  .object({
    id: z.number(),
    type: z.string().nullish(),
    title: z.string(),
    subtitle: z.string().nullish(),
    excerpt: z.string().nullish(),
    canonical_path: z.string().nullish(),
    published_at: z.string().nullish(),
    is_breaking: z.boolean().nullish(),
    is_squares: z.boolean().nullish(),
    is_live: z.boolean().nullish(),
    locale: z.string().nullish(),
    primary_category: z.object({ id: z.number().nullish(), name: z.string().nullish(), slug: z.string().nullish() }).nullish(),
    author: z
      .object({
        id: z.number().nullish(),
        name: z.string().nullish(),
        avatar: z.string().nullish(),
        is_writer: z.boolean().nullish(),
      })
      .nullish(),
    cover: CoverSchema,
  })
  .passthrough();

type Item = z.infer<typeof ItemSchema>;

const EnvelopeSchema = z.object({ data: z.array(ItemSchema).nullish() }).passthrough();

// نزع بادئة اللغة من canonical_path (الواجهة العامة بلا /ar|/en) → /articles/{id}-{slug}.
function localeless(path: string | null | undefined): string {
  if (!path) return '#';
  return path.replace(/^\/[a-z]{2}(?=\/)/, '') || '#';
}

// شارة الكرت من أعلام حقيقية فقط: تغطية مباشرة (live) تسبق عاجل (breaking)؛ غير ذلك ⇒ بلا شارة.
function toBadge(item: Item): FeedItem['badge'] {
  if (item.is_live) return { kind: 'live', label: 'تغطية خاصة' };
  if (item.is_breaking) return { kind: 'breaking', label: 'عاجل' };
  return null;
}

export function mapItem(it: Item): FeedItem {
  const cat = it.primary_category;
  return {
    id: it.id,
    type: it.type || 'news',
    title: it.title,
    subtitle: it.subtitle || null,
    excerpt: (it.excerpt ?? it.subtitle ?? '').trim() || null,
    href: localeless(it.canonical_path),
    image: it.cover?.medium ?? it.cover?.url ?? null,
    imageAlt: it.cover?.alt ?? it.title,
    category: cat?.name ?? null,
    categoryHref: cat?.id && cat?.slug
      ? `${it.locale === 'en' ? '/en' : ''}/category-${cat.id}/${encodeURIComponent(cat.slug)}`
      : null,
    is_featured: !!it.is_featured,
    is_squares: !!it.is_squares,
    author: it.author?.name
      ? {
          id: typeof it.author.id === 'number' ? it.author.id : null,
          name: it.author.name,
          avatar: it.author.avatar ?? null,
          isWriter: !!it.author.is_writer,
        }
      : null,
    publishedAt: it.published_at ?? null,
    badge: toBadge(it),
    cover: it.cover ? {
      url: it.cover.url ?? '',
      thumb: it.cover.thumb ?? null,
      medium: it.cover.medium ?? null,
      alt: it.cover.alt ?? null,
    } : null,
  };
}

// مُحلّل تغذية عامّ (resolver) قابل للكاش: زون (hero/header/breaking/editors_pick/latest) + حدّ + TTL.
// نقيّ، ISR + tags؛ أي فشل/فراغ ⇒ [] (عزل فشل الكتلة، لا تلفيق بيانات).
const fetchFeed = cache(
  async (kind: string, limit: number, locale: string, revalidate: number): Promise<FeedItem[]> => {
    if (!env.apiBaseUrl) return [];
    try {
      const res = await fetch(
        `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/feed/${kind}?limit=${limit}`,
        { headers: env.internalHeaders, next: { revalidate, tags: ['articles', `feed:${kind}`] } },
      );
      if (!res.ok) return [];
      const parsed = EnvelopeSchema.safeParse(await res.json());
      if (!parsed.success) return [];
      return (parsed.data.data ?? []).map(mapItem);
    } catch {
      return [];
    }
  },
);

export interface HomepageFeed {
  hero: FeedItem[];
  breaking: FeedItem[];
  header: FeedItem[];
  editors_pick: FeedItem[];
  latest: FeedItem[];
}

const HomepageEnvelopeSchema = z.object({
  data: z.object({
    hero: z.array(ItemSchema).nullish(),
    breaking: z.array(ItemSchema).nullish(),
    header: z.array(ItemSchema).nullish(),
    editors_pick: z.array(ItemSchema).nullish(),
    latest: z.array(ItemSchema).nullish(),
  }).passthrough()
}).passthrough();

// جلب تجميعيّة الصفحة الرئيسيّة كاملة بطلب واحد (BFF Aggregator) لتقليص الطلبات المتفرّقة (ADR-PE-01).
export const getHomepageFeed = cache(async (locale = 'ar'): Promise<HomepageFeed> => {
  const empty: HomepageFeed = { hero: [], breaking: [], header: [], editors_pick: [], latest: [] };
  return getCached(`homepage:${locale}`, 60000, async () => {
    if (!env.apiBaseUrl) return empty;
    try {
      const res = await fetch(
        `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/homepage`,
        { headers: env.internalHeaders, next: { revalidate: 120, tags: ['articles', 'homepage'] } }
      );
      if (!res.ok) return empty;
      const parsed = HomepageEnvelopeSchema.safeParse(await res.json());
      if (!parsed.success) return empty;
      const d = parsed.data.data;
      return {
        hero: (d.hero ?? []).map(mapItem),
        breaking: (d.breaking ?? []).map(mapItem),
        header: (d.header ?? []).map(mapItem),
        editors_pick: (d.editors_pick ?? []).map(mapItem),
        latest: (d.latest ?? []).map(mapItem),
      };
    } catch {
      return empty;
    }
  });
});


// كتلة الهيرو: الأخبار المميّزة (is_featured) — حدّ 5 (= hero(source:featured,limit:5))، ISR 300s.
export const getHeroFeed = (locale = 'ar') => fetchFeed('hero', 5, locale, 300);

// كتلة «آخر المستجدات»: أخبار الهيدر (is_header) — حدّ 9 (كرت رئيسيّ + شبكة 8)، ISR 300s.
export const getHeaderFeed = (locale = 'ar') => fetchFeed('header', 9, locale, 300);

// صفحة «آخر المستجدات» /latest: أحدث الأخبار المنشورة — حدّ 30، ISR 60s (أحدث = تحديث أسرع).
export const getLatestFeed = (locale = 'ar') => fetchFeed('latest', 30, locale, 60);

// كتلة «تريندينغ»: اختيارات المحرّر (is_editor_pick) — من كلّ الأقسام حين ينطبق العلم. ISR 300s.
export const getEditorsPickFeed = (limit = 5, locale = 'ar') => fetchFeed('editors_pick', limit, locale, 300);

// كتلة «عاجل» (is_breaking) — للشريط السفليّ. حدّ 5، ISR قصير 120s (العاجل حسّاس للوقت). فارغ ⇒ يُخفى.
export const getBreakingFeed = (limit = 5, locale = 'ar') => fetchFeed('breaking', limit, locale, 120);

// كتلة «الأكثر شيوعا»: الأكثر قراءة (مشاهدات مُتتبَّعة، بلا نافذة 7 أيام الضيّقة) — المطابق الدلاليّ
// لـ«الأكثر شيوعا/الأكثر قراءة». endpoint مستقلّ بمُعامل per_page (ليس /feed/{kind})، لكنّه يعيد نفس
// مغلّف {data:[…]} ومورد القائمة ⇒ إعادة استخدام EnvelopeSchema/mapItem. ISR 300s؛ أي فشل ⇒ [] (عزل الكتلة).
// (الرائج /articles/trending متاح أيضاً لكن نافذته 7 أيام تُفرغه إن لم يوجد محتوى حديث.)
export const getMostReadFeed = cache(async (limit = 6, locale = 'ar', days = 0): Promise<FeedItem[]> => {
  if (!env.apiBaseUrl) return [];
  try {
    // days>0 ⇒ نافذة زمنية (الشهر = 30) للأكثر قراءة ضمنها؛ 0 = كل الأوقات.
    const qs = `per_page=${limit}${days > 0 ? `&days=${days}` : ''}`;
    const res = await fetch(
      `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/articles/most-read?${qs}`,
      { headers: env.internalHeaders, next: { revalidate: 300, tags: ['articles', 'feed:most_read'] } },
    );
    if (!res.ok) return [];
    const parsed = EnvelopeSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return (parsed.data.data ?? []).map(mapItem);
  } catch {
    return [];
  }
});

// تصنيف بالـ**ID الثابت** — الـslug والاسم الحاليّان. الـID لا يتغيّر؛ الـslug يتغيّر بإعادة التسمية من
// الإدارة ⇒ مرجعة الأقسام بالـID تمنع كسر الرئيسيّة (نبض الشارع→نبض البلد). الباك إند لا يدعم
// `/categories/{id}` ولا `filter[category_id]` (slug فقط)، فنفهرس شجرة `/categories` مرّةً (مُكاش، ISR
// 300s) بالـID ونحلّ منها الـslug/الاسم الحاليّين لتمريرهما لـ`getCategoryFeed`/العنوان.
export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

// جلب شجرة الأقسام الخامّة (GET /categories) — نداء مشترك واحد يعيد استخدامه أيضاً lib/categories.ts
// (كان كلّ ملفّ يطلب نفس الرابط بسياسة كاش مختلفة قليلاً: 600s هناك مقابل 300s هنا؛ وُحِّدت على 300s
// الأقصر هنا لصالح دقّة مرجعة id→slug). كلّ مستهلك يُطبِّق تحليله الخاصّ على النتيجة الخامّة (منطق
// مختلف عمداً: فهرسة id→ref هنا مقابل تسطيح بعمق هناك) — انظر IMPLEMENTATION-ROADMAP.md 2.6.
export const fetchCategoriesRaw = cache(async (locale = 'ar'): Promise<unknown[]> => {
  return getCached(`categories-raw:${locale}`, 300000, async () => {
    if (!env.apiBaseUrl) return [];
    try {
      const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/categories`, {
        headers: env.internalHeaders,
        next: { revalidate: 300, tags: ['categories'] },
      });
      if (!res.ok) return [];
      const json: unknown = await res.json();
      const root = (json as { data?: unknown }).data;
      return Array.isArray(root) ? root : [];
    } catch {
      return [];
    }
  });
});

const fetchCategoryIndex = cache(async (locale: string): Promise<Map<number, CategoryRef>> => {
  const index = new Map<number, CategoryRef>();
  const root = await fetchCategoriesRaw(locale);
  const walk = (nodes: unknown[]): void => {
    for (const raw of nodes) {
      const n = raw as { id?: unknown; name?: unknown; slug?: unknown; children?: unknown };
      if (typeof n.id === 'number' && typeof n.slug === 'string' && n.slug) {
        index.set(n.id, { id: n.id, name: typeof n.name === 'string' ? n.name : '', slug: n.slug });
      }
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  walk(root);
  return index;
});

// تصنيف بالـID (مقاوم لإعادة التسمية). غير موجود/محذوف ⇒ null.
export const getCategoryById = cache(
  async (id: number, locale = 'ar'): Promise<CategoryRef | null> => (await fetchCategoryIndex(locale)).get(id) ?? null,
);

// تصنيف بالـslug (من رابط /category/[slug]) — لحلّ الاسم والتحقّق من وجود القسم. غير موجود ⇒ null.
// يعيد استخدام فهرس الأقسام المُكاش (fetchCategoryIndex) — لا طلب إضافيّ.
export const getCategoryBySlug = cache(async (slug: string, locale = 'ar'): Promise<CategoryRef | null> => {
  for (const ref of (await fetchCategoryIndex(locale)).values()) {
    if (ref.slug === slug) return ref;
  }

  return null;
});

// نداء مُوحَّد لكل "feed" غير مُرقَّم (عدد ثابت، بلا صفحات/إجماليّ) — الثلاثة أدناه كانوا يكرّرون نفس
// paginate=cursor + fetch + EnvelopeSchema + mapItem حرفيّاً، يختلفون فقط بالفلتر ووسم الكاش.
// cursor (لا offset) يتجنّب COUNT(*) الباهظ — استراتيجيّة الـfeed المدمجة أصلاً في الـendpoint.
// انظر IMPLEMENTATION-ROADMAP.md 2.3.
async function fetchCursorFeed(opts: {
  locale: string;
  limit: number;
  filters: Record<string, string>;
  revalidate: number;
  tags: string[];
}): Promise<FeedItem[]> {
  const { locale, limit, filters, revalidate, tags } = opts;
  if (!env.apiBaseUrl) return [];
  try {
    const qs = new URLSearchParams({ per_page: String(limit), sort: '-published_at', paginate: 'cursor' });
    for (const [key, value] of Object.entries(filters)) qs.set(key, value);
    const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/articles?${qs.toString()}`, {
      headers: env.internalHeaders,
      next: { revalidate, tags },
    });
    if (!res.ok) return [];
    const parsed = EnvelopeSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return (parsed.data.data ?? []).map(mapItem);
  } catch {
    return [];
  }
}

// مقالات تصنيف محدّد (slug) — قائمة المقالات العامّة بمرشّح allow-list `filter[category]`.
// ISR 300s + كاش عبوريّ إضافيّ 60ث (getCached) — الوحيد بين الثلاثة الذي يحمل هذه الطبقة الإضافيّة.
export const getCategoryFeed = cache(
  async (slug: string, limit = 4, locale = 'ar'): Promise<FeedItem[]> =>
    getCached(`category-feed:${locale}:${slug}:${limit}`, 60000, () =>
      fetchCursorFeed({
        locale,
        limit,
        filters: { 'filter[category]': slug },
        revalidate: 300,
        tags: ['articles', `category:${slug}`],
      }),
    ),
);

export const getTagFeed = cache(
  async (tag: string, limit = 4, locale = 'ar'): Promise<FeedItem[]> =>
    fetchCursorFeed({
      locale,
      limit,
      filters: { 'filter[tag]': tag },
      revalidate: 300,
      tags: ['articles', `tag:${tag}`],
    }),
);

export const getAuthorArticles = cache(
  async (authorId: number, limit = 2, locale = 'ar', type?: string): Promise<FeedItem[]> => {
    if (!authorId) return [];
    const filters: Record<string, string> = { 'filter[author_id]': String(authorId) };
    if (type) filters['filter[type]'] = type;
    return fetchCursorFeed({ locale, limit, filters, revalidate: 300, tags: ['articles', `author_articles:${authorId}`] });
  },
);

// ─── صفحة قسم مُرقَّمة (/category/[slug]) — عناصر القسم + بيانات الترقيم (total/total_pages) ───
// نفس نقطة القائمة (filter[category]) لكن بوضع offset (يعيد meta.pagination). فشل/غياب ⇒ نتيجة فارغة.
export interface CategoryPageResult {
  items: FeedItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const PaginatedEnvelope = z
  .object({
    data: z.array(ItemSchema).nullish(),
    meta: z
      .object({
        pagination: z
          .object({
            total: z.number().nullish(),
            current_page: z.number().nullish(),
            total_pages: z.number().nullish(),
          })
          .nullish(),
      })
      .nullish(),
  })
  .passthrough();

// نداء مُوحَّد لكل استهلاكيّ `/articles` المُرقَّم بوضع offset (قسم/كاتب/بحث) — الثلاثة كانوا يكرّرون
// نفس بناء الـquerystring + fetch + تحليل PaginatedEnvelope + mapItem + استخراج pagination حرفيّاً،
// يختلفون فقط بالفلتر (filter[category]/filter[author_id]/filter[q])، الفرز (بحث بلا sort عمداً —
// يُبقي ترتيب صلة Meilisearch)، ISR (ثانية revalidate)، ووسم الكاش. انظر IMPLEMENTATION-ROADMAP.md 2.2.
export async function fetchPaginatedArticles(opts: {
  locale: string;
  page: number;
  perPage: number;
  filters: Record<string, string>;
  sort?: string;
  revalidate: number;
  tags: string[];
}): Promise<CategoryPageResult> {
  const { locale, page, perPage, filters, sort, revalidate, tags } = opts;
  const empty: CategoryPageResult = { items: [], total: 0, page, totalPages: 0 };
  if (!env.apiBaseUrl) return empty;
  try {
    const qs = new URLSearchParams({ per_page: String(perPage), page: String(Math.max(1, page)) });
    if (sort) qs.set('sort', sort);
    for (const [key, value] of Object.entries(filters)) qs.set(key, value);
    const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/articles?${qs.toString()}`, {
      headers: env.internalHeaders,
      next: { revalidate, tags },
    });
    if (!res.ok) return empty;
    const parsed = PaginatedEnvelope.safeParse(await res.json());
    if (!parsed.success) return empty;
    const items = (parsed.data.data ?? []).map(mapItem);
    const pg = parsed.data.meta?.pagination;
    return {
      items,
      total: pg?.total ?? items.length,
      page: pg?.current_page ?? page,
      totalPages: pg?.total_pages ?? 1,
    };
  } catch {
    return empty;
  }
}

export const getCategoryPage = cache(
  async (slug: string, page = 1, perPage = 18, locale = 'ar'): Promise<CategoryPageResult> =>
    fetchPaginatedArticles({
      locale,
      page,
      perPage,
      filters: { 'filter[category]': slug },
      sort: '-published_at',
      revalidate: 300,
      tags: ['articles', `category:${slug}`],
    }),
);
