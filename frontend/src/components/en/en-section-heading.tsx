import Link from 'next/link';

import { TripleChevron } from '@/components/ui/section-more-link';

// Section heading — serif title on a strong top rule, with an optional "More" link on the
// opposite side of the same row.
export function EnSectionHeading({ title, viewAllHref }: { title: string; viewAllHref?: string | null }) {
  return (
    <div className="en-section-head">
      <h2 className="en-section-title">{title}</h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="en-section-viewall">
          <span>More</span>
          <TripleChevron className="en-section-viewall__icon" />
        </Link>
      ) : null}
    </div>
  );
}
