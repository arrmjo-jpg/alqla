<?php

declare(strict_types=1);

use App\Support\Cache\CacheKeys;
use App\Support\Cache\SportCacheTags;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/** استجابة `competitors/?competitors={id}` مُصغَّرة (ملف الفريق). */
function teamProfileJson(int $id): array
{
    return [
        'competitors' => [[
            'id' => $id,
            'name' => 'Gimnasia Jujuy',
            'countryId' => 10,
            'imageVersion' => 2,
            'mainCompetitionId' => 419,
        ]],
        'competitions' => [
            ['id' => 419, 'name' => 'الدوري الأرجنتيني', 'countryId' => 10, 'imageVersion' => 4],
        ],
        'countries' => [['id' => 10, 'name' => 'الأرجنتين']],
    ];
}

/** استجابة `standings/?competitions={id}` مُصغَّرة (دوري فيه ترتيب). */
function standingsJson(): array
{
    return [
        'standings' => [[
            'rows' => [[
                'competitor' => ['id' => 881, 'name' => 'Gimnasia Jujuy', 'imageVersion' => 2],
                'gamePlayed' => 10,
                'gamesWon' => 6,
                'gamesLost' => 2,
                'gamesEven' => 2,
                'for' => 18,
                'against' => 9,
                'ratio' => 9,
                'points' => 20,
                'position' => 1,
                'isWinner' => false,
                'destinationNum' => 1,
                'detailedRecentForm' => [['id' => 555, 'outcome' => 1]],
            ]],
            'destinations' => [['num' => 1, 'name' => 'دوري الأبطال', 'color' => '#00ff00']],
            'groups' => [],
        ]],
        'competitions' => [['id' => 419, 'name' => 'الدوري الأرجنتيني', 'countryId' => 10, 'imageVersion' => 4]],
    ];
}

function fakeTeamEndpoints(int $teamId): void
{
    Http::fake([
        '*web/competitors/?*' => Http::response(teamProfileJson($teamId)),
        '*web/standings/?*' => Http::response(standingsJson()),
        '*' => Http::response(['unexpected' => true], 599),
    ]);
}

it('aggregates team profile + main-competition standings into one response and one cache write', function (): void {
    fakeTeamEndpoints(881);

    $res = $this->getJson('/api/v1/sports/teams/881')->assertOk();

    $res->assertJsonPath('data.id', 881)
        ->assertJsonPath('data.name', 'Gimnasia Jujuy')
        ->assertJsonPath('data.partial', false)
        ->assertJsonPath('data.main_competition_id', 419)
        ->assertJsonPath('data.standings.competition.name', 'الدوري الأرجنتيني')
        ->assertJsonPath('data.standings.rows.0.team.name', 'Gimnasia Jujuy')
        ->assertJsonPath('data.standings.rows.0.points', 20);

    expect($res->json('data.competitions'))->toHaveCount(1);

    expect(Cache::tags(SportCacheTags::teamTags(881))->has(CacheKeys::sportTeamAggregate(881)))->toBeTrue();
});

it('reuses the same cache entry for a second request — no second wave of 365Scores calls', function (): void {
    fakeTeamEndpoints(882);

    $this->getJson('/api/v1/sports/teams/882')->assertOk();
    $firstWaveCount = count(Http::recorded());

    $this->getJson('/api/v1/sports/teams/882')->assertOk();

    expect(count(Http::recorded()))->toBe($firstWaveCount);
});

it('returns 404 when the team itself cannot be resolved — does not fire the standings request', function (): void {
    Http::fake([
        '*web/competitors/?*' => Http::response(null, 404),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $this->getJson('/api/v1/sports/teams/999999999')->assertNotFound();

    Http::assertSentCount(1);
});

it('returns partial=true when standings fails, but keeps the team profile', function (): void {
    Http::fake([
        '*web/competitors/?*' => Http::response(teamProfileJson(883)),
        '*web/standings/?*' => Http::response(null, 500),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $res = $this->getJson('/api/v1/sports/teams/883')->assertOk();

    $res->assertJsonPath('data.found', true)
        ->assertJsonPath('data.partial', true)
        ->assertJsonPath('data.id', 883)
        ->assertJsonPath('data.standings', null);
});

it('treats a ConnectionException while loading the team as a 404, not a crash', function (): void {
    Http::fake(function () {
        throw new ConnectionException('simulated network drop');
    });

    $res = $this->getJson('/api/v1/sports/teams/884');

    $res->assertStatus(404);
});

it('keeps found=true with partial=true when only standings hits a ConnectionException', function (): void {
    Http::fake([
        '*web/competitors/?*' => Http::response(teamProfileJson(885)),
        '*web/standings/?*' => fn () => throw new ConnectionException('simulated drop'),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $res = $this->getJson('/api/v1/sports/teams/885')->assertOk();

    $res->assertJsonPath('data.found', true)
        ->assertJsonPath('data.partial', true)
        ->assertJsonPath('data.standings', null);
});

it('rejects a non-positive team id before any network call', function (): void {
    Http::fake(['*' => Http::response(null, 500)]);

    $this->getJson('/api/v1/sports/teams/0')->assertStatus(422);

    Http::assertNothingSent();
});
