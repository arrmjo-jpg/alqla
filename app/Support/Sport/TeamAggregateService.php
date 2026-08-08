<?php

declare(strict_types=1);

namespace App\Support\Sport;

use Throwable;

/**
 * تجميع بيانات فريق 365Scores — أبسط من Player وMatch لأنها تعكس طبيعة الصفحة فعلياً: لا تبويبات،
 * لا Lazy Loading، كل ما يُعرض يُحمَّل بأول Render (راجع frontend/src/app/(site)/sport/team/[id]/page.tsx).
 * لذلك لا Profiles هنا. نقطة الدخول الوحيدة aggregate() موحَّدة الشكل مع MatchAggregateService رغم غياب
 * Profiles اليوم — إن احتجنا لاحقاً (squad/transfers/fixtures) لن نضطر لتغيير شكل الـAPI.
 *
 * الترتيب (standings) ليس اختياراً مستقلاً كـ`competitionMeta`/`competitionMatchList` بمباراة (تلك
 * مفتاحها الحقيقي competitionId مستقل تماماً عن المباراة، لذا بقيت Legacy) — هنا Standings جزء من
 * "هوية الصفحة": Team → mainCompetitionId → Standings، تسلسل حقيقي لا موازٍ، فمنطقيّ ضمّه بتجميع الفريق.
 */
final class TeamAggregateService extends SportAggregateService
{
    /** @return array{found:bool, partial?:bool, id?:int, name?:string, logo?:?string, country?:?string,
     *     main_competition_id?:?int, competitions?:array, standings?:?array}
     */
    public function aggregate(int $teamId): array
    {
        $this->resetPartial();

        $team = $this->loadTeam($teamId);
        if ($team === null) {
            return ['found' => false];
        }

        $mainCompetitionId = $team['main_competition_id'];
        $standings = $mainCompetitionId !== null ? $this->loadStandings($mainCompetitionId) : null;

        return [
            'found' => true,
            'partial' => $this->isPartial(),
            ...$team,
            'standings' => $standings,
        ];
    }

    // ─── ملف الفريق — `competitors/?competitors={id}` (appTypeId=5، نفس نمط اللاعب) ──────────────

    private function loadTeam(int $teamId): ?array
    {
        try {
            $res = $this->get('competitors/', ['competitors' => $teamId]);
            if (! $res->successful()) {
                return null;
            }
            $json = $res->json();
            $competitors = is_array($json['competitors'] ?? null) ? $json['competitors'] : [];
            $t = null;
            foreach ($competitors as $c) {
                if (is_array($c) && ($c['id'] ?? null) === $teamId) {
                    $t = $c;
                    break;
                }
            }
            $t ??= $competitors[0] ?? null;
            if (! is_array($t)) {
                return null;
            }

            $country = null;
            foreach ((is_array($json['countries'] ?? null) ? $json['countries'] : []) as $c) {
                if (is_array($c) && ($c['id'] ?? null) === ($t['countryId'] ?? null)) {
                    $country = $c['name'] ?? null;
                    break;
                }
            }

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

            return [
                'id' => (int) $t['id'],
                'name' => (string) $t['name'],
                'logo' => $this->teamLogo((int) $t['id'], $t['imageVersion'] ?? null, 64),
                'country' => is_string($country) ? $country : null,
                'main_competition_id' => isset($t['mainCompetitionId']) ? (int) $t['mainCompetitionId'] : null,
                'competitions' => $competitions,
            ];
        } catch (Throwable $e) {
            $this->logFailure('team', ['teamId' => $teamId], $e);

            return null;
        }
    }

    // ─── ترتيب دوري الفريق الرئيس — `standings/?competitions={id}` (فارغ للكؤوس، طبيعي لا فشل) ───

