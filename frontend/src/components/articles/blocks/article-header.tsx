import { LivePulse } from '@/components/ui/live-pulse';
import { editorialTypography } from '@/lib/design-tokens';

interface ArticleHeaderProps {
  title: string;
  subtitle: string | null;
  isLive: boolean;
  isOpinion: boolean;
  breaking: boolean;
  featured: boolean;
}

export function ArticleHeader({
  title,
  subtitle,
  isLive,
  isOpinion,
  breaking,
  featured,
}: ArticleHeaderProps) {
  const hasFlags = isLive || breaking || featured || isOpinion;

  return (
    <header className="mb-3">
      {/* Flags & Badges */}
      {hasFlags && (
        <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-primary">
              <LivePulse />
              <span>مباشر الآن</span>
            </span>
          )}
          {breaking && (
            <span className="px-3 py-1 text-xs font-bold text-white bg-[#dc2626] animate-pulse">
              عاجل
            </span>
          )}
          {featured && (
            <span className="px-3 py-1 text-xs font-bold text-white bg-primary">
              تغطية خاصة
            </span>
          )}
          {isOpinion && (
            <span className="px-3 py-1 text-xs font-bold text-fg bg-surface-3">
              رأي
            </span>
          )}
        </div>
      )}

      {/* Main H1 Title — show subtitle as H1 if available, otherwise main title */}
      <h1 className={`${editorialTypography.h1} editorial-h1`}>
        {subtitle || title}
      </h1>
    </header>
  );
}
