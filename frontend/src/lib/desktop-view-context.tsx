'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface DesktopViewContextType {
  isDesktopView: boolean;
  toggleDesktopView: () => void;
  showToggle: boolean;
}

const DesktopViewContext = createContext<DesktopViewContextType | undefined>(undefined);

export function DesktopViewProvider({ children }: { children: React.ReactNode }) {
  const [isDesktopView, setIsDesktopView] = useState(false);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    // Detect mobile/tablet devices (touch or typical mobile User Agent)
    const ua = navigator.userAgent || '';
    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const mobile = isTouch || hasMobileUA;
    setShowToggle(mobile);

    // Load persisted preference
    const saved = localStorage.getItem('desktop_view');
    if (saved === 'true') {
      setIsDesktopView(true);
      applyViewport(true);
    } else {
      applyViewport(false);
    }
  }, []);

  const applyViewport = (forceDesktop: boolean) => {
    if (typeof window === 'undefined') return;
    
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    
    if (forceDesktop) {
      // Force viewport width to 1280px (matches the site-frame's desktop width)
      // This triggers lg: CSS grid breakpoints on mobile browsers and makes browser scale it down
      meta.setAttribute('content', 'width=1280, initial-scale=0.2, shrink-to-fit=yes');
    } else {
      // Restore standard responsive mobile viewport
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
    }
  };

  const toggleDesktopView = () => {
    const nextVal = !isDesktopView;
    setIsDesktopView(nextVal);
    localStorage.setItem('desktop_view', String(nextVal));
    applyViewport(nextVal);
  };

  return (
    <DesktopViewContext.Provider value={{ isDesktopView, toggleDesktopView, showToggle }}>
      {children}
    </DesktopViewContext.Provider>
  );
}

export function useDesktopView() {
  const ctx = useContext(DesktopViewContext);
  if (!ctx) {
    throw new Error('useDesktopView must be used within DesktopViewProvider');
  }
  return ctx;
}
