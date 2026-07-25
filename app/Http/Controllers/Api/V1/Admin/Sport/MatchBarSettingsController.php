<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin\Sport;

use App\Actions\Admin\Sport\ShowCompetitionBarSettingsAction;
use App\Actions\Admin\Sport\UpdateCompetitionBarSettingsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Sport\UpdateBarSettingsRequest;
use App\Settings\MatchBarSettings;
use Illuminate\Http\JsonResponse;

class MatchBarSettingsController extends Controller
{
    public function show(ShowCompetitionBarSettingsAction $action): JsonResponse
    {
        return $action->handle(app(MatchBarSettings::class)->enabled, 'show_in_match_bar');
    }

    public function update(UpdateBarSettingsRequest $request, UpdateCompetitionBarSettingsAction $action): JsonResponse
    {
        return $action->handle(
            settings: app(MatchBarSettings::class),
            enabled: (bool) $request->validated()['enabled'],
            auditGroup: 'match_bar',
            cacheTag: 'match-bar',
        );
    }
}
