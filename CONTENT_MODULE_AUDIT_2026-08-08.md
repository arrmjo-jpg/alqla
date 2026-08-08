# تدقيق قسم المحتوى (مقالات + تصنيفات) — 2026-08-08

تدقيق معماري وأمني **بلا أي تعديل كود** (Read-only)، بنفس منهجية
`STORAGE_GROWTH_RISK_REPORT_2026-08-07.md`. يغطي Backend (Laravel:
Models/Actions/Requests/Resources/Controllers) وCaching/Public API
والFrontend (Next.js: صفحات ar/en، المكوّنات). كل بند مصنَّف
Critical/High/Medium/Low، وكل ادّعاء مُسنَد بـfile:line محدَّد.

---

## 🔴 Critical

### C1 — تعديل وسائط المقال لا يُبطِل أي كاش (Backend + CDN + Next.js)
- `app/Actions/Admin/Content/UploadArticleMediaAction.php:25-70`
- `app/Actions/Admin/Content/DeleteArticleMediaAction.php:14-30`
- `app/Actions/Admin/Content/ReorderArticleMediaAction.php:44`

رفع/حذف/إعادة ترتيب صورة غلاف أو معرض لمقال **منشور فعلاً** لا يستدعي
`ArticleCdnPurge::purge()` ولا `FrontendRevalidate::tags()` (`ReorderArticleMediaAction`
يُفرِّغ فقط `Cache::tags(['articles'])` بالباك إند، بلا إخطار Next.js إطلاقاً).

**السيناريو**: محرِّر يستبدل صورة غلاف مقال منشور. الكاش المحليّ (Redis) وكاش
Next.js ISR (وسم `article:{id}`) يستمرّان بعرض الصورة القديمة حتى ٣٠ دقيقة
(Backend) / ١٠ ساعات (نافذة الأمان بـNext.js) — نفس فئة الحادثة التي
`MediaCacheInvalidator` صُمِّمت لمنعها، لكنها غير مُوصَّلة بمسار
رفع/حذف/ترتيب وسائط المقال تحديداً (موصولة فقط بـ`UpdateMediaAssetAction`/
`DeleteMediaAssetAction`).

### C2 — الفيديو الخارجي بترويسة المقال الإنجليزيّة معطَّل
- `frontend/src/components/en/en-article-hero.tsx:60-61`
- `frontend/src/app/en/article/[id]/page.tsx:187`

الكوميت `b91efb90c` ("دعم الفيديوهات الخارجية بترويسة المقال") أضاف
`MediaVideo` (iframe لـYouTube/فيديو خارجي) ووصّله بالنسخة العربية
(`components/articles/blocks/hero-image.tsx:68-77`) — لكنه لم يلمس
`en-article-hero.tsx` إطلاقاً، الذي لا يزال يرسم `<video src={videoUrl}>`
خام بلا `videoKind`/`videoEmbedUrl`.

**السيناريو**: مقال بفيديو YouTube مُضمَّن يعمل بشكل صحيح على
`/article/{id}` لكن يظهر مشغِّل فيديو فارغ/معطَّل على `/en/article/{id}` —
مثال مباشر على انجراف "إصلاح وصل لعربي فقط" بين الشجرتين المكرَّرتين.

---

## 🟠 High

### H1 — فحص الملكية غائب عن حذف/استعادة/حذف-نهائي المقال ووسائطه
- `app/Actions/Admin/Content/DeleteArticleAction.php:16`
- `RestoreArticleAction.php:16`
- `ForceDeleteArticleAction.php:16`
- `UploadArticleMediaAction.php:27`, `DeleteArticleMediaAction.php:16`, `ReorderArticleMediaAction.php:23`

بعكس `UpdateArticleAction.php:45` (`ArticleAuthorizationGuard::forUpdate`) و
`TransitionArticleStatusAction.php:33` (`ArticleWorkflowGuard::isOwner`)، هذه
الدوال محميّة فقط بصلاحية Spatie (`articles.delete`/`articles.force_delete`
إلخ)، بلا أي فحص أن الفاعل هو صاحب المقال. أي دور بالإدارة يُمنَح هذه
الصلاحية (دور "كاتب موثوق" مثلاً — الأدوار غير الأساسية تُضاف يدوياً من
اللوحة حسب `RolesAndPermissionsSeeder.php:315-316`) يمكنه حذف/حذف-نهائي أي
مقال **لأي كاتب آخر**، لا مقالاته فقط — تناقض مع حدود الملكية المطبَّقة
بمسارَي التحديث/تغيير الحالة.

### H2 — مفتاح كاش قائمة المقالات لا يشمل `filter[title]`
- `app/Actions/Public/Content/ListPublicArticlesAction.php:186,341-359`

`AllowedFilter::partial('title', 'title')` مسجَّل ومقبول بالطلب، لكن
`hashQuery()` لا يُدخِله ضمن حساب مفتاح الكاش (يشمل فقط
type/category/tag/q/author_id/is_featured). طلبان مختلفان بـ`filter[title]`
فقط يتصادمان على نفس مفتاح الكاش — أيّهما نُفِّذ أولاً يُخدَّم للآخر لمدة
`CacheTtl::SHORT` (٥ دقائق).

