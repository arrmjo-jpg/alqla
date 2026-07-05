'use client';

import { useState } from 'react';
import { Check, Link2, Printer, Bookmark, Share2 } from 'lucide-react';
import { useEngagement, type EngagementMetrics } from '@/lib/use-engagement';
import { FacebookIcon, TelegramIcon, WhatsappIcon, XIcon } from '@/components/icons/social';
import { AudioReader } from '@/components/reading/audio-reader';
import { trackEvent } from '@/lib/analytics';

type Network = { key: string; label: string; href: string; Icon: React.ElementType; brand: string };

function getNetworks(url: string, title: string): Network[] {
  const enc = encodeURIComponent;
  const u = enc(url);
  const t = enc(title);
  const tu = enc(`${title} ${url}`);
  return [
    { key: 'whatsapp', label: 'واتساب', href: `https://wa.me/?text=${tu}`, Icon: WhatsappIcon, brand: '#25D366' },
    { key: 'facebook', label: 'فيسبوك', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: FacebookIcon, brand: '#1877F2' },
    { key: 'x', label: 'إكس', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, Icon: XIcon, brand: '#000000' },
    { key: 'telegram', label: 'تيليجرام', href: `https://t.me/share/url?url=${u}&text=${t}`, Icon: TelegramIcon, brand: '#229ED9' },
  ];
}

interface ReadingToolsProps {
  articleId: number;
  url: string;
  title: string;
  initialMetrics: EngagementMetrics;
  ttsEnabled?: boolean;
}

export function ReadingToolsBar({
  articleId,
  url,
  title,
  initialMetrics,
  ttsEnabled = false,
}: ReadingToolsProps) {
  const [copied, setCopied] = useState(false);

  const { favorited, toggleFavorite } = useEngagement({
    type: 'article',
    id: articleId,
    initialMetrics,
    hydrate: true,
  });

  const handleShareClick = (networkName: string, href: string) => {
    trackEvent('share_clicked', { network: networkName, article_id: articleId });
    window.open(href, '_blank', 'noopener,noreferrer,width=620,height=560');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        trackEvent('native_share_completed', { article_id: articleId });
      } catch {
        /* Cancelled */
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('link_copied', { article_id: articleId });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard fail */
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

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 mb-6 print:hidden">
      {/* Audio Reader (if TTS enabled) */}
      {ttsEnabled && (
        <div className="flex items-center">
          <AudioReader targetId="article-content" />
        </div>
      )}

      {/* Social actions - mobile view ONLY (hidden on desktop because sticky panel is active) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 lg:hidden">
        {/* Social networks share icons */}
        <div className="flex items-center gap-2">
          {getNetworks(url, title).map(({ key, label, href, Icon, brand }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleShareClick(key, href)}
              aria-label={`مشاركة عبر ${label}`}
              title={label}
              className="flex size-9 items-center justify-center bg-surface-2 transition-all hover:-translate-y-0.5 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-primary"
              style={{ color: brand }}
            >
              <Icon size={18} />
            </button>
          ))}

          {/* Native Web Share */}
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label="مشاركة عبر النظام"
            title="مشاركة"
            className="flex size-9 items-center justify-center bg-surface-2 text-fg transition-all hover:-translate-y-0.5 hover:bg-surface-3 sm:hidden"
          >
            <Share2 className="size-[18px]" aria-hidden />
          </button>
        </div>

        {/* Utilities actions */}
        <div className="flex items-center gap-2">
          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="نسخ الرابط"
            title="نسخ الرابط"
            className="flex h-9 px-3 items-center gap-1.5 bg-surface-2 text-fg text-xs font-bold transition-all hover:bg-surface-3"
          >
            {copied ? (
              <>
                <Check className="size-4 text-success" />
                <span className="text-success">تم النسخ</span>
              </>
            ) : (
              <>
                <Link2 className="size-4" />
                <span>نسخ الرابط</span>
              </>
            )}
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="طباعة الخبر"
            title="طباعة"
            className="flex size-9 items-center justify-center bg-surface-2 text-fg transition-all hover:bg-surface-3"
          >
            <Printer className="size-4" />
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleBookmark}
            aria-label={favorited ? 'إزالة من المفضّلة' : 'حفظ في المفضّلة'}
            title={favorited ? 'محفوظ' : 'حفظ'}
            className={`flex h-9 px-3 items-center gap-1.5 transition-all ${
              favorited ? 'bg-primary text-white font-bold' : 'bg-surface-2 text-fg hover:bg-surface-3'
            }`}
          >
            <Bookmark className={`size-4 ${favorited ? 'fill-current' : ''}`} />
            <span>{favorited ? 'محفوظ' : 'حفظ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface StickyShareSidebarProps {
  articleId: number;
  url: string;
  title: string;
  initialMetrics: EngagementMetrics;
}

export function StickyShareSidebar({
  articleId,
  url,
  title,
  initialMetrics,
}: StickyShareSidebarProps) {
  const [copied, setCopied] = useState(false);
  const { favorited, toggleFavorite } = useEngagement({
    type: 'article',
    id: articleId,
    initialMetrics,
    hydrate: true,
  });

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
      /* clipboard fail */
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

  return (
    <aside className="sticky top-24 flex flex-col items-center gap-3.5" aria-label="أدوات مشاركة جانبية">
      <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider select-none leading-none mb-1">
        مشاركة
      </span>

      {/* Share Networks */}
      {getNetworks(url, title).map(({ key, label, href, Icon, brand }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleShareClick(key, href)}
          aria-label={`مشاركة عبر ${label}`}
          title={label}
          className="flex size-10 items-center justify-center bg-surface border border-border text-muted transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
          style={{ '--hover-color': brand } as React.CSSProperties}
          onMouseEnter={(e) => (e.currentTarget.style.color = brand)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '')}
        >
          <Icon size={18} />
        </button>
      ))}

      {/* Divider */}
      <span className="h-px w-6 bg-border my-1 select-none" />

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label="نسخ رابط المقال"
        title="نسخ الرابط"
        className={`flex size-10 items-center justify-center bg-surface border border-border transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary ${
          copied ? 'text-success border-success' : 'text-fg hover:text-primary'
        }`}
      >
        <Link2 size={18} />
      </button>

      {/* Print */}
      <button
        type="button"
        onClick={handlePrint}
        aria-label="طباعة الخبر"
        title="طباعة الخبر"
        className="flex size-10 items-center justify-center bg-surface border border-border text-fg transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary hover:text-primary"
      >
        <Printer size={18} />
      </button>

      {/* Bookmark */}
      <button
        type="button"
        onClick={handleBookmark}
        aria-label={favorited ? 'إزالة من المفضّلة' : 'حفظ في المفضّلة'}
        title={favorited ? 'إزالة من المفضّلة' : 'حفظ في المفضّلة'}
        className={`flex size-10 items-center justify-center border transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary ${
          favorited
            ? 'bg-primary border-primary text-white'
            : 'bg-surface border-border text-fg hover:text-primary'
        }`}
      >
        <Bookmark size={18} className={favorited ? 'fill-current' : ''} />
      </button>
    </aside>
  );
}
