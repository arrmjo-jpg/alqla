'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Fork of components/layout/qalah/search-modal.tsx — identical behavior, English copy. Redirects
// to the shared /search results page (no dedicated /en/search page exists yet).
export function EnSearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <button type="button" className="en-header-icon-btn" aria-label="Search" onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {open && (
        <div className="en-qn-search-overlay" role="dialog" aria-modal="true" aria-label="Search" onClick={() => setOpen(false)}>
          <div className="en-qn-search-panel" onClick={(e) => e.stopPropagation()}>
            <form className="en-qn-search-form" onSubmit={submit}>
              <input
                ref={inputRef}
                type="text"
                className="en-qn-search-field"
                placeholder="Search the site..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search the site"
              />
              <button type="submit" className="en-qn-search-submit">Search</button>
            </form>
            <button type="button" className="en-qn-search-close" aria-label="Close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
