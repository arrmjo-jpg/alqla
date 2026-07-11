import 'server-only';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const apiCache =
  (((globalThis as unknown) as Record<string, unknown>)._apiCache as Map<string, CacheEntry>) ||
  new Map<string, CacheEntry>();
((globalThis as unknown) as Record<string, unknown>)._apiCache = apiCache;

// مساعد كاش عبوريّ **للتطوير المحليّ فقط** (بلا أثر في الإنتاج — يتجاوز الجلب مباشرةً هناك)؛ يتفادى
// تكرار نداءات fetch أثناء إعادة الرسم/HMR المتكرّرة في dev. لا يُكاش قيمة فارغة (مصفوفة []) كي لا
// "تُسمِّم" استجابة عابرة فارغة الكاش لكامل نافذة TTL. موحَّد من ثلاث نسخ مطابقة تقريباً في
// feed.ts/reels.ts/site-settings.ts — انظر IMPLEMENTATION-ROADMAP.md 3.5.
export async function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === 'production') {
    return fetcher();
  }
  const cached = apiCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const value = await fetcher();
  if (value && (!Array.isArray(value) || value.length > 0)) {
    apiCache.set(key, { value, expiresAt: now + ttlMs });
  }
  return value;
}
