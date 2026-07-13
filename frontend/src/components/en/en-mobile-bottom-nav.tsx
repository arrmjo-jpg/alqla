'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, CloudSun, Home, Trophy, Video } from 'lucide-react';

// Fork of components/layout/mobile-bottom-nav.tsx — identical structure/logic; English labels,
// Home points at /en. Icons are locale-agnostic (lucide-react), reused as-is.
const TABS: { label: string; href: string; Icon: typeof Home }[] = [
  { label: 'Home', href: '/en', Icon: Home },
  { label: 'Reels', href: '/reels', Icon: Clapperboard },
  { label: 'Videos', href: '/videos', Icon: Video },
  { label: 'Sports', href: '/sport', Icon: Trophy },
  { label: 'Weather', href: '/weather', Icon: CloudSun },
];

export function EnMobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      dir="ltr"
      aria-label="Bottom navigation"
      className="en-mobile-bottom-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="en-mobile-bottom-nav__list">
        {TABS.map(({ label, href, Icon }) => {
          const active = href === '/en' ? pathname === '/en' : pathname.startsWith(href);
          return (
            <li key={href} className="en-mobile-bottom-nav__item">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`en-mobile-bottom-nav__link${active ? ' en-mobile-bottom-nav__link--active' : ''}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
