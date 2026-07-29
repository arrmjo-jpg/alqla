'use client';

import { useEffect } from 'react';

// عند نسخ أي نص من أي صفحة بالموقع (خبر/مقال/تغطية خاصة/أي صفحة)، يُضاف رابط الصفحة الحالية تلقائيًّا
// أسفل النص المنسوخ — حماية بسيطة من إعادة النشر بلا مصدر + رجوع الزوار للموقع. لا نص محدَّد ⇒ لا تدخّل
// (السلوك الافتراضي للنسخ يبقى كما هو لأي نسخ غير نصّي).
export function CopyAttribution() {
  useEffect(() => {
    function handleCopy(e: ClipboardEvent) {
      const selection = window.getSelection()?.toString();
      if (!selection || !e.clipboardData) return;

      e.clipboardData.setData('text/plain', `${selection}\n\nالمصدر: ${window.location.href}`);
      e.preventDefault();
    }

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return null;
}
