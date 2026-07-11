'use client';

import { useEffect, useState } from 'react';

import type { Heading } from '@/lib/reading';

// Fork of components/reading/table-of-contents.tsx — identical scroll-spy logic
// (IntersectionObserver over server-extracted heading ids), English label.
export function EnTableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActive(topmost.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="en-toc">
      <p className="en-toc__title">On this page</p>
      <ul className="en-toc__list">
        {headings.map((h) => {
          const isActive = active === h.id;
          return (
            <li key={h.id} className={h.level === 3 ? 'en-toc__item en-toc__item--sub' : 'en-toc__item'}>
              <a href={`#${h.id}`} aria-current={isActive ? 'true' : undefined} className={isActive ? 'en-toc__link en-toc__link--active' : 'en-toc__link'}>
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
