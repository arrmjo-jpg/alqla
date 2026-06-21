'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// بوّابة عميل: تعرض أبناءها على الصفحة الرئيسية فقط (المسار "/")، وتُخفيها على باقي صفحات الموقع.
// تتحدّث مع التنقّل (usePathname)، فلا يُركَّب الإعلان/لا يُجلب إلّا على الرئيسية. تُستعمل لإعلان بداية الموقع.
export function HomeOnly({ children }: { children: ReactNode }) {
  return usePathname() === '/' ? <>{children}</> : null;
}
