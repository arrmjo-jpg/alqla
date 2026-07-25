# Cache Invalidation — AlphaCMS

Canonical reference for how a content mutation in Laravel reaches Next.js's
ISR cache. Read this before adding any new `fetch()` with `next.tags`, before
adding a mutation Action that changes public output, and before debugging
"why didn't this update show up immediately."

This document describes the **event-driven invalidation path**
(`revalidateTag()`) — see `docs/architecture/NEXTJS-CACHING-GOTCHAS.md` for
the separate, related topic of *time-based* revalidate windows and why a
page's effective ISR interval is rarely the number written at its top.

Snapshot date: 2026-07-18, after the event-driven ISR conversion (§11) shipped
on top of the P0/P1 fixes (`b8e734cc2b`, `baf2314c60`) and the Phase 3 cleanup
audit (§10). Produced by a full audit of every mutation Action and every
tagged `fetch()` in the codebase — every claim in this document traces to a
specific file:line, not inference.

**Current model: event-driven only.** Every public page now carries a
10-hour (`36000`s) ISR safety fallback — not a freshness mechanism. Freshness
comes exclusively from `FrontendRevalidate::tags()` calls fired on every
content-mutating Action. The only exceptions are external-API-passthrough
data (weather/ASE market/gold/sport) and high-frequency engagement counters,
which have no Laravel-owned mutation to hang an invalidation off — see §11.

---

## 1. Architecture Overview

```
Admin Action (Create/Update/Delete/Publish/...)
        │
        ▼
FrontendRevalidate::tags(array $tags)          app/Support/Frontend/FrontendRevalidate.php
        │  no-op if services.frontend_revalidate.{url,secret} unset, or $tags === []
        ▼
RevalidateFrontendCacheJob::dispatch($tags)     app/Jobs/RevalidateFrontendCacheJob.php
        │  ->afterCommit() — waits for the DB transaction to commit before firing
        │  tries=1, timeout=15s — fire-and-forget, never retries, never blocks the write
        ▼
POST /api/revalidate                            (Laravel → Next.js, over HTTP)
        │  header: x-revalidate-secret
        │  body:   { tags: string[] }
        ▼
frontend/src/app/api/revalidate/route.ts
        │  validates secret (401 if wrong, 503 if unconfigured, 422 if no tags)
        ▼
revalidateTag(tag)  — once per tag
        │
        ▼
Next.js Data Cache entries carrying that tag are marked stale
        │
        ▼
Next request for an affected page triggers a fresh render (ISR "on-demand revalidate")
```

**Two independent systems exist under the name "cache" in this codebase — do not confuse them:**

| System | What it invalidates | Mechanism | Scope |
|---|---|---|---|
| **This document's subject** | Next.js Data Cache / ISR pages | `FrontendRevalidate::tags()` → `revalidateTag()` | Public site (`frontend/`) |
| Laravel response cache | RSS/Sitemap XML responses | `Cache::tags([...])->flush()` via `ArticleCacheTags`/`ReelCacheTags`/`VideoCacheTags` (`app/Support/Cache/*.php`) | Backend-only, served through Next.js as plain `no-store` proxies — see §7 |

A single mutation Action typically calls **both** (e.g. `Cache::tags([...])->flush()` for the Laravel-side response cache, then `FrontendRevalidate::tags()` for Next.js) — they are not redundant, they invalidate different things.

**Fire-and-forget by design**: if the frontend is down or misconfigured, `RevalidateFrontendCacheJob` logs a warning and gives up — it never retries (`tries=1`) and never throws back into the write path. The worst case is a page staying stale until its time-based `revalidate` safety net expires, never a broken publish.

---

## 2. Tag Registry (single source of truth)

Every tag string that exists anywhere in the system, where it's produced, where it's consumed. **If you add a tag, add a row here in the same PR** — this table existing and being wrong is worse than it not existing.

