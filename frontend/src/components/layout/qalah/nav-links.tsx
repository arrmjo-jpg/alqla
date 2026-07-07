'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavCategory } from '@/lib/site-settings';

export function QalahNavLinks({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();

  return (
    <ul className="header-nav-list">
      <li className={`header-nav-item ${pathname === '/' ? 'active' : ''}`}>
        <Link href="/">الرئيسية</Link>
      </li>
      {categories.map((c) => {
        const href = c.id ? `/category-${c.id}/${c.slug}` : `/category/${c.slug}`;
        const decodedPath = decodeURIComponent(pathname);
        const isActive =
          decodedPath === href ||
          decodedPath === `/category-${c.id}/${encodeURIComponent(c.slug)}`;
        return (
          <li key={c.slug} className={`header-nav-item ${isActive ? 'active' : ''}`}>
            <Link href={href}>{c.name}</Link>
          </li>
        );
      })}
    </ul>
  );
}
