# AlphaCMS — Production Deployment Runbook

Self-hosted, Docker-based, **Cloudflare in front**, Linux host. No Kubernetes. One backend image
serves three roles (API / workers / scheduler); the frontend is built **per client** (`CLIENT`).

---

## 1. Architecture

```
                          ┌─────────────── Cloudflare (TLS, WAF, edge cache, brotli) ───────────────┐
   example.com  ─────────▶│  cache: /_next/static, /storage (long)  ·  bypass: /api/*, admin, POSTs │
   api.example.com ──────▶│  honor origin Cache-Control on GET API   ·  no-store: writes/per-actor   │
                          └───────────────────────────────┬───────────────────────────────────────┘
                                                           ▼
                                              ┌──────────  nginx  ──────────┐
                                              │  example.com → frontend:3000 │
                                              │  api.* → fastcgi backend:9000│
                                              │  /storage/* → media volume   │
                                              └───────┬───────────────┬──────┘
                                       ┌──────────────┘               └──────────────┐
                                       ▼                                             ▼
                          ┌───── frontend (Next standalone) ─────┐      ┌──── backend (php-fpm, Laravel) ────┐
                          │  pages + ISR + /api/* proxy routes   │      │  /api/v1/* (public + admin)         │
                          │  SSR fetch → API_BASE_URL            │      └───────┬───────────────┬────────────┘
                          └──────────────────────────────────────┘              │               │
                                                                       worker (default+named)   worker-media (ffmpeg)
                                                                       scheduler (schedule:work)
                                                                                 │               │
                                                                       ┌─────────┴───────┐   ┌───┴────┐
                                                                       │ redis (cache/    │   │ mysql  │   meilisearch
                                                                       │ queue/locks)     │   │        │   (optional)
                                                                       └──────────────────┘   └────────┘
```

| Service | Role | Scale note |
| --- | --- | --- |
| `nginx` | edge proxy + media static + API front controller | 1 (stateless) |
| `frontend` | Next.js standalone (pages, ISR, same-origin `/api/*` proxies) | **1 for launch** (ISR cache is per-instance — see Risks) |
| `backend` | Laravel API (php-fpm) | 1–N (stateless) |
| `worker` | `queue:work` default + notifications/mail/search/sitemap/ai/analytics | 1–N |
| `worker-media` | `queue:work redis-media --queue=media` (video transcode) | 1–N |
| `scheduler` | `schedule:work` (registry crons + health/heartbeat) | **exactly 1** (`onOneServer` also guards) |
| `mysql` `redis` | data + cache/queue/locks (**Redis mandatory** — tagged cache) | 1 each |
| `meilisearch` | Scout search (profile `search`) | 1 |

**Browser never calls the backend directly** — all client calls hit the same-origin Next `/api/*`
proxies; only the frontend SSR + the admin SPA use the backend origin.

---

## 2. Build & deploy

```bash
cp .env.example .env            # fill real values (see §3); chmod 600 .env
docker compose build            # builds backend + frontend (CLIENT baked)
docker compose --profile search up -d meilisearch   # if search enabled
docker compose run --rm backend php artisan key:generate      # first time only
docker compose run --rm backend php artisan migrate --force   # ONCE per deploy
docker compose run --rm backend php artisan scout:sync-index-settings # Sync search settings
docker compose run --rm backend php artisan scout:import "App\Models\Article"  # + Reel/Video
docker compose up -d
```

Redeploy: `git pull && docker compose build && docker compose run --rm backend php artisan migrate --force && docker compose run --rm backend php artisan scout:sync-index-settings && docker compose up -d`.
The entrypoint re-caches config/routes/views from runtime env on every container start.

---

## 3. Environment & secrets

