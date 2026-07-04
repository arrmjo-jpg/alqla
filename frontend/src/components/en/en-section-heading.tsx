import Link from 'next/link';

// Section heading — serif title on a strong top rule, with an optional "View all".
export function EnSectionHeading({ title, viewAllHref }: { title: string; viewAllHref?: string | null }) {
  return (
    <div className="en-section-head">
      <h2 className="en-section-title">{title}</h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="en-section-viewall">
          View all →
        </Link>
      ) : null}
    </div>
  );
}
