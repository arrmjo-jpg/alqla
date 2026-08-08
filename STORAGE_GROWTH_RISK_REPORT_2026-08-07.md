# Storage Growth Risk Report

**تاريخ الفحص**: 2026-08-07
**النطاق**: كامل المشروع (frontend + backend + بنية السيرفر التحتية) — ليس فقط قسم الرياضة
**نوع الفحص**: قراءة فقط (Read-only Audit) — **لم يُعدَّل أي كود، لم يُنفَّذ أي Commit، لم يُحذف أي شيء إلا ما ذُكر صراحة أنه أُزيل باتفاق مسبق أثناء حادثة الاستعادة (خارج نطاق هذا التقرير)**
**السؤال المحوري**: أين يمكن أن ينمو التخزين بدون حدود في هذا المشروع؟
**المنهجية**: بحث شامل بالكود (frontend/src, app/) + فحص مباشر لمساحات التخزين الفعلية على السيرفر الإنتاجي (77.237.236.255) عبر SSH

---

## ملخص تنفيذي

فحصنا كل استخدام للكاش (Next.js fetch cache, Laravel Cache, Redis)، كل مسار ديناميكي مفتوح، كل استدعاء لـ365Scores، كل مجلد تخزين على السيرفر، الطوابير والمهام، السجلات، والملفات المؤقتة. النتيجة: **حادثة `fetch-cache`/365Scores لم تكن مشكلة معزولة — هي مثال واحد من نمط متكرر عبر المشروع بأكمله**: مسارات ديناميكية بلا `generateStaticParams` وبلا تحقق من وجود المُعرِّف قبل الجلب، تُغذّي كاش Next.js الافتراضي (نظام ملفات، بلا حد أقصى، بلا تنظيف تلقائي) لعشرات endpoints غير قسم الرياضة — منها ما هو **أخطر من الرياضة نفسها** (بحث نصي حر، ترقيم صفحات بلا حد أعلى).

كما اكتشفنا أثناء الفحص المباشر على السيرفر (وليس بالكود) **مشكلتين نشطتين حالياً**:
1. **`.next/cache` عاد للنمو من جديد فوراً بعد إعادة النشر** — 5.5GB خلال 3 ساعات فقط فقط (الكود المُصلَح لسه ما انرفع) — إثبات حي إن السبب الجذري لسه فعّال.
2. **8.4GB ملفات مؤقتة متسربة فعلياً على مستوى السيرفر** (`/tmp/restore_*`) — تعود لآلية النسخ الاحتياطي الخاصة بـ Coolify نفسه (منذ 2026-07-25، 13 يوماً)، غير متعلقة بكودنا، ولم تُحذف بعد استخدامها.

**لا يوجد أي إجراء إصلاحي منفَّذ بهذا التقرير — هذا فحص تشخيصي بحت.**

---

## 1. جدول الكاش الشامل (Next.js + Laravel + Redis)

### أ. Next.js — `next: { revalidate }` (كاش ملفات، بلا `cacheHandler` مخصص — مؤكَّد من `next.config.ts`)

