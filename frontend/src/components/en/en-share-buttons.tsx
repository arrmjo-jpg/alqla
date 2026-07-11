'use client';

import { Check, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';

import { FacebookIcon, LinkedinIcon, TelegramIcon, WhatsappIcon, XIcon } from '@/components/icons/social';

// Fork of components/share/share-buttons.tsx — identical share-network/copy/native-share logic,
// English labels/aria. Used by EnStaticPageView (a simple flat row); distinct from
// EnStickyShareSidebar/EnMobileShareBar, which are built for articles specifically (they require
// an articleId + engagement metrics that static pages don't have).
const enc = encodeURIComponent;

type Network = { key: string; label: string; href: string; Icon: typeof FacebookIcon; brand: string };

function networks(url: string, title: string): Network[] {
  const u = enc(url);
  const t = enc(title);
  const tu = enc(`${title} ${url}`);
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${tu}`, Icon: WhatsappIcon, brand: '#25D366' },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: FacebookIcon, brand: '#1877F2' },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, Icon: XIcon, brand: '#000000' },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, Icon: TelegramIcon, brand: '#229ED9' },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: LinkedinIcon, brand: '#0A66C2' },
  ];
}

export function EnShareButtons({ url, title, className = '' }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const nativeShare = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    }
  };

  const copyLink = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no clipboard access */
    }
  };

  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer,width=620,height=560');

  return (
    <div className={`en-share-buttons ${className}`} aria-label="Share">
      <span className="en-share-buttons__label">Share:</span>

      {networks(url, title).map(({ key, label, href, Icon, brand }) => (
        <button
          key={key}
          type="button"
          onClick={() => open(href)}
          aria-label={`Share via ${label}`}
          title={label}
          className="en-share-buttons__btn"
          style={{ color: brand }}
        >
          <Icon size={18} />
        </button>
      ))}

      <button type="button" onClick={copyLink} aria-label="Copy link" title="Copy link" className="en-share-buttons__btn">
        {copied ? <Check size={18} className="en-share-buttons__copied" aria-hidden /> : <Link2 size={18} aria-hidden />}
      </button>

      <button
        type="button"
        onClick={() => void nativeShare()}
        aria-label="Share"
        title="Share"
        className="en-share-buttons__btn en-share-buttons__btn--native"
      >
        <Share2 size={18} aria-hidden />
      </button>
    </div>
  );
}
