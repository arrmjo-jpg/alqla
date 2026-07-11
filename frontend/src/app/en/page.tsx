import { EnArticleCard } from '@/components/en/en-article-card';
import { EnEmpty } from '@/components/en/en-empty';
import { EnFeaturedHero } from '@/components/en/en-featured-hero';
import { EnLatestUpdates } from '@/components/en/en-latest-updates';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { EnSidebar } from '@/components/en/en-sidebar';
import { EnTrendingBox } from '@/components/en/en-trending-box';
import { AdZone } from '@/components/ads/ad-zone';
import { getHomepageFeed, getMostReadFeed } from '@/lib/feed';

// English News homepage. Reuses the locale-aware feed layer (locale='en') — no
// backend changes. ISR = 300s safety ceiling; event-driven refresh via tags.
export const revalidate = 300;

export default async function EnHome() {
  const [homepageData, mostRead] = await Promise.all([
    // Single aggregate call (hero/editors_pick/latest together) — AR's actual homepage data
    // source (getHomepageFeed), and avoids fetching the same articles via 3 separate requests.
    getHomepageFeed('en'),
    getMostReadFeed(6, 'en'),
  ]);

  const heroItems = homepageData.hero;
  const latest = homepageData.latest;
  const editorsPick = homepageData.editors_pick;

  const latestGrid = latest.slice(0, 6);

  // Special Coverage — surfaces whatever's flagged is_live across the pools already being
  // fetched (no extra request). Hidden entirely when nothing is flagged, same as every other
  // conditional section on this page. Public News/Articles are no longer part of this pool:
  // EnLatestUpdates fetches those itself now (own categoryId lookup), so scanning them here too
  // would mean fetching the same category feeds twice.
  const specialCoverage = [...latest, ...editorsPick].filter((it) => it.badge?.kind === 'live').slice(0, 4);

  const nothing = heroItems.length === 0 && latestGrid.length === 0;

  return (
    <div>
      <EnFeaturedHero items={heroItems} />

      {/* Ad zones — same placement as AR's homepage: one large below hero, two pairs framing
          the categoryId-based sections below. Reused as-is (AdZone is locale-agnostic). */}
      <AdZone zone="aalan_kbyr_asfl_alhyrw_1410" className="en-adzone" />
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
      <EnLatestUpdates categoryId={61} fallbackTitle="Articles" />

      <div className="en-container">
        {nothing && (
          <div style={{ paddingBlock: 48 }}>
            <EnEmpty />
          </div>
        )}

        <EnTrendingBox />

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

            {latestGrid.length > 0 && (
              <section className="en-section" aria-label="Latest News">
                <EnSectionHeading title="Latest News" />
                <div className="en-grid">
                  {latestGrid.map((it) => (
                    <EnArticleCard key={it.id} item={it} variant="standard" />
                  ))}
                </div>
              </section>
            )}
          </div>

          <EnSidebar mostRead={mostRead} />
        </div>
      </div>
    </div>
  );
}
