import 'server-only';
import { cache } from 'react';

import { env } from './env';

// Server-only English data helpers. Reuse the existing locale-aware backend
// endpoints (GET /api/v1/en/…) — no new backend, no data-model changes.

export interface EnCategory {
  id: number;
  name: string;
  slug: string;
}

/** Top-level English categories (for masthead nav + section titles). ISR 300s; failure ⇒ []. */
export const getEnCategories = cache(async (): Promise<EnCategory[]> => {
  if (!env.apiBaseUrl) return [];
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/en/categories`, {
      headers: env.internalHeaders,
      next: { revalidate: 300, tags: ['categories'] },
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const root = (json as { data?: unknown }).data;
    if (!Array.isArray(root)) return [];
    return root
      .map((raw) => raw as { id?: unknown; name?: unknown; slug?: unknown })
      .filter((c): c is { id: number; name: string; slug: string } =>
        typeof c.id === 'number' && typeof c.slug === 'string' && c.slug !== '',
      )
      .map((c) => ({ id: c.id, name: typeof c.name === 'string' ? c.name : '', slug: c.slug }));
  } catch {
    return [];
  }
});