### H3 — Regex تفصيل id/slug بمعكوسة الاتّجاه بصفحة المقال بالواجهة
- `frontend/src/lib/articles.ts:285,289`

`bare = idslug.replace(/^\d+-/, '')` يُزيل المعرّف الرقمي **ويُبقي** بقيّة
الـslug، ثم يُستخدَم بوسم الكاش `article:${bare}` — بعكس `reels.ts:159-163`
وvideos.ts:35-44` الصحيحتين (`match(/^(\d+)-/)` واستخدام الرقم نفسه). غير
مؤثِّر حالياً لأن كل نقاط الاستدعاء الفعليّة تمرِّر معرِّفاً رقمياً صرفاً
بلا شرطة — لكن أي نداء مستقبليّ بصيغة `{id}-{slug}` (الشكل القديم الذي
التعليقات بالكود تدّعي دعمه) يُعيد فتح نفس فئة خلل "تصادم كاش id/slug" التي
أُصلِحت سابقاً (راجع §12 مذكورة بتعليقات `ShowPublicArticleAction`).

### H4 — كشف قالب "رأي" يختلف بين عربي وإنجليزي
- عربي: `frontend/src/components/articles/article-detail.tsx:61`
- إنجليزي: `frontend/src/app/en/article/[id]/page.tsx:61`

العربي: `type === 'opinion' || primaryCategory?.slug === 'opinion'`.
الإنجليزي: `type === 'opinion'` فقط، بلا احتياط اسم التصنيف. مقال بتصنيف
رئيسي `opinion` لكن `type` مختلف يُعرَض كقالب رأي بالعربي (بطاقة كاتب،
"المزيد من هذا الكاتب") ويُعرَض كمقال إخباري عادي بالإنجليزي لنفس المحتوى.

### H5 — إزالة تكرار العنوان/المقدّمة موجودة بالعربي فقط
- عربي: `article-detail.tsx:67,71-85` (`stripTitleFromHtml`, `cleanExcerpt`)
- إنجليزي: `en/article/[id]/page.tsx:151,155,193` — لا منطق مماثل، و
  `en-article-body.tsx` أيضاً بلا أي فلترة.

مقال يكرِّر العنوان كأول فقرة بجسم HTML (نمط شائع من المحرِّر) يُظهِر عنواناً
مكرَّراً ظاهراً بالنسخة الإنجليزية فقط، بينما العربية تُخفيه بذكاء.

---

## 🟡 Medium

### M1 — حذف تصنيف لا يفحص المقالات المرتبطة (بعكس الحذف النهائي)
- `app/Actions/Admin/Content/DeleteCategoryAction.php:16-21` (يفحص الأبناء فقط)
- مقارنة بـ`ForceDeleteCategoryAction.php:19-28` (يفحص `Article::withTrashed()->where('primary_category_id', ...)`)

حذف (Soft-delete) تصنيف لا يزال `primary_category_id` لمقالات منشورة يُتِمّ
بصمت. `Article::primaryCategory()` (`Article.php:138-141`) علاقة عادية بلا
`withTrashed()` — فتختفي بيانات التصنيف (الاسم/الرابط/فتات الخبز) من الـAPI
العام رغم بقاء المقالات منشورة، وصفحة التصنيف نفسها تُرجِع 404.

### M2 — أعلام تحريرية (مميَّز/عاجل/مثبَّت) غير محميّة بصلاحية داخل التحديث
- `app/Actions/Admin/Content/UpdateArticleAction.php:83-92`
- مقارنة بـ`views_count`/`author_id` بنفس الملف (94-106) المحميّتين بـ`ArticleAuthorizationGuard::isEditorial`

`is_featured`/`is_breaking`/`is_pinned`/`is_header`/`is_editor_pick`/
`is_squares`/`comments_enabled` تُطبَّق مباشرة من المُدخَل المُتحقَّق منه
بلا فحص صلاحية تحريرية — كاتب غير تحريري يعدِّل مسودّته الخاصة (مسموح له
حسب `ArticleAuthorizationGuard::forUpdate`) يمكنه ترقية نفسه لـ"عاجل"/
"مميَّز"/"مثبَّت" بنفسه — يناقض النيّة الموثَّقة صراحة بـ
`PublicStoreArticleRequest.php:23-24` بأن هذه "قرار تحريري لا يملكه الكاتب".

### M3 — لا يوجد 301 فعلي لروابط تصنيف قديمة بالواجهة رغم وجود البنية التحتية بالباك إند
- `app/Support/Content/CategoryRedirectResolver.php` — يعمل بشكل صحيح ومُتحقَّق
- لكن `frontend/src/app/(site)/category/[id]/page.tsx:15` (المسار المسطَّح القديم `/category/{slug}`) يستدعي `getCategoryBySlug` (بحث بالـslug الحاليّ فقط) بدل نقطة إعادة التوجيه بالباك إند
- نفس الفجوة تقريباً بجانب المقالات: `articles/[idslug]/page.tsx:13` يُحوِّل slug بلا معرّف رقمي إلى `/` بدل حلّه عبر `ArticleRedirectResolver`

إعادة تسمية تصنيف تكسر الروابط القديمة الخارجية (نتائج بحث/روابط مشارَكة)
بدل إعادة توجيهها 301، رغم أن البنية التي تحلّ هذا موجودة وتعمل فعلياً —
فقط غير مستدعاة من هذا المسار بالواجهة.

### M4 — الجسم المُهيكَل (ADR-002) غير مُطبَّق بالواجهة، بكلا اللغتين
- `docs/adr/002-structured-block-body.md` يفرض تخزين المحتوى كـ`ContentBlock[]`
- لكن `article-body.tsx:72-76` وen-article-body.tsx:51` كلاهما يعرضان `content_html` مباشرة عبر `dangerouslySetInnerHTML` بلا أي Block Renderer

