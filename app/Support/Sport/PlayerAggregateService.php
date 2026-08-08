<?php

declare(strict_types=1);

namespace App\Support\Sport;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * تجميع بيانات لاعب 365Scores بنداء داخلي واحد بدل ١٠-٣٠ نداء منفصل كانت الواجهة تطلقها.
 *
 * السبب: `getPlayerCareerData`/`getPlayerTrophies` بالواجهة (frontend/src/lib/sport/player.ts) كانتا
 * تطلقان حتى ٣٠ استدعاء fetch متوازٍ لكل زيارة صفحة لاعب واحدة (١٠ مواسم + حتى ٢٠ بطولة) — كل استدعاء
 * كان يُخزَّن كملف Next.js fetch-cache منفصل بلا حد أقصى ولا تنظيف تلقائي؛ بيانات اللاعبين وحدها شكَّلت
 * 43.5% من حادثة امتلاء القرص بتاريخ 2026-08-07 (راجع STORAGE_DEEPDIVE_5.5GB_SOURCE_2026-08-07.md).
 * تحقَّقنا مباشرة أنه لا يوجد endpoint موحَّد عند 365Scores نفسها (`seasonKey`/`competitionId` إلزاميان
 * بكل نداء، HTTP 204 بدونهما) — وأن موقع 365Scores الرسمي نفسه يجمّع من طرف الخادم لا العميل (صفر
 * طلبات XHR مرصودة من متصفح حقيقي لصفحة لاعب فعلية). التجميع هنا يطابق معماريتهم، لا بديل مؤقّت.
 *
 * كل استدعاء فرعي (موسم/بطولة) معزول بـ try/catch مستقل — فشل واحد لا يُسقط الاستجابة كاملة؛
 * ‎partial=true‎ + تسجيل بقناة perf بدل استثناء يوقف كل شيء (طلب المستخدم: "لا تجعل صفحة اللاعب
 * رهينة لطلب واحد من عشرات الطلبات").
 */
final class PlayerAggregateService extends SportAggregateService
{
    /** آخر ١٠ مواسم — نفس نافذة الواجهة الأصليّة. */
    private const CAREER_SEASONS_BACK = 10;

    /** حد أقصى لعدد البطولات المستعلَمة للألقاب — نفس حد الواجهة الأصليّة (منع تضخّم إضافي). */
    private const MAX_TROPHY_COMPETITIONS = 20;

    /** عدد آخر المباريات المعروضة — يغطي كِلا استخدامَي الواجهة (ملخّص ٥ + تبويب المباريات ٢٠). */
    private const RECENT_GAMES_LIMIT = 20;

    /**
     * @return array{found:bool, partial?:bool, id?:int, name?:string, photo?:?string, position?:?string,
     *     nationality?:?string, age?:?int, club?:?array, national_team?:?array, teams?:array, competitions?:array,
     *     career?:array, trophies?:array, recent_games?:array}
     */
    public function aggregate(int $athleteId): array
    {
        $this->resetPartial();

        $profile = $this->loadProfile($athleteId);
        if ($profile === null) {
            return ['found' => false];
        }

        [$career, $recentGames] = $this->loadCareerAndRecentGames($athleteId);
        $trophies = $this->loadTrophies($athleteId, $career['competitions']);

        return $this->merge($profile, $career, $trophies, $recentGames);
    }

    // ─── التحميل ─────────────────────────────────────────────────────────

    /** ملف اللاعب الأساسي — `athletes/?athletes={id}`. null إن لم يوجد/فشل (لا جدوى من متابعة البقيّة). */
    private function loadProfile(int $athleteId): ?array
    {
        try {
            $res = $this->get('athletes/', ['athletes' => $athleteId]);
            if (! $res->successful()) {
                return null;
            }
            $json = $res->json();
            $athletes = is_array($json['athletes'] ?? null) ? $json['athletes'] : [];
            $a = null;
            foreach ($athletes as $x) {
                if (is_array($x) && ($x['id'] ?? null) === $athleteId) {
                    $a = $x;
                    break;
                }
            }
            $a ??= $athletes[0] ?? null;
            if (! is_array($a)) {
                return null;
            }

            $competitors = [];
            foreach ((is_array($json['competitors'] ?? null) ? $json['competitors'] : []) as $c) {
                if (is_array($c) && isset($c['id'])) {
                    $competitors[(int) $c['id']] = $c;
                }
            }
            $toTeam = function (mixed $tid) use ($competitors): ?array {
                if (! is_int($tid) && ! is_float($tid)) {
                    return null;
                }
                $c = $competitors[(int) $tid] ?? null;
                if ($c === null) {
                    return null;
                }

                return [
                    'id' => (int) $c['id'],
                    'name' => (string) $c['name'],
                    'logo' => $this->teamLogo((int) $c['id'], $c['imageVersion'] ?? null),
                ];
            };
            $club = $toTeam($a['clubId'] ?? null);
            $nationalTeam = $toTeam($a['nationalTeamId'] ?? null);
            $teams = array_values(array_filter([$club, $nationalTeam]));

            $competitions = [];
            foreach ((is_array($json['competitions'] ?? null) ? $json['competitions'] : []) as $c) {
                if (! is_array($c) || ! isset($c['id'], $c['name'])) {
                    continue;
                }
                $competitions[] = [
                    'id' => (int) $c['id'],
                    'name' => (string) $c['name'],
                    'logo' => $this->competitionLogo((int) $c['id'], $c['countryId'] ?? null, $c['imageVersion'] ?? null),
                ];
            }

            $position = $a['formationPosition']['name'] ?? $a['position']['name'] ?? null;

            return [
                'id' => (int) $a['id'],
                'name' => (string) $a['name'],
                'photo' => $this->playerPhoto((int) $a['id'], $a['imageVersion'] ?? null),
                'position' => is_string($position) ? $position : null,
                'nationality' => is_string($a['nationalityName'] ?? null) ? $a['nationalityName'] : null,
                'age' => isset($a['age']) && is_numeric($a['age']) ? (int) $a['age'] : null,
                'club' => $club,
                'national_team' => $nationalTeam,
                'teams' => $teams,
                'competitions' => $competitions,
            ];
        } catch (Throwable $e) {
            $this->logFailure('profile', ['athleteId' => $athleteId], $e);

            return null;
        }
    }

    /**
     * مسيرة اللاعب (١٠ مواسم متوازية) + آخر المباريات — مجمَّعتان بنفس الـ Pool الواحد (لا تعتمد
     * إحداهما على الأخرى، فتوفير جولة شبكة إضافية آمن). `career` يلزمه `seasonKey` واحد لكل نداء
     * (204 بدونه، مؤكَّد تجريبياً) — العرض من أحدث موسم فيه بيانات، وقائمة البطولات (للألقاب) =
     * اتّحاد كل المواسم (تكشف بطولات قديمة فاز بها اللاعب خارج موسمه الحاليّ).
     *
     * @return array{0: array{sections:array, competitions:array}, 1: array}
     */
    private function loadCareerAndRecentGames(int $athleteId): array
    {
        $year = (int) date('Y');
        $seasons = [];
        for ($i = 0; $i < self::CAREER_SEASONS_BACK; $i++) {
            $seasons[] = $year - $i;
        }

        try {
            $responses = Http::pool(function (Pool $pool) use ($athleteId, $seasons): array {
                $requests = [];
                foreach ($seasons as $season) {
                    $requests["season_{$season}"] = $this->pooled($pool, "season_{$season}")
                        ->get($this->url('athletes/career'), $this->params($athleteId, ['seasonKey' => $season]));
                }
                $requests['recent_games'] = $this->pooled($pool, 'recent_games')
                    ->get($this->url('athletes/games/'), $this->params($athleteId, ['lastMatchLimit' => self::RECENT_GAMES_LIMIT]));

                return $requests;
            });
        } catch (Throwable $e) {
            $this->logFailure('career_pool', ['athleteId' => $athleteId], $e);

            return [['sections' => [], 'competitions' => []], []];
        }

        $sections = [];
        $competitionsById = [];
        foreach ($seasons as $season) {
            $res = $responses["season_{$season}"] ?? null;
            $parsed = $this->parseCareerSeason($res, $athleteId, $season);
            if ($parsed === null) {
                continue;
            }
            if ($sections === [] && $parsed['sections'] !== []) {
                $sections = $parsed['sections'];
            }
            foreach ($parsed['competitions'] as $c) {
                $competitionsById[$c['id']] ??= $c['name'];
            }
        }
        $competitions = [];
        foreach ($competitionsById as $id => $name) {
            $competitions[] = ['id' => $id, 'name' => $name];
        }

        $recentGames = $this->parseRecentGames($responses['recent_games'] ?? null, $athleteId);

        return [['sections' => $sections, 'competitions' => $competitions], $recentGames];
    }

    /** ألقاب اللاعب — نداء واحد لكل بطولة بمسيرته (حتى ٢٠، `competitionId` إلزامي، 204 بدونه). */
    private function loadTrophies(int $athleteId, array $competitions): array
    {
        if ($competitions === []) {
            return [];
        }
        $list = array_slice($competitions, 0, self::MAX_TROPHY_COMPETITIONS);

        try {
            $responses = Http::pool(function (Pool $pool) use ($athleteId, $list): array {
                $requests = [];
                foreach ($list as $c) {
                    // مفتاح المصفوفة الخارجي يجب أن يطابق تسمية ->as() حرفياً — Http::pool() يُرجِع
                    // النتائج مفهرَسة بتسميات as() لا بأي مفتاح آخر استُعمل عند بناء المصفوفة.
                    $requests["trophy_{$c['id']}"] = $this->pooled($pool, "trophy_{$c['id']}")
                        ->get($this->url('athletes/trophies/stats'), $this->params($athleteId, ['competitionId' => $c['id']]));
                }

                return $requests;
            });
        } catch (Throwable $e) {
            $this->logFailure('trophies_pool', ['athleteId' => $athleteId], $e);

            return [];
        }

        $groups = [];
        foreach ($list as $c) {
            $res = $responses["trophy_{$c['id']}"] ?? null;
            $group = $this->parseTrophyGroup($res, $athleteId, $c);
            if ($group !== null) {
                $groups[] = $group;
            }
        }

        return $groups;
    }

    // ─── التحليل (كل دالة معزولة بـ try/catch عبر مناداتها فقط، لا تُستثنى للأعلى) ─────────────

    private function parseCareerSeason(Response|ConnectionException|null $res, int $athleteId, int $season): ?array
    {
        if (! $res instanceof Response) {
            $this->logPoolMiss('career_season', ['athleteId' => $athleteId, 'season' => $season], $res);

            return null;
        }
        try {
            if ($res->status() === 204) {
                return null; // لا بيانات لهذا الموسم — طبيعي، لا يُعتبر فشلاً (partial).
            }
            if (! $res->successful()) {
                $this->logFailure('career_season', ['athleteId' => $athleteId, 'season' => $season], null, "HTTP {$res->status()}");

                return null;
            }
            $json = $res->json();
            $tables = $json['stats']['tables'] ?? null;
            if (! is_array($tables) || $tables === []) {
                return null;
            }
            $cats = is_array($json['stats']['categories'] ?? null) ? $json['stats']['categories'] : [];

            $sections = [];
            foreach ($tables as $i => $t) {
                if (! is_array($t)) {
                    continue;
                }
                $columns = [];
                foreach ((is_array($t['columns'] ?? null) ? $t['columns'] : []) as $c) {
                    if (is_array($c) && isset($c['num'])) {
                        $columns[] = ['num' => (int) $c['num'], 'name' => (string) ($c['shortName'] ?: ($c['name'] ?? ''))];
                    }
                }
                $rows = [];
                foreach ((is_array($t['rows'] ?? null) ? $t['rows'] : []) as $r) {
                    if (! is_array($r)) {
                        continue;
                    }
                    $values = [];
                    foreach ((is_array($r['values'] ?? null) ? $r['values'] : []) as $v) {
                        if (is_array($v) && isset($v['columnNum'])) {
                            $values[(int) $v['columnNum']] = (string) ($v['value'] ?? '-');
                        }
                    }
                    $rows[] = [
                        'competition_id' => (int) ($r['entityId'] ?? 0),
                        'title' => (string) ($r['title'] ?? ''),
                        'values' => $values,
                    ];
                }
                $sections[] = ['name' => (string) ($cats[$i]['name'] ?? ''), 'columns' => $columns, 'rows' => $rows];
            }

            $competitions = [];
            foreach ((is_array($json['competitions'] ?? null) ? $json['competitions'] : []) as $c) {
                if (is_array($c) && isset($c['id'], $c['name'])) {
                    $competitions[] = ['id' => (int) $c['id'], 'name' => (string) $c['name']];
                }
            }

            return ['sections' => $sections, 'competitions' => $competitions];
        } catch (Throwable $e) {
            $this->logFailure('career_season', ['athleteId' => $athleteId, 'season' => $season], $e);

            return null;
        }
    }

    private function parseRecentGames(Response|ConnectionException|null $res, int $athleteId): array
    {
        if (! $res instanceof Response) {
            $this->logPoolMiss('recent_games', ['athleteId' => $athleteId], $res);

            return [];
        }
        try {
            if (! $res->successful()) {
                if ($res->status() !== 204) {
                    $this->logFailure('recent_games', ['athleteId' => $athleteId], null, "HTTP {$res->status()}");
                }

                return [];
            }
            $json = $res->json();
            $games = is_array($json['games'] ?? null) ? $json['games'] : [];
            $out = [];
            foreach (array_slice($games, 0, self::RECENT_GAMES_LIMIT) as $it) {
                if (! is_array($it) || ! is_array($it['game'] ?? null)) {
                    continue;
                }
                $g = $it['game'];
                $stats = is_array($it['athleteStats'] ?? null) ? $it['athleteStats'] : [];
                $byType = function (int $type) use ($stats): ?string {
                    foreach ($stats as $s) {
                        if (is_array($s) && ($s['type'] ?? null) === $type) {
                            return isset($s['value']) ? (string) $s['value'] : null;
                        }
                    }

                    return null;
                };
                $rating = null;
                $ratingColor = null;
                foreach ($stats as $s) {
                    if (is_array($s) && ! empty($s['bgColor'])) {
                        $rating = isset($s['value']) ? (string) $s['value'] : null;
                        $ratingColor = (string) $s['bgColor'];
                        break;
                    }
                }
                $side = function (?array $c): array {
                    if ($c === null) {
                        return ['name' => '', 'logo' => null, 'score' => null];
                    }

                    return [
                        'name' => (string) ($c['name'] ?? ''),
                        'logo' => isset($c['id']) ? $this->teamLogo((int) $c['id'], $c['imageVersion'] ?? null) : null,
                        'score' => isset($c['score']) && is_numeric($c['score']) && (float) $c['score'] >= 0 ? (int) $c['score'] : null,
                    ];
                };

                $out[] = [
                    'id' => (int) ($g['id'] ?? 0),
                    'competition' => $g['competitionDisplayName'] ?? null,
                    'date' => $g['startTime'] ?? null,
                    'home' => $side(is_array($g['homeCompetitor'] ?? null) ? $g['homeCompetitor'] : null),
                    'away' => $side(is_array($g['awayCompetitor'] ?? null) ? $g['awayCompetitor'] : null),
                    'minutes' => $byType(229),
                    'goals' => $byType(226),
                    'rating' => $rating,
                    'rating_color' => $ratingColor,
                ];
            }

            return $out;
        } catch (Throwable $e) {
            $this->logFailure('recent_games', ['athleteId' => $athleteId], $e);

            return [];
        }
    }

    private function parseTrophyGroup(Response|ConnectionException|null $res, int $athleteId, array $competition): ?array
    {
        if (! $res instanceof Response) {
            $this->logPoolMiss('trophy', ['athleteId' => $athleteId, 'competitionId' => $competition['id']], $res);

            return null;
        }
        try {
            if ($res->status() === 204) {
                return null; // لا ألقاب بهذه البطولة — طبيعي، ليس فشلاً.
            }
            if (! $res->successful()) {
                $this->logFailure('trophy', ['athleteId' => $athleteId, 'competitionId' => $competition['id']], null, "HTTP {$res->status()}");

                return null;
            }
            $json = $res->json();
            $rows = $json['stats']['rows'] ?? null;
            if (! is_array($rows) || $rows === []) {
                return null;
            }

            $logoOf = [];
            foreach ((is_array($json['competitors'] ?? null) ? $json['competitors'] : []) as $c) {
                if (is_array($c) && isset($c['id'])) {
                    $logoOf[(int) $c['id']] = $this->teamLogo((int) $c['id'], $c['imageVersion'] ?? null);
                }
            }
            $columns = [];
            foreach ((is_array($json['stats']['columns'] ?? null) ? $json['stats']['columns'] : []) as $c) {
                if (is_array($c) && isset($c['num'])) {
                    $columns[] = ['num' => (int) $c['num'], 'name' => (string) ($c['name'] ?? '')];
                }
            }
            $outRows = [];
            foreach ($rows as $r) {
                if (! is_array($r)) {
                    continue;
                }
                $values = [];
                foreach ((is_array($r['values'] ?? null) ? $r['values'] : []) as $v) {
                    if (is_array($v) && isset($v['columnNum'])) {
                        $values[(int) $v['columnNum']] = (string) ($v['value'] ?? '-');
                    }
                }
                $entityId = $r['entityId'] ?? null;
                $outRows[] = [
                    'competitor' => (string) ($r['title'] ?? ''),
                    'competitor_logo' => is_numeric($entityId) ? ($logoOf[(int) $entityId] ?? null) : null,
                    'season' => $r['secondaryTitle'] ?? null,
                    'values' => $values,
                ];
            }

            return [
                'competition' => (string) $competition['name'],
                'count' => count($outRows),
                'columns' => $columns,
                'rows' => $outRows,
            ];
        } catch (Throwable $e) {
            $this->logFailure('trophy', ['athleteId' => $athleteId, 'competitionId' => $competition['id']], $e);

            return null;
        }
    }

    // ─── الدمج ────────────────────────────────────────────────────────────

    private function merge(array $profile, array $career, array $trophies, array $recentGames): array
    {
        return [
            'found' => true,
            'partial' => $this->isPartial(),
            ...$profile,
            'career' => $career['sections'],
            'trophies' => $trophies,
            'recent_games' => $recentGames,
        ];
    }

    // ─── أدوات خاصة بهالخدمة (المشتركة انتقلت لـSportAggregateService) ──────

    /** @return array<string,int|string> */
    private function params(int $athleteId, array $extra): array
    {
        return $this->commonParams() + ['athleteId' => $athleteId] + $extra;
    }

    /** @return array<string,int|string> */
    protected function commonParams(): array
    {
        parse_str((string) config('sport.api_common_athlete'), $parsed);

        return $parsed;
    }

    // ─── روابط الصور (نفس صيغة الواجهة الأصليّة حرفياً) ──────────────────

    private function playerPhoto(int $id, mixed $version, int $w = 140): ?string
    {
        if ($version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_%d,h_%d,c_limit,q_auto:eco,dpr_2,d_Athletes:default.png,r_max,c_thumb,g_face,z_0.65/v%d/Athletes/%d',
            $w,
            $w,
            (int) $version,
            $id,
        );
    }

    private function teamLogo(int $id, mixed $version): ?string
    {
        if ($version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_56,h_56,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v%d/Competitors/%d',
            (int) $version,
            $id,
        );
    }

    private function competitionLogo(int $id, mixed $countryId, mixed $version): ?string
    {
        if ($countryId === null || $version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_24,h_24,c_limit,q_auto:eco,dpr_2,d_Countries:Round:%d.png/v%d/Competitions/%d',
            (int) $countryId,
            (int) $version,
            $id,
        );
    }
}
