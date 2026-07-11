import { Clock, History } from 'lucide-react';

import { readingMinutes } from '@/lib/articles';
import { enDate, enRelative, readingLabel } from '@/lib/en';
import type { FaqItem, StaticPageDetail } from '@/lib/static-pages';

import { EnAudioReader } from './en-audio-reader';
import { EnShareButtons } from './en-share-buttons';

// Fork of components/pages/static-page-view.tsx — same quiet text-first hero + body structure.
// English strings ("Last updated:", reading-time label via readingLabel()), enRelative/enDate
// instead of formatRelativeTime/toLocaleDateString('ar'), EnAudioReader/EnShareButtons instead of
// the AR originals. Drops the closing "Have a question? Contact us" CTA (linked to AR-only
// /contact, which has no EN equivalent) — the footer's Contact column covers this instead.
export function EnStaticPageView({
  page,
  contentHtml,
  faqItems,
  shareUrl,
  ttsEnabled,
}: {
  page: StaticPageDetail;
  contentHtml: string;
  faqItems: FaqItem[];
  shareUrl: string;
  ttsEnabled?: boolean;
}) {
  const isFaq = page.template === 'faq' && faqItems.length > 0;
  const minutes = readingMinutes(page.contentHtml);
  const updatedAbsolute = page.updatedAt ? enDate(page.updatedAt) : null;

  return (
    <article>
      <header className="en-static-page__header">
        <h1 className="en-h1">{page.title}</h1>

        {page.seo.description ? <p className="en-lead" style={{ marginTop: 12 }}>{page.seo.description}</p> : null}

        <div className="en-static-page__meta-row">
          {page.updatedAt ? (
            <span className="en-static-page__meta-item">
              <History size={16} aria-hidden />
              <span>Last updated:</span>
              <time dateTime={page.updatedAt} title={updatedAbsolute ?? undefined}>
                {enRelative(page.updatedAt)}
              </time>
            </span>
          ) : null}
          {minutes > 0 ? (
            <span className="en-static-page__meta-item">
              <Clock size={16} aria-hidden />
              {readingLabel(minutes)}
            </span>
          ) : null}
        </div>

        <div className="en-static-page__actions">
          <div>{ttsEnabled ? <EnAudioReader targetId="en-page-content" /> : null}</div>
          <EnShareButtons url={shareUrl} title={page.title} />
        </div>
      </header>

      <div id="en-page-content" className="en-static-page__body">
        {isFaq ? (
          <div className="en-static-page__faq">
            {faqItems.map((item, idx) => (
              <details key={`${idx}-${item.question}`} className="en-static-page__faq-item">
                <summary className="en-static-page__faq-question">
                  {item.question}
                  <span className="en-static-page__faq-chevron" aria-hidden>▾</span>
                </summary>
                {item.answerHtml ? (
                  <div className="en-prose" dangerouslySetInnerHTML={{ __html: item.answerHtml }} />
                ) : null}
              </details>
            ))}
          </div>
        ) : (
          <div className="en-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        )}
      </div>
    </article>
  );
}
