'use client';

import { useState } from 'react';
import { Bookmark, Check, Link2, Printer, Share2 } from 'lucide-react';

import { FacebookIcon, TelegramIcon, WhatsappIcon, XIcon } from '@/components/icons/social';
import { trackEvent } from '@/lib/analytics';
import { type EngagementMetrics, useEngagement } from '@/lib/use-engagement';

import { EnAudioReader } from './en-audio-reader';

// Fork of components/articles/blocks/reading-tools.tsx (ReadingToolsBar + StickyShareSidebar) —
// identical share-network/copy/print/bookmark logic (same useEngagement hook, same analytics
// events), English labels/aria. Split into the same two surfaces AR uses: a sticky desktop rail
// (1-col aside) and a mobile-only horizontal bar (hidden on desktop, where the rail takes over).

type Network = { key: string; label: string; href: string; Icon: React.ElementType };

function getNetworks(url: string, title: string): Network[] {
  const enc = encodeURIComponent;
  const u = enc(url);
  const t = enc(title);
  const tu = enc(`${title} ${url}`);
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${tu}`, Icon: WhatsappIcon },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: FacebookIcon },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, Icon: XIcon },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, Icon: TelegramIcon },
  ];
}

interface ShareProps {
  articleId: number;
  url: string;
  title: string;
  initialMetrics: EngagementMetrics;
}

function useShareActions({ articleId, url, title, initialMetrics }: ShareProps) {
  const [copied, setCopied] = useState(false);
  const { favorited, toggleFavorite } = useEngagement({ type: 'article', id: articleId, initialMetrics, hydrate: true });

  const handleShareClick = (networkName: string, href: string) => {
    trackEvent('share_clicked', { network: networkName, article_id: articleId });
    window.open(href, '_blank', 'noopener,noreferrer,width=620,height=560');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('link_copied', { article_id: articleId });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handlePrint = () => {
    trackEvent('article_printed', { article_id: articleId });
    window.print();
  };

  const handleBookmark = async () => {
    trackEvent('bookmark_toggled', { article_id: articleId, is_bookmarked: !favorited });
    await toggleFavorite();
  };

  const networks = getNetworks(url, title);
  return { copied, favorited, networks, handleShareClick, handleCopyLink, handlePrint, handleBookmark };
}

/** Desktop sticky rail — hidden below lg, mirrors AR's StickyShareSidebar. */
export function EnStickyShareSidebar(props: ShareProps) {
  const { copied, favorited, networks, handleShareClick, handleCopyLink, handlePrint, handleBookmark } = useShareActions(props);

  return (
    <aside className="en-share-rail" aria-label="Share tools">
      <span className="en-share-rail__label">Share</span>

      {networks.map(({ key, label, href, Icon }) => (
        <button key={key} type="button" onClick={() => handleShareClick(key, href)} className="en-share-rail__btn" aria-label={`Share via ${label}`} title={label}>
          <Icon size={18} />
        </button>
      ))}

      <span className="en-share-rail__divider" aria-hidden />

      <button type="button" onClick={handleCopyLink} className={`en-share-rail__btn${copied ? ' en-share-rail__btn--active' : ''}`} aria-label="Copy article link" title="Copy link">
        <Link2 size={18} />
      </button>
      <button type="button" onClick={handlePrint} className="en-share-rail__btn" aria-label="Print article" title="Print">
        <Printer size={18} />
      </button>
      <button type="button" onClick={handleBookmark} className="en-share-rail__btn" aria-label={favorited ? 'Remove from saved' : 'Save article'} title={favorited ? 'Saved' : 'Save'}>
        <Bookmark size={18} fill={favorited ? 'currentColor' : 'none'} />
      </button>
    </aside>
  );
}

/** Mobile-only horizontal bar — hidden on desktop (lg:hidden), mirrors AR's ReadingToolsBar. */
export function EnMobileShareBar(props: ShareProps & { ttsEnabled?: boolean }) {
  const { articleId, ttsEnabled = false } = props;
  const { copied, favorited, networks, handleShareClick, handleCopyLink, handlePrint, handleBookmark } = useShareActions(props);

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: props.title, url: props.url });
        trackEvent('native_share_completed', { article_id: articleId });
      } catch {
        /* cancelled */
      }
    }
  };

  return (
    <div className="en-share-bar">
      {ttsEnabled && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EnAudioReader targetId="en-article-content" />
        </div>
      )}

      <div className="en-share-bar__row">
        <div className="en-share-bar__group">
          {networks.map(({ key, label, href, Icon }) => (
            <button key={key} type="button" onClick={() => handleShareClick(key, href)} className="en-share-bar__icon" aria-label={`Share via ${label}`} title={label}>
              <Icon size={18} />
            </button>
          ))}
          <button type="button" onClick={handleNativeShare} className="en-share-bar__icon en-share-bar__icon--native" aria-label="Share" title="Share">
            <Share2 size={18} />
          </button>
        </div>

        <div className="en-share-bar__group">
          <button type="button" onClick={handleCopyLink} className="en-share-bar__pill">
            {copied ? (<><Check size={16} /> Copied</>) : (<><Link2 size={16} /> Copy link</>)}
          </button>
          <button type="button" onClick={handlePrint} className="en-share-bar__icon" aria-label="Print article" title="Print">
            <Printer size={16} />
          </button>
          <button type="button" onClick={handleBookmark} className="en-share-bar__pill">
            <Bookmark size={16} fill={favorited ? 'currentColor' : 'none'} /> {favorited ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
