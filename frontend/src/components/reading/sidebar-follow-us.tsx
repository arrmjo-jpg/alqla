import { RssIcon } from '@/components/icons';
import { socialEntries } from '@/components/layout/social-map';
import { getSiteSettings } from '@/lib/site-settings';

// «تابع [اسم الموقع] على:» — روابط السوشيل ميديا الحقيقيّة من إعدادات الموقع (لا تلفيق: أيقونة بلا
// رابط مُفعَّل لا تُعرض) + RSS ثابت دايمًا (لا يعتمد على الإعدادات، رابط الموقع نفسه /rss.xml).
export async function SidebarFollowUs({ locale = 'ar' }: { locale?: string } = {}) {
  const settings = await getSiteSettings(locale);
  const socials = socialEntries(settings?.social);
  const siteName = settings?.site_name?.trim() || 'الموقع';

  return (
    <div className="border border-border bg-surface p-4 text-center">
      <p className="mb-3 text-sm font-bold text-fg">تابع {siteName} على:</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <a
          href="/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="RSS"
          title="RSS"
          className="flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <RssIcon size={18} />
        </a>
        {socials.map(({ key, url, Icon, label }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Icon size={18} />
          </a>
        ))}
      </div>
    </div>
  );
}
