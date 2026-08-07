'use client';

interface MediaVideoProps {
  kind?: string | null;
  src?: string | null;
  embedUrl?: string | null;
  poster?: string | null;
  title: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
}

// عنصر عرض فيديو مشترك: فيديو خارجي (kind === 'external') ⇒ iframe بالـ embed_url الجاهز من الباك إند
// (Source of Truth — لا نستنتج النوع من الـ url أو الـ mime). غير ذلك ⇒ <video> بملف مباشر.
export function MediaVideo({
  kind,
  src,
  embedUrl,
  poster,
  title,
  autoPlay = false,
  controls = true,
  className,
  onPlay,
}: MediaVideoProps) {
  if (kind === 'external') {
    if (!embedUrl) return null;
    return (
      <iframe
        className={className}
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (!src) return null;

  return (
    <video
      src={src}
      controls={controls}
      autoPlay={autoPlay}
      poster={poster ?? undefined}
      playsInline
      className={className}
      onPlay={onPlay}
    />
  );
}
