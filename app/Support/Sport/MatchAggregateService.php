<?php

declare(strict_types=1);

namespace App\Support\Sport;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use LogicException;
use Throwable;

/**
 * تجميع بيانات مباراة 365Scores — على عكس اللاعب، الواجهة الحالية **لا تجلب كل شيء دفعة واحدة**:
 * تفاصيل المباراة + معلومات البطولة + قائمة مباريات البطولة تُجلب دائماً (كل تبويب)، بينما
 * الترتيب/خريطة التسديدات/المواجهات المباشرة/الإحصائيات/الشائع مشروطة بالتبويب النشط فعلياً بالكود
 * (`frontend/src/app/(site)/sport/match/[id]/page.tsx`). لذلك هذه الخدمة **بملفات (Profiles)** لا
 * تجميع واحد شامل — كل Profile يبني فوق aggregateBase() ويضيف فقط ما يحتاجه تبويبه، فلا نستبدل مشكلة
 * "طلبات كثيرة" بمشكلة "استجابة ضخمة تحمّل بيانات لا يحتاجها المستخدم".
 *
 * هذا الملف: profile=base فقط (تفاصيل المباراة + معلومات البطولة + قائمة المباريات) — الجزء المُجلَب
 * دائماً بغضّ النظر عن التبويب. overview/stats/trends تُضاف بخطوة تالية منفصلة.
 */
final class MatchAggregateService extends SportAggregateService
{
    /** نقطة الدخول المركزية — التوجيه حسب MatchProfile بدل سلاسل نصية متفرّقة. */
    public function aggregate(int $gameId, MatchProfile $profile = MatchProfile::Base): array
    {
        return match ($profile) {
            MatchProfile::Base => $this->aggregateBase($gameId),
            MatchProfile::Overview, MatchProfile::Stats, MatchProfile::Trends => throw new LogicException(
                "MatchProfile::{$profile->name} غير مُنفَّذ بعد بـMatchAggregateService — يُضاف بخطوة تالية منفصلة."
            ),
        };
    }

    /** @return array<string,mixed> */
    public function aggregateBase(int $gameId): array
    {
        $this->resetPartial();

        $detail = $this->loadGameDetail($gameId);
        if ($detail === null) {
            return ['found' => false];
        }

        $competitionId = $detail['competition_id'];
        $competitionMeta = $competitionId !== null ? $this->loadCompetitionMeta($competitionId) : null;
        $matchList = $competitionId !== null ? $this->loadCompetitionMatchList($competitionId) : $this->emptyMatchList();

        return [
            'found' => true,
            'partial' => $this->isPartial(),
            'profile' => 'base',
            ...$detail,
            'competition_meta' => $competitionMeta,
            'competition_match_list' => $matchList,
        ];
    }

    // ─── تفاصيل المباراة — `game/?appTypeId=5&gameId={id}` (نفس تجاوز appTypeId يدوياً كالواجهة) ────

