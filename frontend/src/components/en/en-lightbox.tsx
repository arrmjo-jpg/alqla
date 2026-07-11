'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface EnLightboxImage {
  src: string;
  alt: string;
  caption: string;
  photographer?: string;
  source?: string;
}

// Fork of components/ui/lightbox.tsx (AR) — identical zoom/keyboard-nav/cycling logic, English
// strings. Nav-arrow physical sides swapped: AR's "prev" sits on the visual right (RTL forward
// direction), "next" on the visual left; for LTR the natural mapping is prev=left, next=right.
export function EnLightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  images: EnLightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const [zoom, setZoom] = useState(1);

  const navigate = useCallback(
    (direction: number) => {
      const nextIndex = (currentIndex + direction + images.length) % images.length;
      onNavigate(nextIndex);
    },
    [currentIndex, images.length, onNavigate],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigate, onClose]);

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  if (!isOpen || images.length === 0) return null;

  const current = images[currentIndex] || images[0];
  const handleZoom = (amount: number) => setZoom((z) => Math.min(3, Math.max(0.5, z + amount)));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="en-lightbox" role="dialog" aria-modal="true" aria-label="Image gallery">
      <div className="en-lightbox__top">
        <button type="button" onClick={onClose} className="en-lightbox__btn" aria-label="Close gallery">
          <X size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => handleZoom(0.25)} className="en-lightbox__btn en-lightbox__btn--sm" title="Zoom in" aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button type="button" onClick={() => handleZoom(-0.25)} className="en-lightbox__btn en-lightbox__btn--sm" title="Zoom out" aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          {zoom !== 1 && (
            <button type="button" onClick={handleResetZoom} className="en-lightbox__btn en-lightbox__btn--sm" title="Reset zoom" aria-label="Reset zoom">
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <span className="en-lightbox__count">{currentIndex + 1} / {images.length}</span>
      </div>

      <div className="en-lightbox__stage">
        <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs high-res img */}
          <img src={current.src} alt={current.alt || 'Gallery image'} className="en-lightbox__img" draggable={false} />
        </div>

        {images.length > 1 && (
          <>
            <button type="button" onClick={() => navigate(-1)} className="en-lightbox__nav en-lightbox__nav--prev" aria-label="Previous image">
              <ChevronLeft size={32} />
            </button>
            <button type="button" onClick={() => navigate(1)} className="en-lightbox__nav en-lightbox__nav--next" aria-label="Next image">
              <ChevronRight size={32} />
            </button>
          </>
        )}
      </div>

      <div className="en-lightbox__bottom">
        <div className="en-lightbox__bottom-inner">
          {current.caption && <p className="en-lightbox__caption">{current.caption}</p>}
          <div className="en-lightbox__credit">
            {current.photographer && <span>Photo: <b>{current.photographer}</b></span>}
            {current.photographer && current.source && <span style={{ opacity: 0.3 }}>|</span>}
            {current.source && <span>Source: <b>{current.source}</b></span>}
          </div>
        </div>
      </div>
    </div>
  );
}
