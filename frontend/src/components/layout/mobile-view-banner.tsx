'use client';

import { useEffect, useState } from 'react';

import { isForcedDesktop, setForcedDesktop } from '@/lib/site-view';

// شريط فوق الهيدر (يظهر على الموبايل فقط) — مكان واحد يغطّي الاتجاهين: تفعيل «النسخة الكاملة»
// أو الرجوع منها لنسخة الجوال، بدل زر بالمنيو + زر عائم منفصل. لا يُخفى بـlg:hidden وقت أن تكون
// «النسخة الكاملة» مفعّلة، لأنه لو اختفى فور التفعيل ما ضلّت في طريقة للرجوع منه.
export function MobileViewBanner() {
  const [forced, setForced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setForced(isForcedDesktop());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`flex justify-center border-b border-border bg-surface-2 px-4 py-2 ${forced ? '' : 'lg:hidden'}`}
    >
      <button
        type="button"
        onClick={() => setForcedDesktop(!forced)}
        className="text-sm font-bold text-primary transition-opacity hover:opacity-80"
      >
        {forced ? 'عرض نسخة الجوال' : 'عرض النسخة الكاملة'}
      </button>
    </div>
  );
}
