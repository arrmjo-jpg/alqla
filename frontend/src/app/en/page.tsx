import { EnArticleCard } from '@/components/en/en-article-card';
import { EnEditorialColumn } from '@/components/en/en-editorial-column';
import { EnEmpty } from '@/components/en/en-empty';
import { EnFeaturedHero } from '@/components/en/en-featured-hero';
import { EnLatestUpdates } from '@/components/en/en-latest-updates';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { EnSidebar } from '@/components/en/en-sidebar';
import { EnTopNewsCarousel } from '@/components/en/en-top-news-carousel';
import { AdZone } from '@/components/ads/ad-zone';
import { enCategoryUrl } from '@/lib/en';
import { getCategoryById, getCategoryFeed, getHomepageFeed, getLatestFeed, getMostReadFeed } from '@/lib/feed';

// English News homepage. Reuses the locale-aware feed layer (locale='en') — no
// backend changes. ISR = 300s safety ceiling; event-driven refresh via tags.
export const revalidate = 300;

export default async function EnHome() {
  const [homepageData, mostRead, latestNews, articlesCategory] = await Promise.all([
    // Single aggregate call (hero/editors_pick/latest together) — AR's actual homepage data
    // source (getHomepageFeed), and avoids fetching the same articles via 3 separate requests.
    getHomepageFeed('en'),
    getMostReadFeed(6, 'en'),
    // True chronological order — the same feed AR's sitewide ticker and dedicated /latest page
    // use. Distinct from homepageData.latest below (an is_header-flag pool, unrelated to recency).
    getLatestFeed('en'),
    getCategoryById(61, 'en'),
  ]);

  const heroItems = homepageData.hero;
  const latest = homepageData.latest;
  const editorsPick = homepageData.editors_pick;
  const latestNewsGrid = latestNews.slice(0, 6);
  // getCategoryFeed needs the slug getCategoryById just resolved, so this can't join the Promise.all
  // above — same two-step category->slug->feed dependency EnLatestUpdates uses internally.
  const articles = articlesCategory ? await getCategoryFeed(articlesCategory.slug, 6, 'en') : [];

  // Special Coverage — surfaces whatever's flagged is_live across the pools already being
  // fetched (no extra request). Hidden entirely when nothing is flagged, same as every other
  // conditional section on this page. Public News/Articles are no longer part of this pool:
  // EnLatestUpdates fetches those itself now (own categoryId lookup), so scanning them here too
  // would mean fetching the same category feeds twice.
  const specialCoverage = [...latest, ...editorsPick].filter((it) => it.badge?.kind === 'live').slice(0, 4);

  const nothing = heroItems.length === 0 && latest.length === 0;
  // Same is_squares flag AR's TopNewsCarousel uses, off data already fetched above — every
  // matching item, paginated by the carousel itself rather than truncated to a fixed count.
  const topNews = latest.filter((it) => it.is_squares);

  return (
    <div>
      <EnTopNewsCarousel items={topNews} />

      <EnFeaturedHero items={heroItems} />

      {/* Ad zones — two pairs framing the categoryId-based sections below.
          aalan_kbyr_asfl_alhyrw_1410 moved inside EnFeaturedHero (3-col aside). */}
      <div className="en-container en-adzone-row">
        <AdZone zone="aalan_asfl_alslaydr_mbarshraymyn" className="en-adzone-row__item" />
        <AdZone zone="aalan_asfl_alslaydr_mbarshra_shmal" className="en-adzone-row__item" />
      </div>
      <div className="en-container en-adzone-row">
        <AdZone zone="aalan_fwq_akhr_almstjdat_ymyn" className="en-adzone-row__item" />
        <AdZone zone="aalan_fwq_akhr_almstjdat_shmal" className="en-adzone-row__item" />
      </div>

      {/* EN's own category mapping (60/61), not AR's categoryId=2 ("محليات", doesn't exist for
          English) — same EnLatestUpdates lead+grid layout/behavior, real EN category IDs. */}
      <EnLatestUpdates categoryId={60} fallbackTitle="Public News" />

      <div className="en-container">
        {nothing && (
          <div style={{ paddingBlock: 48 }}>
            <EnEmpty />
          </div>
        )}

        {/* Single shared 3-column editorial block (BBC/CNN-style) — Articles/Most Popular/Latest
            News side by side on desktop, one column each, stacking to 1-col below lg (matching
            TrendingLatestMostRead's own breakpoint). Not three separate full-width sections.
            Trending itself now lives in the sidebar (EnSidebar) instead of its own section here —
            showing it in both places would be the same data twice. */}
        {(articles.length > 0 || mostRead.length > 0 || latestNewsGrid.length > 0) && (
          <section className="en-section" aria-label="More News">
            <div className="en-editorial-row">
              <EnEditorialColumn
                title="Articles"
                items={articles}
                viewAllHref={articlesCategory ? enCategoryUrl(articlesCategory.id, articlesCategory.slug) : null}
              />
              <EnEditorialColumn title="Most Popular" items={mostRead} showRank />
              <EnEditorialColumn title="Latest News" items={latestNewsGrid} />
            </div>
          </section>
        )}

        {specialCoverage.length > 0 && (
          <section className="en-section en-section--live" aria-label="Special Coverage">
            <EnSectionHeading title="Special Coverage" />
            <div className="en-grid en-grid--2">
              {specialCoverage.map((it) => (
                <EnArticleCard key={it.id} item={it} variant="standard" />
              ))}
            </div>
          </section>
        )}

        <div className="en-main">
          <div>
            {editorsPick.length > 0 && (
              <section className="en-section" aria-label="Featured News">
                <EnSectionHeading title="Featured News" />
                <div className="en-grid">
                  {editorsPick.map((it) => (
                    <EnArticleCard key={it.id} item={it} variant="feature" />
                  ))}
                </div>
              </section>
            )}
          </div>

          <EnSidebar />
        </div>
      </div>
    </div>
  );
}
