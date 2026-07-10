import Link from 'next/link';

import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// بطاقة مقال مفردة (مُستخرَجة من قوائم الهوم — نفس الشكل تماماً: صورة 16:9 + عنوان، رابط متراكب).
// مطورة لنظام التصميم التحريري: أهداف لمس واسعة (أكثر من 44px)، وضوح هرمي، إيقاف حركات الهوفر لتسهيل التصفح على الهواتف.
export function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col gap-3 p-3 bg-surface border border-border/60 hover:border-primary/40 transition-colors duration-200">
      {/* 1. Image block - fixed aspect ratio to prevent CLS */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2 select-none">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- performance list image
          <img
            src={item.image}
            alt={item.imageAlt ?? item.title}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
      </div>

      {/* 2. Text Details */}
      <div className="flex flex-col flex-1 min-w-0 justify-between">
        <div>
          <h4 className="line-clamp-2 text-sm sm:text-base font-extrabold leading-snug text-fg group-hover:text-primary transition-colors">
            {/* Link covers the title area with min height to satisfy mobile touch target ergonomics */}
            <Link href={item.href} className="focus:outline-none min-h-[44px] flex items-start pt-1">
              {item.title}
            </Link>
          </h4>
          
          {/* Subtitle (only for opinions) */}
          {item.type === 'opinion' && item.subtitle && (
            <h5 className="text-[13px] font-bold text-primary mt-1 line-clamp-2 leading-relaxed">
              {item.subtitle}
            </h5>
          )}
        </div>
        
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="block text-[10px] sm:text-xs font-bold text-muted mt-2">
            {formatRelativeTime(item.publishedAt)}
          </time>
        )}
      </div>
    </article>
  );
}
