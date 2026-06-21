import Link from 'next/link';

import { SiteLogo } from '@/components/branding/site-logo';
import { UserIcon } from '@/components/icons';
import { getUnreadCount } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth';
import { getNavCategories, getSiteSettings } from '@/lib/site-settings';
import { getStaticPages } from '@/lib/static-pages';

import { socialEntries } from '../social-map';
import { UserMenu } from '../user-menu';
import { QalahMenu } from './menu';
import { QalahSearch } from './search';
import { QalahSearchModal } from './search-modal';

// هيدر التصميم الجديد. مربوط بالكامل (سوشال/شعار/أقسام من الإعدادات/الـCMS، المستخدم من الجلسة).
// سطح المكتب: الصفّ العلويّ = سوشال؛ الصفّ الرئيسيّ = شعار + (بث/بحث/إشعارات/حساب) + صفّ الأقسام.
// الموبايل (CSS): الصفّ العلويّ = سوشال + (أيقونة بحث-مودال/إشعارات/حساب)؛ الصفّ الرئيسيّ = هامبرغر + شعار فقط.
export async function QalahHeader() {
  const [user, navCategories, pages, settings] = await Promise.all([
    getCurrentUser(),
    getNavCategories(),
    getStaticPages('footer'),
    getSiteSettings(),
  ]);
  const unread = user ? await getUnreadCount() : 0;
  const social = socialEntries(settings?.social);
  const staticPages = pages.map((p) => ({ id: p.id, title: p.title, href: p.href }));

  // الإشعارات + الحساب — يُعاد استخدامهما في صفّ الموبايل العلويّ وفي أكشن الديسكتوب.
  const notifLink = (
    <Link href={user ? '/account/notifications' : '/login'} className="header-icon-btn" aria-label="الإشعارات">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && <span className="red-badge" />}
    </Link>
  );

  // منطقة الحساب: مسجّل ⇒ صورة + قائمة منسدلة (لوحة التحكم/ملفي الشخصي/الإشعارات/مقالاتي/تسجيل الخروج)؛
  // زائر ⇒ أيقونة تسجيل الدخول. UserMenu يعرض صورتك إن توفّرت، وإلّا الحرف الأوّل من اسمك.
  const authArea = user ? (
    <UserMenu name={user.name} avatar={user.avatar ?? null} isWriter={user.is_writer} unread={unread} />
  ) : (
    <Link href="/login" className="header-icon-btn" aria-label="تسجيل الدخول">
      <span className="header-user-avatar">
        <UserIcon className="size-5" aria-hidden />
      </span>
    </Link>
  );

  return (
    <header className="site-header">
      {/* صفّ 1: السوشال + (على الموبايل) أيقونة بحث-مودال + إشعارات + حساب */}
      <div className="header-top-row">
        <div className="qn-mobile-actions">
          <QalahSearchModal />
          {notifLink}
          {authArea}
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
          {notifLink}
          {authArea}
        </div>
      </div>

      {/* صفّ 3: أقسام الموقع التحريريّة من الـCMS (مخفيّ على الموبايل — موجود في القائمة الجانبيّة) */}
      {navCategories.length > 0 && (
        <div className="header-nav-row">
          <ul className="header-nav-list">
            {navCategories.map((c) => (
              <li key={c.slug} className="header-nav-item">
                <Link href={`/category/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
