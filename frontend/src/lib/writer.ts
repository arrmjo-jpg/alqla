import 'server-only';
import { cache } from 'react';
import { z } from 'zod';

import { env } from './env';

// بروفيل الكاتب العامّ — `GET /{locale}/writers/{id}` (الباك إند يبوّبه بـ is_writer نشِط؛ غيره ⇒ 404).
// حقول آمنة للنشر فقط: الاسم/الصورة/النبذة/روابط السوشيل. فشل/404 ⇒ null.
const WriterSchema = z
  .object({
    data: z
      .object({
        id: z.number(),
        name: z.string(),
        avatar: z.string().nullish(),
        bio: z.string().nullish(),
        social_links: z.record(z.string(), z.string()).nullish(),
      })
      .nullish(),
  })
  .passthrough();

export interface WriterProfile {
  id: number;
  name: string;
  avatar: string | null;
  bio: string | null;
  social: Record<string, string>;
}

export const getWriterProfile = cache(async (id: number, locale = 'ar'): Promise<WriterProfile | null> => {
  if (!env.apiBaseUrl || !Number.isFinite(id)) return null;
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/writers/${id}`, {
      next: { revalidate: 300, tags: ['writers', `writer:${id}`] },
    });
    if (!res.ok) return null;
    const parsed = WriterSchema.safeParse(await res.json());
    const d = parsed.success ? parsed.data.data : null;
    if (!d) return null;
    return {
      id: d.id,
      name: d.name,
      avatar: d.avatar ?? null,
      bio: d.bio?.trim() || null,
      social: d.social_links ?? {},
    };
  } catch {
    return null;
  }
});

// ─── مقالات الكاتب مع الترقيم ───
// تعتمد نفس الـ Contract المستخدم في صفحات الأقسام لضمان الاتساق.
import type { CategoryPageResult } from './feed';
import { PaginatedEnvelope, mapItem } from './feed';

export const getWriterArticles = cache(
  async (authorId: number, page = 1, perPage = 18, locale = 'ar', type?: string): Promise<CategoryPageResult> => {
    const empty: CategoryPageResult = { items: [], total: 0, page, totalPages: 0 };
    if (!env.apiBaseUrl || !authorId) return empty;
    try {
      const qs = new URLSearchParams({
        per_page: String(perPage),
        page: String(Math.max(1, page)),
        sort: '-published_at',
      });
      qs.set('filter[author_id]', String(authorId));
      if (type) {
        qs.set('filter[type]', type);
      }
      
      const res = await fetch(
        `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/articles?${qs.toString()}`,
        { headers: env.internalHeaders, next: { revalidate: 300, tags: ['articles', `author_articles:${authorId}`] } },
      );
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
);
