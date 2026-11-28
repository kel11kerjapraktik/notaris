<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Support\DatabaseSearch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public const STEP = 15;

    public const MAX_LIMIT = 150;

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $role = (string) $request->query('role', 'semua');
        if (! in_array($role, ['semua', 'notaris', 'staf'], true)) {
            $role = 'semua';
        }

        $requestedLimit = (int) $request->query('limit', self::STEP);
        $limit = max(self::STEP, min($requestedLimit, self::MAX_LIMIT));

        $rows = ActivityLog::query()
            ->select(['id', 'user_name', 'user_role', 'action', 'description', 'created_at'])
            ->when($role !== 'semua', fn ($q) => $q->where('user_role', $role))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    DatabaseSearch::orWhereLikeAny($q, ['action', 'description', 'user_name'], $search);
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $rows->count() > $limit;
        $logs = $rows->take($limit)->values();

        return Inertia::render('activity-logs/index', [
            'logs' => $logs,
            'limit' => $limit,
            'step' => self::STEP,
            'maxLimit' => self::MAX_LIMIT,
            'hasMore' => $hasMore,
            'filters' => [
                'search' => $search,
                'role' => $role,
            ],
        ]);
    }
}
