'use client';

import { ThumbsUp, ThumbsDown, Bookmark, Share2, Copy, Check } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useEngagement } from '@/lib/use-engagement';
import { FacebookIcon, TelegramIcon, WhatsappIcon, XIcon } from '@/components/icons/social';

export function ArticleInteractionBar({ articleId }: { articleId: number }) {
  const { metrics, reaction, favorited, react, toggleFavorite } = useEngagement({
    type: 'article',
    id: articleId,
    initialMetrics: { likes: 0, dislikes: 0, favorites: 0, views: 0 },
    hydrate: true,
  });

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Close share menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFullShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/article/${articleId}`;
    }
    return '';
  };

  const handleShare = async () => {
    const shareData = {
      title: 'القلعة نيوز',
      text: 'اقرأ هذا الخبر المثير للاهتمام',
      url: getFullShareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* User cancelled or share failed */
      }
    } else {
      setShowShareMenu((prev) => !prev);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = getFullShareUrl();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent('اقرأ هذا الخبر: ');

  return (
    <div className="relative flex items-center justify-between border-t border-border/40 py-2.5 mt-3 select-none text-muted-foreground w-full print:hidden">
      {/* Thumbs up & Thumbs down group */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => react('like')}
          className={`group/btn flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-all hover:bg-secondary/40 active:scale-95 ${
            reaction === 'like' ? 'text-primary font-extrabold' : 'text-muted-foreground'
          }`}
          title="إعجاب"
        >
          <ThumbsUp
            className={`size-4 transition-transform duration-200 group-hover/btn:-translate-y-0.5 ${
              reaction === 'like' ? 'fill-primary stroke-primary' : ''
            }`}
          />
          <span>{metrics.likes}</span>
        </button>

        <button
          onClick={() => react('dislike')}
          className={`group/btn flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-all hover:bg-secondary/40 active:scale-95 ${
            reaction === 'dislike' ? 'text-fg font-extrabold' : 'text-muted-foreground'
          }`}
          title="عدم إعجاب"
        >
          <ThumbsDown
            className={`size-4 transition-transform duration-200 group-hover/btn:translate-y-0.5 ${
              reaction === 'dislike' ? 'fill-muted-foreground stroke-muted-foreground' : ''
            }`}
          />
          <span>{metrics.dislikes}</span>
        </button>
      </div>

      {/* Share & Bookmark group */}
      <div className="flex items-center gap-2">
        {/* Share Button with popup menu fallback */}
        <div className="relative" ref={shareMenuRef}>
          <button
            onClick={handleShare}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary/40 active:scale-90 transition-all text-muted-foreground hover:text-fg"
            title="مشاركة الخبر"
          >
            <Share2 className="size-4" />
          </button>

          {showShareMenu && (
            <div
              className="absolute bottom-9 left-0 z-30 mt-1 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{ transform: 'translateX(0)' }}
            >
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold hover:bg-secondary transition-colors"
              >
                <FacebookIcon size={14} className="text-[#1877F2]" />
                <span>فيسبوك</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold hover:bg-secondary transition-colors"
              >
                <XIcon size={14} className="text-fg" />
                <span>إكس (تويتر)</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodedText}${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold hover:bg-secondary transition-colors"
              >
                <WhatsappIcon size={14} className="text-[#25D366]" />
                <span>واتساب</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold hover:bg-secondary transition-colors"
              >
                <TelegramIcon size={14} className="text-[#0088cc]" />
                <span>تيليجرام</span>
              </a>
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold hover:bg-secondary transition-colors"
              >
                {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bookmark/Favorite Button */}
        <button
          onClick={toggleFavorite}
          className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary/40 active:scale-90 transition-all ${
            favorited ? 'text-yellow-500' : 'text-muted-foreground hover:text-fg'
          }`}
          title={favorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Bookmark className={`size-4 ${favorited ? 'fill-yellow-500 stroke-yellow-500' : ''}`} />
        </button>
      </div>
    </div>
  );
}
