// Author avatar with a graceful serif-initial fallback (shared by byline + author card).
export function EnAvatar({ name, src, size = 44 }: { name: string; src: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- absolute backend URL, no next/image config
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: 'var(--en-line)', flexShrink: 0 }}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--en-accent-wash)',
        color: 'var(--en-accent-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--en-serif)',
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
