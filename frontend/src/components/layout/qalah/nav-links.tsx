'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { NavCategory } from '@/lib/site-settings';

export function QalahNavLinks({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLUListElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);

  const allItems = [
    { name: 'الرئيسية', slug: '', href: '/', id: null },
    ...categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      href: c.id ? `/category-${c.id}/${c.slug}` : `/category/${c.slug}`,
      id: c.id,
    })),
  ];

  const [visibleCount, setVisibleCount] = useState<number>(allItems.length);

  useEffect(() => {
    const measure = () => {
      if (!measureRef.current || !containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth - 10; // 10px buffer
      const children = Array.from(measureRef.current.children) as HTMLElement[];

      let totalWidth = 0;
      let count = 0;
      const moreBtnWidth = 100; // estimated width for "المزيد" button

      for (let i = 0; i < children.length; i++) {
        totalWidth += children[i].offsetWidth;
        if (totalWidth + (i < children.length - 1 ? moreBtnWidth : 0) > containerWidth) {
          break;
        }
        count++;
      }

      setVisibleCount(count === 0 ? 1 : count); // At least show one
    };

    // Delay initial measurement slightly to ensure fonts are loaded
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const visibleItems = allItems.slice(0, visibleCount);
  const hiddenItems = allItems.slice(visibleCount);

  return (
    <div className="relative w-full">
      {/* Invisible ruler for measuring items */}
      <ul
        ref={measureRef}
        className="header-nav-list absolute opacity-0 pointer-events-none whitespace-nowrap"
        style={{ top: 0, right: 0, display: 'flex', width: 'max-content' }}
        aria-hidden
      >
        {allItems.map((item) => (
          <li key={item.slug || 'home'} className="header-nav-item">
            <Link href={item.href}>{item.name}</Link>
          </li>
        ))}
      </ul>

      {/* Actual visible items */}
      <ul ref={containerRef} className="header-nav-list">
        {visibleItems.map((item) => {
          const decodedPath = decodeURIComponent(pathname);
          const isActive =
            (item.slug === '' && pathname === '/') ||
            (item.slug !== '' &&
              (decodedPath === item.href ||
                (item.id && decodedPath === `/category-${item.id}/${encodeURIComponent(item.slug)}`)));

          return (
            <li key={item.slug || 'home'} className={`header-nav-item ${isActive ? 'active' : ''}`}>
              <Link href={item.href}>{item.name}</Link>
            </li>
          );
        })}

        {hiddenItems.length > 0 && (
          <li className="header-nav-item relative group">
            <button className="flex items-center gap-1 font-bold text-[#333] hover:text-primary transition-colors px-2 py-1 outline-none">
              المزيد <ChevronDown className="size-4" />
            </button>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block bg-white shadow-xl border border-gray-100 rounded-md py-2 min-w-[200px] z-[60]">
              {hiddenItems.map((item) => {
                const decodedPath = decodeURIComponent(pathname);
                const isActive =
                  decodedPath === item.href ||
                  (item.id && decodedPath === `/category-${item.id}/${encodeURIComponent(item.slug)}`);

                return (
                  <Link
                    key={item.slug}
                    href={item.href}
                    className={`block px-4 py-2 text-base font-bold hover:bg-gray-50 hover:text-primary transition-colors ${
                      isActive ? 'text-primary bg-red-50/50' : 'text-[#333]'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
