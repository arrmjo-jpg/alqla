import Link from 'next/link';

import { SiteLogo } from '@/components/branding/site-logo';
import { getNavCategories, getSiteSettings } from '@/lib/site-settings';
import { getStaticPages } from '@/lib/static-pages';

import { socialEntries } from '../social-map';
import { QalahHeaderAuth } from './header-auth';
import { QalahMenu } from './menu';
import { QalahNavLinks } from './nav-links';
import { QalahSearch } from './search';
import { QalahSearchModal } from './search-modal';

// هيدر التصميم الجديد. مربوط بالكامل (سوشال/شعار/أقسام من الإعدادات/الـCMS، المستخدم من الجلسة).
// سطح المكتب: الصفّ العلويّ = سوشال؛ الصفّ الرئيسيّ = شعار + (بث/بحث/إشعارات/حساب) + صفّ الأقسام.
// الموبايل (CSS): الصفّ العلويّ = سوشال + (أيقونة بحث-مودال/إشعارات/حساب)؛ الصفّ الرئيسيّ = هامبرغر + شعار فقط.
export async function QalahHeader() {
  const [navCategories, pages, settings] = await Promise.all([
    getNavCategories(),
    getStaticPages('footer'),
    getSiteSettings(),
  ]);
  const social = socialEntries(settings?.social);
  const staticPages = pages.map((p) => ({ id: p.id, title: p.title, href: p.href }));

  return (
    <header className="site-header">
      {/* صفّ 1: السوشال + (على الموبايل) أيقونة بحث-مودال + إشعارات + حساب */}
      <div className="header-top-row">
        <div className="qn-mobile-actions">
          <QalahSearchModal />
          <QalahHeaderAuth />
        </div>
        {social.length > 0 && (
          <div className="header-socials">
            {social.map(({ key, url, Icon, label }) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}>
                <Icon className="size-4" aria-hidden />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* صفّ 3: أقسام الموقع التحريريّة من الـCMS (مخفيّ على الموبايل — موجود في القائمة الجانبيّة) */}
      {navCategories.length > 0 && (
        <div className="header-nav-row">
          <QalahNavLinks categories={navCategories} />
        </div>
      )}

      {/* صفّ 2: الهامبرغر + الشعار | (سطح المكتب) البث + البحث + الإشعارات + الحساب */}
      <div className="header-main-row">
        <div className="header-logo-group">
          <QalahMenu staticPages={staticPages} categories={navCategories} social={settings?.social} />
          <Link href="/" className="header-logo-link" aria-label="الصفحة الرئيسية">
            <SiteLogo variant="light" className="header-logo-img" priority />
          </Link>
        </div>

        <div className="header-action-group">
          <Link href="/live" className="header-live-btn">
            <span className="live-dot" />
            بث مباشر
          </Link>
          <QalahSearch />
          <QalahHeaderAuth />
        </div>
      </div>
    </header>
  );
}
