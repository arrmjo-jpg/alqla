<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Actions\Public\Sport\BuildCompetitionBarAction;
use App\Http\Controllers\Controller;
use App\Settings\MatchBarSettings;
use Illuminate\Http\JsonResponse;

class MatchBarController extends Controller
{
    public function show(BuildCompetitionBarAction $action): JsonResponse
    {
        return $action->handle(
            enabled: app(MatchBarSettings::class)->enabled,
            selectedColumn: 'show_in_match_bar',
            sortColumn: 'match_bar_sort_order',
        );
    }
}
