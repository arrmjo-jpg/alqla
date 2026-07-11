'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Fork of components/writers/writers-search-box.tsx — identical debounced router-push search
// logic, English placeholder/aria-label instead of hardcoded Arabic + forced dir="rtl".
export function EnWritersSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams?.get('q') || '');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString());
      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, router, pathname, searchParams]);

  useEffect(() => {
    setQuery(searchParams?.get('q') || '');
  }, [searchParams]);

  return (
    <div className="en-writers-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a writer, editor, or correspondent…"
        aria-label="Search writers"
      />
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx={11} cy={11} r={8} />
        <path strokeLinecap="round" d="m21 21-4.3-4.3" />
      </svg>
    </div>
  );
}
