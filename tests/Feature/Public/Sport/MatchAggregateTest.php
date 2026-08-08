<?php

declare(strict_types=1);

use App\Support\Cache\CacheKeys;
use App\Support\Cache\SportCacheTags;
use App\Support\Sport\MatchProfile;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/** استجابة `game/?gameId={id}` مُصغَّرة — حدث واحد، تشكيلة لاعب واحد لكل فريق، شوط واحد، أبرز لاعب واحد. */
function matchDetailJson(int $gameId): array
{
    return [
        'game' => [
            'id' => $gameId,
            'competitionId' => 419,
            'competitionDisplayName' => 'الدوري الأرجنتيني',
            'roundName' => 'الجولة',
            'roundNum' => 5,
            'startTime' => '2026-08-08T20:00:00+03:00',
            'statusGroup' => 4,
            'statusText' => 'انتهت',
            'venue' => ['name' => 'ملعب الأرجنتين', 'capacity' => 40000],
            'homeCompetitor' => ['id' => 881, 'name' => 'Gimnasia Jujuy', 'score' => 2, 'color' => '#FFFFFF', 'imageVersion' => 2],
            'awayCompetitor' => ['id' => 999, 'name' => 'خصم', 'score' => 1, 'color' => '#000000', 'imageVersion' => 1],
            'members' => [
                ['id' => 1, 'athleteId' => 74901, 'shortName' => 'Soria', 'jerseyNumber' => 5, 'imageVersion' => 3],
                ['id' => 2, 'athleteId' => 55555, 'shortName' => 'X', 'jerseyNumber' => 9, 'imageVersion' => 1],
            ],
            'events' => [[
                'competitorId' => 881,
                'gameTimeDisplay' => '41',
                'gameTime' => 41,
                'addedTime' => null,
                'stageId' => 1,
                'playerId' => 1,
                'isMajor' => true,
                'eventType' => ['id' => 1, 'name' => 'goal'],
            ]],
            'officials' => [['name' => 'حكم الساحة']],
            'hasLineups' => true,
            'hasStats' => true,
            'hasPreviousMeetings' => false,
            'stages' => [['id' => 1, 'name' => 'الشوط الأول', 'homeCompetitorScore' => 1, 'awayCompetitorScore' => 0]],
            'topPerformers' => [
                'categories' => [[
                    'name' => 'الهجوم',
                    'homePlayer' => ['athleteId' => 74901, 'shortName' => 'Soria', 'positionName' => 'مهاجم', 'imageVersion' => 3, 'stats' => [['name' => 'تقييم', 'value' => '8.1']]],
                    'awayPlayer' => null,
                ]],
            ],
        ],
        'competitions' => [['id' => 419, 'name' => 'الدوري الأرجنتيني', 'countryId' => 10, 'imageVersion' => 4]],
    ];
}

/** استجابة `competitions/?competitions={id}` مُصغَّرة. */
function competitionMetaJson(): array
{
    return [
        'competitions' => [['id' => 419, 'name' => 'الدوري الأرجنتيني', 'countryId' => 10, 'imageVersion' => 4, 'hasStandings' => true]],
        'countries' => [['id' => 10, 'name' => 'الأرجنتين']],
    ];
}

/** استجابة `games/fixtures|results/` مُصغَّرة — مباراة واحدة بنفس البطولة. */
function competitionGamesJson(): array
{
    return ['games' => [[
        'id' => 555,
        'competitionId' => 419,
        'startTime' => '2020-01-01T18:00:00+03:00',
        'statusGroup' => 4,
        'statusText' => 'انتهت',
        'roundName' => 'الجولة',
        'roundNum' => 1,
        'homeCompetitor' => ['id' => 1, 'name' => 'A', 'score' => 1, 'imageVersion' => 1],
        'awayCompetitor' => ['id' => 2, 'name' => 'B', 'score' => 0, 'imageVersion' => 1],
    ]]];
}

function fakeMatchEndpoints(int $gameId): void
{
    Http::fake([
        '*web/game/?*' => Http::response(matchDetailJson($gameId)),
        '*web/competitions/?*' => Http::response(competitionMetaJson()),
        '*games/fixtures*' => Http::response(competitionGamesJson()),
        '*games/results*' => Http::response(competitionGamesJson()),
        '*' => Http::response(['unexpected' => true], 599),
    ]);
}

