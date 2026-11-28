<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\DeedCase;
use App\Services\NotarisStatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly NotarisStatsService $stats,
    ) {}

    public function __invoke(Request $request): Response
    {
        $isNotaris = $request->user()?->isNotaris() ?? false;
        $aggregates = $this->stats->dashboardAggregates();

        $recentCases = DeedCase::query()
            ->select([
                'id',
                'nomor',
                'client_id',
                'jenis_akta',
                'is_badan_usaha',
                'current_stage',
                'is_completed',
                'draft_status',
                'biaya',
                'created_at',
            ])
            ->with(['client:id,nama,jenis', 'client.company:id,client_id,nama'])
            ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (DeedCase $case): array => [
                'id' => $case->id,
                'nomor' => $case->nomor,
                'client_name' => $case->client->displayName(),
                'jenis_akta' => $case->jenis_akta,
                'is_badan_usaha' => $case->is_badan_usaha,
                'current_stage' => $case->current_stage->value,
                'current_stage_order' => $case->current_stage->order(),
                'current_stage_label' => $case->current_stage->label(),
                'is_completed' => $case->is_completed,
                'draft_status' => $case->draft_status->value,
                'biaya' => $case->biaya,
                'terbayar' => (float) ($case->getAttribute('terbayar') ?? 0),
                'created_at' => $case->created_at?->toISOString(),
            ]);

        return Inertia::render('dashboard', [
            'stats' => $aggregates['stats'],
            'stageDistribution' => $aggregates['stageDistribution'],
            'recentCases' => $recentCases,
            'pendingSummary' => $isNotaris ? $aggregates['pendingSummary'] : null,
        ]);
    }
}
