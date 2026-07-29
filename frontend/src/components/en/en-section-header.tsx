import Link from 'next/link';

import { TripleChevron } from '@/components/ui/section-more-link';

// Fork of components/home/section-header.tsx — the shared AR homepage section-header pattern
// (red title box + "More" link on the opposite side of the same row + red bottom rule). Distinct
// from EnSectionHeading (this session's earlier serif-underline design) — kept separate rather
// than changing EnSectionHeading everywhere, since only Local News was asked to match this
// specific AR treatment so far.
export function EnSectionHeader({
  title,
  headingId,
  href,
  moreLabel = 'More',
}: {
  title: string;
  headingId?: string;
  href?: string;
  moreLabel?: string;
}) {
  return (
    <div className="en-sechead">
      <h2 id={headingId} className="en-sechead__title">
        {href ? <Link href={href}>{title}</Link> : title}
      </h2>

      {href && (
        <Link href={href} className="en-sechead__more">
          <span>{moreLabel}</span>
          <TripleChevron className="en-sechead__more-icon" />
        </Link>
      )}
    </div>
  );
}
