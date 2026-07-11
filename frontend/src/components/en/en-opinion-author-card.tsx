import Link from 'next/link';
import { PenLine } from 'lucide-react';

import { enAuthorUrl } from '@/lib/en';

// Fork of the floating author box inside AR's opinion template (article-detail.tsx lines ~124-166)
// — NOT EnAuthorCard's circular-avatar layout, a structurally different piece: a large natural-
// aspect-ratio photo (not cropped to a circle) with rounded corners, a gradient name pill below
// it, optional bio. English strings, .en-* tokens instead of Tailwind bg-primary/dark-mode rings.
export function EnOpinionAuthorCard({
  author,
}: {
  author: { id: number | null; name: string; avatar: string | null; bio?: string | null; role?: string | null };
}) {
  const href = author.id ? enAuthorUrl(author.id) : null;
  const role = author.role || 'Columnist';

  return (
    <div className="en-opinion-photo">
      <div className="en-opinion-photo__frame">
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- natural aspect ratio, not a cropped avatar
          <img src={author.avatar} alt={author.name} className="en-opinion-photo__img" />
        ) : (
          <div className="en-opinion-photo__placeholder" aria-hidden>
            <PenLine size={64} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="en-opinion-photo__pill">
        <span className="en-opinion-photo__pill-icon" aria-hidden>
          <PenLine size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <span className="en-opinion-photo__role">{role}</span>
          {href ? (
            <Link href={href} className="en-opinion-photo__name">{author.name}</Link>
          ) : (
            <span className="en-opinion-photo__name">{author.name}</span>
          )}
        </div>
      </div>

      {author.bio && <p className="en-opinion-photo__bio">{author.bio}</p>}
    </div>
  );
}
