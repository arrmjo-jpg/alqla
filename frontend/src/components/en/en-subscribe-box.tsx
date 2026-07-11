import { getStaticPages } from '@/lib/static-pages';

import { EnSubscribeBoxCard } from './en-subscribe-box-card';

// Fork of subscribe-box-section.tsx — card variant only (the 'bar' variant is homepage-specific,
// out of scope for the article page). Same terms/privacy CMS-page lookup, locale='en'.
export async function EnSubscribeBoxSection() {
  const pages = await getStaticPages('footer', 'en');
  const terms = pages.find((p) => /terms/i.test(p.title)) ?? null;
  const privacy = pages.find((p) => /privacy/i.test(p.title)) ?? null;

  return (
    <EnSubscribeBoxCard
      termsHref={terms?.href ?? null}
      termsLabel={terms?.title ?? null}
      privacyHref={privacy?.href ?? null}
      privacyLabel={privacy?.title ?? null}
    />
  );
}
