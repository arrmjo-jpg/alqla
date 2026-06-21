'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import {
  ChevronLeftIcon,
  CloseIcon,
  CloudSunIcon,
  CoinsIcon,
  FilmIcon,
  GridIcon,
  RadioIcon,
  TrendingUpIcon,
  TrophyIcon,
  VideoIcon,
} from '@/components/icons';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { SECTIONS_NAV } from '../nav-data';
import { socialEntries } from '../social-map';

export type QalahMenuPage = { id: number; title: string; href: string };
export type QalahMenuCategory = { name: string; slug: string };

// أيقونة لكلّ خدمة بحسب رابطها — ترفع وضوح القائمة وأناقتها.
const SERVICE_ICON: Record<string, typeof VideoIcon> = {
  '/videos': VideoIcon,
  '/reels': FilmIcon,
  '/live': RadioIcon,
  '/sport': TrophyIcon,
  '/bourse': TrendingUpIcon,
  '/gold-prices': CoinsIcon,
  '/weather': CloudSunIcon,
};

// هامبرغر التصميم (ظاهر على كل القياسات) → درج جانبيّ راقٍ (Radix Sheet: حبس التركيز + Escape +
// قفل التمرير + انزلاق ناعم). رأس بتدرّج الهويّة، خدمات بأيقونات، أقسام تحريريّة، صفحات، وتذييل سوشال.
// على الموبايل هذه القائمة هي مصدر التنقّل الوحيد (الشريط الأسود وصفّ الأقسام مخفيّان).
export function QalahMenu({
  staticPages = [],
  categories = [],
  social,
}: {
  staticPages?: QalahMenuPage[];
  categories?: QalahMenuCategory[];
  social?: Record<string, string> | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const socials = socialEntries(social);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="hamburger-btn" aria-label="القائمة الجانبية">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </SheetTrigger>

      <SheetContent side="start" className="gap-0 p-0">
        {/* رأس مُهيّب بتدرّج الهويّة + دوائر زخرفيّة شفّافة + زرّ إغلاق مصقول */}
        <div
          className="relative shrink-0 overflow-hidden px-5 py-5 text-white"
          style={{ background: 'linear-gradient(135deg, #850000 0%, #5c0000 100%)' }}
        >
          <span className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-white/[0.06]" aria-hidden />
          <span className="pointer-events-none absolute end-12 top-9 size-16 rounded-full bg-white/[0.05]" aria-hidden />
          <div className="relative flex items-start justify-between">
            <div>
              <SheetTitle className="font-heading text-xl font-extrabold text-white">القائمة</SheetTitle>
              <p className="mt-1 text-xs text-white/75">كافة الاقسام</p>
            </div>
            <SheetClose
              aria-label="إغلاق"
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              <CloseIcon className="size-5" aria-hidden />
            </SheetClose>
          </div>
        </div>

        <nav aria-label="التنقّل" className="flex flex-1 flex-col overflow-y-auto p-3">
          {/* خدمات وأقسام — صفوف بأيقونات */}
          <SectionLabel>خدمات وأقسام</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {SECTIONS_NAV.map((item) => {
              const Icon = SERVICE_ICON[item.href] ?? GridIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-fg">{item.label}</span>
                  <ChevronLeftIcon
                    className="size-4 -translate-x-1 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>

          {/* الأقسام التحريريّة (CMS) — صفوف بنقطة تكبر وتحمرّ عند المرور */}
          {categories.length > 0 && (
            <>
              <SectionLabel>الأقسام</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    onClick={close}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-border transition-all group-hover:scale-150 group-hover:bg-primary" aria-hidden />
                    <span className="flex-1 text-[15px] font-medium text-fg transition-colors group-hover:text-primary">{c.name}</span>
                    <ChevronLeftIcon
                      className="size-4 -translate-x-1 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* صفحات ثابتة — أصغر وأخفت */}
          {staticPages.length > 0 && (
            <>
              <SectionLabel>صفحات</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {staticPages.map((p) => (
                  <Link
                    key={p.id}
                    href={p.href}
                    onClick={close}
                    className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* تذييل: تابعنا (روابط السوشال) */}
        {socials.length > 0 && (
          <div className="shrink-0 border-t border-border px-4 py-3.5">
            <p className="mb-2 px-1 text-xs font-bold text-muted">تابعنا على</p>
            <div className="flex flex-wrap items-center gap-2">
              {socials.map(({ key, url, Icon, label }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-fg transition-colors hover:border-primary hover:bg-primary hover:text-white"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// عنوان قسم: شريط أحمر صغير + نصّ متباعد خافت.
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 flex items-center gap-2 px-3 first:mt-0">
      <span className="h-3.5 w-1 rounded-full bg-primary" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{children}</span>
    </div>
  );
}