| Tag | Backend Producer | Frontend Consumer | Purpose |
|---|---|---|---|
| `homepage` | `FrontendCacheTags::article()` — always | *(none — see §8 Reserved)* | Intended to cover Hero/Latest/Breaking/Editors Pick as one umbrella; superseded by the specific `feed:*` tags below |
| `feed:hero` | `FrontendCacheTags::article()` — if `is_featured` set or changed | `lib/feed.ts: getHeroFeed()` | Homepage hero block |
| `feed:header` | `FrontendCacheTags::article()` — if `is_header` set or changed | `lib/feed.ts: getHeaderFeed()` | "آخر المستجدات" homepage block |
| `feed:breaking` | `FrontendCacheTags::article()` — if `is_breaking` set or changed *(added `b8e734cc2b`)* | `lib/feed.ts: getBreakingFeed()` | Breaking-news bar |
| `feed:latest` | `FrontendCacheTags::article()` — always | `lib/feed.ts: getLatestFeed()` | `/latest` + sidebar news widget |
| `feed:most_read` | `FrontendCacheTags::article()` — always | `lib/feed.ts: getMostReadFeed()` | "الأكثر قراءة" + `/trending` |
| `feed:editors_pick` | `FrontendCacheTags::article()` — if `is_editor_pick` set or changed | *(none — see §8 Reserved)* | No Editor's Pick section exists in the frontend yet |
| `search` | `FrontendCacheTags::article()` — always *(added `b8e734cc2b`)* | `lib/search.ts: searchArticles()` | Site search results |
| `articles` | *(legacy umbrella — no longer emitted by `FrontendCacheTags::category()` as of 2026-07-24, see §14)* | `lib/feed.ts` (hero/header/breaking/latest/most_read/category-feed), `lib/articles.ts: getArticle()`, `lib/search.ts` | Broad umbrella; kept as a consumer-side tag but the category-rename producer branch was removed (id-based tags don't need it — see §14) |
| `article:{id}` | `FrontendCacheTags::article()` — always (2026-07-18: id-keyed, was slug-keyed — see §12) | `lib/articles.ts: getArticle()` | Single article page |
| `category:{id}` | `FrontendCacheTags::article()` (current + old category ids on change), `FrontendCacheTags::category()` — always | `lib/feed.ts: getCategoryFeed()`, `getCategoryPage()` (both resolve id from slug via `getCategoryBySlug()` before tagging — see §14) | Category listing/landing pages. **2026-07-24: was `category:{slug}` — found still slug-based despite §12/§11 claiming an id-based conversion; fixed, see §14.** |
| `categories` | `FrontendCacheTags::category()` — always | `lib/feed.ts` (nav/category-tree lookups), `lib/categories.ts: getCategories()` *(dead — no caller)* | Category tree/nav |
| `author_articles:{id}` | `FrontendCacheTags::article()` — current + old author on change | *(none — see §8 Reserved)* | No author-article-listing page exists in the frontend |
| `tag:{name}` | `FrontendCacheTags::article()` — current + old tags | *(none — see §8 Reserved)* | No tag-filtered listing page exists in the frontend |
| `live_updates` | `CreateLiveUpdateAction`/`UpdateLiveUpdateAction`/`DeleteLiveUpdateAction`/`MoveLiveUpdateAction` via `FrontendCacheTags::liveUpdates()` *(added `b8e734cc2b`)* | `lib/articles.ts: getLiveUpdates()` | Umbrella for all live-coverage updates |
| `live:{slug}` | same four Actions, same method | same | One specific live-coverage article |
| `page-feed:{locale}` | `PageCdnPurge` → `FrontendCacheTags::page()` | `lib/static-pages.ts: getStaticPages()` | Footer/header static-page lists |
| `page:{locale}:{slug}` | same (current + old slug on rename) | `lib/static-pages.ts: getStaticPage()` | Single static page |
| `reel-feed:{locale}` | `ReelCdnPurge` → `FrontendCacheTags::reel()` | `lib/reels.ts: getReelsFeed()` | Reels feed |
| `reel:{id}` | same, always (id-based) | `lib/reels.ts: getReelByIdSlug()` (extracts id from the `{id}-{slug}` URL segment) | Single reel deep-link. **2026-07-24: was `reel:{locale}:{slug}` — fixed, see §14.** |
| `video-feed:{locale}` | Video actions → `FrontendCacheTags::fromVideoTags()` | `lib/videos.ts` (latest/featured/trending/most-viewed/related/by-category/playlists) | Video library listings |
| `video:{id}` | `FrontendCacheTags::videoDetail()` — called explicitly alongside `fromVideoTags()` by every video action with a `Video` object (Create/Update/Delete/ForceDelete/Restore/PublishDue/BulkVideoAction/status-change listener) | `lib/videos.ts: getVideo()` (extracts id from the `{id}-{slug}` URL segment) | Single video page. **2026-07-24: was `video:{locale}:{slug}` — fixed, see §14.** |
| `video-category:{locale}:{slug}` | same, and `FrontendCacheTags::videoCategory()` | `lib/videos.ts: getVideosByCategory()` | Video-category listing |
| `playlist:{locale}:{slug}` | same | `lib/videos.ts: getPlaylist()` | Playlist page |
| `categories` (video-side reuse) | n/a — video categories use their own tag family above; no collision | — | — |
| `comments` | `DeleteCommentAction`/`ModerateCommentAction` → `FrontendCacheTags::comments()` | `lib/comments.ts: getComments()` | Umbrella for all comment lists |
| `comments:{slug}` | same | same | One article's comment list |
| `writers` | `UpdateUserAction`, `UpdateUserStatusAction`, `UploadAuthorAvatarAction` *(added `baf2314c60`)* | `lib/writer.ts: getWriterProfile()` | Writer directory-level data |
| `writer:{id}` | same three | same | Single writer profile page |
| `site-settings` | `UpdateGeneralSettingsAction`, `UpdateNewspaperSettingsAction`, `FrontendCacheTags::category()` (always) | `lib/site-settings.ts: getSiteSettings()` | Logo/theme/footer/nav/cookie-policy/newspaper toggle |
| `tts-config` | `UpdateThirdPartySettingsAction` | `lib/tts.ts: getTtsConfig()` | Text-to-speech feature flag |
| `social-config` | `UpdateThirdPartySettingsAction` | `lib/auth-config.ts: getSocialAuthConfig()` | Social login providers |
| `recaptcha-config` | `UpdateThirdPartySettingsAction` | `lib/recaptcha.ts: getRecaptchaConfig()` | reCAPTCHA toggle |
| `match-bar` | `UpdateMatchBarSettingsAction`, `UpdateCompetitionAction` | `lib/match-bar.ts: getMatchBar()` | Sport match-bar admin config (not live sport data — see §8). Time-based only (60s) — see §11, deliberately excluded from the event-driven conversion |
| `epaper-feed:{locale}` | `FrontendCacheTags::epaper()` — every Epaper action (§11) | `lib/epaper.ts` | Newspaper issue archive |
| `engagement`, `engagement:article:{id}` | *not applicable — high-frequency counters, time-based by design* | `lib/engagement.ts: getArticleMetrics()` | View/like/favorite counts |
| `weather`, `ase-ticker`, `ase-summary`, `ase-index`, `ase-movers`, `ase-docs`, `gold`, `sport-games`, `sport-game-{id}`, `sport-competition-{id}`, `sport-stats` | *none — external-API passthrough, see §7* | various `lib/*.ts` | Live external data; time-based revalidate is the correct and only mechanism |
| `broadcast-feed:{kind}` | `FrontendCacheTags::broadcast()` / `broadcastCategoryChange()` — every Broadcast action (§11) | `lib/broadcast.ts: getLiveKindFeed()`, `getChannels()`, `getLiveNow()`, `getNextUpcoming()` (via shared `fetchList()`) | Live/TV/Radio listing per kind |
| `broadcast:{kind}:{slug}` | `FrontendCacheTags::broadcast()` (current + old kind/slug on change) | `lib/broadcast.ts: getBroadcast()` | Single broadcast watch page |
| `ase` | *none* | `lib/ase.ts: getAseCompanies()` *(dead — no caller)* | — |
| `ads`, `ads:zone:{key}` | `AdCacheTags`/`AdServingInvalidator::forCampaign()`/`forCreative()`/`flushZones()` — every `app/Actions/Admin/Advertising/*` mutation | *(none — ads are always client-side `no-store`, never cached in the frontend)* | **Added 2026-07-23 — previously undocumented.** This is a real *backend* Redis cache (the ad-serving pool, `CachedRead::remember()`-wrapped in `ServeAdAction`), distinct from the Next.js ISR layer this document otherwise tracks. §7's "two layers" framing undersold this — there are effectively three caching surfaces once ad-serving is counted; see §7. |
| `sport-menu` | `Create/Update/Delete/ReorderSportMenuItemsAction` via `FrontendRevalidate::tags(['sport-menu'])` | *(none — grepped, no `fetch()` anywhere uses this tag)* | **Added 2026-07-23 — previously undocumented.** Orphan invalidation, same class as §8's reserved tags: harmless no-op today (`ListPublicSportMenuAction` isn't cached either, so there's nothing stale to begin with), just never listed here before. |

---

## 3. Mutation Matrix

Every content-mutating Action and exactly what it invalidates. "—" means confirmed no invalidation exists.

| Action | Tags Invalidated |
|---|---|
| `CreateArticleAction`, `UpdateArticleAction`, `DeleteArticleAction`, `ForceDeleteArticleAction`, `RestoreArticleAction` | `FrontendCacheTags::article()` via `ArticleCdnPurge::purge()` |
| `TransitionArticleStatusAction` (publish/unpublish/schedule) | same, via `ArticleStatusChanged` → `PurgeArticleCdnOnStatusChanged` listener |
| `PublishDueArticlesAction` (scheduled) | same, per article, inside the cron job |
| `ClearBreakingArticlesAction` (bulk-clear) | same, per article — automatically picks up `feed:breaking` now that `FrontendCacheTags::article()` checks `is_breaking` |
| *(no bulk-publish/bulk-delete article action exists)* | n/a |
| `CreateLiveUpdateAction`, `UpdateLiveUpdateAction`, `DeleteLiveUpdateAction`, `MoveLiveUpdateAction` | `FrontendCacheTags::liveUpdates()` — `live_updates`, `live:{slug}` |
| `CreateCategoryAction`, `UpdateCategoryAction`, `DeleteCategoryAction`, `RestoreCategoryAction`, `ForceDeleteCategoryAction`, `MoveCategoryAction` | `FrontendCacheTags::category()` |
| `BulkUpdateCategoriesAction` | `FrontendCacheTags::category()` per affected category, deduplicated union |
| `CreateVideoAction`, `UpdateVideoAction`, `DeleteVideoAction`, `RestoreVideoAction`, `ForceDeleteVideoAction`, `BulkVideoAction`, playlist actions (`Create/Update/Delete/Restore/ForceDelete/Attach/Detach/Reorder`) | `FrontendCacheTags::fromVideoTags()` |
| `TransitionVideoStatusAction` | same, via `VideoStatusChanged` → `RevalidateVideoFrontendOnStatusChanged` listener |
| `PublishDueVideosAction` (scheduled) | same, inside the cron job |
| `UpdateVideoCategoryAction`, `MoveVideoCategoryAction` | `FrontendCacheTags::videoCategory()` / `fromVideoTags()` |
| `CreateReelAction`, `UpdateReelAction`, `DeleteReelAction`, `RestoreReelAction`, `ForceDeleteReelAction` | `FrontendCacheTags::reel()` via `ReelCdnPurge::purge()` |
| `TransitionReelStatusAction` | same, via `ReelStatusChanged` → `PurgeReelCdnOnStatusChanged` listener |
| `PublishDueReelsAction` (scheduled) | same, inside the cron job |
| `DeleteCommentAction`, `ModerateCommentAction` | `FrontendCacheTags::comments()` |
| `UpdateUserAction`, `UpdateUserStatusAction`, `UploadAuthorAvatarAction` | literal `['writers', "writer:{id}"]` |
| `DeleteUserAction`, `RestoreUserAction` | literal `['writers', "writer:{id}"]` — **fixed** (was previously listed as a gap; closed in a later session, mirrors `UpdateUserAction`) |
| `UpdateTagAction`, `DeleteTagAction` | `["tag:{name}", ...]` for old+new translated names — **fixed** (was previously listed as a gap; still functionally inert today since no frontend consumer of `tag:{name}` exists yet, see §8, but the plumbing is now in place for when one ships) |
| `UpdateGeneralSettingsAction`, `UpdateNewspaperSettingsAction` | `['site-settings']` |
| `UpdateThirdPartySettingsAction` | `['tts-config', 'social-config', 'recaptcha-config']` |
| `UpdateMatchBarSettingsAction`, `UpdateCompetitionAction` | `['match-bar']` |
| All `app/Actions/Admin/Advertising/*` (15 actions) | **—** on the frontend, by design (ads are always client-side `no-store`, never cached there) — but **not** uninvalidated overall: see the new Ad-serving backend cache row below |
| All `app/Actions/Admin/Polls/*` (6 actions) | **—** (no frontend feature consumes poll data — see §8) |
| Gallery-related | n/a — no Gallery model/feature exists |
| `SportMenuItem` CRUD (`Create/Update/Delete/ReorderSportMenuItemsAction`) | `['sport-menu']` — see the new Sport-menu tag row below (previously undocumented, not a gap: harmless since no frontend `fetch()` consumes this tag and there's no backend cache on this read path either) |
| `CreateBroadcastAction`, `UpdateBroadcastAction`, `DeleteBroadcastAction`, `StartBroadcastAction`, `ScheduleBroadcastAction`, `EndBroadcastAction`, `FailBroadcastAction`, `ArchiveBroadcastAction`, `ResumeBroadcastAction`, `MarkBroadcastOfflineAction`, `EmergencyShutdownAction` (offline transition only), `MonitorBroadcastHealthAction` (failed↔live transitions only) | `FrontendCacheTags::broadcast()` — `broadcast-feed:{kind}` (+ old kind on change), `broadcast:{kind}:{slug}` (+ old kind/slug on change) *(closed 2026-07-18, §11)* |
| `PublishDueBroadcastsAction` (scheduled go-live) | same, batched per broadcast in the cron job, deduplicated union *(closed 2026-07-18, §11)* |
| `CreateBroadcastCategoryAction`, `UpdateBroadcastCategoryAction`, `DeleteBroadcastCategoryAction` | `FrontendCacheTags::broadcastCategoryChange()` — all three `broadcast-feed:{kind}` *(closed 2026-07-18, §11)* |
| `BanViewerAction`, `CloseAudienceAction`, `ReopenAudienceAction`, `UnbanViewerAction`, `KickViewerAction` | **—** by design (session/viewer moderation only, no public cached output changes) |
| `BroadcastDashboardAction`, `BroadcastEntityAnalyticsAction`, `ListBroadcastsAction`, `ListBroadcastCategoriesAction`, `SyncBroadcastViewerCountsAction`, `DispatchBroadcastRemindersAction` | **—** by design (read-only/analytics/high-frequency, no public cached output changes) |
| `CreateEpaperAction`, `UpdateEpaperAction`, `DeleteEpaperAction`, `RestoreEpaperAction`, `ForceDeleteEpaperAction`, `DuplicateEpaperAction`, `ReplacePdfAction`, `SetEpaperCoverAction`, `TransitionEpaperStatusAction` | `FrontendCacheTags::epaper()` — `epaper-feed:{locale}` (+ old locale on change) *(closed 2026-07-18, §11)* |
| `PublishDueEpapersAction` (scheduled publish) | same, batched per epaper in the cron job, deduplicated union *(closed 2026-07-18, §11)* |
| `ExtractEpaperTextAction`, `ReprocessEpaperOcrAction` | **—** by design (OCR text is search-index-only — `EpaperSearchIndexer` — never exposed on any public frontend response, confirmed by grep across `frontend/src`) |

---

## 4. Frontend Fetch Matrix

Every `fetch()` in `frontend/src` that carries `next.tags`. Full detail (dead code, per-file line numbers) lives in the audit transcript; this is the canonical quick-reference. Fetches using `cache: 'no-store'` (ads, per-user account/follow/engagement BFFs, RSS/sitemap proxies, auth mutations) carry no tags and are omitted — they are never meant to be tag-invalidated.

All figures below reflect the 2026-07-18 event-driven conversion (§11): every
fetch backed by a Laravel-owned, tag-invalidated mutation now carries
`revalidate: 36000` (10h) as a **safety-fallback ceiling only** — freshness
comes from the tag invalidation, not this number. Fetches with no Laravel
mutation to hang an invalidation off (external APIs, engagement counters,
sport match-bar) keep their pre-existing tiered, genuinely time-based values
— unchanged, and correctly so.

| Fetch (`lib/*.ts`) | Tags | Revalidate (s) |
|---|---|---|
| `feed.ts: getHeroFeed` | `articles`, `feed:hero` | 36000 |
| `feed.ts: getHeaderFeed` | `articles`, `feed:header` | 36000 |
| `feed.ts: getBreakingFeed` | `articles`, `feed:breaking` | 36000 |
| `feed.ts: getLatestFeed` | `articles`, `feed:latest` | 36000 |
| `feed.ts: getMostReadFeed` | `articles`, `feed:most_read` | 36000 |
| `feed.ts: getCategoryById/BySlug` | `categories` | 300 (categories-tree index, not a per-category detail fetch) |
| `feed.ts: getCategoryFeed/Page` | `articles`, `category:{id}` (resolved from slug via `getCategoryBySlug()` before tagging) | 36000 |
| `articles.ts: getArticle` | `articles`, `article:{id}` (2026-07-18 — must be called with a bare numeric id, never a real slug string) | 36000 |
| `articles.ts: getLiveUpdates` | `live_updates`, `live:{slug}` | 1800 *(deliberately excluded — live-ticking content, mirrors the broadcast exception)* |
| `videos.ts` (latest/featured/trending/most-viewed/related/by-category/playlists index) | `video-feed:{locale}` (+ `video-category:*` where relevant) | 120 |
| `videos.ts: getVideo` | `video:{id}` (extracted from the `{id}-{slug}` URL segment; falls back to a `video:slug-fallback:{locale}:{slug}` tag — not backend-invalidated — only if the segment has no numeric prefix) | 36000 |
| `videos.ts: getPlaylist` | `playlist:{locale}:{slug}` *(still slug-based — known gap, not fixed 2026-07-24, see §14)* | 120 |
| `reels.ts: getReelsFeed` | `reel-feed:{locale}` | 60 |
| `reels.ts: getReelByIdSlug` | `reel:{id}` (extracted from the `{id}-{slug}` URL segment; same slug-fallback caveat as `getVideo`) | 36000 |
| `match-bar.ts: getMatchBar` | `match-bar` | 60 *(deliberately excluded — sport data, no Laravel-owned mutation to invalidate on; see §11)* |
| `writer.ts: getWriterProfile` | `writers`, `writer:{id}` | 36000 |
| `static-pages.ts: getStaticPages` | `page-feed:{locale}` | 36000 |
| `static-pages.ts: getStaticPage` | `page:{locale}:{slug}` | 36000 |
| `search.ts: searchArticles` | `articles`, `search` | 36000 |
| `site-settings.ts: getSiteSettings` | `site-settings` | 36000 |
| `recaptcha.ts: getRecaptchaConfig` | `recaptcha-config` | 36000 |
| `auth-config.ts: getSocialAuthConfig` | `social-config` | 36000 |
| `tts.ts: getTtsConfig` | `tts-config` | 36000 |
| `comments.ts: getComments` | `comments`, `comments:{slug}` | 36000 |
| `epaper.ts` | `epaper-feed:{locale}` | 36000 |
| `broadcast.ts` | `broadcast-feed:{kind}`, `broadcast:{kind}:{slug}` | 36000 |
| `engagement.ts: getArticleMetrics` | `engagement`, `engagement:article:{id}` | 300 *(deliberately excluded — high-frequency counters, time-based by design)* |
| `weather.ts` | `weather` | 900 / 1800 *(deliberately excluded — external API)* |
| `ase-market.ts`, `gold.ts` | `ase-ticker`/`ase-summary`/`ase-index`/`ase-movers`/`ase-docs`/`gold` | 120–300 *(deliberately excluded — external API)* |
| `sport/games.ts`, `sport/player.ts`, `sport/stats.ts` | `sport-games`/`sport-game-{id}`/`sport-competition-{id}`/`sport-stats` | 30–86400 *(deliberately excluded — external API, tiered by data volatility)* |

**Dead code found during the audit (tagged fetch, zero callers)** — harmless, but flag before relying on them: `lib/categories.ts: getCategories()`, `lib/ase.ts: getAseCompanies()`, `lib/sport/games.ts: getTeamGames()`, `lib/sport/stats.ts: getCompetitionTeams()`.

---

## 5. Event Flow — worked examples

### Publish an article (manual or scheduled)
```
TransitionArticleStatusAction / PublishDueArticlesAction
        │
        ▼
ArticleStatusChanged event  (manual path only)
        │
        ▼
ArticleCdnPurge::purge($article)
        │
        ├── FrontendCacheTags::article($article, ...)
        │       → homepage, feed:latest, feed:most_read, article:{slug},
        │         feed:hero/header/breaking (conditional), category:{slug}×N,
        │         author_articles:{id}, tag:{name}×N, search
        │
        ├── FrontendRevalidate::tags(...) → Queue → POST /api/revalidate → revalidateTag() × N
        │
        ├── CDN edge purge (Cloudflare, if cdn_auto_purge enabled)
        │
        └── SearchEngineNotify::sitemaps() (if newly published)

Next visitor to any affected page (homepage, category, the article itself,
search) triggers a fresh Server Component render — no wait for the
time-based revalidate window.
```

### Post a live-coverage update
```
CreateLiveUpdateAction / UpdateLiveUpdateAction / DeleteLiveUpdateAction / MoveLiveUpdateAction
        │
        ├── Cache::tags(['live_updates'])->flush()   (Laravel-side, unrelated system)
        │
        └── FrontendRevalidate::tags(FrontendCacheTags::liveUpdates($article))
                → live_updates, live:{slug}
                → Queue → POST /api/revalidate → revalidateTag() × 2

Next visitor to that article's page re-fetches getLiveUpdates() fresh.
(Fixed in b8e734cc2b — previously this step did not exist; updates could
take up to 1800s, the fetch's own revalidate, to appear.)
```

### Delete a category (soft or force)
```
DeleteCategoryAction / ForceDeleteCategoryAction
        │
        ▼
FrontendRevalidate::tags(FrontendCacheTags::category($category))
        → categories, site-settings, category:{slug}
        → Queue → POST /api/revalidate → revalidateTag() × 3

Nav, homepage category blocks, and the category's own landing page all
revalidate on next visit. (ForceDelete captures the tags before the row is
gone, since relations would otherwise be lost.)
```

### Bulk category status/visibility change
```
BulkUpdateCategoriesAction
        │
        ├── Cache::tags(['categories'])->flush()   (Laravel-side)
        │
        └── FrontendRevalidate::tags(
                merge of FrontendCacheTags::category($c) for every $c in the batch
            )
                → single dispatch, deduplicated tag union across all affected categories

(Fixed in baf2314c60 — previously only the first line existed; a bulk edit
across N categories relied solely on the 300s safety net.)
```

---

## 6. Design Rules

1. **Every new `fetch()` in the render tree must declare `next: { tags, revalidate }` explicitly.** No cache option at all silently defaults to `force-cache` forever (never revalidates without a tag hit) — see `docs/architecture/NEXTJS-CACHING-GOTCHAS.md` for what happens when this is gotten wrong.
2. **Every mutation that changes what a tagged fetch returns must call `FrontendRevalidate::tags(...)` with that fetch's exact tag(s)**, immediately after (or via `->afterCommit()` semantics, already built into the job). Do not rely on the time-based `revalidate` window as a substitute for real invalidation — that window is a safety net for infrastructure failures, not the primary freshness mechanism.
3. **Any new tag must be added to the Tag Registry (§2) in the same PR** that introduces it — on both the producing side (which Action/method emits it) and the consuming side (which `fetch()` uses it). A tag with only one side filled in is either dead code or a bug; this table is how a future reviewer tells the difference without re-auditing the whole codebase.
4. **Prefer specific tags over the `articles`/`categories` umbrella tags** for anything with its own tag family already (e.g. `feed:latest` over reusing `articles`) — the umbrella exists for the one legitimate cross-cutting case (category slug rename affecting cached article breadcrumbs), not as a default.
5. **Any new content-mutating feature needs a test asserting the invalidation call happens** — `Queue::fake()` + `Queue::assertPushed(RevalidateFrontendCacheJob::class, fn ($job) => in_array('your:tag', $job->tags))` is the pattern used to verify the P0/P1 fixes in this document; follow it, don't just eyeball the code.
6. **External-API passthrough data (sport, weather, market/gold, ads) never needs `FrontendRevalidate`** — there is no Laravel-authored content to invalidate; its own tiered time-based `revalidate` (30s–86400s by volatility) is the correct and only freshness mechanism. Don't "fix" these by adding invalidation calls that have nothing to invalidate.

---

## 7. Other caching layers, not covered by this document

This document tracks the Next.js ISR (`FrontendRevalidate`) layer primarily. Three other, independent caching surfaces exist and are **not** ISR concerns:

- **Laravel `Cache::tags()->flush()`** (`ArticleCacheTags`/`ReelCacheTags`/`VideoCacheTags`) backs RSS/Sitemap XML responses and other backend-only response caches. `frontend/src/app/{rss.xml,sitemap.xml,rss/[feed].xml,[sitemap].xml}/route.ts` proxy these with `cache: 'no-store'` and set their own `Cache-Control` header — no `revalidateTag` involvement, and none is needed.
- **The ad-serving backend cache** (`AdCacheTags`/`AdServingInvalidator`, see §2) — a real Redis-tagged cache for the ad pool, fully invalidated on every Advertising mutation, but with no corresponding Next.js tag since ads are always fetched client-side `no-store`. Easy to mistake for "uncached" when reading only the Mutation Matrix's frontend column — it isn't; see the `ads`/`ads:zone:{key}` row in §2.
- **Image/media Cache-Control** (browser + CDN, `max-age=30d` set in `docker/php/nginx-backend.conf`/`docker/nginx/default.conf`) is entirely separate from Next.js's Data Cache. As of 2026-07-23, `MediaCacheInvalidator` (§13) does invalidate the Laravel/ISR caches of every owning entity when a media asset's derivatives regenerate — but the image *bytes themselves* may still be served from browser/CDN cache under the same URL for up to 30 days regardless. This is a distinct, still-open concern (unaffected by §13's fix), flagged during the original Cache Invalidation Audit.
- **Laravel Scout / Meilisearch** (`ResilientSearchable` on `Article`/`Broadcast`/`Reel`/`Video`) reindexes automatically via Eloquent's Scout observer on save/delete, fully independent of `FrontendRevalidate`. This is expected — search indexing and Next.js page caching are different systems solving different problems.

---

## 8. Reserved / Currently Unused Tags

These tags are produced by the backend but have no frontend consumer today. **Do not delete the backend code that emits them** without first confirming the corresponding frontend feature is genuinely never planned — they may be scaffolding for features not yet built:

| Tag | Why it might exist |
|---|---|
| `homepage` | **Correction (2026-07-23): this row was wrong — `/homepage` is live, not dead.** A prior draft of this doc (and of a separate migration audit) claimed no caller existed for the backend `/homepage` endpoint (`routes/api/v1/public.php` → `BuildPublicHomepageAction`). That was based on an incomplete grep. `frontend/src/lib/feed.ts`'s `getHomepageFeed()` calls this endpoint directly and tags the fetch `['articles', 'homepage']` for ISR revalidation — it is the real homepage data source, correctly wired to this tag, and should **not** be treated as dead code or removed. |
| `feed:editors_pick` | Implies an "Editor's Pick" homepage section is planned but not yet built |
| `author_articles:{id}` | Implies an author-article-listing page (e.g. `/writer/{id}/articles`) is planned but not yet built |
| `tag:{name}` | Implies a tag-filtered article listing page is planned but not yet built |

If a future feature adds the missing frontend consumer for any of these, the backend invalidation already exists and needs no changes — just wire up the `fetch()` with the matching tag and update §2/§4 above.

---

## 9. Open items not resolved by this document

- ~~`broadcast-feed:{kind}`/`broadcast:{kind}:{slug}`~~ — **closed 2026-07-18**, see §11.
- ~~`epaper-feed:{locale}`~~ — **closed 2026-07-18**, see §11.
- **Polls** — six admin Actions exist with zero invalidation and (per this audit) zero frontend consumer. Per the 2026-07-17 review: do not add invalidation before confirming the feature is actually surfaced anywhere in the frontend — adding cache-invalidation plumbing for a feature nobody can see would be complexity with no payoff.
- ~~`DeleteUserAction`/`RestoreUserAction`~~ — **closed** (in a session after the original audit): both now invalidate `['writers', "writer:{id}"]`, mirroring `UpdateUserAction`.
- **Media (`MediaAsset`)** — **closed 2026-07-23**, see §13.

---

## 10. Phase 3 — Cleanup audit results (2026-07-17, safe mode)

A dedicated pass to find genuinely dead tags for removal, run after P0/P1 shipped. Every tag in `FrontendCacheTags.php` was checked against six conditions (no `fetch()` uses it, no frontend component depends on it, no backend invalidates it, no documentation references it, no test references it, no future architecture doc reserves it) — a tag had to fail **all six** to be eligible for removal.

### Dead Tags
**None found.** Every tag with zero frontend consumers (`homepage`, `feed:editors_pick`, `author_articles:{id}`, `tag:{name}`) already fails the "no documentation references it" condition — §8 above documents all four as intentionally reserved. None were removed.

### Removed Tags
**None.** No code, `fetch()`, `revalidate` value, or API contract was changed in this pass.

### Duplicate tags found (reported, not merged)
Two tag pairs currently produce identical invalidation scope because each pair has exactly one consuming `fetch()` that requires both tags simultaneously:

| Umbrella tag | Specific tag | Sole consumer today |
|---|---|---|
| `comments` | `comments:{slug}` | `lib/comments.ts: getComments(slug)` |
| `live_updates` | `live:{slug}` | `lib/articles.ts: getLiveUpdates(slug)` |

Not merged deliberately — each umbrella tag would become independently meaningful the moment a site-wide "recent comments" or "all live coverage" listing page is built, mirroring why `categories`/`articles` stay separate from their `*:{slug}` counterparts today.

### Orphan invalidations (backend produces, frontend never consumes)
Identical to the Reserved list in §8 — `homepage`, `feed:editors_pick`, `author_articles:{id}`, `tag:{name}`. See §8 for the reasoning behind keeping each.

### Orphan fetch tags (frontend uses, backend never invalidates)
**None found**, confirmed after P0/P1 closed the three that existed (`feed:breaking`, `search`, `live_updates`/`live:{slug}`). The only frontend tags without a backend producer are the intentional external-API-passthrough family (weather, ASE market, gold, sport, broadcast) — see §7/§9, not a gap.

### Notable aside discovered during this pass (out of scope, flagged not fixed)
The backend `/homepage` REST endpoint (`BuildPublicHomepageAction`, still routed, still CDN-purged on every article write) has no confirmed caller anywhere in this repository — see the corrected `homepage` row in §8. This is a Laravel API surface question, not a Next.js cache tag question, and was not investigated further here.

### Regression check
No source file changed in this pass, so no new tests were needed; the existing suite's state is unchanged from the P0/P1 commits (`b8e734cc2b`, `baf2314c60`).

### Git diff summary
This documentation update only. Zero application code changed.

---

## 11. Event-driven ISR conversion (2026-07-18)

Goal: eliminate reliance on time-based ISR for freshness. Every public page's
`export const revalidate` becomes a 10-hour (`36000`s) **safety fallback
only** — freshness must come exclusively from `FrontendRevalidate::tags()`
firing on every content-mutating Action. Requires (a) closing every remaining
invalidation gap so raising the fallback is actually safe, then (b) raising
the fallback everywhere it's safe to do so.

### Scope decisions (confirmed with the team before implementation)

- **External-API-passthrough data is excluded**: weather, ASE market/gold,
  sport scores, and the sport `match-bar` widget have no Laravel-owned
  mutation to hang `FrontendRevalidate` off — they stay at their existing
  tiered time-based values (30s–1800s). Forcing these to 10h would make
  genuinely-external data appear stale for hours.
- **Engagement counters are excluded**: view/like/favorite counts
  (`lib/engagement.ts`) stay at 300s by design — high-frequency,
  intentionally not event-driven (an invalidation-per-view would be a
  storm).
- **Broadcast live/tv/radio pages ARE included** (raised to 36000s), despite
  their prior 30s ceiling existing specifically because the fire-and-forget
  invalidation job (`tries=1`, `timeout=15s`) could in theory fail silently
  on a status transition. Confirmed explicitly: the full lifecycle now has
  `FrontendRevalidate::tags()` coverage (see below), and the team chose
  consistency with the rest of the site over the extra 30s safety margin.

### Broadcast gap closed

Zero Broadcast admin Actions called `FrontendRevalidate::tags()` before this
pass — only the unrelated Laravel-side `Cache::tags(BroadcastCacheTags...)`
existed. Added `FrontendCacheTags::broadcast()` (builds
`broadcast-feed:{kind}` + `broadcast:{kind}:{slug}`, tracking old kind/slug
on change — deliberately hand-built rather than translated from
`BroadcastCacheTags`, since the backend tag shape isn't kind-dimensioned but
the frontend's `lib/broadcast.ts` requires it) and
`FrontendCacheTags::broadcastCategoryChange()` (all three feed tags, for
category-level mutations that don't target one broadcast). Wired into:
`CreateBroadcastAction`, `UpdateBroadcastAction`, `DeleteBroadcastAction`,
`StartBroadcastAction`, `ScheduleBroadcastAction`, `EndBroadcastAction`,
`FailBroadcastAction`, `ArchiveBroadcastAction`, `ResumeBroadcastAction`,
`MarkBroadcastOfflineAction`, `EmergencyShutdownAction`,
`MonitorBroadcastHealthAction`, `PublishDueBroadcastsAction` (batched),
`CreateBroadcastCategoryAction`, `UpdateBroadcastCategoryAction`,
`DeleteBroadcastCategoryAction` — 16 files. Deliberately excluded: viewer
moderation (`BanViewerAction`/`CloseAudienceAction`/`ReopenAudienceAction`/
`UnbanViewerAction`/`KickViewerAction` — session-only, no cached-output
change) and read-only/analytics/high-frequency actions.

### Epaper gap closed

No backend cache-tag class existed for Epaper at all before this pass (zero
`Cache::tags` calls in `app/Actions/Admin/Epaper/*.php`). Added
`FrontendCacheTags::epaper()` (`epaper-feed:{locale}`, + old locale on
change — the frontend has no per-issue detail tag; even the reader page
reuses the list fetch). Wired into: `CreateEpaperAction`,
`UpdateEpaperAction`, `DeleteEpaperAction`, `RestoreEpaperAction`,
`ForceDeleteEpaperAction` (tags captured before `forceDelete()`, matching
`ForceDeleteArticleAction`'s pattern), `DuplicateEpaperAction`,
`ReplacePdfAction`, `SetEpaperCoverAction`, `TransitionEpaperStatusAction`
(the actual draft→published/archived transition — the most consequential
fix), `PublishDueEpapersAction` (batched, scheduled publish) — 10 files.
Deliberately excluded: `ExtractEpaperTextAction`/`ReprocessEpaperOcrAction`
(OCR text is search-index-only via `EpaperSearchIndexer`, confirmed by grep
that it's never exposed on any public frontend response).

### ISR-eligibility gap found and fixed (not part of the original ask)

Raising `export const revalidate` is a no-op on a route that Next.js treats
as fully dynamic. A production build (`next build` against the real edited
source, in a disposable `node:20-alpine` container) surfaced that 5 routes
had **zero ISR at all** — `writer/[id]`, `live/[slug]`, `radio/[slug]`,
`tv/[slug]`, `newspaper/[idslug]` all built as `ƒ (Dynamic)`, not `● (SSG)` —
because they were missing `generateStaticParams()`. This is the exact root
cause already fixed for `articles/[idslug]` and `reels/[idslug]` during this
session's earlier ISR Restoration work, just never applied to the other
dynamic-segment routes. Confirmed and fixed by adding
`export async function generateStaticParams() { return []; }` (identical
pattern) to all 5 files — a second build confirmed all 5 flipped to `●`.
`category/[slug]` and `videos/[idslug]` remain `ƒ` correctly — both read
`searchParams`, a legitimate, pre-existing, unrelated reason for full
dynamic rendering.

One further empirical correction to a theoretical concern raised mid-task:
the shared `(site)/layout.tsx` fetches `getMatchBar()` at `revalidate: 60`
on every request; the worry was that this would drag every `(site)`-group
page's *effective* ISR ceiling down to 60s regardless of the page's own
`revalidate` export. The actual production build disproved this —
`/economy`, `/latest`, `/trending`, `/live`, `/epaper`, `/videos` all build
with a clean `10h` effective revalidate, not `1m`. Only the homepage itself
is bounded lower (`2m`), and that's from its own embedded `ase-ticker` fetch
(120s, already-excluded external data) — an expected, pre-existing
exception, not a new gap.

### Page-level `revalidate` raised to 36000

`(site)/page.tsx` (homepage, 3600→36000), `(site)/latest`, `(site)/trending`,
`(site)/live`, `(site)/live/[slug]`, `(site)/tv/[slug]`, `(site)/radio/[slug]`,
`(site)/epaper`, `(site)/epaper/archive`, `(site)/economy`,
`(site)/category/[slug]` (cosmetic — already fully dynamic via
`searchParams`), `(site)/writer/[id]`, `(site)/videos`,
`(site)/videos/[idslug]` (cosmetic — already fully dynamic via
`searchParams`), `(site)/articles/[idslug]`, `(reels)/reels/[idslug]`,
`(reels)/reels`, `newspaper/[idslug]` — 18 files. Left untouched:
`(site)/bourse`, `(site)/gold-prices`, `(site)/weather` (external data),
`(site)/pages/[slug]` (already 86400, exceeds the new baseline).

### Fetch-level `next.revalidate` raised to 36000

`articles.ts`, `broadcast.ts`, `epaper.ts`, `videos.ts` (all via their shared
`REVALIDATE` constant), `categories.ts`, `comments.ts`, `search.ts`,
`site-settings.ts`, `writer.ts`, `reels.ts` (both fetches),
`static-pages.ts` (both fetches), `feed.ts` (all six tagged fetches),
`auth-config.ts`, `recaptcha.ts`, `tts.ts` — 14 files. Left untouched:
`ase-market.ts`, `ase.ts`, `engagement.ts`, `gold.ts`, `match-bar.ts`,
`weather.ts`.

### Test evidence

- **Existing Pest suites** (`tests/Feature/Admin/{Broadcast,Epaper}`,
  `tests/Feature/Public/{Broadcast,Epaper}`, 323 tests) run unchanged after
  the invalidation-call additions: 322 passed, 1 pre-existing failure
  (`EpaperAccessTest::it_applies_the_conservative_default_policy...`)
  confirmed present and identical on `main` *before* this pass too (via
  `git stash`) — unrelated to this work.
- **Functional `Queue::fake()` verification**, matching this session's
  established P0/P1 pattern, run against the live backend container with
  the edited Action files copied in: every modified Broadcast action
  (Create/Update/Delete/Start/Schedule/End/Fail/Archive/Resume/
  MarkOffline/EmergencyShutdown/PublishDue/category CRUD) and every modified
  Epaper action (Create/Duplicate/Restore/ForceDelete/SetCover/ReplacePdf/
  TransitionStatus/PublishDue) confirmed dispatching
  `RevalidateFrontendCacheJob` with the exact expected tag set, on real
  broadcast id 2 (safe reversible transitions) and disposable test rows
  (created, exercised, then hard-deleted — verified zero residual rows and
  zero mutated production data afterward).
- **Frontend build verification**: `npx tsc --noEmit` clean; `npm run build`
  succeeds; production build output used as direct evidence for the
  ISR-eligibility fix above (Static/Dynamic classification, effective
  revalidate window per route).

### Not changed
SEO, public API contracts, and business logic were left untouched per the
task's explicit constraints — every change in this section is either a
numeric `revalidate` value, a new `FrontendRevalidate::tags()` call site, or
a `generateStaticParams()` addition using the exact pre-existing pattern.

---

## 12. Public URL restructuring — id-based canonical scheme (2026-07-18)

### The bug this closes permanently

`ShowPublicArticleAction`'s Laravel-side detail cache (`CachedRead::remember()`)
was keyed and tagged from the **raw incoming URL segment** — whichever string
the client sent (bare id, id-slug, or bare slug). `UpdateArticleAction`'s
invalidation always targeted the tag built from the article's **real DB
slug**. Any request shape that didn't match that exact slug string created an
orphaned cache entry that no write ever invalidated — proven live on article
343745 (`/articles/343745` kept serving a title from two edits prior, while
`/articles/343745-{real-slug}` updated correctly). See the live-trace evidence
earlier in this session's transcript for the full reproduction.

Fix: article identity for caching purposes is now **the id alone, resolved
before any cache lookup happens** — never the raw request string. This
closes the entire class of bug, not just this one instance, because there is
no longer any string variant to key by.

### New canonical URL shapes

- **Article**: `/news/{dd}/{mm}/{yyyy}/{id}/` — date from `published_at`
  only (never `updated_at`), id-only, slug never present. Old:
  `/{locale}/articles/{id}` (already id-only, but locale-prefixed and not
  date-based).
- **Category**: `/news/category/{slug}` or nested
  `/news/category/{ancestor}/.../{slug}` (new capability — categories had no
  `canonicalPath()` or nested-path resolution before this). Old: flat
  `/{locale}/{slug}`, hand-built ad hoc in three different places (sitemap,
  breadcrumbs, CDN purge) with three slightly different shapes — now all
  three converge on `Category::canonicalPath()`.
- **Writer / Search / Live / Videos**: moved from `/writer`, `/search`,
  `/live(/[slug])`, `/videos(/[idslug])` to the `/news/` prefix. No DB
  dependency for these, so old paths redirect via static `next.config.ts`
  rules rather than a Server Component.

### Cache-key changes (the actual fix)

- `app/Actions/Public/Content/ShowPublicArticleAction.php` — resolves the
  numeric id first (regex `^(\d+)-`, `is_numeric`, or a cheap indexed
  `->value('id')` for a legacy bare-slug request), *then* builds the
  `CachedRead` key/tags from that id. The expensive relation-hydrated query
  only ever runs once per id, regardless of which URL shape reached it.
- `app/Support/Cache/ArticleCacheTags.php` (`writeTags()`) — tag built from
  `(string) $article->id` instead of `(string) $article->slug`. This is the
  single line that made write-side invalidation miss non-canonical-slug
  cache entries.
- `app/Support/Frontend/FrontendCacheTags.php` (`article()`) — tag is now
  `"article:{$article->id}"`; the old "slug transition" branch (re-tagging
  an old slug on rename) is dead code and removed, since id never changes.
- `frontend/src/lib/articles.ts` (`getArticle()`) — fetch tag is
  `article:{id}`; **every call site must pass a bare numeric id**, never a
  real slug string, or the same class of bug reappears at this layer.
- New gap found and closed: `TransitionArticleStatusAction` (draft→scheduled)
  can change `published_at`, which now changes the canonical URL even though
  the id doesn't — this action never captured an old path for CDN purge
  before (only `UpdateArticleAction`'s slug/locale-change path did). Fixed
  by threading `$oldPath` through `ArticleStatusChanged` →
  `PurgeArticleCdnOnStatusChanged` → `ArticleCdnPurge::purge()`, mirroring
  the existing pattern.

### Backward compatibility

Every legacy shape (`/articles/{id}`, `/articles/{id}-{slug}`,
`/news/{wrong-date}/{id}(-slug)?`, `/category/{slug}`, `/writer/{id}`,
`/search`, `/live(/*)`, `/videos(/*)`) 301s to the true canonical, computed
**live** from the record's current state — no dependency on a lookup table
for the id→date or category-nesting cases. `ArticleUrlHistory`/
`ArticleRedirectResolver` still exist and still work, but only for the
narrower case of an actual slug rename affecting the pre-2026-07-18 legacy
`/articles/{slug}` lookup path — not for resolving the new canonical shape.

### Verified

Real production build (`next build` + `tsc --noEmit`) confirms every new
route compiles and classifies correctly (SSG where `generateStaticParams()`
is present, matching the established pattern from this session's earlier ISR
work). Backend: existing Pest suites updated for the new canonical assertion
shape, plus two new regression tests in
`tests/Feature/Public/Content/ArticleCacheKeyByIdTest.php` — one reproduces
the exact 343745 live-trace as an automated test (hit the same article via
three URL shapes, update it, confirm all three reflect the update
immediately), the other asserts the write-side tag is id-based, not
slug-based.

### Descoped

Tag (`/news/tag/{slug}`) and photo-gallery (`/news/gallery`) public routes —
neither has a model, endpoint, or design today; explicitly deferred to a
separate future migration per the team's decision.

---

## 13. Second URL restructuring + Media invalidation gap closed (2026-07-23)

### Article canonical path simplified further

`Article::canonicalPath()` changed again, from §12's `/news/{dd}/{mm}/{yyyy}/{id}`
to plain **`/article/{id}`** — no date, no `/news/` prefix. The date-based
shape tied the canonical URL to `published_at`, meaning a status transition
could change it with no slug/id change involved; pure `/article/{id}` removes
that dependency entirely. Nothing downstream needed to change —
`PublicSeoBuilder`, `SitemapController`, `RssController` all already consumed
`canonicalPath()` as the single source of truth, and `ArticleCacheTags`/
`FrontendCacheTags` already tagged by id (§12's fix), not by path. No backfill:
the `/news/...` shape was never public (pre-launch, decommissioned domain).

### Category canonical path + redirect system built from scratch

Categories previously had **no** `canonicalPath()`-based id scheme and **no**
rename-safe redirect mechanism at all — a category slug rename silently 404'd
every old link with nothing to recover it, unlike articles. Closed by mirroring
the article pattern exactly:

- `Category::canonicalPath()` → `/category-{id}/{slug}` (id mandatory, slug
  decorative).
- New `category_url_history` table + `CategoryUrlHistory` model +
  `CategoryRedirectResolver` (mirrors `ArticleUrlHistory`/
  `ArticleRedirectResolver`), populated by `UpdateCategoryAction` whenever the
  canonical path changes.
- New `GET /{locale}/redirects/categories` endpoint (mirrors the article one).
- `ShowPublicCategoryAction` now accepts a bare numeric id as the primary
  lookup (mirrors `ShowPublicArticleAction::resolveId()`), falling back to the
  existing slug-chain walk for backward compatibility.
- `PublicCategoryResource` now exposes `canonical_path` (parity with
  `PublicArticleResource`).
- `ListPublicArticlesAction`'s `filter[category]` now accepts either a slug or
  a bare id, so a category rename can't silently empty a client still filtering
  by the old slug.

No tag-string changes were needed anywhere in §2 — `FrontendCacheTags::category()`
already keys frontend tags off `slug` independent of the URL path shape.

### Media (`MediaAsset`) cache invalidation — the one real functional gap, now closed

`MediaAsset` is referenced by ~9 owning entity types (article gallery/og-image,
live-update pivot, category banner, reel/video source, video-category/playlist
cover, broadcast/broadcast-category cover, team-member avatar, ad-creative
image) but had **zero** cache invalidation anywhere — editing an asset's
alt/caption, or deleting/reprocessing it, never busted the owning entity's
cached page. Closed via:

- `app/Support/Media/MediaUsage::RELATIONS` (already the single source of
  truth for "what consumes this asset," used by the delete-guard and orphan-
  pruner) extended with `categories`, `teamMembers`, `adCreatives` — these
  three relations didn't exist on `MediaAsset` at all before, meaning a
  category banner / team-member avatar / ad-creative image could previously be
  force-deleted or orphan-pruned while still in active use. Fixing the cache
  gap and this latent correctness bug together, since both stem from the same
  incomplete list.
- New `app/Support/Cache/MediaCacheInvalidator::invalidate(MediaAsset $asset)`
  — walks every `MediaUsage::RELATIONS` relation and delegates to each owning
  type's *existing* tag-building logic (`ArticleCacheTags`, `ReelCacheTags`,
  `VideoCacheTags`, `BroadcastCacheTags`, `TeamMemberCacheTags`,
  `AdServingInvalidator`, `FrontendCacheTags`) rather than reinventing tag
  strings, accumulating into one backend `Cache::tags()->flush()` call and one
  `FrontendRevalidate::tags()` call (mirrors the existing accumulate-then-
  flush-once pattern in `ClearBreakingArticlesAction`/`BulkUpdateCategoriesAction`).
- Wired into `UpdateMediaAssetAction`, `DeleteMediaAssetAction` (before the
  relations are gone), and both `GenerateMediaAssetConversionsJob` and
  `TranscodeVideoAssetJob` at their actual derivative-ready completion point
  (not at synchronous dispatch time, since the derivative content hasn't
  changed yet then). `StoreMediaAssetAction` (new asset, no owners yet) and
  `PruneOrphanMediaAssetsAction` (orphans have no owners by definition)
  intentionally do not call it.
- Epaper relations (`epapers`/`epaperVersions`) intentionally excluded — not
  public-cached, per this document's existing scope.

### `ClearContentCacheAction` (break-glass admin tool) completed

Previously only flushed Article/Reel/category tags and never notified the
Next.js frontend at all. Now flushes every tag umbrella (`VideoCacheTags`,
`BroadcastCacheTags`, `PageCacheTags`, `TeamMemberCacheTags`, `AdCacheTags`,
`live_updates`) and calls `FrontendRevalidate` with the broadest known
frontend tags, since this tool has no per-entity context to be more precise.

### Verified

Live Docker-stack verification (same method as the DB/cache migration
verification round): article/category create/update(rename)/delete/restore
behavior, redirect endpoints, media invalidation across owner types, and
`ClearContentCacheAction`'s full flush — all confirmed with zero manual
`cache:clear` required. See `docs/migration/ALPHACMS-MIGRATION-AUDIT.md` for
the full verification log.

---

## 14. ID-based tag audit (2026-07-24)

A fresh, from-the-source re-audit (every claim below re-derived directly from
current `git show HEAD` file contents, not from this document or from §11/§12's
narrative) found that **this document's own prior claims did not match the
code**: §11/§12 describe `category`, `video`, and `reel` detail tags as already
converted to id-based keys and `revalidate` as already raised to `36000`
everywhere safe. The actual code on `fix/coolify-production-readiness` still had:

- `category:{slug}` (`lib/feed.ts: getCategoryFeed/getCategoryPage`,
  `FrontendCacheTags::category()`, `FrontendCacheTags::article()`'s category
  loop) — slug-based, matching this document's own "Bad" example almost
  verbatim.
- `video:{locale}:{slug}` (`lib/videos.ts: getVideo`,
  `FrontendCacheTags::fromVideoTags()`'s `videos:detail:` → `video:` mapping)
  — slug-based.
- `reel:{locale}:{slug}` (`lib/reels.ts: getReelByIdSlug`,
  `FrontendCacheTags::reel()`) — slug-based.
- Page-level `revalidate`: homepage `3600` (ar) / `300` (en), article `21600`,
  category `21600`, video detail `21600`, reel detail `21600` — none at
  `36000`. Fetch-level: `getHomepageFeed` at `120`, `articles.ts` shared
  `REVALIDATE` at `1800` (covering both `getArticle` and `getLiveUpdates`).

Whether this is a regression after §11/§12 shipped, or those sections
described an intended-but-never-merged state, wasn't determined — not
material to fixing it. **Do not cite §11/§12 as current-state evidence
without re-checking the source**, per this document's own §6 rule 3 spirit.

### What changed

- **`category:{id}`**: `FrontendCacheTags::category(Category $category): array`
  simplified to drop the `$oldSlug` parameter and old-slug/`articles`-umbrella
  branch entirely (id is stable — no rename tracking needed).
  `FrontendCacheTags::article()`'s category loop now collects `$category->id`
  instead of `$category->slug` (param renamed `$oldCategorySlugs` →
  `$oldCategoryIds`, threaded from `UpdateArticleAction` through
  `ArticleCdnPurge::purge()`). Next.js: `lib/feed.ts: getCategoryFeed()` /
  `getCategoryPage()` still take a `slug` parameter (zero of the 27 call
  sites across homepage section components changed) but now resolve
  `getCategoryBySlug(slug, locale)` internally — already React-`cache()`-deduped
  via the existing categories-tree index — before building the fetch tag,
  falling back to a non-invalidatable `category:slug-fallback:{slug}` tag only
  if the resolve fails (transient index-fetch failure).
- **`video:{id}`**: new `FrontendCacheTags::videoDetail(Video $video): string`
  (`"video:{$video->id}"`), called explicitly alongside
  `FrontendCacheTags::fromVideoTags()` — not through it — from every video
  action holding a `Video` object: `CreateVideoAction`, `UpdateVideoAction`,
  `DeleteVideoAction`, `ForceDeleteVideoAction`, `RestoreVideoAction`,
  `PublishDueVideosAction` (per video in the batch),
  `BulkVideoAction` (per successfully-processed video),
  `RevalidateVideoFrontendOnStatusChanged`, and `MediaCacheInvalidator`'s
  video-owner loop. `fromVideoTags()`'s `'videos:detail:' => 'video:'` mapping
  was removed (it was the sole slug-based producer) — feed/category/playlist
  mappings are untouched. Next.js: `lib/videos.ts: getVideo()` now takes the
  raw `{id}-{slug}` URL segment (was: pre-stripped bare slug) and extracts the
  id itself for tagging while still querying the by-slug API endpoint (which
  doesn't accept id-slug); `(site)/videos/[idslug]/page.tsx` passes `idslug`
  straight through instead of pre-computing `bareSlug(idslug)`.
- **`reel:{id}`**: `FrontendCacheTags::reel(Reel $reel): array` simplified the
  same way as `category()` (drops `$oldSlug`, no rename tracking needed).
  `ReelCdnPurge`'s internal `$oldSlug` computation for this call was removed
  (its other use, CDN URL purging, is untouched). Next.js:
  `lib/reels.ts: getReelByIdSlug()` now extracts the numeric prefix from the
  incoming `idSlug` itself for the tag, alongside the existing slug
  extraction for the API call — no page-level change needed (it already
  passed the raw segment).
- **`revalidate` raised to `36000`**: homepage (ar `3600`→`36000`, en
  `300`→`36000`), article detail (ar/en `21600`→`36000`, via the shared
  `articles.ts` `REVALIDATE` constant — now split from a new
  `LIVE_UPDATES_REVALIDATE = 1800` constant so live-coverage polling isn't
  affected), category detail (ar/en `21600`→`36000`), video detail
  (page `21600`→`36000`, fetch via a new `DETAIL_REVALIDATE` constant in
  `videos.ts`, split from the list/feed `REVALIDATE = 120`), reel detail
  (page `21600`→`36000`, fetch via a new `DETAIL_REVALIDATE` constant in
  `reels.ts`), `getHomepageFeed` fetch (`120`→`36000`).

### What was deliberately NOT changed (documented gaps, not fixed here)

- **`broadcast:{kind}:{slug}`** (live/tv/radio) and **`page:{locale}:{slug}`**
  (static pages) remain slug-based. Both routes (`/live/[slug]`,
  `/tv/[slug]`, `/radio/[slug]`, `/pages/[slug]`) carry **no numeric id in
  the URL at all** — unlike article/category/video/reel, there is nothing to
  extract client-side before the tagged fetch fires, and `next.tags` must be
  known synchronously at `fetch()` call time (can't be set retroactively
  once the response reveals the id). A real fix requires restructuring these
  URLs to embed an id (e.g. `/live/{id}-{slug}`, matching the video/reel
  convention already established in this codebase) — an intentional,
  out-of-scope product/URL change, not a caching-only fix. Partial
  mitigation already in place and unchanged: both tag builders re-emit the
  *old* slug's tag on rename (`UpdateBroadcastAction` passes `oldKind`/
  `oldSlug`; `PageCdnPurge`/`UpdateCategoryAction`-style old-slug capture),
  so a rename doesn't silently orphan the previous cache entry.
- **`video-category:{locale}:{slug}`**, **`playlist:{locale}:{slug}`** remain
  slug-based — not in the explicitly required entity list (article/category/
  video/reel/live/ad) for this pass; same "no id in URL" constraint as
  broadcasts for playlists specifically (`/playlists/{slug}` has no id
  segment).
- **Advertising**: confirmed **not a caching bug** — `lib/ads-bff.ts` fetches
  ad data with `cache: 'no-store'` (verified by direct read), meaning the
  Next.js Data Cache never holds ad responses regardless of what the backend
  does or doesn't invalidate. The `Advertising/*` action set genuinely never
  calls `FrontendRevalidate` (confirmed, ~19 actions), but there is nothing
  for it to invalidate on the Next.js side — the backend-only
  `AdServingInvalidator`/`Cache::tags(AdCacheTags...)` flush is the correct
  and sufficient mechanism for the ad-serving pool it targets (§7/§2's `ads`
  row already documented this correctly; §14 just re-confirms it against
  live code).
- **WP-migration / Vertix import actions** (`ImportWpPostAction`,
  `ImportTaxonomyAction`, `ImportVertixNewsBatchAction`,
  `ImportVertixCategoriesAction`) construct `Article`/`Category` rows via
  `new Model()->save()` directly, bypassing `CreateArticleAction`/
  `CreateCategoryAction` and therefore `ArticleCdnPurge`/`FrontendRevalidate`
  entirely — bulk-imported content won't appear on the frontend until the
  36000s safety-net expires. Flagged, not fixed (one-time/batch migration
  tooling, not a steady-state content-mutation path).
- **Team members, Polls, video-category CRUD (Create/Delete/ForceDelete/
  Restore — only `Update` is wired), Settings branding/CDN/media-storage**:
  confirmed still missing `FrontendRevalidate` calls, matching this
  document's own §9/§10 prior findings for Team/Polls. Not in the explicit
  six-entity scope (article/category/ad/video/reel/live) for this pass.

### Verified (this pass)

- `php -l` clean on all 14 modified Laravel files.
- `tsc --noEmit` clean (disposable `node:22-alpine` container, source
  bind-mounted — matches this document's established verification method
  from §11).
- `eslint` clean (same container) on all 12 modified frontend files.
- `next build` (production build, same container) — see the immediately
  preceding shell output in the session transcript for the pass/fail result
  and route classification table.
