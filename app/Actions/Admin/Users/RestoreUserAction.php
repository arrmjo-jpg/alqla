<?php

declare(strict_types=1);

namespace App\Actions\Admin\Users;

use App\Http\Resources\Admin\Users\UserResource;
use App\Models\User;
use App\Support\Frontend\FrontendRevalidate;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

class RestoreUserAction
{
    public function handle(User $target): JsonResponse
    {
        if (! $target->trashed()) {
            return ApiResponse::error(__('user.not_deleted'), [], 422);
        }

        $target->restore();

        // انظر UpdateUserAction — بروفايل الكاتب العامّ يجب أن يظهر فوراً بعد الاستعادة.
        FrontendRevalidate::tags(['writers', "writer:{$target->id}"]);

        return ApiResponse::success(
            __('user.restored'),
            new UserResource($target->load('roles'))
        );
    }
}
