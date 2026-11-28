<?php

namespace App\Services;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Models\DeedCase;
use App\Models\Document;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection;

class ApprovalQueryService
{
    /** @var array<string, mixed>|null */
    private ?array $historyCache = null;

    public function __construct(
        private readonly NotarisStatsService $stats,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getNotarisPendingData(): array
    {
        $pendingPayments = Payment::query()
            ->with([
                'deedCase:id,client_id,nomor,jenis_akta',
                'deedCase.client:id,nama,jenis',
                'deedCase.client.company:id,client_id,nama',
                'submitter:id,name',
            ])
            ->where('status', PaymentStatus::MENUNGGU)
            ->latest()
            ->get();

        // Single query across all 3 pending case queues instead of 3 separate round-trips
        $activeCases = DeedCase::query()
            ->select([
                'id',
                'client_id',
                'nomor',
                'jenis_akta',
                'current_stage',
                'is_completed',
                'draft_status',
                'doc_approval_status',
                'biaya',
                'tanggal_ttd_minuta',
                'nomor_akta',
                'tanggal_akta',
                'updated_at',
            ])
            ->with(['client:id,nama,jenis', 'client.company:id,client_id,nama'])
            ->withCount('documents')
            ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
            ->withExists(['payments as has_pending_payment' => fn ($q) => $q->where('status', PaymentStatus::MENUNGGU)])
            ->where(function ($query): void {
                $query->where('draft_status', DraftStatus::PENDING_APPROVAL)
                    ->orWhere('doc_approval_status', 'pending_approval')
                    ->orWhere(function ($q): void {
                        $q->where('is_completed', false)
                            ->whereIn('current_stage', [
                                DeedStage::PENANDATANGANAN_MINUTA->value,
                                DeedStage::PELUNASAN_BIAYA->value,
                            ]);
                    });
            })
            ->latest('updated_at')
            ->get();

        $casesNeedingDocs = $activeCases->filter(
            fn (DeedCase $c): bool => $c->draft_status === DraftStatus::PENDING_APPROVAL
                || $c->doc_approval_status === 'pending_approval',
        );
        if ($casesNeedingDocs->isNotEmpty()) {
            $casesNeedingDocs->load([
                'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
            ]);
        }

        $draftCases = $activeCases->filter(
            fn (DeedCase $c): bool => $c->draft_status === DraftStatus::PENDING_APPROVAL,
        );
        if ($draftCases->isNotEmpty()) {
            $draftCases->load([
                'histories' => fn ($q) => $q->whereIn('action', ['draft_requested', 'revision_requested'])->latest('id'),
            ]);
        }

        $pendingDrafts = $draftCases
            ->values()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'documents_count' => $c->documents_count,
                'draft_files_count' => $c->documents->where('kategori', 'Draft Akta')->count(),
                'draft_status' => $c->draft_status->value,
                'current_stage_order' => $c->current_stage->order(),
                'current_stage_label' => $c->current_stage->label(),
                'latest_note' => $c->histories->first()?->notes,
                'documents' => $c->documents,
            ]);

