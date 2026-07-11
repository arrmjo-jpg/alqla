'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

// Fork of components/articles/blocks/font-size-controls.tsx — same persisted-size logic
// (localStorage + --article-font-size custom property), English label, no forced dir.
export function EnFontSizeControls() {
  const [, setFontSize] = useState(19);

  useEffect(() => {
    const saved = localStorage.getItem('article-font-size');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 15 && parsed <= 27) {
        setFontSize(parsed);
        document.documentElement.style.setProperty('--article-font-size', `${parsed}px`);
      }
    }
  }, []);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(27, Math.max(15, prev + delta));
      localStorage.setItem('article-font-size', String(next));
      document.documentElement.style.setProperty('--article-font-size', `${next}px`);
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSize(19);
    localStorage.setItem('article-font-size', '19');
    document.documentElement.style.setProperty('--article-font-size', '19px');
  };

  return (
    <div className="en-fontsize" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="en-meta" style={{ marginInlineEnd: 4 }}>Text size:</span>
      <button type="button" onClick={() => changeFontSize(2)} className="en-tool-btn" style={{ width: 32, height: 32 }} title="Increase text size" aria-label="Increase text size">
        <ZoomIn size={15} />
      </button>
      <button type="button" onClick={() => changeFontSize(-2)} className="en-tool-btn" style={{ width: 32, height: 32 }} title="Decrease text size" aria-label="Decrease text size">
        <ZoomOut size={15} />
      </button>
      <button type="button" onClick={resetFontSize} className="en-tool-btn" style={{ width: 32, height: 32 }} title="Reset text size" aria-label="Reset text size">
        <RotateCcw size={13} />
      </button>
    </div>
  );
}
