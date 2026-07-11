'use client';

import { useState, type FormEvent } from 'react';

import type { CommentItem } from '@/lib/comments';
import { enRelative } from '@/lib/en';

// Fork of comment-list.tsx + comment-form.tsx — identical logic/API contract
// (POST /api/comments, same payload shape, same pending-review flow), English copy.

export function EnCommentList({ comments }: { comments: CommentItem[] }) {
  if (comments.length === 0) {
    return <p className="en-body" style={{ fontSize: '0.9rem' }}>No comments yet — be the first to comment.</p>;
  }
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, listStyle: 'none', margin: 0, padding: 0 }}>
      {comments.map((c) => (
        <EnCommentNode key={c.id} c={c} />
      ))}
    </ul>
  );
}

function EnCommentNode({ c, isReply = false }: { c: CommentItem; isReply?: boolean }) {
  return (
    <li
      style={
        isReply
          ? { marginTop: 12, borderInlineStart: '2px solid var(--en-line)', paddingInlineStart: 12 }
          : { borderBottom: '1px solid var(--en-line)', paddingBottom: 16 }
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', background: 'var(--en-surface-2)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--en-ink)' }}>
          {c.authorName.charAt(0) || '?'}
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="en-meta" style={{ color: 'var(--en-ink)', margin: 0 }}>{c.authorName}</p>
          {c.createdAt && <time dateTime={c.createdAt} className="en-caption">{enRelative(c.createdAt)}</time>}
        </div>
      </div>
      <p className="en-body" style={{ marginTop: 8, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{c.body}</p>
      {c.replies.length > 0 && (
        <ul style={{ marginTop: 8, listStyle: 'none', padding: 0 }}>
          {c.replies.map((r) => (
            <EnCommentNode key={r.id} c={r} isReply />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EnCommentForm({ slug, isLoggedIn }: { slug: string; isLoggedIn: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setStatus('submitting');
    setError('');
    try {
      const payload: Record<string, unknown> = { slug, body: body.trim() };
      if (!isLoggedIn) {
        payload.authorName = name.trim();
        payload.authorEmail = email.trim();
      }
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus('success');
        setBody('');
        if (!isLoggedIn) {
          setName('');
          setEmail('');
        }
      } else {
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(j?.message || "Couldn't submit your comment. Please try again.");
        setStatus('error');
      }
    } catch {
      setError('Connection failed. Check your network and try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={{ border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.06)', padding: 16, fontSize: '0.9rem' }}>
        Thanks — your comment was received and is <strong>pending review</strong> before it publishes.
        <button type="button" onClick={() => setStatus('idle')} className="en-link" style={{ marginInlineStart: 8, fontWeight: 700 }}>
          Add another comment
        </button>
      </div>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--en-surface-3)', background: 'var(--en-paper)',
    padding: '10px 12px', fontSize: '0.9rem', color: 'var(--en-ink)', outline: 'none',
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!isLoggedIn && (
        <div className="en-grid en-grid--2" style={{ gap: 12 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Name" aria-label="Name" style={fieldStyle} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={190} placeholder="Email" aria-label="Email" style={fieldStyle} />
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={2}
        maxLength={5000}
        rows={4}
        placeholder="Write your comment…"
        aria-label="Comment text"
        style={{ ...fieldStyle, resize: 'vertical' }}
      />
      {status === 'error' && <p style={{ fontSize: '0.85rem', color: '#c0392b' }}>{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={status === 'submitting'} className="en-tool-btn en-tool-btn--wide" style={{ background: 'var(--en-primary)', color: '#fff', borderColor: 'var(--en-primary)' }}>
          {status === 'submitting' ? 'Submitting…' : 'Post Comment'}
        </button>
        <span className="en-caption">Comments are published after review.</span>
      </div>
    </form>
  );
}