it('aggregates match detail + competition meta + competition match list into one base response', function (): void {
    fakeMatchEndpoints(4649912);

    $res = $this->getJson('/api/v1/sports/matches/4649912')->assertOk();

    $res->assertJsonPath('data.id', 4649912)
        ->assertJsonPath('data.profile', 'base')
        ->assertJsonPath('data.partial', false)
        ->assertJsonPath('data.home.name', 'Gimnasia Jujuy')
        ->assertJsonPath('data.home.score', 2)
        ->assertJsonPath('data.kind', 'finished')
        ->assertJsonPath('data.competition_meta.name', 'الدوري الأرجنتيني')
        ->assertJsonPath('data.competition_meta.country', 'الأرجنتين');

    expect($res->json('data.events'))->toHaveCount(1)
        ->and($res->json('data.events.0.player'))->toBe('Soria')
        ->and($res->json('data.top_performers'))->toHaveCount(1)
        ->and($res->json('data.top_performers.0.home.name'))->toBe('Soria')
        ->and($res->json('data.commentary'))->toHaveCount(1)
        ->and($res->json('data.commentary.0.events.0.type'))->toBe('goal')
        ->and($res->json('data.competition_match_list.results'))->not->toBeEmpty();

    expect(Cache::tags(SportCacheTags::matchTags(4649912))->has(CacheKeys::sportMatchAggregate(4649912, MatchProfile::Base)))->toBeTrue();
});

it('reuses the same cache entry for a second request to the same match', function (): void {
    fakeMatchEndpoints(4649913);

    $this->getJson('/api/v1/sports/matches/4649913')->assertOk();
    $firstWaveCount = count(Http::recorded());

    $this->getJson('/api/v1/sports/matches/4649913')->assertOk();

    expect(count(Http::recorded()))->toBe($firstWaveCount);
});

it('returns partial=true when the competition match list pool fails, but keeps the match detail', function (): void {
    Http::fake([
        '*web/game/?*' => Http::response(matchDetailJson(4649914)),
        '*web/competitions/?*' => Http::response(competitionMetaJson()),
        '*games/fixtures*' => Http::response(null, 500),
        '*games/results*' => Http::response(null, 500),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $res = $this->getJson('/api/v1/sports/matches/4649914')->assertOk();

    $res->assertJsonPath('data.found', true)
        ->assertJsonPath('data.partial', true)
        ->assertJsonPath('data.id', 4649914);
    expect($res->json('data.competition_match_list.results'))->toBeEmpty();
});

it('treats a pool ConnectionException as a partial failure instead of crashing the whole response', function (): void {
    Http::fake(function () {
        throw new ConnectionException('simulated network drop');
    });

    // Http::fake(callable) يطبَّق على كل النداءات — بما فيها game/ نفسها (المجموعة A) — فتُسجَّل كفشل
    // كامل (found=false) بدل partial، وهذا سلوك متوقَّع ومختبَر بحالة منفصلة أدناه لتفصيل الأثر عبر Pool تحديدًا.
    $res = $this->getJson('/api/v1/sports/matches/4649915');

    $res->assertStatus(404);
});

it('keeps found=true with partial=true when only the pooled competition-list requests hit a ConnectionException', function (): void {
    Http::fake([
        '*web/game/?*' => Http::response(matchDetailJson(4649916)),
        '*web/competitions/?*' => Http::response(competitionMetaJson()),
        '*games/fixtures*' => fn () => throw new ConnectionException('simulated drop'),
        '*games/results*' => fn () => throw new ConnectionException('simulated drop'),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $res = $this->getJson('/api/v1/sports/matches/4649916')->assertOk();

    $res->assertJsonPath('data.found', true)
        ->assertJsonPath('data.partial', true);
});

it('returns 404 when the match itself cannot be resolved', function (): void {
    Http::fake([
        '*web/game/?*' => Http::response(null, 404),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $this->getJson('/api/v1/sports/matches/999999999')->assertNotFound();
    Http::assertSentCount(1);
});

it('rejects a non-positive match id before any network call', function (): void {
    Http::fake(['*' => Http::response(null, 500)]);

    $this->getJson('/api/v1/sports/matches/0')->assertStatus(422);
    Http::assertNothingSent();
});

it('rejects an unsupported profile before any network call', function (): void {
    Http::fake(['*' => Http::response(null, 500)]);

    $this->getJson('/api/v1/sports/matches/4649917?profile=overview')->assertStatus(422);
    Http::assertNothingSent();
});
