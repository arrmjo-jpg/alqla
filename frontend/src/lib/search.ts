import 'server-only';
import { cache } from 'react';

import { type FeedItem, fetchPaginatedArticles } from './feed';

// نتيجة بحث الأخبار (view-model) — عناصر جاهزة للعرض + ترقيم.
export interface SearchResult {
  items: FeedItem[];
  total: number;
  page: number;
  totalPages: number;
}

// بحث الأخبار عبر مرشّح allow-list `filter[q]` (Scout/Meilisearch في الباك إند، متن كامل + تسامح
// أخطاء). يعيد استخدام fetchPaginatedArticles من feed.ts (صفر تكرار — انظر IMPLEMENTATION-ROADMAP.md
// 2.2؛ الثلاثة مستهلكي `/articles` المُرقَّمين وُحِّدوا على هذا النداء المشترك). فشل/غياب/خطأ ⇒ نتيجة
// فارغة (تدهور رشيق — يطابق تدهور الباك إند عند تعطّل المحرّك). ISR قصير لتخفيف ضغط الاستعلامات المتكرّرة.
export const searchArticles = cache(
  async (query: string, page = 1, perPage = 20, locale = 'ar'): Promise<SearchResult> => {
    const q = query.trim();
    if (q === '') return { items: [], total: 0, page, totalPages: 0 };
    // بلا sort: يُبقي الباك‑إند ترتيب صلة Meilisearch (العنوان أوّلًا) بدل التاريخ.
    return fetchPaginatedArticles({
      locale,
      page,
      perPage,
      filters: { 'filter[q]': q },
      revalidate: 60,
      tags: ['articles', 'search'],
    });
  },
);