    private function loadGameDetail(int $gameId): ?array
    {
        try {
            $res = Http::acceptJson()
                ->timeout((int) config('sport.http_timeout', 8))
                ->get($this->url('game/'), ['appTypeId' => 5, 'langId' => 27, 'timezoneName' => 'Asia/Amman', 'userCountryId' => 6, 'gameId' => $gameId]);

            if (! $res->successful()) {
                return null;
            }
            $json = $res->json();
            $g = $json['game'] ?? null;
            if (! is_array($g)) {
                return null;
            }

            $home = $this->side($g['homeCompetitor'] ?? null, 96);
            $away = $this->side($g['awayCompetitor'] ?? null, 96);
            $kind = $this->classify($g['statusGroup'] ?? null, $home, $away);

            $competitions = is_array($json['competitions'] ?? null) ? $json['competitions'] : [];
            $compMeta = null;
            foreach ($competitions as $c) {
                if (is_array($c) && ($c['id'] ?? null) === ($g['competitionId'] ?? null)) {
                    $compMeta = $c;
                    break;
                }
            }

            // خريطة عضو الفريق (athleteId/اسم/قميص/صورة) — للأحداث والتشكيلة والمجريات معاً.
            $memberInfo = [];
            foreach ((is_array($g['members'] ?? null) ? $g['members'] : []) as $m) {
                if (! is_array($m) || ! isset($m['id'])) {
                    continue;
                }
                $athleteId = $m['athleteId'] ?? $m['id'];
                $memberInfo[(int) $m['id']] = [
                    'athlete_id' => (int) $athleteId,
                    'name' => (string) (($m['shortName'] ?? null) ?: ($m['name'] ?? '')),
                    'jersey' => $m['jerseyNumber'] ?? null,
                    'photo' => $this->athletePhoto((int) $athleteId, $m['imageVersion'] ?? null),
                ];
            }

            $homeCompetitorId = $g['homeCompetitor']['id'] ?? null;
            $events = [];
            foreach ((is_array($g['events'] ?? null) ? $g['events'] : []) as $e) {
                if (! is_array($e)) {
                    continue;
                }
                $type = $this->eventKind($e['eventType']['id'] ?? null);
                if ($type === null) {
                    continue;
                }
                $playerId = $e['playerId'] ?? null;
                $events[] = [
                    'minute' => $e['gameTimeDisplay'] ?? null,
                    'side' => ($e['competitorId'] ?? null) === $homeCompetitorId ? 'home' : 'away',
                    'type' => $type,
                    'player' => $playerId !== null ? ($memberInfo[(int) $playerId]['name'] ?? null) : null,
                ];
            }

            $homeLineup = $this->buildLineup(is_array($g['homeCompetitor']['lineups'] ?? null) ? $g['homeCompetitor']['lineups'] : null, $memberInfo);
            $awayLineup = $this->buildLineup(is_array($g['awayCompetitor']['lineups'] ?? null) ? $g['awayCompetitor']['lineups'] : null, $memberInfo);

            $minute = null;
            if ($kind === 'live') {
                $gameTime = $g['gameTime'] ?? null;
                $minute = ($g['gameTimeDisplay'] ?? null) ?: (is_numeric($gameTime) && $gameTime > 0 ? floor((float) $gameTime).'\'' : null);
            }

            $commentary = $this->buildCommentary($g, $memberInfo, $homeCompetitorId);

            $topPerformers = [];
            foreach ((is_array($g['topPerformers']['categories'] ?? null) ? $g['topPerformers']['categories'] : []) as $c) {
                if (! is_array($c) || empty($c['name'])) {
                    continue;
                }
                $homeP = $this->topPerfPlayer(is_array($c['homePlayer'] ?? null) ? $c['homePlayer'] : null);
                $awayP = $this->topPerfPlayer(is_array($c['awayPlayer'] ?? null) ? $c['awayPlayer'] : null);
                if ($homeP === null && $awayP === null) {
                    continue;
                }
                $topPerformers[] = ['name' => (string) $c['name'], 'home' => $homeP, 'away' => $awayP];
            }

            $round = null;
            if (! empty($g['roundName'])) {
                $round = isset($g['roundNum']) ? "{$g['roundName']} {$g['roundNum']}" : $g['roundName'];
            }

            return [
                'id' => (int) $g['id'],
                'competition_id' => isset($g['competitionId']) ? (int) $g['competitionId'] : null,
                'competition' => $g['competitionDisplayName'] ?? null,
                'competition_logo' => $compMeta ? $this->competitionLogo((int) $compMeta['id'], $compMeta['countryId'] ?? null, $compMeta['imageVersion'] ?? null) : null,
                'round' => $round,
                'group' => $g['groupName'] ?? null,
                'venue' => $g['venue']['name'] ?? null,
                'venue_capacity' => $g['venue']['capacity'] ?? null,
                'start_time' => $g['startTime'] ?? null,
                'kind' => $kind,
                'status_text' => $g['statusText'] ?? null,
                'minute' => $minute,
                'home' => $home,
                'away' => $away,
                'home_id' => $homeCompetitorId,
                'away_id' => $g['awayCompetitor']['id'] ?? null,
                'events' => $events,
                'referee' => $g['officials'][0]['name'] ?? null,
                'home_lineup' => $homeLineup,
                'away_lineup' => $awayLineup,
                'has_lineups' => (bool) ($g['hasLineups'] ?? false),
                'has_stats' => (bool) ($g['hasStats'] ?? false),
                'has_previous_meetings' => (bool) ($g['hasPreviousMeetings'] ?? false),
                'top_performers' => $topPerformers,
                'commentary' => $commentary,
            ];
        } catch (Throwable $e) {
            $this->logFailure('game_detail', ['gameId' => $gameId], $e);

            return null;
        }
    }

