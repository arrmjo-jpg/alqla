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
  slug?: string;
  url?: string;
  avatar: string | null;
  bio: string | null;
  social: Record<string, string>;
  articles_count?: number;
  last_activity_at?: string | null;
  verified?: boolean;
}

export const getWriterProfile = cache(async (id: number, locale = 'ar'): Promise<WriterProfile | null> => {
  if (!env.apiBaseUrl || !Number.isFinite(id)) return null;
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/writers/${id}`, {
      headers: env.internalHeaders,
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
// تعتمد نفس الـ Contract المستخدم في صفحات الأقسام لضمان الاتساق، وتعيد استخدام نداء الجلب
// المُرقَّم المشترك (IMPLEMENTATION-ROADMAP.md 2.2 — صفر تكرار مع getCategoryPage/searchArticles).
import type { CategoryPageResult } from './feed';
import { fetchPaginatedArticles } from './feed';

export const getWriterArticles = cache(
  async (authorId: number, page = 1, perPage = 18, type?: string, locale = 'ar'): Promise<CategoryPageResult> => {
    if (!authorId) return { items: [], total: 0, page, totalPages: 0 };
    const filters: Record<string, string> = { 'filter[author_id]': String(authorId) };
    if (type) filters['filter[type]'] = type;
    return fetchPaginatedArticles({
      locale,
      page,
      perPage,
      filters,
      sort: '-published_at',
      revalidate: 300,
      tags: ['articles', `author_articles:${authorId}`],
    });
  }
);

// ─── دليل الكتّاب (Writers Directory) ───

const WriterListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  url: z.string().optional(),
  avatar: z.string().nullish(),
  bio: z.string().nullish(),
  articles_count: z.number().optional(),
  last_activity_at: z.string().nullish(),
  verified: z.boolean().optional(),
});

const WritersEnvelope = z.object({
  data: z.array(WriterListItemSchema).optional(),
  meta: z
    .object({
      pagination: z.object({
        total: z.number().optional(),
        current_page: z.number().optional(),
        total_pages: z.number().optional(),
      }).optional(),
    })
    .optional(),
});

export interface WritersPageResult {
  items: WriterProfile[];
  total: number;
  page: number;
  totalPages: number;
}

export const getWriters = cache(
  async (page = 1, perPage = 24, q?: string, locale = 'ar'): Promise<WritersPageResult> => {
    const empty: WritersPageResult = { items: [], total: 0, page, totalPages: 0 };
    if (!env.apiBaseUrl) return empty;
    try {
      const qs = new URLSearchParams({
        per_page: String(perPage),
        page: String(Math.max(1, page)),
      });
      if (q) {
        qs.set('q', q);
      }
      
      const res = await fetch(
        `${env.apiBaseUrl}/api/v1/${encodeURIComponent(locale)}/writers?${qs.toString()}`,
        { headers: env.internalHeaders, next: { revalidate: 600, tags: ['writers'] } },
      );
      if (!res.ok) return empty;
      
      const parsed = WritersEnvelope.safeParse(await res.json());
      if (!parsed.success) return empty;
      
      const items = (parsed.data.data ?? []).map(d => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        url: d.url,
        avatar: d.avatar ?? null,
        bio: d.bio ?? null,
        social: {},
        articles_count: d.articles_count,
        last_activity_at: d.last_activity_at ?? null,
        verified: d.verified,
      }));
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
