import { EnArticleCard } from '@/components/en/en-article-card';
import { EnEmpty } from '@/components/en/en-empty';
import { EnSectionHeading } from '@/components/en/en-section-heading';
import { EnSidebar } from '@/components/en/en-sidebar';
import { enCategoryUrl } from '@/lib/en';
import {
  getCategoryFeed,
  getEditorsPickFeed,
  getHeroFeed,
  getLatestFeed,
  getMostReadFeed,
} from '@/lib/feed';

// English News homepage. Reuses the locale-aware feed layer (locale='en') — no
// backend changes. ISR = 300s safety ceiling; event-driven refresh via tags.
export const revalidate = 300;

export default async function EnHome() {
  const [hero, latest, publicNews, articles, mostRead, editors] = await Promise.all([
    getHeroFeed('en'),
    getLatestFeed('en'),
    getCategoryFeed('public-news', 7, 'en'),
    getCategoryFeed('articles', 6, 'en'),
    getMostReadFeed(6, 'en'),
    getEditorsPickFeed(5, 'en'),
  ]);

  // Lede: prefer featured (hero); fall back to the latest feed.
  const lede = hero.length ? hero : latest;
  const lead = lede[0] ?? null;
  const secondary = lede.slice(1, 4);
  const used = new Set([lead?.id, ...secondary.map((s) => s.id)].filter(Boolean));
  const latestGrid = latest.filter((it) => !used.has(it.id)).slice(0, 6);

  const nothing =
    !lead && latestGrid.length === 0 && publicNews.length === 0 && articles.length === 0;

  return (
    <div className="en-container">
      {lead && (
        <section className="en-lede" aria-label="Top stories">
          <EnArticleCard item={lead} variant="hero" />
          <div className="en-lede__side">
            {secondary.map((it) => (
              <EnArticleCard key={it.id} item={it} variant="list" />
            ))}
          </div>
        </section>
      )}

      {nothing && (
        <div style={{ paddingBlock: 48 }}>
          <EnEmpty />
        </div>
      )}

      <div className="en-main">
        <div>
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

          {publicNews.length > 0 && (
            <section className="en-section" aria-label="Public News">
              <EnSectionHeading title="Public News" viewAllHref={enCategoryUrl(60, 'public-news')} />
              <div className="en-grid">
                {publicNews.slice(0, 6).map((it) => (
                  <EnArticleCard key={it.id} item={it} variant="standard" />
                ))}
              </div>
            </section>
          )}

          {articles.length > 0 && (
            <section className="en-section" aria-label="Articles">
              <EnSectionHeading title="Articles" viewAllHref={enCategoryUrl(61, 'articles')} />
              <div className="en-grid en-grid--2">
                {articles.slice(0, 4).map((it) => (
                  <EnArticleCard key={it.id} item={it} variant="feature" />
                ))}
              </div>
            </section>
          )}
        </div>

        <EnSidebar mostRead={mostRead} editorsPicks={editors} />
      </div>
    </div>
  );
}
