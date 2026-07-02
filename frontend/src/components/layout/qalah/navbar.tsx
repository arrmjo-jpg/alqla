'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SECTIONS_NAV } from '../nav-data';
import { socialEntries } from '../social-map';

// الشريط الأسود العلويّ (تصميم القلعة الجديد) — أيقونات السوشال (outline فاتح، جهة البداية) + روابط الوسائط/الخدمات
// من nav-data (فيديوهات/ريلز/بث/جدول الرياضة/بورصة عمّان/أسعار الذهب/الطقس). usePathname للحالة النشطة.
// ديسكتوب فقط (يُخفى ≤1023px)؛ على الجوّال تبقى السوشال في صفّ الهيدر العلويّ.
export function QalahNavbar({ social }: { social?: Record<string, string> | null }) {
  const pathname = usePathname();
  const socials = socialEntries(social);

  return (
    <nav className="navbar" aria-label="الشريط العلوي">
      {socials.length > 0 && (
        <div className="navbar-socials">
          {socials.map(({ key, url, Icon, label }) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}>
              <Icon className="size-3.5" aria-hidden />
            </a>
          ))}
        </div>
      )}
      <ul className="navbar-nav">
        {SECTIONS_NAV.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className={`navbar-item ${isActive ? 'active' : ''}`}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          );
        })}
      </ul>
      <div className="navbar-lang">
        <Link href="/en">English</Link>
      </div>
    </nav>
  );
}
