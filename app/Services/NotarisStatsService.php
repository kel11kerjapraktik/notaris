<?php

namespace App\Services;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\DeedCase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class NotarisStatsService
{
    private const TTL_MINUTES = 5;

    private const KEYS = [
        'notaris:pending_count:notaris',
        'notaris:pending_count:staf',
        'notaris:dashboard_agg',
        'notaris:client_counts',
        'notaris:client_options',
        'notaris:case_options',
        'notaris:case_payment_options',
        'notaris:payment_summary',
    ];

    public static function flush(bool $resetOrphanCheck = false): void
    {
        foreach (self::KEYS as $key) {
            Cache::forget($key);
        }

        if ($resetOrphanCheck) {
            Cache::forget('notaris:orphan_clients_synced');
        }
    }

    public function pendingApprovalsCount(bool $isNotaris): int
    {
        $key = $isNotaris ? 'notaris:pending_count:notaris' : 'notaris:pending_count:staf';

        return (int) Cache::remember($key, now()->addMinutes(self::TTL_MINUTES), function () use ($isNotaris): int {
            if ($isNotaris) {
                $row = DB::selectOne(
                    'SELECT
                        (SELECT COUNT(*) FROM payments WHERE status = ?) +
                        (SELECT COUNT(*) FROM deed_cases WHERE draft_status = ?) +
                        (SELECT COUNT(*) FROM deed_cases WHERE doc_approval_status = ?) +
                        (SELECT COUNT(*) FROM deed_cases WHERE is_completed = false AND current_stage IN (?, ?)) +
                        (SELECT COUNT(*) FROM documents d WHERE d.is_verified = false AND d.is_rejected = false
                            AND NOT EXISTS (
                                SELECT 1 FROM deed_cases dc WHERE dc.id = d.deed_case_id
                                AND (dc.doc_approval_status IN (?, ?) OR dc.draft_status IN (?, ?))
                            )
                        ) AS total',
                    [
                        PaymentStatus::MENUNGGU->value,
                        DraftStatus::PENDING_APPROVAL->value,
                        'pending_approval',
                        DeedStage::PENANDATANGANAN_MINUTA->value,
                        DeedStage::PELUNASAN_BIAYA->value,
                        'pending_approval',
                        'rejected',
                        DraftStatus::PENDING_APPROVAL->value,
                        DraftStatus::REVISION_REQUESTED->value,
                    ],
                );

                return (int) ($row->total ?? 0);
            }

            $row = DB::selectOne(
                'SELECT
                    (SELECT COUNT(*) FROM payments WHERE status IN (?, ?)) +
                    (SELECT COUNT(*) FROM deed_cases WHERE draft_status IN (?, ?)) +
                    (SELECT COUNT(*) FROM deed_cases WHERE doc_approval_status IN (?, ?)) +
                    (SELECT COUNT(*) FROM documents d WHERE d.is_verified = false
                        AND NOT EXISTS (
                            SELECT 1 FROM deed_cases dc WHERE dc.id = d.deed_case_id
                            AND (dc.doc_approval_status IN (?, ?) OR dc.draft_status IN (?, ?))
                        )
                    ) AS total',
                [
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::DITOLAK->value,
                    DraftStatus::PENDING_APPROVAL->value,
                    DraftStatus::REVISION_REQUESTED->value,
                    'pending_approval',
                    'rejected',
                    'pending_approval',
                    'rejected',
                    DraftStatus::PENDING_APPROVAL->value,
                    DraftStatus::REVISION_REQUESTED->value,
                ],
            );

            return (int) ($row->total ?? 0);
        });
    }

