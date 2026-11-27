<?php

namespace App\Http\Controllers;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $isNotaris = $request->user()?->isNotaris() ?? false;

        $agg = DB::selectOne(
            "SELECT
                (SELECT COUNT(*) FROM clients) AS total_clients,
                (SELECT SUM(CASE WHEN jenis = 'perusahaan' THEN 1 ELSE 0 END) FROM clients) AS company_clients,
                (SELECT SUM(CASE WHEN is_completed = false THEN 1 ELSE 0 END) FROM deed_cases) AS active_cases,
                (SELECT SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) FROM deed_cases) AS completed_cases,
                (SELECT SUM(CASE WHEN draft_status = ? THEN 1 ELSE 0 END) FROM deed_cases) AS pending_drafts,
                (SELECT COALESCE(SUM(CASE WHEN status = ? THEN jumlah ELSE 0 END), 0) FROM payments) AS received_amount,
                (SELECT SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) FROM payments) AS lunas_count,
                (SELECT COALESCE(SUM(CASE WHEN status != ? THEN jumlah ELSE 0 END), 0) FROM payments) AS receivable_amount,
                (SELECT SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) FROM payments) AS unpaid_count,
                (SELECT SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) FROM payments) AS pending_payments,
                (SELECT COUNT(*) FROM documents WHERE is_verified = false AND is_rejected = false) AS pending_docs",
            [
                DraftStatus::PENDING_APPROVAL->value,
                PaymentStatus::LUNAS->value,
                PaymentStatus::LUNAS->value,
                PaymentStatus::LUNAS->value,
                PaymentStatus::LUNAS->value,
                PaymentStatus::MENUNGGU->value,
            ],
        );

        $stageCounts = DeedCase::query()
            ->where('is_completed', false)
            ->selectRaw('current_stage, count(*) as total')
            ->groupBy('current_stage')
            ->pluck('total', 'current_stage');

        $stageDistribution = array_map(fn (DeedStage $stage) => [
            'key' => $stage->value,
            'order' => $stage->order(),
            'label' => $stage->label(),
            'count' => (int) ($stageCounts[$stage->value] ?? 0),
        ], DeedStage::cases());

        $recentCases = DeedCase::query()
            ->with(['client.company'])
            ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (DeedCase $case) => [
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

        $pendingSummary = null;
        if ($isNotaris) {
            $pendingPayments = (int) ($agg->pending_payments ?? 0);
            $pendingDrafts = (int) ($agg->pending_drafts ?? 0);
            $pendingDocs = (int) ($agg->pending_docs ?? 0);

            $pendingSummary = [
                'total' => $pendingPayments + $pendingDrafts + $pendingDocs,
                'payments' => $pendingPayments,
                'drafts' => $pendingDrafts,
                'documents' => $pendingDocs,
            ];
        }

        return Inertia::render('dashboard', [
            'stats' => [
                'total_clients' => (int) ($agg->total_clients ?? 0),
                'company_clients' => (int) ($agg->company_clients ?? 0),
                'active_cases' => (int) ($agg->active_cases ?? 0),
                'completed_cases' => (int) ($agg->completed_cases ?? 0),
                'received_amount' => (float) ($agg->received_amount ?? 0),
                'lunas_count' => (int) ($agg->lunas_count ?? 0),
                'receivable_amount' => (float) ($agg->receivable_amount ?? 0),
                'unpaid_count' => (int) ($agg->unpaid_count ?? 0),
            ],
            'stageDistribution' => $stageDistribution,
            'recentCases' => $recentCases,
            'pendingSummary' => $pendingSummary,
        ]);
    }
}
