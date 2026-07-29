'use client';

import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function FontSizeControls() {
  const [, setFontSize] = useState(20);

  useEffect(() => {
    const saved = localStorage.getItem('article-font-size');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 12 && parsed <= 36) {
        setFontSize(parsed);
        document.documentElement.style.setProperty('--article-font-size', `${parsed}px`);
      }
    }
  }, []);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      // افتراضيّ 20px — 4 درجات تصغير (حتى 12px) و8 درجات تكبير (حتى 36px)، كلّ درجة 2px.
      const next = Math.min(36, Math.max(12, prev + delta));
      localStorage.setItem('article-font-size', String(next));
      document.documentElement.style.setProperty('--article-font-size', `${next}px`);
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSize(20);
    localStorage.setItem('article-font-size', '20');
    document.documentElement.style.setProperty('--article-font-size', '20px');
  };

  return (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-sans select-none print:hidden" dir="rtl">
      <span className="text-muted font-bold me-1">التحكم بالخط:</span>
      <button
        type="button"
        onClick={() => changeFontSize(2)}
        className="flex h-8 w-8 items-center justify-center bg-surface-2 text-fg font-bold transition-colors hover:bg-surface-3 border border-border"
        title="تكبير الخط"
        aria-label="تكبير الخط"
      >
        <ZoomIn className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => changeFontSize(-2)}
        className="flex h-8 w-8 items-center justify-center bg-surface-2 text-fg font-bold transition-colors hover:bg-surface-3 border border-border"
        title="تصغير الخط"
        aria-label="تصغير الخط"
      >
        <ZoomOut className="size-4" />
      </button>
      <button
        type="button"
        onClick={resetFontSize}
        className="flex h-8 w-8 items-center justify-center bg-surface-2 text-fg font-bold transition-colors hover:bg-surface-3 border border-border"
        title="إعادة تعيين الخط"
        aria-label="إعادة تعيين الخط"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}
