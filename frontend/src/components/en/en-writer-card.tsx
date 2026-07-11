import Link from 'next/link';

import type { WriterProfile } from '@/lib/writer';

import { EnAvatar } from './en-avatar';

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// Directory profile card — fork of components/writers/writer-card.tsx (hardcoded Arabic copy,
// not props-adaptable). Same fields (avatar, verified badge, name, articles_count,
// last_activity_at), .en-* styling instead of Tailwind utilities.
export function EnWriterCard({ writer }: { writer: WriterProfile }) {
  return (
    <Link href={`/en/author/${writer.id}`} className="en-writer-card">
      <div className="en-writer-card__avatar-wrap">
        <EnAvatar name={writer.name} src={writer.avatar} size={88} />
        {writer.verified && (
          <span className="en-writer-card__verified" title="Verified">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
      <h3 className="en-writer-card__name">{writer.name}</h3>
      <div className="en-writer-card__stats">
        <span className="en-writer-card__stat">
          {writer.articles_count ? `${writer.articles_count.toLocaleString('en-US')} articles` : 'No articles yet'}
        </span>
        {writer.last_activity_at && (
          <span className="en-writer-card__stat">Published {dateFmt.format(new Date(writer.last_activity_at))}</span>
        )}
      </div>
    </Link>
  );
}
