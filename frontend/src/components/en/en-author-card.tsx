import Link from 'next/link';

import { enAuthorUrl } from '@/lib/en';
import type { ArticleDetail } from '@/lib/articles';

import { EnAvatar } from './en-avatar';

// Author bio card shown beneath the article body.
export function EnAuthorCard({ author }: { author: NonNullable<ArticleDetail['author']> }) {
  const href = author.id ? enAuthorUrl(author.id) : null;
  const role = author.role || (author.isWriter ? 'Columnist' : 'Staff Writer');

  return (
    <div className="en-authorcard">
      <EnAvatar name={author.name} src={author.avatar} size={64} />
      <div style={{ minWidth: 0 }}>
        <div className="en-kicker">{role}</div>
        <h3 className="en-h3" style={{ marginTop: 3 }}>
          {href ? (
            <Link href={href} className="en-headline-link">{author.name}</Link>
          ) : (
            author.name
          )}
        </h3>
        {author.bio && (
          <p className="en-body" style={{ fontSize: '0.98rem', marginTop: 8 }}>{author.bio}</p>
        )}
        {href && (
          <Link href={href} className="en-link en-meta" style={{ marginTop: 12, display: 'inline-block' }}>
            More from {author.name} →
          </Link>
        )}
      </div>
    </div>
  );
}
