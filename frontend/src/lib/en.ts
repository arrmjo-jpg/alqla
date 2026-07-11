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
