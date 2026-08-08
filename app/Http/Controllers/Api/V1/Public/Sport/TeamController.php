<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public\Sport;

use App\Actions\Public\Sport\ShowTeamAggregateAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TeamController extends Controller
{
    // $id يصل نصّاً دائماً من الراوتر (route param) — التحويل هنا صريح، لا اعتماد على تحويل ضمنيّ
    // من Laravel (غير مضمون مع strict_types=1). الصحّة (رقم موجب) تُفحَص داخل الـ Action.
    public function show(string $id, ShowTeamAggregateAction $action): JsonResponse
    {
        return $action->handle((int) $id);
    }
}
