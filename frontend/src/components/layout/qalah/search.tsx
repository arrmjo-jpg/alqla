'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// بحث الهيدر (تصميم القلعة) — يوجّه إلى /search?q= بدل alert التصميم الأصليّ.
export function QalahSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <form className="header-search-wrap" onSubmit={onSubmit} role="search">
      <input
        type="text"
        className="header-search-input"
        placeholder="ابحث..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="ابحث في الموقع"
      />
      <button type="submit" className="header-search-icon" aria-label="بحث">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  );
}
