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

import { EnDesktopViewToggle } from './en-desktop-view-toggle';
import { EN_MEDIA_NAV, enSocialLabel } from '@/lib/en';
import { socialEntries } from '@/components/layout/social-map';

export type EnMenuCategory = { id?: number | null; name: string; slug: string };

// Fork of components/layout/qalah/menu.tsx — same Sheet structure, English copy, EN_MEDIA_NAV
// instead of SECTIONS_NAV. AR's hamburger shows at all sizes (not mobile-only, per its own
// comment); mirrored here the same way via EnHeader's trigger placement.
const SERVICE_ICON: Record<string, typeof VideoIcon> = {
  '/videos': VideoIcon,
  '/reels': FilmIcon,
  '/live': RadioIcon,
  '/sport': TrophyIcon,
  '/bourse': TrendingUpIcon,
  '/gold-prices': CoinsIcon,
  '/weather': CloudSunIcon,
};

export function EnMenu({
  categories = [],
  social,
}: {
  categories?: EnMenuCategory[];
  social?: Record<string, string> | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const socials = socialEntries(social);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="en-hamburger-btn" aria-label="Menu">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </SheetTrigger>

      <SheetContent side="start" className="gap-0 p-0" dir="ltr">
        {/* Language switch — its own full-height bar (not squeezed into the title row), so the
            black background always fills the whole strip instead of just hugging the text. */}
        <div className="en-menu-lang-bar">
          <Link href="/" className="en-menu-lang-bar__link" aria-label="التبديل إلى العربية">العربية</Link>
        </div>

        <div className="relative shrink-0 overflow-hidden en-menu-header">
          <span className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-white/[0.06]" aria-hidden />
          <span className="pointer-events-none absolute end-12 top-9 size-16 rounded-full bg-white/[0.05]" aria-hidden />
          <div className="relative flex items-start justify-between">
            <div>
              <SheetTitle className="font-heading text-xl font-extrabold text-white">Menu</SheetTitle>
              <p className="mt-1 text-xs text-white/75">All sections</p>
            </div>
            <SheetClose
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              <CloseIcon className="size-5" aria-hidden />
            </SheetClose>
          </div>
        </div>

        <nav aria-label="Navigation" className="flex flex-1 flex-col overflow-y-auto p-3">
          <SectionLabel>Services & sections</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {EN_MEDIA_NAV.map((item) => {
              const Icon = SERVICE_ICON[item.href] ?? GridIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#b90000]/10 text-[#b90000] transition-colors group-hover:bg-[#b90000] group-hover:text-white">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-fg">{item.label}</span>
                  <ChevronLeftIcon
                    className="size-4 translate-x-1 rotate-180 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>

          {categories.length > 0 && (
            <>
              <SectionLabel>Categories</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={c.id ? `/en/category-${c.id}/${c.slug}` : `/en/category/${c.slug}`}
                    onClick={close}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-border transition-all group-hover:scale-150 group-hover:bg-[#b90000]" aria-hidden />
                    <span className="flex-1 text-[15px] font-medium text-fg transition-colors group-hover:text-[#b90000]">{c.name}</span>
                    <ChevronLeftIcon
                      className="size-4 translate-x-1 rotate-180 text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-border px-5 py-4 flex justify-center bg-surface-2/40">
          <EnDesktopViewToggle className="w-full" />
        </div>

        {socials.length > 0 && (
          <div className="shrink-0 border-t border-border px-4 py-3.5">
            <p className="mb-2 px-1 text-xs font-bold text-muted">Follow us</p>
            <div className="flex flex-wrap items-center gap-2">
              {socials.map(({ key, url, Icon }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={enSocialLabel(key)}
                  title={enSocialLabel(key)}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-fg transition-colors hover:border-[#b90000] hover:bg-[#b90000] hover:text-white"
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 flex items-center gap-2 px-3 first:mt-0">
      <span className="h-3.5 w-1 rounded-full bg-[#b90000]" aria-hidden />
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{children}</span>
    </div>
  );
}
