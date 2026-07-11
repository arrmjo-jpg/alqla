import { LivePulse } from '@/components/ui/live-pulse';
import { enBadgeLabel } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of components/home/featured-hero.tsx's FeedBadge — same solid-red/sharp-corner/live-pulse
// treatment, but resolves the label via enBadgeLabel(kind) instead of badge.label, which the
// shared feed mapper always sets in Arabic (toBadge() in lib/feed.ts) regardless of locale.
export function EnFeedBadge({ badge }: { badge: FeedItem['badge'] }) {
  if (!badge) return null;
  return (
    <span className="en-feedbadge" aria-hidden={false}>
      {badge.kind === 'live' && <LivePulse />}
      {enBadgeLabel(badge.kind)}
    </span>
  );
}