    /** @return array{formation:?string, starters:array, bench:array}|null */
    private function buildLineup(?array $lineups, array $memberInfo): ?array
    {
        $members = is_array($lineups['members'] ?? null) ? $lineups['members'] : [];
        if ($members === []) {
            return null;
        }
        $starters = [];
        $bench = [];
        foreach ($members as $m) {
            if (! is_array($m) || ! isset($m['id'])) {
                continue;
            }
            $info = $memberInfo[(int) $m['id']] ?? null;
            $competitorId = $m['competitorId'] ?? null;
            $player = [
                'id' => $info['athlete_id'] ?? (int) $m['id'],
                'name' => $info['name'] ?? '',
                'jersey' => $info['jersey'] ?? null,
                'position' => $m['position']['name'] ?? null,
                'ranking' => $m['ranking'] ?? null,
                'photo' => $info['photo'] ?? null,
                'club_logo' => $competitorId !== null ? $this->competitorLogoSimple((int) $competitorId) : null,
                'x' => $m['yardFormation']['fieldSide'] ?? null,
                'y' => $m['yardFormation']['fieldLine'] ?? null,
            ];
            if (($m['status'] ?? null) === 1) {
                $starters[] = $player;
            } else {
                $bench[] = $player;
            }
        }

        return ['formation' => $lineups['formation'] ?? null, 'starters' => $starters, 'bench' => $bench];
    }

    /** مجريات المباراة مُجمَّعة بالأشواط، الأشواط والأحداث داخلها الأحدث أولاً — نفس ترتيب الواجهة حرفياً. */
    private function buildCommentary(array $g, array $memberInfo, mixed $homeCompetitorId): array
    {
        $cPlayer = function (mixed $id) use ($memberInfo): ?array {
            if ($id === null) {
                return null;
            }
            $mi = $memberInfo[(int) $id] ?? null;

            return $mi ? ['id' => $mi['athlete_id'], 'name' => $mi['name'] ?: null, 'photo' => $mi['photo']] : null;
        };

        $evByStage = [];
        foreach ((is_array($g['events'] ?? null) ? $g['events'] : []) as $e) {
            if (! is_array($e)) {
                continue;
            }
            $ctype = $this->commentaryType($e['eventType']['id'] ?? null);
            $extraPlayers = is_array($e['extraPlayers'] ?? null) ? $e['extraPlayers'] : [];
            $ev = [
                'side' => ($e['competitorId'] ?? null) === $homeCompetitorId ? 'home' : 'away',
                'minute' => $this->eventMinute($e),
                'type' => $ctype,
                'major' => (bool) ($e['isMajor'] ?? false),
                'player' => $cPlayer($e['playerId'] ?? null),
                'player_out' => $ctype === 'sub' ? $cPlayer($extraPlayers[0] ?? null) : null,
            ];
            $sid = (int) ($e['stageId'] ?? 0);
            $evByStage[$sid][] = $ev;
        }

        $stages = is_array($g['stages'] ?? null) ? array_reverse($g['stages']) : [];
        $commentary = [];
        foreach ($stages as $s) {
            if (! is_array($s) || ! isset($s['id'])) {
                continue;
            }
            $evs = $evByStage[(int) $s['id']] ?? [];
            if ($evs === []) {
                continue;
            }
            $commentary[] = [
                'name' => $s['name'] ?? '',
                'home_score' => $s['homeCompetitorScore'] ?? null,
                'away_score' => $s['awayCompetitorScore'] ?? null,
                'events' => array_reverse($evs),
            ];
        }

        return $commentary;
    }

