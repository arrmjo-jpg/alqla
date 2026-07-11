'use client';

import { useEffect, useState } from 'react';

import { EnLightbox, type EnLightboxImage } from './en-lightbox';

// Fork of components/articles/blocks/article-body.tsx — identical click-delegation logic
// (any <img> inside #article-content opens the lightbox at that image's index), English lightbox.
export function EnArticleBody({ contentHtml, excerpt }: { contentHtml: string; excerpt: string | null }) {
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; currentIndex: number; images: EnLightboxImage[] }>({
    isOpen: false,
    currentIndex: 0,
    images: [],
  });

  useEffect(() => {
    const container = document.getElementById('en-article-content');
    if (!container) return;

    const handleImgClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      e.preventDefault();

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

      setLightbox({ isOpen: true, currentIndex: index >= 0 ? index : 0, images: list });
    };

    container.addEventListener('click', handleImgClick);
    return () => container.removeEventListener('click', handleImgClick);
  }, [contentHtml]);

  return (
    <div style={{ width: '100%' }}>
      {excerpt && <p className="en-lead" style={{ marginBlock: '0 20px' }}>{excerpt}</p>}

      <div id="en-article-content" className="en-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      <EnLightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
        onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(index) => setLightbox((prev) => ({ ...prev, currentIndex: index }))}
      />
    </div>
  );
}
