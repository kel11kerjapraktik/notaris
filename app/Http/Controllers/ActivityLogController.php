<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(): Response
    {
        $logs = ActivityLog::query()
            ->orderByDesc('created_at')
            ->limit(300)
            ->get();

        return Inertia::render('activity-logs/index', [
            'logs' => $logs,
        ]);
    }
}
