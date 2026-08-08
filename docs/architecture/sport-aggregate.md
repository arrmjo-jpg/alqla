# تجميع بيانات الرياضة (Sport Aggregate) — AlphaCMS

مرجع مختصر لمعماريّة تجميع بيانات 365Scores. اقرأ هذا قبل إضافة Aggregate جديد
(فريق/مباراة/لاعب إضافي) أو قبل تعديل أحد الموجودين.

## لماذا أنشأنا Aggregate

قبل هذه المعماريّة، كانت صفحات الرياضة تستدعي 365Scores مباشرةً من Next.js —
حتى ٣٠ نداء `fetch()` منفصل لصفحة لاعب واحدة. كل نداء يُخزَّن كملف
Next.js fetch-cache منفصل بلا حد أقصى ولا تنظيف تلقائي. هذا تسبّب بحادثة
إنتاج فعليّة (٢٠٢٦-٠٨-٠٧): امتلاء القرص ١١١GB/3.1M ملف، توقّف الموقع. راجع
`INCIDENT_ANALYSIS_2026-08-07.md` للتفصيل الكامل.

الحل: نداء داخليّ **واحد** لكل كيان (لاعب/مباراة/فريق) عبر Laravel — يجمّع
داخلياً (`Http::pool`) ما كان يُطلَق من Next.js بشكل متفرّق، ويُخزَّن بمفتاح
كاش واحد لكل كيان بدل مفتاح لكل (كيان، موسم/بطولة/تبويب).

365Scores نفسها لا تملك endpoint موحَّد (`seasonKey`/`competitionId` إلزاميان
بكل نداء) — وموقعها الرسمي نفسه يجمّع من طرف الخادم لا العميل. التجميع هنا
يطابق معماريتهم، لا بديل مؤقّت.

## متى يُستخدَم كل Provider

كل كيان مُجمَّع له `XxxProvider` (`PlayerProvider`/`MatchProvider`/
`TeamProvider`، بـ`frontend/src/lib/sport/providers.ts`) بتوقيع واحد يُلزِم
تنفيذَين:

- **Legacy** (`xxx-legacy.ts`) — نداءات 365Scores المباشرة الأصليّة من
  Next.js. السلوك القديم كما هو، بلا تغيير.
- **Aggregate** (`xxx-aggregate.ts`) — نداء واحد لـ`GET /api/v1/sports/...`
  (خدمة Laravel المقابلة)، مع تحويل snake_case ⇐ camelCase **فقط** — لا حساب،
  لا فلترة، لا قيم افتراضية مخفيّة. أي منطق حقيقي يذهب لخدمة الـAggregate
  بالباك إند، لا للـAdapter.

المُنتقي (`xxx.ts`، مثل `player.ts`/`match.ts`/`team.ts`) يختار أحدهما عبر
متغيّر بيئة ولا يحوي أي منطق جلب بنفسه. المستهلكون (`page.tsx`، المكوّنات)
يستوردون من المُنتقي حصراً ولا يتغيّرون أبداً بتبديل الـProvider.

## كيف يعمل Feature Flag

```
SPORT_PLAYER_PROVIDER=legacy|aggregate   (افتراضي: legacy)
SPORT_MATCH_PROVIDER=legacy|aggregate    (افتراضي: legacy)
SPORT_TEAM_PROVIDER=legacy|aggregate     (افتراضي: legacy)
```

متغيّرات بيئة مستقلّة لكل كيان — قابلة للتبديل فرداً بفرد، بلا Rebuild
(تُقرَأ عند الطلب داخل مكوّنات خادميّة، لا في وقت البناء). `legacy` هو
الافتراضي دائماً: صفر تغيير سلوك ما لم يُفعَّل العلم صراحةً. راجع
`.env.example` للتوثيق الكامل.

## دورة إضافة Aggregate جديد

ست خطوات إلزاميّة، بهذا الترتيب، لا تُختصَر ولا تُدمَج:

1. **Backend** — خدمة تمتد `SportAggregateService` (نقطة دخول
   `aggregate(int $id)`، تُعيد `found`/`partial` دائماً). لا Profiles إلا إذا
   أثبت تحليل الصفحة وجود تحميل Lazy/بتبويبات حقيقيّ (راجع `MatchProfile`
   كمثال — `TeamAggregateService` لا تحتاجه لأن صفحتها بلا تبويبات).
2. **Tests** — الحد الأدنى: نجاح كامل + مفتاح كاش واحد، إعادة استخدام الكاش،
   فشل الكيان الأساسي ⇒ 404، فشل جزء ثانوي ⇒ `partial:true` مع بقاء الباقي،
   `ConnectionException` (لا `Response` فقط) لكلتا الحالتين، معرّف غير صالح
   ⇒ 422 بلا أي نداء شبكة.
3. **مقارنة Legacy ↔ Aggregate على بيانات حقيقيّة** — **إلزاميّة، لا اختياريّة.**
   قارن مخرجات Aggregate ضد **مخرجات Legacy الفعليّة** (لا JSON 365Scores
   الخام) لكيانين حقيقيّين على الأقل. كشفت هذه الخطوة خللاً حقيقياً في كل
   مرة استُخدِمت (Player: `Http::pool` key mismatch + `ConnectionException`
   غير معالَجة؛ Match: مفاتيح مفقودة تسبّب تحذيرات PHP؛ Team: دوال شعارات
   صور بحجم/شرط خاطئَين) — لم تكن مرة واحدة زائدة عن الحاجة.
4. **Adapter** — `Provider`/`Repository`/`Feature Flag` (راجع القسمين
   أعلاه). أي عدم تطابق معماريّ حقيقيّ (مثل `getCompetitionMeta`/
   `getCompetitionMatchList` بالمباراة، مفتاحهما `competitionId` لا
   `gameId`) يُصرَّح به كقرار معماريّ مقصود ويبقى Legacy — لا Stub، لا
   fallback يخفي الفجوة.
5. **Docker Validation** — Build + TypeScript + ESLint + Backend Tests
   داخل الحاوية الفعليّة، ثم فحص متصفّح حقيقي لكلا الـProviderين (تطابق
   بصري، صفر أخطاء Console جديدة، صفر نداءات مباشرة لـ365Scores من
   المتصفّح).
6. **Benchmark** — قياس الأثر الفعلي (زمن/عدد نداءات قبل وبعد) على بيانات
   حقيقيّة، لا تخمين.

بعد الخطوة 6: اعتماد النمط (الإعلان أن الكيان أصبح جزءاً من المعماريّة
المرجعيّة، لا مجرّد PR منفرد).

## ملاحظة أداء معروفة

`MatchAggregateService::aggregateBase()` يحسب ويُعيد `competition_match_list`
رغم أن الـAdapter الحالي لا يستهلكه (بقي `getCompetitionMatchList` على
Legacy عمداً — نقطة ٤ أعلاه). تذكرة تحسين مستقلة مسجَّلة، لا تُعالَج ضمن هذا
التوثيق ولا تمنع اعتماد Match.
