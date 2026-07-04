'use client';

import { useCallback, useState } from 'react';

// Reading tools: text-size stepper (adjusts .en-prose[data-size]), share
// (Web Share API → clipboard fallback), and print. Client component.
const STEPS = ['s', 'm', 'l'] as const;
type Size = (typeof STEPS)[number];

export function EnReadingTools({ title }: { title: string }) {
  const [size, setSize] = useState<Size>('m');
  const [copied, setCopied] = useState(false);

  const apply = useCallback((s: Size) => {
    setSize(s);
    const el = document.querySelector('.en-prose');
    if (el) el.setAttribute('data-size', s === 'm' ? '' : s);
  }, []);

  const step = (dir: number) => {
    const i = Math.min(STEPS.length - 1, Math.max(0, STEPS.indexOf(size) + dir));
    apply(STEPS[i]);
  };

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="en-tools" role="group" aria-label="Reading tools">
      <button
        type="button"
        className="en-tool-btn"
        onClick={() => step(-1)}
        disabled={size === 's'}
        aria-label="Decrease text size"
        title="Decrease text size"
        style={{ fontSize: '0.78rem' }}
      >
        A&minus;
      </button>
      <button
        type="button"
        className="en-tool-btn"
        onClick={() => step(1)}
        disabled={size === 'l'}
        aria-label="Increase text size"
        title="Increase text size"
        style={{ fontSize: '1.02rem' }}
      >
        A+
      </button>
      <span aria-hidden style={{ width: 1, height: 22, background: 'var(--en-line)', margin: '0 2px' }} />
      <button
        type="button"
        className="en-tool-btn en-tool-btn--wide"
        onClick={share}
        aria-label="Share article"
        title="Share"
      >
        {copied ? 'Copied ✓' : 'Share'}
      </button>
      <button
        type="button"
        className="en-tool-btn"
        onClick={() => window.print()}
        aria-label="Print article"
        title="Print"
      >
        &#9106;
      </button>
    </div>
  );
}