| الملف | نوع الكاش | TTL | التخزين | تنظيف تلقائي؟ | نمو بلا حدود؟ | الخطورة |
|---|---|---|---|---|---|---|
| `lib/articles.ts:273` (`getArticle`) | fetch cache | 36000s | Filesystem | ❌ | ✅ — `id` خام بلا تحقق، بلا `generateStaticParams` | **Critical** |
| `lib/feed.ts:397-415` (`fetchPaginatedArticles`) عبر `search/page.tsx` | fetch cache | 60s | Filesystem | ❌ | ✅ — `?q=` نص حر بلا حد طول، يدخل مباشرة بمفتاح الكاش | **Critical** |
| `lib/feed.ts` — `?page=` على category/writer/search | fetch cache | 60-36000s | Filesystem | ❌ | ✅ — بلا حد أعلى لرقم الصفحة، أي رقم = مفتاح كاش جديد | **Critical** |
| `lib/sport/{games,stats,player}.ts` (27 استدعاء) | fetch cache | 30-86400s | Filesystem | ❌ | ✅ (السبب الأصلي للحادثة — مُصلَح جزئياً بتحقق `Number.isInteger` فقط، الكاش نفسه لسه بلا حد) | **Critical (معروفة)** |
| `lib/videos.ts:287` (`getVideo`) | fetch cache | 36000s | Filesystem | ❌ | ✅ — نفس نمط المقالات | **High** |
| `lib/reels.ts:167` (`getReelByIdSlug`) | fetch cache | 36000s | Filesystem | ❌ | ✅ — نفس النمط | **High** |
| `lib/static-pages.ts:107` (`getStaticPage`) | fetch cache | 86400s (الأطول) | Filesystem | ❌ | ✅ — نفس النمط | **High** |
| `lib/broadcast.ts:177` (`getBroadcast`) | fetch cache | 30s | Filesystem | ❌ | ✅ — لكن TTL قصير يخفف الأثر | **Medium** |
| `lib/writer.ts:44` | fetch cache | 300s | Filesystem | ❌ | جزئي — `id` يتحقق منه الـ route قبل الاستدعاء | **Low-Medium** |
| `lib/feed.ts` (homepage/categories/most-read/ase/gold/weather/…) | fetch cache | 120-36000s | Filesystem | ❌ | ❌ — مفاتيح ثابتة أو من مجموعة محدودة | **Low** |
| ~35 استدعاء `cache:'no-store'` (ads, engagement, follow, sitemap, rss, comments...) | لا كاش | — | — | n/a | ❌ | **Low** |

### ب. Laravel Cache (المخزن الفعلي: `Cache::forever` بلا TTL)

| الملف | المفتاح | التخزين | تنظيف تلقائي؟ | نمو بلا حدود؟ | الخطورة |
|---|---|---|---|---|---|
| `app/Support/Broadcast/BroadcastPresenceControl.php:32` | `bpres:ctl:closed:{broadcastId}` — **forever، لكل بث** | Redis (`CACHE_STORE=redis`) | ❌ فقط عبر `reopen()` يدوي | ✅ — بث جديد كل حدث حي، بدون تنظيف مجدوَل | **High** |
| `app/Support/Advertising/AdEventBuffer.php:44` | `adbuf:dirty:index` + مفاتيح `adbuf:delta:*` بلا TTL | Redis | ✅ عبر مهمة مجدولة كل دقيقة (`ads_flush_events`) | مشروط — فقط إذا توقفت المهمة المجدولة | **Medium** |
| `app/Support/Engagement/ViewBuffer.php:48` | نفس النمط | Redis | ✅ مشروط (`engagement_flush_views`) | مشروط | **Medium** |
| `Cache::remember` لكل كيان (analytics بأنواعها، `accountStats`) | مفاتيح لكل مستخدم/مقال/فيديو + نافذة زمنية | Redis أو DB (حسب `CACHE_STORE`) | TTL يحدّد كل مفتاح، لكن لا تنظيف نشط على مخزن DB لو استُخدم كـfallback | مشروط — فقط لو `CACHE_STORE` غير `redis` فعلياً بالإنتاج | **Low (مشروطة)** |

### ج. Redis (البنية التحتية، وليس فقط الكاش)

- **`maxmemory = 0B` (بلا حد)، `maxmemory-policy = noeviction`** — تأكدت مباشرة (`redis-cli INFO memory`). الاستخدام الحالي صغير جداً (10.5MB)، لكن **لا يوجد أي سقف** يحمي من نمو غير محسوب مستقبلاً (خاصة لو تعطّلت مهام التفريغ المجدولة أعلاه لفترة طويلة). | **Medium**

---

## 2. المسارات الديناميكية — الجرد الكامل

النتيجة الأهم: **`generateStaticParams` غير مستخدَم إطلاقاً بأي مسار بكامل المشروع (صفر نتيجة بحث)** — كل مسار ديناميكي مفتوح بالكامل، وهذا نمط عام لا خاص بقسم الرياضة.