**Build-time (baked, not secret):** `CLIENT` (frontend image → active client/theme).
**Frontend runtime:** `API_BASE_URL`, `SITE_URL`, `REVALIDATE_SECRET`.
**Backend runtime (`.env`):** `APP_KEY`, DB creds, `REDIS_*`, `QUEUE_CONNECTION=redis`,
`CACHE_STORE=redis`, `SESSION_DRIVER=database`, `CORS_ALLOWED_ORIGINS` (admin origin only — never `*`),
`FRONTEND_REVALIDATE_URL` + `FRONTEND_REVALIDATE_SECRET` (**must equal** the frontend `REVALIDATE_SECRET`),
`SCOUT_DRIVER`/`MEILISEARCH_*`, `BACKUP_*`, `HEALTH_*`, mail creds.
**Compose interpolation:** `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `MEILISEARCH_KEY`.

Secrets (`APP_KEY`, DB/Redis passwords, `*_SECRET`, `BACKUP_ARCHIVE_PASSWORD`, mail creds, AWS keys)
live only in the host `.env` (mode 600) or a secrets manager — never in git, never in the image.

---

## 4. Cloudflare / CDN

- **Cache aggressively:** `/_next/static/*` (immutable), `/storage/*` (media). 
- **Honor origin headers** on backend GET API (it sets `Cache-Control: public, s-maxage=…`).
- **Bypass cache (no-store):** all `/api/*` on the site origin (Next proxies are per-actor/dynamic),
  `POST/DELETE`, `/api/revalidate`, the engagement/poll-vote/view beacons, admin, and auth.
- **Do not "Cache Everything" on HTML** unless you also purge on publish — ISR + the revalidation
  webhook are the freshness mechanism; let HTML pass to Next (it serves its own ISR cache).
- Set SSL **Full (strict)** with a Cloudflare **Origin Certificate** on nginx `:443` (the shipped
  conf listens `:80`; add the 443 server + cert for production). Restore real client IP via
  `CF-Connecting-IP` (uncomment the `set_real_ip_from` block with current CF ranges).

---

## 5. Queues, scheduler, workers

- **Workers** run as compose services (`restart: unless-stopped`) — no Supervisor needed inside
  containers; Docker is the supervisor. Scale with `docker compose up -d --scale worker=3`.
  (Laravel **Horizon** is *not* installed — optional future upgrade for dashboards/autobalancing.)
- **Media** transcode uses the dedicated `redis-media` connection (`retry_after=3600 > job
  timeout 2400`) so long ffmpeg jobs are never double-dispatched. `ffmpeg`/`ffprobe` + image
  optimizers ship in the backend image.
- **Scheduler:** `schedule:work` runs the registry crons + `health:check` (15m) + scheduler/queue
  heartbeats (1m). Run **exactly one** scheduler container (`onOneServer` is also enforced via Redis locks).
- **Failure handling:** failed jobs → `failed_jobs` (database-uuids). Inspect/retry with
  `php artisan queue:failed` / `queue:retry all`. The queue heartbeat health check flags a dead worker.

---

## 6. Frontend revalidation (cache invalidation flow)

Every admin write to content that has a public page (categories, articles, pages, …) must reach
the live frontend within seconds, not just the next ISR tick. This is the on-demand revalidation
webhook — it is a **queued, fire-and-forget notification from the backend to the frontend**, not a
frontend→backend call.

```
Admin Update
  ↓
Laravel  (e.g. UpdateCategoryAction::handle())
  ↓
Redis tag flush            Cache::tags(['categories'])->flush()
  ↓
RevalidateFrontendCacheJob  (queued — tries=1, timeout=15s, isolated failure)
  ↓
POST FRONTEND_REVALIDATE_URL   (x-revalidate-secret header, {"tags":[...]})
  ↓
Next.js  POST /api/revalidate  (frontend/src/app/api/revalidate/route.ts)
  ↓
revalidateTag(tag)  for every tag in the payload
  ↓
Updated UI  (next request to any page whose fetch used that tag re-runs against the DB)
```

**`FRONTEND_REVALIDATE_URL` is resolved by the backend/worker container, not by a browser.** Its
value must be an address *the backend container can reach* — never `http://localhost:<port>`.
Inside a container, `localhost` always means "this container", never a sibling container. Two
services in the same `docker-compose.yml` reach each other only by **service name** (the same
mechanism already used for `MEILISEARCH_HOST=http://meilisearch:7700` and `REDIS_HOST`) — Docker's
embedded DNS resolves the service name to the right container IP on the compose network.

| Deployment shape | `FRONTEND_REVALIDATE_URL` |
| --- | --- |
| Docker / Coolify (backend + frontend on the same compose network) | `http://frontend:3000/api/revalidate` |
| Non-Docker / frontend on a different host or network | `https://your-domain.com/api/revalidate` |

This project's actual Compose service names (from `docker-compose.yml`, `docker compose config
--services`): `frontend`, `backend`, `worker`, `worker-media`, `worker-migration`, `scheduler`,
`admin`, `app-db` (MySQL), `redis-app`, `meilisearch`. Use these — not generic guesses like
`mariadb` or `redis` — when wiring any new inter-container URL in this repo.

**Fail-safe by design:** an unset URL/secret is a silent no-op (§3); a wrong-but-reachable URL logs
a warning (`[frontend-revalidate] rejected`/`failed` in the worker log) and does **not** fail the
admin write. This means a misconfigured `FRONTEND_REVALIDATE_URL` (e.g. pointing at `localhost`)
produces **no error anywhere in the admin UI** — the only symptom is that renamed/edited content
takes up to the page's ISR ceiling (5 min for categories/site-settings, up to 1h for the homepage,
see `revalidate` exports in `frontend/src/lib/*.ts` and `frontend/src/app/**/page.tsx`) to appear
live, instead of updating instantly. Always verify this endpoint after any change to Compose
networking, container names, or `.env` — see §7.

---

## 7. Troubleshooting: cache revalidation

**1. Confirm the URL is reachable from where the job actually runs** — the `backend`/`worker`
container, not your host machine:

```bash
docker exec <backend-or-worker-container> sh -c \
  "curl -s -o /dev/null -w 'HTTP:%{http_code}\n' --max-time 3 \
   -X POST \$FRONTEND_REVALIDATE_URL \
   -H \"x-revalidate-secret: \$FRONTEND_REVALIDATE_SECRET\" \
   -H 'Content-Type: application/json' \
   -d '{\"tags\":[\"categories\"]}'"
