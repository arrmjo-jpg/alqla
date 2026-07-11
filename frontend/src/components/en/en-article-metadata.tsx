import { enDateTime, enRelative } from '@/lib/en';

import { EnFontSizeControls } from './en-font-size-controls';

// Fork of components/articles/blocks/metadata-row.tsx — same structure (relative date, absolute
// date, reading time, separated by bullets, accent bar) + font-size controls on the other side.
// English formatting throughout (enRelative/enDateTime instead of ar-EG Intl formatters).
export function EnArticleMetadata({
  publishedAt,
  readingTime,
}: {
  publishedAt: string | null;
  readingTime: number;
}) {
  const rel = publishedAt ? enRelative(publishedAt) : null;
  const abs = publishedAt ? enDateTime(publishedAt) : null;

  const items: { key: string; node: React.ReactNode }[] = [];
  if (rel) items.push({ key: 'rel', node: <span style={{ color: 'var(--en-primary)', fontWeight: 800 }}>{rel}</span> });
  if (abs) items.push({ key: 'abs', node: <time dateTime={publishedAt ?? undefined} className="en-meta">{abs}</time> });
  if (readingTime > 0) items.push({ key: 'read', node: <span className="en-meta">{readingTime} min read</span> });

  return (
    <div className="en-article-metadata">
      <div className="en-article-metadata__items">
        {items.map((item, idx) => (
          <span key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {idx > 0 && <span style={{ color: 'var(--en-surface-3)' }} aria-hidden>•</span>}
            {item.node}
          </span>
        ))}
      </div>
      <EnFontSizeControls />
    </div>
  );
}