        $pendingDocApprovals = $activeCases
            ->filter(fn (DeedCase $c): bool => $c->doc_approval_status === 'pending_approval')
            ->values()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'documents_count' => $c->documents_count,
                'current_stage_order' => $c->current_stage->order(),
                'current_stage_label' => $c->current_stage->label(),
                'documents' => $c->documents,
            ]);

        $awaitingNotarisCases = $activeCases
            ->filter(fn (DeedCase $c): bool => ! $c->is_completed && in_array($c->current_stage, [
                DeedStage::PENANDATANGANAN_MINUTA,
                DeedStage::PELUNASAN_BIAYA,
            ], true))
            ->values()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'current_stage' => $c->current_stage->value,
                'current_stage_order' => $c->current_stage->order(),
                'current_stage_label' => $c->current_stage->label(),
                'biaya' => $c->biaya,
                'terbayar' => (float) ($c->getAttribute('terbayar') ?? 0),
                'tanggal_ttd_minuta' => $c->tanggal_ttd_minuta?->format('Y-m-d'),
                'is_minuta_ready' => ! empty($c->tanggal_ttd_minuta),
                'has_pending_payment' => (bool) $c->getAttribute('has_pending_payment'),
            ]);

        $pendingDocuments = Document::query()
            ->select([
                'id',
                'client_id',
                'deed_case_id',
                'kategori',
                'nama',
                'nomor_dokumen',
                'tanggal_dokumen',
                'file_path',
                'file_name',
                'mime_type',
                'is_complete_checked',
                'is_verified',
                'is_rejected',
                'catatan_notaris',
                'uploaded_by',
                'created_at',
                'updated_at',
            ])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'deedCase:id,nomor,jenis_akta,current_stage,is_completed',
                'uploader:id,name',
            ])
            ->where('is_verified', false)
            ->where('is_rejected', false)
            ->whereDoesntHave('deedCase', fn ($q) => $q->whereIn('doc_approval_status', ['pending_approval', 'rejected'])
                ->orWhereIn('draft_status', [DraftStatus::PENDING_APPROVAL->value, DraftStatus::REVISION_REQUESTED->value]))
            ->latest()
            ->get()
            ->map(fn (Document $doc): array => $this->serializeDocumentWithStage($doc));

        return [
            'pendingPayments' => $pendingPayments,
            'pendingDrafts' => $pendingDrafts,
            'pendingDocuments' => $pendingDocuments,
            'pendingDocApprovals' => $pendingDocApprovals,
            'awaitingNotarisCases' => $awaitingNotarisCases,
        ];
    }

    /**
     * Deferred history lists for the secondary tab ("Hasil Persetujuan").
     *
     * @return array<string, mixed>
     */
    public function getNotarisHistoryData(): array
    {
        if ($this->historyCache !== null) {
            return $this->historyCache;
        }

        $decidedPayments = Payment::query()
            ->with([
                'deedCase:id,client_id,nomor,jenis_akta',
                'deedCase.client:id,nama,jenis',
                'deedCase.client.company:id,client_id,nama',
                'confirmer:id,name',
            ])
            ->whereIn('status', [PaymentStatus::LUNAS->value, PaymentStatus::DITOLAK->value])
            ->latest('confirmed_at')
            ->limit(30)
            ->get();

        $decidedDocuments = Document::query()
            ->select([
                'id',
                'client_id',
                'deed_case_id',
                'kategori',
                'nama',
                'nomor_dokumen',
                'tanggal_dokumen',
                'file_path',
                'file_name',
                'mime_type',
                'is_verified',
                'is_rejected',
                'catatan_notaris',
                'verified_by',
                'verified_at',
            ])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'deedCase:id,nomor,jenis_akta',
                'verifier:id,name',
            ])
            ->where(fn ($q) => $q->where('is_verified', true)->orWhere('is_rejected', true))
            ->latest('verified_at')
            ->limit(30)
            ->get();

        $decidedDrafts = DeedCase::query()
            ->select(['id', 'client_id', 'nomor', 'jenis_akta', 'draft_status', 'draft_approved_by', 'draft_approved_at', 'updated_at'])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'draftApprover:id,name',
                'histories' => fn ($q) => $q->whereIn('action', ['draft_approved', 'revision_requested'])->latest('id'),
            ])
            ->whereIn('draft_status', [DraftStatus::APPROVED->value, DraftStatus::REVISION_REQUESTED->value])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'draft_status' => $c->draft_status->value,
                'draft_approver_name' => $c->draftApprover?->name,
                'draft_approved_at' => $c->draft_approved_at?->toISOString(),
                'latest_note' => $c->histories->first()?->notes,
                'updated_at' => $c->updated_at?->toISOString(),
            ]);

        $decidedDocApprovals = DeedCase::query()
            ->select(['id', 'client_id', 'nomor', 'jenis_akta', 'doc_approval_status', 'doc_approved_by', 'doc_approval_notes', 'doc_approved_at', 'updated_at'])
            ->with(['client:id,nama,jenis', 'client.company:id,client_id,nama', 'docApprover:id,name'])
            ->whereIn('doc_approval_status', ['approved', 'rejected'])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'doc_approval_status' => $c->doc_approval_status,
                'doc_approver_name' => $c->docApprover?->name,
                'doc_approval_notes' => $c->doc_approval_notes,
                'doc_approved_at' => $c->doc_approved_at?->toISOString(),
                'updated_at' => $c->updated_at?->toISOString(),
            ]);

        return $this->historyCache = [
            'decidedPayments' => $decidedPayments,
            'decidedDocuments' => $decidedDocuments,
            'decidedDrafts' => $decidedDrafts,
            'decidedDocApprovals' => $decidedDocApprovals,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getStaffData(): array
    {
        $payments = Payment::query()
            ->with([
                'deedCase:id,client_id,nomor,jenis_akta',
                'deedCase.client:id,nama,jenis',
                'deedCase.client.company:id,client_id,nama',
                'confirmer:id,name',
            ])
            ->whereIn('status', [
                PaymentStatus::MENUNGGU->value,
                PaymentStatus::DITOLAK->value,
            ])
            ->latest('updated_at')
            ->get();

        $documents = Document::query()
            ->select([
                'id',
                'client_id',
                'deed_case_id',
                'kategori',
                'nama',
                'nomor_dokumen',
                'tanggal_dokumen',
                'file_path',
                'file_name',
                'mime_type',
                'is_complete_checked',
                'is_verified',
                'is_rejected',
                'catatan_notaris',
                'verified_by',
                'created_at',
                'updated_at',
            ])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'deedCase:id,nomor,jenis_akta,current_stage,is_completed',
                'verifier:id,name',
            ])
            ->where('is_verified', false)
            ->whereDoesntHave('deedCase', fn ($q) => $q->whereIn('doc_approval_status', ['pending_approval', 'rejected'])
                ->orWhereIn('draft_status', [DraftStatus::PENDING_APPROVAL->value, DraftStatus::REVISION_REQUESTED->value]))
            ->latest('updated_at')
            ->get()
            ->map(fn (Document $doc): array => $this->serializeDocumentWithStage($doc));

        /** @var Collection<int, DeedCase> $staffCases */
        $staffCases = DeedCase::query()
            ->select([
                'id',
                'client_id',
                'nomor',
                'jenis_akta',
                'current_stage',
                'draft_status',
                'draft_approved_by',
                'draft_approved_at',
                'doc_approval_status',
                'doc_approved_by',
                'doc_approval_notes',
                'updated_at',
            ])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
                'draftApprover:id,name',
                'docApprover:id,name',
            ])
            ->withCount('documents')
            ->where(function ($query): void {
                $query->whereIn('draft_status', [
                    DraftStatus::PENDING_APPROVAL->value,
                    DraftStatus::REVISION_REQUESTED->value,
                ])->orWhereIn('doc_approval_status', ['pending_approval', 'rejected']);
            })
            ->latest('updated_at')
            ->get();

        $draftCases = $staffCases->filter(
            fn (DeedCase $c): bool => in_array($c->draft_status, [DraftStatus::PENDING_APPROVAL, DraftStatus::REVISION_REQUESTED], true),
        );
        if ($draftCases->isNotEmpty()) {
            $draftCases->load([
                'histories' => fn ($q) => $q->whereIn('action', ['draft_approved', 'revision_requested'])->latest('id'),
            ]);
        }

        $drafts = $draftCases
            ->values()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'draft_status' => $c->draft_status->value,
                'draft_approver_name' => $c->draftApprover?->name,
                'draft_approved_at' => $c->draft_approved_at?->toISOString(),
                'latest_note' => $c->histories->first()?->notes,
                'current_stage_order' => $c->current_stage->order(),
                'current_stage_label' => $c->current_stage->label(),
                'documents' => $c->documents,
                'updated_at' => $c->updated_at?->toISOString(),
            ]);

        $docApprovals = $staffCases
            ->filter(fn (DeedCase $c): bool => in_array($c->doc_approval_status, ['pending_approval', 'rejected'], true))
            ->values()
            ->map(fn (DeedCase $c): array => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'documents_count' => $c->documents_count,
                'doc_approval_status' => $c->doc_approval_status,
                'doc_approval_notes' => $c->doc_approval_notes,
                'current_stage_order' => $c->current_stage->order(),
                'current_stage_label' => $c->current_stage->label(),
                'documents' => $c->documents,
            ]);

        return [
            'payments' => $payments,
            'documents' => $documents,
            'drafts' => $drafts,
            'docApprovals' => $docApprovals,
            'clients' => $this->stats->clientOptions(),
            'cases' => $this->stats->caseOptions(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeDocumentWithStage(Document $doc): array
    {
        $arr = $doc->toArray();
        if ($doc->deedCase) {
            $arr['deed_case']['current_stage_order'] = $doc->deedCase->current_stage->order();
            $arr['deed_case']['current_stage_label'] = $doc->deedCase->current_stage->label();
        }

        return $arr;
    }
}