ليس انجرافاً بين اللغتين (كلتاهما متطابقتان بهذا الخلل)، لكنه فجوة معماريّة
حقيقية مقابل الـADR، وسطح XSS كامن لو تراجع تعقيم HTML بالباك إند مستقبلاً.

### M5 — عدد عناصر ترويسة التصنيف المميَّزة يختلف عربي(٢)/إنجليزي(١)
- عربي: `frontend/src/app/(site)/category/[id]/[name]/page.tsx:63-64`
- إنجليزي: `frontend/src/app/en/category/[id]/[name]/page.tsx:63-64`

قد يكون قراراً تصميمياً مقصوداً، لكن التعليق المرافق (أسطر 60-62) لا يوضّح
سبب الاختلاف تحديداً — يستحق تأكيداً أنه مقصود لا انجراف.

---

## ⚪ Low

- **L1** — كود ميت لتسجيل تاريخ الروابط: `TransitionArticleStatusAction.php:56-62` وUpdateArticleAction.php:139-145` يحسبان `oldPath`/`newPath` لكن `Article::canonicalPath()` (`Article.php:300-303`) أصبح ثابتاً (`/article/{id}`) — الشرط لا يتحقّق أبداً، فلا يُكتَب أي صفّ `ArticleUrlHistory` من هذين المسارين (حتى التوثيق بالكود بـ`UpdateArticleAction.php:28-35` يعترف بذلك).
- **L2** — تعليق قديم غير دقيق + N+1 بسيط بـ`ArticleRevisionRecorder.php:14,37` (يدّعي أن `tags_snapshot` خارج النطاق، لكن السطر 37 فعلياً يُحمِّل علاقة `tags` كسولاً بكل نسخة).
- **L3** — كود ميت بالواجهة: `ArticleInteractionBar.tsx` وblocks/author-card.tsx` (`AuthorCard`) غير مستورَدين بأي مكان — استُبدِلا بـ`ReadingToolsBar`/بطاقة كاتب مضمَّنة يدوياً بـ`article-detail.tsx:124-167`.

---

## ✅ تحقّق نظيف (لا ملاحظات)

- **N+1 بالقوائم**: `ListArticlesAction`/`ListPublicArticlesAction`/`ListMyArticlesAction`/`ListCategoriesAction`/`ListPublicCategoriesAction` كلها تُحمِّل `author`/`category`/`media`/`tags` مسبقاً بشكل صحيح.
- **تسريب بيانات**: `PublicArticleResource`/`PublicArticleListItemResource` تحذفان `content_json`/`author_id` الخام/حقول SEO الداخلية بشكل صحيح.
- **حالة السباق بالنشر المجدوَل**: `PublishDueArticlesAction` يستخدم `Cache::lock` + `lockForUpdate` + إعادة فحص idempotent — يُعالِج تداخل تشغيلَي cron بشكل صحيح.
- **إبطال الكاش لبقيّة عمليّات المقال/التصنيف**: كل عمليّات الإنشاء/التحديث/الحذف/الاستعادة/تغيير الحالة (عدا وسائط المقال، C1 أعلاه) تستدعي `FrontendRevalidate::tags()` بالوسوم الصحيحة، شاملةً `BulkUpdateCategoriesAction`.
- **معالجة `notFound()`**: متّسقة بكلتا اللغتين بكل المسارات المفحوصة.
- **بيانات SEO**: `articleSeoToMetadata()` مشتركة بين اللغتين، لا تصادم Canonical.
- **التحديثات الحيّة (Live Updates)**: منطق polling/تنظيف متطابق تماماً بالعربي والإنجليزي.

---

## توصية بالأولوية

1. **C1** (كاش وسائط المقال) — نفس فئة حادثة سابقة، أعلى أثر مستخدم مباشر.
2. **C2** (فيديو خارجي إنجليزي معطَّل) — كسر واضح للمستخدم، إصلاح صغير.
3. **H1** (فحص ملكية الحذف) — فجوة صلاحيات حقيقية، تتطلّب قراراً: هل الحذف
   يجب أن يبقى بصلاحية دور فقط (سلوك مقصود لأدوار Admin/Editor) أم يلزمه
   نفس حاجز الملكية كالتحديث؟ يحتاج قراركم قبل أي تعديل.
4. **H2–H5**, ثم **Medium**, حسب الأولوية التشغيلية.
