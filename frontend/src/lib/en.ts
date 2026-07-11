// Pure English-presentation helpers (safe in server or client components):
// /en URL prefixing, en-US date/relative formatting, and locale labels.
// No backend or data-model changes — presentation only.

/** Prefix a locale-less path (/articles/…, /category/…) with the English segment. */
export function enUrl(path: string | null | undefined): string {
  if (!path || path === '#') return '/en';
  if (path.startsWith('/en/') || path === '/en') return path;
  return `/en${path.startsWith('/') ? path : `/${path}`}`;
}

/** /en/category-{id}/{slug} */
export function enCategoryUrl(id: number | string, slug: string): string {
  return `/en/category-${id}/${encodeURIComponent(slug)}`;
}

/** /en/author/{id} */
export function enAuthorUrl(id: number | string): string {
  return `/en/author/${encodeURIComponent(String(id))}`;
}

const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export function enDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : longDate.format(d);
}

export function enRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return enDate(iso);
}

export function readingLabel(min: number): string {
  return `${Math.max(1, min)} min read`;
}

const dateOnly = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
const timeOnly = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

/** "MM/DD/YYYY | H:MM AM" — the absolute-datetime pairing AR's metadata row shows
 *  alongside the relative time (formatFullDateTime in metadata-row.tsx), en-US equivalent. */
export function enDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dateOnly.format(d)} | ${timeOnly.format(d)}`;
}

/** English label for a feed badge kind (the shared feed mapper emits Arabic labels).
 *  "Special Coverage" matches the AR label (تغطية خاصة, driven by the is_live flag) and is
 *  deliberately distinct from the "Live Now" wording used for type === 'live' articles. */
export function enBadgeLabel(kind: 'live' | 'breaking'): string {
  return kind === 'live' ? 'Special Coverage' : 'Breaking';
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  x: 'X',
  twitter: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  nabd: 'Nabd',
};

/** English label for a social-map key (socialEntries() in social-map.ts always returns Arabic
 *  labels — فيسبوك/إكس/etc — regardless of locale). Falls back to the key itself (still English
 *  characters, just less polished) rather than the Arabic label if a new platform is ever added
 *  to SOCIAL there before this map is updated. */
export function enSocialLabel(key: string): string {
  return SOCIAL_LABELS[key] ?? key;
}

const ARABIC_SCRIPT = /[؀-ۿ]/;

/** True if the string contains Arabic-script characters. Some Site Settings free-text fields
 *  (e.g. copyright) aren't actually locale-scoped in the CMS yet — /api/v1/en/site and
 *  /api/v1/ar/site can return the exact same Arabic string for them. "CMS value always wins"
 *  only holds when that value is genuinely localized; a shared Arabic fallback is exactly the
 *  Arabic-content leak the English edition must never show, so callers should check this and use
 *  their own English default instead when it's true. */
export function looksArabic(text: string | null | undefined): boolean {
  return !!text && ARABIC_SCRIPT.test(text);
}
