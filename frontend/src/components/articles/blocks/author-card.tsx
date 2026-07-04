import Link from 'next/link';
import { PenLine, ExternalLink, BookOpen } from 'lucide-react';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';
import { editorialTypography } from '@/lib/design-tokens';

interface AuthorCardProps {
  author: {
    id: number | null;
    name: string;
    bio: string | null;
    avatar: string | null;
    isWriter: boolean;
    role: string | null;
    articlesCount: number;
  } | null;
  latestArticles?: FeedItem[];
}

function translateRole(role: string | null): string {
  if (!role) return 'كاتب';
  const mapping: Record<string, string> = {
    super_admin: 'مدير النظام',
    editor: 'محرر رئيسي',
    reviewer: 'مراجع المحتوى',
    moderator: 'مشرف القسم',
    social_media_manager: 'مسؤول شبكات التواصل',
    journalist: 'صحفي كاتب',
    contributor: 'مساهم',
    writer: 'كاتب مقال',
  };
  return mapping[role] ?? 'كاتب';
}

export function AuthorCard({ author, latestArticles = [] }: AuthorCardProps) {
  if (!author) return null;

  const writerHref = author.isWriter && author.id ? `/writer/${author.id}` : null;
  const roleName = translateRole(author.role);

  return (
    <section className="bg-surface-2 border border-border/80 p-6 my-8 print:hidden" aria-labelledby="author-card-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {/* Avatar */}
        <div className="size-20 sm:size-24 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-4 ring-background mx-auto sm:mx-0">
          {author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar img
            <img src={author.avatar} alt={author.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted" aria-hidden>
              <PenLine className="size-10" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 text-center sm:text-right">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className={`${editorialTypography.aside} text-primary px-2.5 py-0.5 bg-primary/10 rounded-full inline-flex items-center gap-1.5`}>
                <PenLine className="size-3" aria-hidden />
                <span>{roleName}</span>
              </span>
              <h3 id="author-card-title" className="mt-2 text-lg font-extrabold text-fg sm:text-xl">
                {writerHref ? (
                  <Link href={writerHref} className="hover:text-primary hover:underline transition-colors min-h-[44px] inline-flex items-center">
                    {author.name}
                  </Link>
                ) : (
                  author.name
                )}
              </h3>
            </div>

            {/* Articles count & Link */}
            {writerHref && (
              <div className="text-xs text-muted font-bold flex items-center justify-center sm:justify-end gap-1.5 mt-1 sm:mt-0 select-none">
                <BookOpen className="size-4 text-primary" />
                <span>المقالات: {author.articlesCount}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mt-3 text-sm text-muted leading-relaxed font-sans">
            {author.bio ? (
              <p className="line-clamp-3">{author.bio}</p>
            ) : (
              <p className="italic">صحفي ومحرر في منصتنا، يغطي الشؤون المحلية والإقليمية.</p>
            )}
          </div>

          {/* Action Link to Profile */}
          {writerHref && (
            <div className="mt-4 flex justify-center sm:justify-start">
              <Link
                href={writerHref}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-opacity hover:opacity-85 min-h-[44px] px-2 py-1 -mx-2 -my-1 rounded hover:bg-primary/5"
              >
                <span>جميع مقالات الكاتب</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Latest Articles list */}
      {latestArticles.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h4 className={`${editorialTypography.aside} mb-4 block`}>
            أحدث كتابات الكاتب:
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {latestArticles.map((art) => (
              <Link
                key={art.href}
                href={art.href}
                className="group flex gap-4 p-4 bg-surface border border-border hover:border-primary/50 transition-colors rounded-none min-h-[80px]"
              >
                {art.image && (
                  <div className="aspect-[16/9] w-24 shrink-0 overflow-hidden bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- list preview */}
                    <img
                      src={art.image}
                      alt={art.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <h5 className="line-clamp-2 text-sm font-extrabold leading-snug text-fg group-hover:text-primary transition-colors">
                    {art.title}
                  </h5>
                  {art.publishedAt && (
                    <time dateTime={art.publishedAt} className="block text-[10px] text-muted font-bold mt-1">
                      {formatRelativeTime(art.publishedAt)}
                    </time>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
