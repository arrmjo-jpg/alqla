<?php

declare(strict_types=1);

use App\Support\Cache\CacheKeys;
use App\Support\Cache\SportCacheTags;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/** استجابة `athletes/?athletes={id}` مُصغَّرة (ملف اللاعب). */
function playerProfileJson(int $id): array
{
    return [
        'athletes' => [[
            'id' => $id,
            'name' => 'Hugo Soria',
            'age' => 36,
            'position' => ['name' => 'الوسط'],
            'nationalityName' => 'أوروغواي',
            'clubId' => 881,
            'nationalTeamId' => null,
            'imageVersion' => 3,
        ]],
        'competitors' => [
            ['id' => 881, 'name' => 'Gimnasia Jujuy', 'imageVersion' => 2],
        ],
        'competitions' => [
            ['id' => 419, 'name' => 'الدوري الأرجنتيني', 'countryId' => 10, 'imageVersion' => 4],
        ],
    ];
}

/** استجابة `athletes/career` لموسم فيه بيانات. */
function careerSeasonJson(): array
{
    return [
        'stats' => [
            'categories' => [['name' => 'نادٍ']],
            'tables' => [[
                'columns' => [['num' => 1, 'shortName' => 'م'], ['num' => 2, 'shortName' => 'هـ']],
                'rows' => [[
                    'entityId' => 419,
                    'title' => 'الدوري الأرجنتيني',
                    'values' => [['columnNum' => 1, 'value' => '22'], ['columnNum' => 2, 'value' => '2']],
                ]],
            ]],
        ],
        'competitions' => [['id' => 419, 'name' => 'الدوري الأرجنتيني']],
    ];
}

/** استجابة `athletes/games/` مُصغَّرة (آخر المباريات). */
function recentGamesJson(): array
{
    return ['games' => [[
        'game' => [
            'id' => 4649912,
            'competitionDisplayName' => 'الدوري الأرجنتيني',
            'startTime' => '2026-03-16T20:00:00+03:00',
            'homeCompetitor' => ['id' => 881, 'name' => 'Gimnasia Jujuy', 'score' => 2, 'imageVersion' => 2],
            'awayCompetitor' => ['id' => 999, 'name' => 'خصم', 'score' => 1, 'imageVersion' => 1],
        ],
        'athleteStats' => [
            ['type' => 229, 'value' => '90'],
            ['type' => 226, 'value' => '1'],
            ['value' => '7.5', 'bgColor' => '#2ecc71'],
        ],
    ]]];
}

/** استجابة `athletes/trophies/stats` (بطولة فيها ألقاب). */
function trophyJson(): array
{
    return [
        'stats' => [
            'columns' => [['num' => 1, 'name' => 'المواسم']],
            'rows' => [['entityId' => 881, 'title' => 'Gimnasia Jujuy', 'secondaryTitle' => '2022/2023', 'values' => [['columnNum' => 1, 'value' => '1']]]],
        ],
        'competitors' => [['id' => 881, 'name' => 'Gimnasia Jujuy', 'imageVersion' => 2]],
    ];
}

it('aggregates profile+career+trophies+recent games into one response and one cache write', function (): void {
    Http::fake([
        '*athletes/career*' => Http::response(careerSeasonJson()),
        '*athletes/games*' => Http::response(recentGamesJson()),
        '*trophies/stats*' => Http::response(trophyJson()),
        '*web/athletes/?*' => Http::response(playerProfileJson(74901)),
        '*' => Http::response(['unexpected' => true], 599), // أي URL غير متوقَّع — يفشل بوضوح بدل نداء حقيقي صامت.
    ]);

    $res = $this->getJson('/api/v1/sports/players/74901')->assertOk();

    $res->assertJsonPath('data.id', 74901)
        ->assertJsonPath('data.name', 'Hugo Soria')
        ->assertJsonPath('data.club.name', 'Gimnasia Jujuy')
        ->assertJsonPath('data.partial', false);

    expect($res->json('data.career'))->not->toBeEmpty()
        ->and($res->json('data.trophies'))->not->toBeEmpty()
        ->and($res->json('data.recent_games'))->toHaveCount(1);

    // ملف واحد يجمّع كل شيء ⇒ سطر واحد بالكاش، لا مفتاح لكل موسم/بطولة.
    expect(Cache::tags(SportCacheTags::playerTags(74901))->has(CacheKeys::sportPlayerAggregate(74901)))->toBeTrue();
});

it('reuses the same cache entry for a second request — no second wave of 365Scores calls', function (): void {
    Http::fake([
        '*athletes/career*' => Http::response(careerSeasonJson()),
        '*athletes/games*' => Http::response(recentGamesJson()),
        '*trophies/stats*' => Http::response(trophyJson()),
        '*web/athletes/?*' => Http::response(playerProfileJson(74901)),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $this->getJson('/api/v1/sports/players/74901')->assertOk();
    $firstWaveCount = count(Http::recorded());

    $this->getJson('/api/v1/sports/players/74901')->assertOk();

    // الطلب الثاني لم يُطلق ولا نداء 365Scores إضافي (قراءة من الكاش مباشرة).
    expect(count(Http::recorded()))->toBe($firstWaveCount);
});

it('returns partial=true and keeps the other seasons when one season request fails, instead of failing the whole response', function (): void {
    $year = (int) date('Y');
    Http::fake([
        "*seasonKey={$year}*" => Http::response(null, 500),
        '*athletes/career*' => Http::response(careerSeasonJson()),
        '*athletes/games*' => Http::response(recentGamesJson()),
        '*trophies/stats*' => Http::response(trophyJson()),
        '*web/athletes/?*' => Http::response(playerProfileJson(74901)),
        '*' => Http::response(['unexpected' => true], 599),
    ]);

    $res = $this->getJson('/api/v1/sports/players/74901')->assertOk();

    $res->assertJsonPath('data.found', true)
        ->assertJsonPath('data.partial', true);
    expect($res->json('data.career'))->not->toBeEmpty();
});

it('returns 404 when the player profile itself cannot be resolved — does not fire the other 30 requests', function (): void {
    Http::fake([
        '*web/athletes/?*' => Http::response(null, 404),
        '*' => Http::response(null, 500), // أي استدعاء آخر = خطأ فادح بالاختبار (يجب ألا يُستدعى إطلاقاً).
    ]);

    $this->getJson('/api/v1/sports/players/999999999')->assertNotFound();

    Http::assertSentCount(1);
});

it('rejects a non-positive player id before any network call', function (): void {
    Http::fake(['*' => Http::response(null, 500)]);

    $this->getJson('/api/v1/sports/players/0')->assertStatus(422);

    Http::assertNothingSent();
});