| المسار | `generateStaticParams` | تحقق من وجود المعرّف قبل الجلب | عدد fetch لكل صفحة | كاش؟ |
|---|---|---|---|---|
| `article/[id]`, `en/article/[id]` | ❌ | ❌ **لا يوجد إطلاقاً** | ~9-10 | ✅ 36000s |
| `videos/[idslug]` | ❌ | ❌ **لا يوجد** | 2-4 | ✅ 36000s |
| `reels/[idslug]` | ❌ | ❌ **لا يوجد** | 4 | ✅ 36000s |
| `pages/[slug]`, `en/pages/[slug]` | ❌ | ❌ **لا يوجد** | 1-2 | ✅ 86400s |
| `live/[slug]`, `radio/[slug]`, `tv/[slug]` | ❌ | ❌ **لا يوجد** | 1-2 | ✅ 30s (TTL قصير يخفف) |
| `writer/[id]` | ❌ | ✅ `Number.isInteger` | 4 | ✅ 300s |
| `en/author/[id]` | ❌ | ⚠️ بلا تحقق صريح (خلافاً للنسخة العربية) | 4 | ✅ |
| `category/[id]/[name]` | ❌ | ✅ فحص وجود فعلي | 2 | ✅ |
| `newspaper/[idslug]` | ❌ | ✅ محدود بقائمة مُحمَّلة كاملة (bounded) | 1 | ✅ 300s |
| `sport/match/[id]`, `sport/competition/[id]`, `sport/player/[id]`, `sport/team/[id]` | ❌ | ✅ `Number.isInteger` + فحص وجود (بعد إصلاح الحادثة) | 2-15 | ✅ 30-86400s |
| `search` (searchParams، ليس segment) | n/a | ❌ **لا حد على طول `q` ولا على `page`** | متعدد | ✅ 60s |
| `api/ads/serve/[zoneKey]`, `api/engagement/[type]/[id]`, `api/follow/[type]/[id]`, `api/epaper/[idslug]` | n/a | ✅ regex/allowlist صارم | 1 | ❌ `no-store` |

---

## 3. استدعاءات 365Scores — التفصيل الكامل

| الملف | عدد Endpoints | كاش؟ | التخزين | نمو بلا حدود؟ | يجب Redis؟ | يجب no-store؟ |
|---|---|---|---|---|---|---|
| `lib/sport/games.ts` | 13 استدعاء (`allscores`, `game`, `trends`, `h2h`, `stats/preGame`...) | ✅ 30-600s | Filesystem (Next cache) | ✅ (IDs عددية بلا حد أعلى) | ✅ (بيانات حيّة قصيرة العمر) | جزئياً (الأحياء فقط: score/game الحالي) |
| `lib/sport/stats.ts` | 8 استدعاء (`stats`, `competitions`, `standings`, `brackets`, `history`) | ✅ 3600-86400s | Filesystem | ✅ | ✅ | ❌ (بيانات شبه ثابتة، Redis TTL طويل أنسب) |
| `lib/sport/player.ts` | 6 استدعاء (`athletes`, `career`, `trophies`, `squads`) | ✅ 300-3600s | Filesystem | ✅ | ✅ | ❌ |
| **مجموع صفحة مباراة واحدة (`match/[id]`)** | حتى 9 استدعاء دفعة واحدة | ✅ | Filesystem | ✅ (مضاعَف ×9) | — | — |

*(تفاصيل السبب الجذري الكامل موثقة مسبقاً في [INCIDENT_ANALYSIS_2026-08-07.md](INCIDENT_ANALYSIS_2026-08-07.md) — لا تكرار هنا)*

---

## 4. مساحات التخزين على السيرفر — القياس المباشر (وليس تقديراً)

