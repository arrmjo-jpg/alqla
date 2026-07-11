import { getCurrentUser } from '@/lib/auth';
import { getComments } from '@/lib/comments';

import { EnCommentForm, EnCommentList } from './en-comments';

// Fork of components/articles/comments/comment-section.tsx — same gating (commentsEnabled),
// same getComments(slug, 'en')/getCurrentUser() contracts, English heading.
export async function EnCommentSection({ slug, enabled }: { slug: string; enabled: boolean }) {
  if (!enabled) return null;

  const [comments, user] = await Promise.all([getComments(slug, 'en'), getCurrentUser()]);

  return (
    <section aria-labelledby="en-comments-heading" className="en-feed-section">
      <h2 id="en-comments-heading" className="en-feed-section__title">
        Comments{comments.length > 0 && <span style={{ marginInlineStart: 6, color: 'var(--en-muted)' }}>({comments.length})</span>}
      </h2>
      <EnCommentList comments={comments} />
      <div style={{ marginTop: 24 }}>
        <EnCommentForm slug={slug} isLoggedIn={user !== null} />
      </div>
    </section>
  );
}
