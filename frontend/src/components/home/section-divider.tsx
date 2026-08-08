'use client';

import { useEffect, useRef } from 'react';

// يزيل الـ margin-top الخاصّ بالقسم التالي (mt-6 / sm:mt-8 …) حتى تبقى المسافة أسفل الخط
// 5px ثابتة دائمًا. يتخطّى وسوم <template> — علامات حدود الـ Suspense أثناء الـ streaming —
// ويُعاد التحقّق عبر MutationObserver لأنّ ترتيب/وجود هذه الوسوم قد يتغيّر بعد الترطيب (hydration).
function neutralizeNextMargin(el: HTMLElement) {
  let next = el.nextElementSibling as HTMLElement | null;
  while (next && next.tagName === 'TEMPLATE') {
    next = next.nextElementSibling as HTMLElement | null;
  }
  if (next && next.style.marginTop !== '0px') {
    next.style.marginTop = '0px';
  }
}

// فاصل بصري بين أقسام الصفحة الرئيسية فقط — خط أحمر بعرض الحاوية بالكامل،
// بمسافة ثابتة 10px فوق وتحت الخط لكل الأقسام دون استثناء.
export function SectionDivider() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;

    neutralizeNextMargin(el);
    const observer = new MutationObserver(() => neutralizeNextMargin(el));
    observer.observe(el.parentElement, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full py-[10px]">
      <div aria-hidden="true" className="h-[3px] w-full bg-primary" />
    </div>
  );
}