    /**
     * @return array{
     *     stats: array<string, float|int>,
     *     stageDistribution: array<int, array<string, int|string>>,
     *     pendingSummary: array<string, int>
     * }
     */
    public function dashboardAggregates(): array
    {
        return Cache::remember('notaris:dashboard_agg', now()->addMinutes(self::TTL_MINUTES), function (): array {
            $agg = DB::selectOne(
                "SELECT
                    (SELECT COUNT(*) FROM clients) AS total_clients,
                    (SELECT SUM(CASE WHEN jenis = 'perusahaan' THEN 1 ELSE 0 END) FROM clients) AS company_clients,
                    (SELECT SUM(CASE WHEN is_completed = false THEN 1 ELSE 0 END) FROM deed_cases) AS active_cases,
                    (SELECT SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) FROM deed_cases) AS completed_cases,
                    (SELECT SUM(CASE WHEN draft_status = ? THEN 1 ELSE 0 END) FROM deed_cases) AS pending_drafts,
                    (SELECT COALESCE(SUM(CASE WHEN status = ? THEN jumlah ELSE 0 END), 0) FROM payments) AS received_amount,
                    (SELECT SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) FROM payments) AS lunas_count,
                    (SELECT COALESCE(SUM(CASE WHEN status IN (?, ?) THEN jumlah ELSE 0 END), 0) FROM payments) AS receivable_amount,
                    (SELECT SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) FROM payments) AS unpaid_count,
                    (SELECT SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) FROM payments) AS pending_payments,
                    (SELECT COUNT(*) FROM deed_cases WHERE doc_approval_status = ?) AS pending_doc_approvals,
                    (SELECT COUNT(*) FROM deed_cases WHERE is_completed = false AND current_stage IN (?, ?)) AS awaiting_notaris,
                    (SELECT COUNT(*) FROM documents d WHERE d.is_verified = false AND d.is_rejected = false
                        AND NOT EXISTS (
                            SELECT 1 FROM deed_cases dc WHERE dc.id = d.deed_case_id
                            AND (dc.doc_approval_status IN (?, ?) OR dc.draft_status IN (?, ?))
                        )
                    ) AS pending_docs",
                [
                    DraftStatus::PENDING_APPROVAL->value,
                    PaymentStatus::LUNAS->value,
                    PaymentStatus::LUNAS->value,
                    PaymentStatus::BELUM->value,
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::BELUM->value,
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::MENUNGGU->value,
                    'pending_approval',
                    DeedStage::PENANDATANGANAN_MINUTA->value,
                    DeedStage::PELUNASAN_BIAYA->value,
                    'pending_approval',
                    'rejected',
                    DraftStatus::PENDING_APPROVAL->value,
                    DraftStatus::REVISION_REQUESTED->value,
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

            $pendingPayments = (int) ($agg->pending_payments ?? 0);
            $pendingDrafts = (int) ($agg->pending_drafts ?? 0);
            $pendingDocs = (int) ($agg->pending_docs ?? 0) + (int) ($agg->pending_doc_approvals ?? 0);
            $awaitingNotaris = (int) ($agg->awaiting_notaris ?? 0);

            return [
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
                'pendingSummary' => [
                    'total' => $pendingPayments + $pendingDrafts + $pendingDocs + $awaitingNotaris,
                    'payments' => $pendingPayments,
                    'drafts' => $pendingDrafts,
                    'documents' => $pendingDocs,
                    'awaiting_notaris' => $awaitingNotaris,
                ],
            ];
        });
    }

    /**
     * @return array{proses: int, selesai: int}
     */
    public function clientTabCounts(): array
    {
        return Cache::remember('notaris:client_counts', now()->addMinutes(self::TTL_MINUTES), function (): array {
            $row = DB::selectOne(
                'SELECT
                    (SELECT COUNT(*) FROM clients c WHERE NOT EXISTS (SELECT 1 FROM deed_cases dc WHERE dc.client_id = c.id)
                        OR EXISTS (SELECT 1 FROM deed_cases dc WHERE dc.client_id = c.id AND dc.is_completed = false)) AS proses,
                    (SELECT COUNT(*) FROM clients c WHERE EXISTS (SELECT 1 FROM deed_cases dc WHERE dc.client_id = c.id)
                        AND NOT EXISTS (SELECT 1 FROM deed_cases dc WHERE dc.client_id = c.id AND dc.is_completed = false)) AS selesai',
            );

            return [
                'proses' => (int) ($row->proses ?? 0),
                'selesai' => (int) ($row->selesai ?? 0),
            ];
        });
    }

    /**
     * @return array<int, array{id: int, kode: string, label: string}>
     */
    public function clientOptions(): array
    {
        return Cache::remember('notaris:client_options', now()->addMinutes(self::TTL_MINUTES), function (): array {
            return Client::query()
                ->select(['id', 'kode', 'nama', 'jenis'])
                ->with('company:id,client_id,nama')
                ->orderBy('nama')
                ->get()
                ->map(fn (Client $c): array => [
                    'id' => $c->id,
                    'kode' => $c->kode,
                    'label' => $c->kode.' — '.$c->nama.($c->company?->nama ? " ({$c->company->nama})" : ''),
                ])
                ->all();
        });
    }

    /**
     * @return array<int, array{id: int, client_id: int, label: string}>
     */
    public function caseOptions(): array
    {
        return Cache::remember('notaris:case_options', now()->addMinutes(self::TTL_MINUTES), function (): array {
            return DeedCase::query()
                ->select(['id', 'client_id', 'nomor', 'jenis_akta'])
                ->orderByDesc('id')
                ->get()
                ->map(fn (DeedCase $dc): array => [
                    'id' => $dc->id,
                    'client_id' => $dc->client_id,
                    'label' => $dc->nomor.' • '.$dc->jenis_akta,
                ])
                ->all();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function casePaymentOptions(): array
    {
        return Cache::remember('notaris:case_payment_options', now()->addMinutes(self::TTL_MINUTES), function (): array {
            return DeedCase::query()
                ->select(['id', 'client_id', 'nomor', 'jenis_akta', 'biaya'])
                ->with(['client:id,nama,jenis', 'client.company:id,client_id,nama'])
                ->withCount('payments')
                ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
                ->latest('id')
                ->get()
                ->map(fn (DeedCase $case): array => [
                    'id' => $case->id,
                    'nomor' => $case->nomor,
                    'client_name' => $case->client->displayName(),
                    'jenis_akta' => $case->jenis_akta,
                    'biaya' => $case->biaya,
                    'terbayar' => (float) ($case->getAttribute('terbayar') ?? 0),
                    'next_termin' => ((int) $case->getAttribute('payments_count')) + 1,
                ])
                ->all();
        });
    }

    /**
     * @return array<string, float|int>
     */
    public function paymentSummary(): array
    {
        return Cache::remember('notaris:payment_summary', now()->addMinutes(self::TTL_MINUTES), function (): array {
            $paymentAgg = DB::selectOne(
                'SELECT
                    (SELECT COALESCE(SUM(biaya), 0) FROM deed_cases) as total_kontrak,
                    COALESCE(SUM(CASE WHEN status = ? THEN jumlah ELSE 0 END), 0) as total_diterima,
                    COALESCE(SUM(CASE WHEN status = ? THEN jumlah ELSE 0 END), 0) as total_menunggu,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as count_menunggu,
                    COALESCE(SUM(CASE WHEN status = ? THEN jumlah ELSE 0 END), 0) as total_belum,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as count_belum
                FROM payments',
                [
                    PaymentStatus::LUNAS->value,
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::BELUM->value,
                    PaymentStatus::BELUM->value,
                ],
            );

            return [
                'total_kontrak' => (float) ($paymentAgg?->total_kontrak ?? 0),
                'total_diterima' => (float) ($paymentAgg?->total_diterima ?? 0),
                'total_menunggu' => (float) ($paymentAgg?->total_menunggu ?? 0),
                'count_menunggu' => (int) ($paymentAgg?->count_menunggu ?? 0),
                'total_belum' => (float) ($paymentAgg?->total_belum ?? 0),
                'count_belum' => (int) ($paymentAgg?->count_belum ?? 0),
            ];
        });
    }
}
