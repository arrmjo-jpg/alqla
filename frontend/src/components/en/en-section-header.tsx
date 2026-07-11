import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Fork of components/home/section-header.tsx — the shared AR homepage section-header pattern
// (red title box + thin bottom rule, separate "View all" button below the section). Distinct
// from EnSectionHeading (this session's earlier serif-underline design) — kept separate rather
// than changing EnSectionHeading everywhere, since only Local News was asked to match this
// specific AR treatment so far.
export function EnSectionHeader({ title, headingId, href }: { title: string; headingId?: string; href?: string }) {
  return (
    <div className="en-sechead">
      <h2 id={headingId} className="en-sechead__title">
        {href ? <Link href={href}>{title}</Link> : title}
      </h2>
    </div>
  );
}

// "View all" — LTR-native forward chevron points right (AR's ChevronForward points left, the RTL
// forward direction); justify-end lands it at the LTR trailing edge, matching AR's positioning logic.
export function EnSectionMore({ href }: { href: string }) {
  return (
    <div className="en-secmore">
      <Link href={href} className="en-secmore__btn">
        <span>View all</span>
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} aria-hidden />
      </Link>
    </div>
  );
}
