<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ActivityLogService
{
    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(
        User $user,
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        array $properties = [],
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->role->value,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'properties' => $properties ?: null,
            'created_at' => now(),
        ]);
    }
}
