import React from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/format';
import { editorialTypography } from '@/lib/design-tokens';

interface MetadataRowProps {
  category: { name: string; slug: string } | null;
  publishedAt: string | null;
  readingTime: number;
  author: { id: number | null; name: string; isWriter: boolean } | null;
}

export function ArticleMetadata({
  category,
  publishedAt,
  readingTime,
  author,
}: MetadataRowProps) {
  const writerHref = author?.isWriter && author.id ? `/writer/${author.id}` : null;

  // Formatting dates (relative and absolute)
  const formatFullDateTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
    }).format(d);
  };

  const pubDateAbs = publishedAt ? formatFullDateTime(publishedAt) : null;
  const pubDateRel = publishedAt ? formatRelativeTime(publishedAt) : null;

  // Format reading time pluralization
  const getReadingTimeStr = (mins: number) => {
    if (mins === 1) return 'دقيقة واحدة';
    if (mins === 2) return 'دقيقتان';
    if (mins >= 3 && mins <= 10) return `${mins} دقائق قراءة`;
    return `${mins} دقيقة قراءة`;
  };

  // Build sequential metadata items array dynamically for clean bullet separation
  const items: React.ReactNode[] = [];

  if (category) {
    items.push(
      <Link
        key="category"
        href={`/category/${encodeURIComponent(category.slug)}`}
        className="text-primary hover:underline transition-colors font-extrabold"
      >
        {category.name}
      </Link>
    );
  }

  if (pubDateRel) {
    items.push(
      <span key="pubDateRel" className="text-fg font-semibold">
        {pubDateRel}
      </span>
    );
  }

  if (pubDateAbs) {
    items.push(
      <time key="pubDateAbs" dateTime={publishedAt ?? undefined} className="text-muted font-medium">
        {pubDateAbs}
      </time>
    );
  }

  if (readingTime > 0) {
    items.push(
      <span key="readingTime" className="text-muted font-medium">
        {getReadingTimeStr(readingTime)}
      </span>
    );
  }

  if (author) {
    items.push(
      <div key="author" className="flex items-center gap-1">
        <span className="text-muted/70 font-medium">بقلم:</span>
        {writerHref ? (
          <Link href={writerHref} className="text-fg font-bold hover:text-primary hover:underline transition-colors">
            {author.name}
          </Link>
        ) : (
          <span className="text-fg font-bold">{author.name}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`${editorialTypography.meta} editorial-meta border-y border-border/80 py-2.5 my-3`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-muted/40 px-1 font-normal select-none" aria-hidden>•</span>}
          {item}
        </React.Fragment>
      ))}
    </div>
  );
}