    private function topPerfPlayer(?array $p): ?array
    {
        if ($p === null) {
            return null;
        }
        $id = $p['athleteId'] ?? $p['id'] ?? null;
        if ($id === null) {
            return null;
        }
        $stats = [];
        foreach ((is_array($p['stats'] ?? null) ? $p['stats'] : []) as $s) {
            if (is_array($s) && ! empty($s['name'])) {
                $stats[] = ['name' => (string) $s['name'], 'value' => (string) ($s['value'] ?? '')];
            }
        }

        return [
            'id' => (int) $id,
            'name' => ($p['shortName'] ?? null) ?: ($p['name'] ?? null),
            'photo' => $this->athletePhoto((int) $id, $p['imageVersion'] ?? null),
            'position' => $p['positionName'] ?? null,
            'stats' => $stats,
        ];
    }

    // ─── معلومات البطولة — `competitions/?competitions={id}` (appTypeId=5، نفس نمط اللاعب/الإحصاءات) ──

    private function loadCompetitionMeta(int $competitionId): ?array
    {
        try {
            $res = Http::acceptJson()
                ->timeout((int) config('sport.http_timeout', 8))
                ->get($this->url('competitions/'), ['appTypeId' => 5, 'langId' => 27, 'timezoneName' => 'Asia/Amman', 'userCountryId' => 6, 'competitions' => $competitionId]);

            if (! $res->successful()) {
                return null;
            }
            $json = $res->json();
            $comps = is_array($json['competitions'] ?? null) ? $json['competitions'] : [];
            $comp = null;
            foreach ($comps as $c) {
                if (is_array($c) && ($c['id'] ?? null) === $competitionId) {
                    $comp = $c;
                    break;
                }
            }
            $comp ??= $comps[0] ?? null;
            if (! is_array($comp)) {
                return null;
            }
            $country = null;
            foreach ((is_array($json['countries'] ?? null) ? $json['countries'] : []) as $c) {
                if (is_array($c) && ($c['id'] ?? null) === ($comp['countryId'] ?? null)) {
                    $country = $c['name'] ?? null;
                    break;
                }
            }

            return [
                'id' => (int) $comp['id'],
                'name' => (string) $comp['name'],
                'logo' => $this->competitionLogo((int) $comp['id'], $comp['countryId'] ?? null, $comp['imageVersion'] ?? null),
                'country' => $country,
                'has_stats' => (bool) ($comp['hasStats'] ?? false),
                'has_history' => (bool) ($comp['hasHistory'] ?? false),
                'has_brackets' => (bool) ($comp['hasBrackets'] ?? false),
                'has_standings' => (bool) ($comp['hasStandings'] ?? false),
            ];
        } catch (Throwable $e) {
            $this->logFailure('competition_meta', ['competitionId' => $competitionId], $e);

            return null;
        }
    }

    // ─── قائمة مباريات البطولة (الشريط الجانبي) — fixtures + results، متوازيان، ثم تجميع/تقسيم بالتاريخ ──