```

**Expected response:** `HTTP:200`. A `curl: (7) Failed to connect` / `HTTP:000` means the URL is
unreachable from inside the container — almost always a `localhost` vs. service-name mistake (§6).
A `HTTP:401` means the secret doesn't match `REVALIDATE_SECRET` in the frontend's env. A `HTTP:503`
means the frontend has no `REVALIDATE_SECRET` configured at all. On success the frontend returns
`{"revalidated":true,"count":N,"tags":[...]}`.

**2. Verify `RevalidateFrontendCacheJob` actually ran** (queue log, not just "the write succeeded" —
a failed job never blocks or errors the admin request, by design):

```bash
docker logs <worker-container> --tail 50 | grep -i "RevalidateFrontendCacheJob\|frontend-revalidate"
```
- `RevalidateFrontendCacheJob ... DONE` only means the job didn't throw — it does **not** prove the
  HTTP call succeeded (the job catches all failures and logs a warning instead of throwing, so the
  write path is never blocked by a frontend outage). Look specifically for a
  `[frontend-revalidate] rejected` or `[frontend-revalidate] failed` warning nearby to catch a
  silent failure.
- No warning + a `200` from the manual curl test in step 1 = the chain is healthy.

**3. Confirm a category rename actually appears instantly** (end-to-end proof, not just log
inspection):
```bash
# 1) note the current live name (e.g. curl the public API or load the site)
# 2) rename the category via the admin API/UI
# 3) reload the site WITHOUT restarting/rebuilding the frontend container
# 4) the new name must appear immediately — if it only appears after a container
#    restart or after several minutes, the revalidate webhook is not reaching Next.js
```
If step 4 requires a restart or a multi-minute wait, re-check `FRONTEND_REVALIDATE_URL` per §6
before assuming a frontend bug — the frontend's fetch/tag wiring can be entirely correct while the
webhook that triggers it never arrives.

---

## 8. Backups & recovery (spatie/laravel-backup — already wired)

- Set `BACKUP_DESTINATION_DISKS=s3` (or `local,s3` — offsite is mandatory), `BACKUP_ARCHIVE_PASSWORD`,
  `BACKUP_NOTIFICATION_EMAIL`, and AWS/R2 creds. Verify `backup:run`/`backup:clean` are enabled in the
  scheduler registry.
- **Covers:** MySQL dump + the media disk (`storage/app/public`, the `media` volume).
- **Restore:** new host → `docker compose up -d mysql redis` → import the SQL dump → restore media
  into the `media` volume → `docker compose up -d`. Rehearse a restore before launch.
- Redis is cache/queue only (rebuildable) — not part of backups.

---

## 9. Monitoring (spatie/laravel-health — already wired)

- `php artisan health:check` runs every 15m; failures notify `HEALTH_NOTIFICATION_EMAIL`. Protect the
  results endpoint with `HEALTH_SECRET_TOKEN`. Checks include DB, Redis, queue heartbeat, schedule heartbeat.
- **Frontend liveness:** `GET /health` echoes the resolved client/theme (Docker `HEALTHCHECK`).
- Container health: `mysql`/`redis`/`frontend`/`worker` have healthchecks; alert on `unhealthy`/restarts.
- Logs: `docker compose logs -f <service>`; ship to your aggregator if available (out of scope here).

---

## 10. Launch smoke-test checklist

Run against the **production** domains after deploy:

- [ ] **Homepage** `/` renders (hero + sections + chrome), correct client brand/colors (shaabjo).
- [ ] **Article publish** in admin → article page reachable; appears in latest/category.
- [ ] **Revalidation** — publish/edit an article → page refreshes within seconds (not just TTL);
      check `worker` logs for `RevalidateFrontendCacheJob` → `200` from `/api/revalidate`.
- [ ] **Videos** `/videos` (featured/trending/latest) + `/videos/{id-slug}` plays (external embed + uploaded HLS/MP4).
- [ ] **Reels** `/reels` feed scroll/autoplay; a reel detail records a view (beacon → 200).
- [ ] **Live updates** — a `live` article polls + shows new timeline entries (ETag/304).
- [ ] **Search** `/search?q=` returns results (Meilisearch up + indexed).
- [ ] **Polls** — vote once; second vote deduped; results render.
- [ ] **Ads** — a configured zone serves a creative; impression beacon fires.
- [ ] **Sitemap** `/sitemap.xml` + child sitemaps; **robots** `/robots.txt`.
- [ ] **Mobile** — homepage/article/video on a phone: single-column, tap targets, RTL correct.
- [ ] **Cache invalidation** — edit a video/playlist → `/videos` + detail refresh (tag busted).
- [ ] **Security headers** present on HTML (`curl -I`): CSP, HSTS, X-Frame-Options, nosniff.
- [ ] **Media upload** (admin) of a large video → transcodes (worker-media) → playable.
- [ ] **Health** — backend `health:check` green; `/health` (frontend) returns the right client.

---

## 11. Production assumptions

- Single `frontend` instance (ISR cache is per-instance) and single `scheduler` instance.
- Redis is present and mandatory (tagged cache invalidation; `onOneServer` locks).
- Media uses the local `public` disk persisted in the `media` volume; offsite backup via S3/R2.
- TLS terminates at Cloudflare; origin uses a CF Origin Certificate (add the `:443` server block).
- Reverb/WebSockets are **not** deployed (live coverage uses HTTP polling — fully functional).
- Search requires a provisioned + indexed Meilisearch; without it, search degrades to empty.

---

## 12. Launch risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Frontend scaled >1** | ISR cache diverges between instances | launch with 1; for N, add a shared cache handler or rely on revalidate + short TTL |
| **`FRONTEND_REVALIDATE_SECRET` ≠ frontend `REVALIDATE_SECRET`** | webhook 401 → editorial freshness falls back to TTL only | verify both match at deploy (checklist) |
| **Meilisearch not indexed** | empty search | run `scout:import` on deploy; monitor |
| **Media volume not backed up offsite** | data loss on host failure | `BACKUP_DESTINATION_DISKS` includes `s3`; rehearse restore |
| **CF "Cache Everything" on HTML** | stale pages, ISR bypassed | bypass HTML / honor origin; purge on publish |
| **`.env` / secrets in image or git** | credential leak | host-only `.env` (600); secrets manager |
| **Migrations run by multiple containers** | race/lock errors | migrate is a single explicit deploy step (not in entrypoint) |
| **Large uploads exceed limits** | 413 errors | nginx `client_max_body_size 512M` + php `upload_max_filesize` aligned |
| **Windows-only image-pipeline test failures** | none on Linux | Linux image ships ffmpeg + gd(WebP) + optimizers; tracked separately |