| المجلد/Volume | من يكتب فيه | تنظيف؟ | حد أقصى؟ | الحجم الفعلي المقاس الآن | ملاحظة |
|---|---|---|---|---|---|
| `.next/cache` (frontend-cache volume) | Next.js fetch cache | ❌ | ❌ | **5.5GB خلال 3 ساعات فقط من إعادة النشر** | 🔴 **عم ينمو الآن، الكود لسه ما انصلح** |
| `storage/app/tmp`, `storage/app/perf` (backend) | مهام تحويل الوسائط/OCR، أوامر تشخيص | ✅ (tmp عبر `finally`)، ❌ (perf) | — | غير موجودين حالياً (حاوية جديدة، لا تراكم بعد) | مخاطر كامنة موثقة بالقسم 7 |
| `storage/logs` (backend) | Laravel logs | ✅ (`daily`, 14 يوم) | ✅ ضمنياً بالتدوير | 708KB | سليم |
| `storage/framework/cache` (backend) | Laravel file cache (fallback فقط) | — | — | 4.0KB | فارغ فعلياً — `CACHE_STORE=redis` مؤكَّد بالإنتاج |
| `/data/uploads` (وسائط، bind mount) | رفع الوسائط من الإدارة | ✅ (`media_orphans_prune` يومي) | ❌ (نمو طبيعي متوقع مع المحتوى) | **40GB** | نمو تجاري مشروع، ليس خللاً — يستحق مراقبة حجم فقط |
| `/data/storage-public` (bind mount) | صور شخصية/أفاتار وغيرها | ⚠️ جزئي (راجع القسم 7 — تسرّب أفاتار موثَّق) | ❌ | 2.3MB | صغير حالياً |
| `mysql-data` (volume) | MySQL | — | — | 10.94GB | طبيعي |
| `redis-data` (volume) | Redis persistence | — | ❌ (`maxmemory=0`) | 57.8MB | راجع قسم 1-ج |
| `meilisearch-data` (النسخة الجديدة) | فهرسة البحث | — | — | 110.6KB | ⚠️ صغير جداً — يحتمل فهرسة غير مكتملة (خارج نطاق هذا التقرير تحديداً، لكن يستحق تحقق منفصل) |
| `meilisearch-data` (نسخة قديمة، حاوية يتيمة 13 يوم) | فهرسة قديمة | — | — | 132KB | ⚠️ **حاوية مكررة يتيمة موجودة أصلاً منذ حادثة الاستعادة — راجع الملاحظة بأسفل التقرير** |
| Docker Build Cache | `docker compose build` | ✅ ذاتي الإدارة من Docker | جزئي | 11.42GB | منخفض الخطورة، تلقائي |
| **`/tmp/restore_*` (مستوى السيرفر، خارج Docker)** | آلية نسخ احتياطي/استعادة تابعة لـ**Coolify نفسه** | ❌ | ❌ | **8.4GB، منذ 2026-07-25 (13 يوماً)، 3 ملفات + سكربتاتها** | 🔴 **تسرّب فعلي حالي، غير متعلق بكودنا — يستحق تنظيف منفصل بعد التأكد من عدم الحاجة إليه** |

---

## 5. الطوابير والمهام (Queues & Jobs)

- كل قوائم الانتظار المُرسَل إليها (`->onQueue(...)`) **مغطاة بالكامل** من مستهلكين فعليين (`worker`/`worker-media`) — لا قائمة انتظار متروكة بلا مستهلك. طوابير `mail`/`sitemap`/`ai` مستهلَكة لكن بلا أي منتج فعلي (سعة احتياطية غير مستغَلة، ليست خطراً).
- `failed_jobs`: تنظيف مجدوَل فعلي (`queue:prune-failed --hours=168`، يومياً 01:30). ✅
- `job_batches`: تنظيف مجدوَل (`queue:prune-batches --hours=48`)، لكن لا استخدام فعلي لـ`Bus::batch` بالكود — الجدول شبه فارغ دوماً. ✅
- مهام تُعيد جدولة نفسها (WP Migration, Vertix Import): **لها شرط توقف واضح** ومحمية بـ`ShouldBeUniqueUntilProcessing` — لا خطر تراكم. ✅
- ⚠️ **ملاحظة اتساق**: `GenerateEpaperCoverJob` لا يحدد `onConnection` صراحة خلافاً لكل مهام الوسائط الأخرى المشابهة — يحتاج تأكيد يدوي (بمراجعة `.env` الفعلي) أنه لا يُرسَل لاتصال Redis غير مستهلَك فعلياً. **لم يُتحقق منه بشكل قاطع بهذا التقرير.**