    private function loadStandings(int $competitionId): ?array
    {
        try {
            $res = $this->get('standings/', ['competitions' => $competitionId]);
            if ($res->status() === 204) {
                return null; // لا ترتيب لهذه البطولة (كأس) — طبيعي، ليس فشلاً.
            }
            if (! $res->successful()) {
                $this->logFailure('standings', ['competitionId' => $competitionId], null, "HTTP {$res->status()}");

                return null;
            }
            $json = $res->json();
            $groupsData = is_array($json['standings'] ?? null) ? $json['standings'] : [];
            $group = $groupsData[0] ?? null;
            $rowsRaw = is_array($group['rows'] ?? null) ? $group['rows'] : [];
            if (! is_array($group) || $rowsRaw === []) {
                return null; // بطولة بلا ترتيب (كأس أحاديّ الإقصاء) — طبيعي، ليس فشلاً.
            }

            $comps = is_array($json['competitions'] ?? null) ? $json['competitions'] : [];
            $comp = null;
            foreach ($comps as $c) {
                if (is_array($c) && ($c['id'] ?? null) === $competitionId) {
                    $comp = $c;
                    break;
                }
            }
            $comp ??= $comps[0] ?? null;

            $zoneColor = [];
            foreach ((is_array($group['destinations'] ?? null) ? $group['destinations'] : []) as $d) {
                if (is_array($d) && ! empty($d['color']) && isset($d['num'])) {
                    $zoneColor[(int) $d['num']] = $d['color'];
                }
            }

            $rows = [];
            foreach ($rowsRaw as $i => $r) {
                if (! is_array($r) || ! is_array($r['competitor'] ?? null) || ! isset($r['competitor']['id'])) {
                    continue;
                }
                $competitor = $r['competitor'];
                $destNum = $r['destinationNum'] ?? null;
                $form = [];
                foreach (array_slice(is_array($r['detailedRecentForm'] ?? null) ? $r['detailedRecentForm'] : [], 0, 5) as $g) {
                    if (is_array($g)) {
                        $form[] = ['outcome' => $g['outcome'] ?? -1, 'game_id' => $g['id'] ?? null];
                    }
                }
                $rows[] = [
                    'rank' => $r['position'] ?? ($i + 1),
                    'is_winner' => (bool) ($r['isWinner'] ?? false),
                    'zone_color' => $destNum !== null ? ($zoneColor[(int) $destNum] ?? null) : null,
                    'group_num' => $r['groupNum'] ?? null,
                    'team' => [
                        'id' => (int) $competitor['id'],
                        'name' => (string) ($competitor['name'] ?? ''),
                        'logo' => $this->teamLogo((int) $competitor['id'], $competitor['imageVersion'] ?? null, 32),
                    ],
                    'played' => $r['gamePlayed'] ?? 0,
                    'won' => $r['gamesWon'] ?? 0,
                    'draw' => $r['gamesEven'] ?? 0,
                    'lost' => $r['gamesLost'] ?? 0,
                    'goals_for' => $r['for'] ?? 0,
                    'goals_against' => $r['against'] ?? 0,
                    'diff' => $r['ratio'] ?? 0,
                    'points' => $r['points'] ?? 0,
                    'form' => $form,
                ];
            }

            $zones = [];
            foreach ((is_array($group['destinations'] ?? null) ? $group['destinations'] : []) as $d) {
                if (is_array($d) && ! empty($d['color']) && ! empty($d['name'])) {
                    $zones[] = ['name' => (string) $d['name'], 'color' => (string) $d['color']];
                }
            }

            $groupsOut = [];
            foreach ((is_array($group['groups'] ?? null) ? $group['groups'] : []) as $g) {
                if (is_array($g) && ! empty($g['name']) && isset($g['num'])) {
                    $groupsOut[] = ['num' => (int) $g['num'], 'name' => (string) $g['name']];
                }
            }

            return [
                'competition' => [
                    'id' => is_array($comp) && isset($comp['id']) ? (int) $comp['id'] : $competitionId,
                    'name' => is_array($comp) ? (string) ($comp['name'] ?? '') : '',
                    'logo' => is_array($comp) && isset($comp['id'])
                        ? $this->competitionLogo((int) $comp['id'], $comp['countryId'] ?? null, $comp['imageVersion'] ?? null)
                        : null,
                ],
                'rows' => $rows,
                'zones' => $zones,
                'groups' => $groupsOut,
            ];
        } catch (Throwable $e) {
            $this->logFailure('standings', ['competitionId' => $competitionId], $e);

            return null;
        }
    }

    // ─── أدوات خاصة بهالخدمة (نفس صيغة الواجهة الأصليّة حرفياً، كـPlayerAggregateService) ─────────

    protected function commonParams(): array
    {
        parse_str((string) config('sport.api_common_athlete'), $parsed);

        return $parsed;
    }

    /** نفس صيغة stats.ts::teamLogo حرفياً (لا PlayerAggregateService::teamLogo — حجم ثابت مختلف هناك). */
    private function teamLogo(int $id, mixed $version, int $size = 40): ?string
    {
        if ($version === null) {
            return null;
        }

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_%d,h_%d,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v%d/Competitors/%d',
            $size,
            $size,
            (int) $version,
            $id,
        );
    }

    /** نفس صيغة stats.ts::competitionLogo حرفياً — بعكس PlayerAggregateService، لا يشترط countryId
     *  (يتراجع لصورة افتراضية عامة `Competitions:default1` بدلاً من إرجاع null). */
    private function competitionLogo(int $id, mixed $countryId, mixed $version): ?string
    {
        if ($version === null) {
            return null;
        }
        $def = $countryId !== null ? "Countries:Round:{$countryId}" : 'Competitions:default1';

        return sprintf(
            'https://imagecache.365scores.com/image/upload/f_png,w_40,h_40,c_limit,q_auto:eco,dpr_2,d_%s.png/v%d/Competitions/%d',
            $def,
            (int) $version,
            $id,
        );
    }
}