    private function loadCompetitionMatchList(int $competitionId): array
    {
        try {
            $responses = Http::pool(function (Pool $pool) use ($competitionId): array {
                return [
                    'fixtures' => $this->pooled($pool, 'fixtures')
                        ->get($this->url('games/fixtures/'), $this->commonParams() + ['competitions' => $competitionId]),
                    'results' => $this->pooled($pool, 'results')
                        ->get($this->url('games/results/'), $this->commonParams() + ['competitions' => $competitionId]),
                ];
            });
        } catch (Throwable $e) {
            $this->logFailure('competition_match_list_pool', ['competitionId' => $competitionId], $e);

            return $this->emptyMatchList();
        }

        $fx = $this->parseGameList($responses['fixtures'] ?? null, $competitionId, 'fixtures');
        $rs = $this->parseGameList($responses['results'] ?? null, $competitionId, 'results');

        $today = Carbon::now('Asia/Amman')->toDateString();
        $ymd = fn (?string $iso): string => $iso !== null ? substr($iso, 0, 10) : '';

        $todayGames = array_filter([...$rs, ...$fx], fn ($g) => $ymd($g['start_time']) === $today);
        $upcoming = array_filter($fx, fn ($g) => $ymd($g['start_time']) > $today);
        $recent = array_filter($rs, fn ($g) => $ymd($g['start_time']) < $today);

        usort($todayGames, fn ($a, $b) => ($a['start_time'] ?? '') <=> ($b['start_time'] ?? ''));
        usort($upcoming, fn ($a, $b) => ($a['start_time'] ?? '') <=> ($b['start_time'] ?? ''));
        usort($recent, fn ($a, $b) => ($b['start_time'] ?? '') <=> ($a['start_time'] ?? ''));
        $fxSorted = $fx;
        $rsSorted = $rs;
        usort($fxSorted, fn ($a, $b) => ($a['start_time'] ?? '') <=> ($b['start_time'] ?? ''));
        usort($rsSorted, fn ($a, $b) => ($b['start_time'] ?? '') <=> ($a['start_time'] ?? ''));

        return [
            'today' => $this->groupMatches(array_values($todayGames)),
            'upcoming' => $this->groupMatches(array_values($upcoming)),
            'recent' => $this->groupMatches(array_values($recent)),
            'fixtures' => $this->groupMatches($fxSorted),
            'results' => $this->groupMatches($rsSorted),
        ];
    }

    private function parseGameList(Response|ConnectionException|null $res, int $competitionId, string $stage): array
    {
        if (! $res instanceof Response) {
            $this->logPoolMiss('competition_match_list', ['competitionId' => $competitionId, 'stage' => $stage], $res);

            return [];
        }
        try {
            if (! $res->successful()) {
                if ($res->status() !== 204) {
                    $this->logFailure('competition_match_list', ['competitionId' => $competitionId, 'stage' => $stage], null, "HTTP {$res->status()}");
                }

                return [];
            }
            $json = $res->json();
            $games = is_array($json['games'] ?? null) ? $json['games'] : [];
            $out = [];
            foreach ($games as $g) {
                if (! is_array($g) || ($g['competitionId'] ?? null) !== $competitionId) {
                    continue;
                }
                $round = null;
                if (isset($g['roundNum'])) {
                    $round = (($g['roundName'] ?? null) ?: 'الجولة').' '.$g['roundNum'];
                } elseif (! empty($g['roundName'])) {
                    $round = $g['roundName'];
                }
                $out[] = [
                    'group_name' => $g['groupName'] ?? null,
                    'round' => $round,
                    ...$this->gameToMatch($g),
                ];
            }

            return $out;
        } catch (Throwable $e) {
            $this->logFailure('competition_match_list', ['competitionId' => $competitionId, 'stage' => $stage], $e);

            return [];
        }
    }

    /** @return array<int,array{label:string,date:?string,matches:array}> */
    private function groupMatches(array $games): array
    {
        $groups = [];
        $order = [];
        foreach ($games as $g) {
            $round = $g['round'] ?? '';
            $label = trim(implode(' - ', array_filter([$g['group_name'] ?? null, $round], fn ($v) => $v !== null && $v !== '')));
            if ($label === '') {
                $label = $round ?: ($g['group_name'] ?? '—');
            }
            if (! isset($groups[$label])) {
                $groups[$label] = ['label' => $label, 'date' => $g['start_time'] ?? null, 'matches' => []];
                $order[] = $label;
            }
            $groups[$label]['matches'][] = [
                'id' => $g['id'],
                'kind' => $g['kind'],
                'status_text' => $g['status_text'],
                'minute' => $g['minute'],
                'start_time' => $g['start_time'],
                'home' => $g['home'],
                'away' => $g['away'],
            ];
        }

        return array_map(fn ($label) => $groups[$label], $order);
    }

