interface OptimizedImageProps {
  cover?: {
    url: string;
    thumb?: string | null;
    medium?: string | null;
    alt?: string | null;
  } | null;
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

// صورة متجاوبة أداءً — **`<img>` أصيل عمدًا** (لا next/image): روابط وسائط الباك إند مطلقة وعبر أصل
// خارجيّ، وليس هناك إعداد `images` في next.config، فـnext/image يرفضها/يكسرها. النسخة الأصيلة تعمل مع أيّ
// رابط بلا إعداد، وتحافظ على تحسين الأداء عبر `srcSet` (thumb 400w / medium 1024w / url 2048w) + `sizes`.
export function OptimizedImage({
  cover,
  src,
  alt,
  className,
  priority,
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: OptimizedImageProps) {
  const mainSrc = cover?.medium ?? cover?.url ?? src ?? '';

  if (!mainSrc) {
    return <div className="absolute inset-0 size-full bg-surface-3" aria-hidden />;
  }

  const srcSet =
    cover && (cover.thumb || cover.medium)
      ? [
          cover.thumb ? `${cover.thumb} 400w` : null,
          cover.medium ? `${cover.medium} 1024w` : null,
          cover.url ? `${cover.url} 2048w` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: روابط الباك إند المطلقة + بلا إعداد next/image
    <img
      src={mainSrc}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={cover?.alt ?? alt ?? ''}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
