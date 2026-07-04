import Link from 'next/link';

// English 404 — renders inside the /en (LTR) shell.
export default function EnNotFound() {
  return (
    <div className="en-container" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div className="en-kicker">Error 404</div>
      <h1 className="en-display" style={{ marginTop: 8, fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
        Page not found
      </h1>
      <p className="en-lead" style={{ marginTop: 16 }}>
        The story you&rsquo;re looking for may have moved or no longer exists.
      </p>
      <p style={{ marginTop: 28 }}>
        <Link href="/en" className="en-page-link">← Back to the homepage</Link>
      </p>
    </div>
  );
}
