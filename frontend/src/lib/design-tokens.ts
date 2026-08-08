/**
 * AlphaCMS Editorial Design System - Design Tokens
 * 
 * Central SSoT for typography styles, spacing ratios, and layouts.
 * Uses Noto Sans Arabic for body, lead, and quotes, and Al Jazeera/Cairo for display/ui.
 */

export const editorialTypography = {
  // display: Hero page headers, live events titles
  display: 'font-sans font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] text-fg',
  
  // h1: Main article title
  h1: 'font-sans font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight sm:leading-[1.15] tracking-tight text-fg',
  
  // lead: Editorial introductory paragraph (excerpt)
  lead: 'font-sans font-semibold text-[1.1875rem] sm:text-xl md:text-[1.375rem] leading-relaxed text-fg/90 border-r-4 border-primary/50 pr-4 my-6 block',
  
  // body: Long-form reading copy
  body: 'font-serif text-[19px] leading-[1.9] text-fg/95 antialiased font-normal',
  
  // caption: Media details, photographer and source
  caption: 'font-sans text-xs text-muted leading-relaxed p-1 bg-[#d7d7d7] border-t border-border flex flex-col items-center text-center gap-0',
  
  // meta: Publishing details, time stamps, sections, author names
  meta: 'font-sans text-xs sm:text-sm font-bold text-muted/80 tracking-wide flex flex-wrap items-center gap-1.5',
  
  // quote: Pull quotes, blockquotes
  quote: 'font-sans text-[1.25rem] sm:text-[1.375rem] font-medium leading-relaxed text-fg bg-primary/5 border-r-4 border-primary p-6 my-8 block',
  
  // aside: Small uppercase tags, labels
  aside: 'font-sans text-[10px] sm:text-xs font-extrabold text-muted uppercase tracking-wider',
};

