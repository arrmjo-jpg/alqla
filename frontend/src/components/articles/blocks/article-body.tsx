'use client';

import { useEffect, useState } from 'react';
import { Lightbox, type LightboxImage } from '@/components/ui/lightbox';
import { editorialTypography } from '@/lib/design-tokens';

interface ArticleBodyProps {
  contentHtml: string;
  excerpt: string | null;
}

export function ArticleBody({ contentHtml, excerpt }: ArticleBodyProps) {
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    currentIndex: number;
    images: LightboxImage[];
  }>({
    isOpen: false,
    currentIndex: 0,
    images: [],
  });

  // Setup click listener for global image lightbox delegation
  useEffect(() => {
    const container = document.getElementById('article-content');
    if (!container) return;

    const handleImgClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        
        // Find all images in this container to build slide list
        const allImgs = Array.from(container.querySelectorAll('img'));
        const index = allImgs.indexOf(target as HTMLImageElement);
        
        const list = allImgs.map((img) => {
          const figure = img.closest('figure');
          const figcaption = figure?.querySelector('figcaption');
          
          return {
            src: img.src,
            alt: img.alt || '',
            caption: figcaption?.textContent?.trim() || img.alt || '',
            photographer: img.getAttribute('data-photographer') || undefined,
            source: img.getAttribute('data-source') || undefined,
          };
        });

        setLightbox({
          isOpen: true,
          currentIndex: index >= 0 ? index : 0,
          images: list,
        });
      }
    };

    container.addEventListener('click', handleImgClick);
    return () => container.removeEventListener('click', handleImgClick);
  }, [contentHtml]);

  return (
    <div className="w-full">
      {/* Explicit structured Lead paragraph */}
      {excerpt && (
        <span className={`${editorialTypography.lead} editorial-lead`}>
          {excerpt}
        </span>
      )}

      {/* Article Text Content */}
      <div
        id="article-content"
        className="tiptap-content text-fg"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* Lightbox Slideshow Popup */}
      <Lightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
        onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(index) => setLightbox((prev) => ({ ...prev, currentIndex: index }))}
      />
    </div>
  );
}