---

## 6. السجلات (Logs)

| المصدر | آلية التدوير | الحد | ملاحظة |
|---|---|---|---|
| Laravel (`storage/logs/laravel.log`) | `daily` (مؤكَّد بـ`.env.example`، القيمة الافتراضية بالكود `single` — **يستحق تأكيد أن `.env` الفعلي بالإنتاج يطابق `daily` لا الافتراضي `single`**) | 14 يوم | ⚠️ اعتماد على قيمة `.env` غير مؤكَّدة مباشرة من هذا الفحص |
| `perf.log` (قناة مخصصة) | `daily` | 7 أيام | ✅ سليم |
| Docker (`json-file` driver) | ✅ مؤكَّد من `/etc/docker/daemon.json` | 10MB × 3 ملفات/حاوية | ✅ سليم (تحقَّق منه سابقاً بحادثة اليوم نفسها) |
| Traefik | **لا يوجد `--accesslog` مفعَّل إطلاقاً** | — | ❌ ليست مشكلة نمو تخزين، لكنها فجوة تشخيصية موثَّقة بتقرير الحادثة |
| PHP-FPM / nginx (داخل حاوية backend) | لم يُفحص بعمق ضمن هذا التقرير (خارج ما طُلب صراحة) | — | يستحق فحص منفصل قصير إن رغبتم |

---

## 7. الملفات المؤقتة والتصدير والنسخ الاحتياطي

| الموقع | يُحذف بعد الاستخدام؟ | ملاحظة |
|---|---|---|
| `ExtractEpaperTextAction`, `EpaperCoverGenerator`, `TranscodeVideoAssetJob`, `VertixImageImporter`, `WpMediaImporter`, `MediaConversions` | ✅ جميعها — `finally` blocks موثَّقة ومؤكَّدة بالكود | نمط سليم ومُطبَّق باتساق عبر أغلب الكود |
| **`ExportWhatsappContactsAction.php:25`** | ❌ — خطأ استخدام `tempnam()` (نفس فئة الخلل الذي أُصلح سابقاً بـ`MediaConversions.php` نفسها حسب تعليق بالكود، لكن لم يُصلَح هنا) | كل تصدير جهات اتصال واتساب يسرّب ملف فارغ صغير بـ`/tmp` |
| **`UploadUserAvatarAction.php:23`** | ❌ — لا حذف للصورة القديمة عند تغيير الأفاتار (تأكَّد بتتبع السلسلة الكاملة: Controller → Create/UpdateUserAction) | كل تغيير أفاتار لمستخدم إداري يسرّب ملف دائم بـ`storage/app/public/avatars` |
| `PerfIncidentSnapshotCommand.php` | ❌ — لا تنظيف مجدوَل لملفات `storage/app/perf/incident_*.txt` | محدود بتكرار التشغيل اليدوي فقط |
| النسخ الاحتياطي لقاعدة البيانات (`config/backup.php`) | ✅ سياسة تدوير كاملة (7 أيام/16 يوم/8 أسابيع/4 أشهر/سنتان) | سليم |
| **`/tmp/restore_*` على مستوى السيرفر (Coolify)** | ❌ — 8.4GB منذ 13 يوماً | خارج نطاق كودنا، لكن تسرّب فعلي حالي — راجع القسم 4 |

---

## 8. Storage Growth Risk Report — التصنيف النهائي

### 🔴 Critical — أي شيء يمكن أن يملأ القرص

