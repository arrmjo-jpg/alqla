'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// بحث الموبايل: أيقونة تفتح مودالًا (overlay) فيه حقل بحث يوجّه إلى /search?q=.
// تُستعمل في الصفّ العلويّ (مع السوشال/الإشعارات/الحساب) بدل صندوق البحث المضمّن.
export function QalahSearchModal() {
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
      <button type="button" className="header-icon-btn" aria-label="بحث" onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {open && (
        <div className="qn-search-overlay" role="dialog" aria-modal="true" aria-label="البحث" onClick={() => setOpen(false)}>
          <div className="qn-search-panel" onClick={(e) => e.stopPropagation()}>
            <form className="qn-search-form" onSubmit={submit}>
              <input
                ref={inputRef}
                type="text"
                className="qn-search-field"
                placeholder="ابحث في الموقع..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="ابحث في الموقع"
              />
              <button type="submit" className="qn-search-submit">بحث</button>
            </form>
            <button type="button" className="qn-search-close" aria-label="إغلاق" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