    private function gameToMatch(array $g): array
    {
        $home = $this->side($g['homeCompetitor'] ?? null);
        $away = $this->side($g['awayCompetitor'] ?? null);
        $kind = $this->classify($g['statusGroup'] ?? null, $home, $away);
        $minute = null;
        if ($kind === 'live') {
            $gameTime = $g['gameTime'] ?? null;
            $minute = $g['gameTimeDisplay'] ?: (is_numeric($gameTime) && $gameTime > 0 ? floor((float) $gameTime).'\'' : null);
        }

        return [
            'id' => (int) $g['id'],
            'kind' => $kind,
            'status_text' => $g['statusText'] ?? null,
            'minute' => $minute,
            'start_time' => $g['startTime'] ?? null,
            'home' => $home,
            'away' => $away,
        ];
    }

    private function emptyMatchList(): array
    {
        return ['today' => [], 'upcoming' => [], 'recent' => [], 'fixtures' => [], 'results' => []];
    }

    // ─── أدوات مشتركة داخل هالخدمة ──────────────────────────────────────

    private function side(?array $c, int $logoSize = 64): array
    {
        if ($c === null) {
            return ['name' => '', 'score' => null, 'color' => null, 'logo' => null];
        }
        $score = $c['score'] ?? null;

        return [
            'name' => (string) ($c['name'] ?? ''),
            'score' => is_numeric($score) && (float) $score >= 0 ? (int) $score : null,
            'color' => $c['color'] ?? null,
            'logo' => isset($c['id']) ? $this->img('Competitors', (int) $c['id'], $c['imageVersion'] ?? null, $logoSize) : null,
        ];
    }

    private function classify(mixed $statusGroup, array $home, array $away): string
    {
        if ($statusGroup === 3) {
            return 'live';
        }
        if ($home['score'] !== null && $away['score'] !== null) {
            return 'finished';
        }

        return 'upcoming';
    }

    private function eventKind(mixed $id): ?string
    {
        return match ($id) {
            1 => 'goal',
            2 => 'yellow',
            3 => 'red',
            1000 => 'sub',
            default => null,
        };
    }

    private function commentaryType(mixed $id): string
    {
        return match ($id) {
            1 => 'goal',
            2 => 'yellow',
            3 => 'red',
            1000 => 'sub',
            12 => 'woodwork',
            default => 'other',
        };
    }

    private function eventMinute(array $e): string
    {
        $base = $e['gameTimeDisplay'] ?? ($e['gameTime'] ?? null);
        $base = $base !== null ? (string) (is_float($base) ? (int) floor($base) : $base) : '';
        $added = $e['addedTime'] ?? null;

        return $added ? "{$base}+{$added}" : $base;
    }

    protected function commonParams(): array
    {
        parse_str((string) config('sport.api_common'), $parsed);

        return $parsed;
    }

    private function img(string $kind, int $id, mixed $version, int $size = 64): ?string
    {
        if ($version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_%d,h_%d,c_limit,q_auto:eco,dpr_2,d_%s:default1.png/v%d/%s/%d',
            $size,
            $size,
            $kind,
            (int) $version,
            $kind,
            $id,
        );
    }

    private function competitionLogo(int $id, mixed $countryId, mixed $version): ?string
    {
        if ($version === null) {
            return null;
        }
        $def = $countryId !== null ? "Countries:Round:{$countryId}" : 'Competitions:default1';

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_48,h_48,c_limit,q_auto:eco,dpr_2,d_%s.png/v%d/Competitions/%d',
            $def,
            (int) $version,
            $id,
        );
    }

    private function athletePhoto(int $athleteId, mixed $version): ?string
    {
        if ($version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_62,h_62,c_limit,q_auto:eco,dpr_2,d_Athletes:default.png,r_max,c_thumb,g_face,z_0.65/v%d/Athletes/%d',
            (int) $version,
            $athleteId,
        );
    }

    private function competitorLogoSimple(int $id): string
    {
        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_24,h_24,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/Competitors/%d',
            $id,
        );
    }
}