1. **`fetch-cache` (Next.js) لكل مسارات المقالات/الفيديو/الريلز/الصفحات الثابتة/البحث** — نفس فئة خلل حادثة الرياضة بالضبط، منتشرة بـ~10 ملفات lib مختلفة، أخطرها: `article/[id]` (بلا أي تحقق من المعرّف إطلاقاً)، والبحث الحر (`?q=`، نص غير محدود كمفتاح كاش).
2. **`?page=` بلا حد أعلى** على category/writer/search — يمكن توليد ملايين مفاتيح الكاش بمجرد تجربة أرقام صفحات عشوائية.
3. **8.4GB ملفات `/tmp/restore_*` متسربة فعلياً على السيرفر الآن** (Coolify، غير متعلقة بكودنا) — تسرّب حقيقي حالي، ليس نظرياً.
4. **`.next/cache` يعيد التضخم الآن** (5.5GB/3 ساعات) — تأكيد حي أن المشكلة الأصلية لسه نشطة بالإنتاج لحد ما يُنفَّذ الإصلاح المعماري.

### 🟠 High — قد يسبب مشاكل بعد أشهر

5. `videos/[idslug]`, `reels/[idslug]`, `pages/[slug]` — نفس نمط الخطر الحرج لكن بحركة زوار أقل من المقالات على الأغلب (تقدير نسبي، لا بيانات وصول مؤكَّدة).
6. `BroadcastPresenceControl.php` — `Cache::forever` لكل بث حي، بلا تنظيف تلقائي، عدد البثوث ينمو مع الوقت.
7. `UploadUserAvatarAction.php` — تسرّب ملف دائم لكل تغيير أفاتار (بطيء لكن تراكمي بلا حد).
8. Redis بلا `maxmemory`/`noeviction` — لا حد حماية عند أي نمو غير متوقع مستقبلي بالبيانات المخزَّنة.

### 🟡 Medium — يحتاج تحسين

9. `live/[slug]`/`radio/[slug]`/`tv/[slug]` — نفس النمط لكن TTL قصير (30s) يخفف الأثر كثيراً.
10. `AdEventBuffer`/`ViewBuffer` — مشروط بصحة المهام المجدولة كل دقيقة، ينمو بالذاكرة (Redis) لا القرص.
11. `ExportWhatsappContactsAction.php` — تسرّب ملفات فارغة صغيرة، أثر منخفض لكن نمط خلل مكرَّر.
12. `PerfIncidentSnapshotCommand.php` — بلا تنظيف، لكن محدود بالتشغيل اليدوي.
13. `en/author/[id]` — بلا تحقق صريح من المعرّف خلافاً للنسخة العربية المكافئة له (عدم اتساق يستحق توحيد).
14. تأكيد قيمة `LOG_CHANNEL` الفعلية بالإنتاج (`daily` المتوقعة أم `single` الافتراضية بالكود).
15. `GenerateEpaperCoverJob` — عدم اتساق `onConnection` يحتاج تأكيد يدوي من `.env` الفعلي.
16. حاوية Meilisearch اليتيمة المكرَّرة (من حادثة الاستعادة) — تحتاج قرار: دمج/حذف أيهما يحمل الفهرس الصحيح.

### 🟢 Low — لا يحتاج تدخل

17. جميع استدعاءات `cache: 'no-store'` (~35 موقعاً بالفرونت إند: ads, engagement, follow, sitemap, rss, comments, live-updates).
18. `failed_jobs`, `job_batches` — تنظيف مجدوَل فعّال ومؤكَّد.
19. Laravel `perf.log`, Docker logs — تدوير سليم ومؤكَّد.
20. `MediaConversions`, `TranscodeVideoAssetJob`, `EpaperCoverGenerator` وغيرها من مسارات الملفات المؤقتة — أنماط `finally`/تنظيف سليمة ومؤكَّدة بالكود.
21. نسخ قاعدة البيانات الاحتياطية (`config/backup.php`) — سياسة تدوير كاملة وسليمة.
22. `/data/uploads` (40GB) — نمو تجاري مشروع مرتبط بالمحتوى الفعلي، ليس خللاً برمجياً.

---

**لا إجراء إصلاحي بهذا التقرير.** بانتظار قراركم بأولويات المعالجة قبل أي تعديل كود.
