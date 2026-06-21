'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;

// Side drawer. `start` = inline-start (RTL → right). Slides from the start edge.
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'start' | 'end' }
>(({ className, side = 'start', children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={cn('qn-sheet-overlay fixed inset-0 z-[300] bg-black/55 backdrop-blur-sm')} />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      data-side={side}
      className={cn(
        'qn-sheet-content fixed inset-y-0 z-[300] flex h-full w-80 max-w-[85vw] flex-col bg-surface shadow-xl',
        side === 'start' ? 'start-0' : 'end-0',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';
