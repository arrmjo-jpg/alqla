<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public\Sport;

use App\Actions\Public\Sport\ShowMatchAggregateAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    // $id يصل نصّاً دائماً من الراوتر — التحويل صريح (نفس نمط PlayerController، لا اعتماد على
    // تحويل ضمنيّ من Laravel مع strict_types=1).
    public function show(string $id, Request $request, ShowMatchAggregateAction $action): JsonResponse
    {
        $profile = (string) $request->query('profile', 'base');

        return $action->handle((int) $id, $profile);
    }
}
