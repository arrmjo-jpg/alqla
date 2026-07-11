'use client';

import { useId, useState } from 'react';

import { getClientId } from '@/lib/client-id';

// Fork of public-forms/subscribe-box.tsx ('card' variant only — 'bar' is homepage-only, out of
// scope here) — identical validation/submit logic (same /api/whatsapp/subscribe contract, same
// Jordan +962 phone format regardless of locale: it's the actual WhatsApp number infra, not a
// language concern), English copy, .en-* styling instead of the AR Tailwind-token Button.
interface Props {
  termsHref?: string | null;
  termsLabel?: string | null;
  privacyHref?: string | null;
  privacyLabel?: string | null;
}

export function EnSubscribeBoxCard({ termsHref, termsLabel, privacyHref, privacyLabel }: Props) {
  const nameId = useId();
  const phoneId = useId();

  const [closed, setClosed] = useState(false);
  const [name, setName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (closed) return null;

  function validate(): boolean {
    if (!name.trim()) {
      setErrorMsg('Please enter your name');
      return false;
    }
    const digits = localPhone.replace(/\D/g, '');
    if (!/^7\d{8}$/.test(digits)) {
      setErrorMsg('Please enter a valid WhatsApp number');
      return false;
    }
    setErrorMsg('');
    return true;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
        body: JSON.stringify({ name: name.trim(), phone: '+962' + localPhone.replace(/\D/g, '') }),
      });
      const data: { success?: boolean; message?: string } = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setErrorMsg(data.message || 'Subscription failed. Please check your details.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch {
      setErrorMsg('A connection error occurred. Please try again later.');
      setLoading(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    height: 56, width: '100%', border: '1px solid var(--en-surface-3)', background: 'var(--en-paper)',
    paddingInline: 16, fontWeight: 700, color: 'var(--en-ink)', outline: 'none',
  };

  return (
    <section className="en-subscribe-card">
      <button type="button" onClick={() => setClosed(true)} aria-label="Close" className="en-subscribe-card__close">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="en-subscribe-card__inner">
        <h2 className="en-h1" style={{ fontSize: '1.7rem' }}>Breaking News Alerts</h2>
        <h3 className="en-h3" style={{ marginTop: 6, color: 'var(--en-ink-soft)' }}>Be the first to know when news breaks</h3>
        <p className="en-body" style={{ marginTop: 12, fontSize: '0.88rem' }}>
          Stay up to date with the latest news — subscribe to get breaking news straight to WhatsApp the moment it&apos;s published.
        </p>

        {(termsHref || privacyHref) && (
          <p className="en-caption" style={{ marginTop: 16 }}>
            By signing up, you agree to our{' '}
            {termsHref && <a href={termsHref} className="en-link">{termsLabel || 'Terms of Service'}</a>}
            {termsHref && privacyHref && ' and '}
            {privacyHref && <a href={privacyHref} className="en-link">{privacyLabel || 'Privacy Policy'}</a>}
            .
          </p>
        )}

        {success ? (
          <div role="status" style={{ marginTop: 16, border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.08)', padding: 16, textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
            Subscribed successfully ✅
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="en-grid en-grid--2" style={{ gap: 14, textAlign: 'left' }}>
              <div>
                <label htmlFor={nameId} className="en-caption" style={{ display: 'none' }}>Name</label>
                <input id={nameId} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name *" maxLength={150} autoComplete="name" style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', height: 56, overflow: 'hidden', border: '1px solid var(--en-surface-3)', background: 'var(--en-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', borderInlineEnd: '1px solid var(--en-surface-3)', background: 'var(--en-surface-2)', paddingInline: 16, fontSize: '1.05rem', fontWeight: 900, color: 'var(--en-ink)' }}>
                  +962
                </div>
                <label htmlFor={phoneId} className="en-caption" style={{ display: 'none' }}>WhatsApp number</label>
                <input
                  id={phoneId}
                  type="tel"
                  inputMode="numeric"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder="Enter WhatsApp number *"
                  maxLength={9}
                  autoComplete="tel-national"
                  style={{ width: '100%', background: 'transparent', border: 'none', paddingInline: 16, fontWeight: 700, color: 'var(--en-ink)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="en-tool-btn en-tool-btn--wide" style={{ height: 56, width: '100%', background: 'var(--en-primary)', color: '#fff', borderColor: 'var(--en-primary)', fontSize: '1rem' }}>
              {loading ? 'Processing…' : 'Subscribe Now'}
            </button>

            {errorMsg && <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c0392b' }}>{errorMsg}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
