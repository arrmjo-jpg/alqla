import { EnTrendingBox } from './en-trending-box';

// Sidebar, next to Featured News. Was a numbered Most Read list, but that duplicated the "Most
// Popular" column in the 3-column editorial block below (same getMostReadFeed data) — same class
// of redundancy this component's Editor's Picks removal already fixed once before. Replaced with
// Trending instead (moved here from its old standalone spot between Public News and the editorial
// block, so it isn't shown twice either). EnTrendingBox is self-fetching, so this needs no props.
export function EnSidebar() {
  return (
    <aside className="en-sidebar-sticky">
      <EnTrendingBox />
    </aside>
  );
}
