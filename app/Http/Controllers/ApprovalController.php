<?php

namespace App\Http\Controllers;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Models\Payment;
use App\Services\ActivityLogService;
use App\Services\FileStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(
        private readonly FileStorageService $fileStorage,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function index(Request $request): Response
    {
        $isNotaris = $request->user()?->isNotaris() ?? false;

        if (! $isNotaris) {
            $payments = Payment::query()
                ->with(['deedCase.client.company', 'confirmer:id,name'])
                ->whereIn('status', [
                    PaymentStatus::MENUNGGU->value,
                    PaymentStatus::DITOLAK->value,
                ])
                ->latest('updated_at')
                ->get();

            $documents = Document::query()
                ->with(['client.company', 'deedCase:id,nomor,jenis_akta,current_stage,is_completed', 'verifier:id,name'])
                ->where('is_verified', false)
                ->whereDoesntHave('deedCase', fn ($q) => $q->whereIn('doc_approval_status', ['pending_approval', 'rejected'])
                    ->orWhereIn('draft_status', [DraftStatus::PENDING_APPROVAL->value, DraftStatus::REVISION_REQUESTED->value]))
                ->latest('updated_at')
                ->get()
                ->map(function (Document $doc) {
                    $arr = $doc->toArray();
                    if ($doc->deedCase) {
                        $arr['deed_case']['current_stage_order'] = $doc->deedCase->current_stage->order();
                        $arr['deed_case']['current_stage_label'] = $doc->deedCase->current_stage->label();
                    }

                    return $arr;
                });

            $drafts = DeedCase::query()
                ->with([
                    'client.company',
                    'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
                    'draftApprover:id,name',
                    'histories' => fn ($q) => $q->whereIn('action', ['draft_approved', 'revision_requested'])->latest('id'),
                ])
                ->whereIn('draft_status', [
                    DraftStatus::PENDING_APPROVAL->value,
                    DraftStatus::REVISION_REQUESTED->value,
                ])
                ->latest('updated_at')
                ->get()
                ->map(fn (DeedCase $c) => [
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

            $clients = Client::with('company')->orderBy('nama')->get()->map(fn (Client $c) => [
                'id' => $c->id,
                'label' => $c->kode.' — '.$c->displayName(),
            ]);

            $cases = DeedCase::orderByDesc('id')->get()->map(fn (DeedCase $dc) => [
                'id' => $dc->id,
                'client_id' => $dc->client_id,
                'label' => $dc->nomor.' • '.$dc->jenis_akta,
            ]);

            $docApprovals = DeedCase::query()
                ->with([
                    'client.company',
                    'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
                    'docApprover:id,name',
                ])
                ->withCount('documents')
                ->whereIn('doc_approval_status', ['pending_approval', 'rejected'])
                ->latest('updated_at')
                ->get()
                ->map(fn (DeedCase $c) => [
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

            return Inertia::render('approvals/staff', [
                'payments' => $payments,
                'documents' => $documents,
                'drafts' => $drafts,
                'docApprovals' => $docApprovals,
                'clients' => $clients,
                'cases' => $cases,
            ]);
        }

        $pendingPayments = Payment::query()
            ->with(['deedCase.client.company', 'submitter:id,name'])
            ->where('status', PaymentStatus::MENUNGGU)
            ->latest()
            ->get();

        $pendingDrafts = DeedCase::query()
            ->with([
                'client.company',
                'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
            ])
            ->withCount('documents')
            ->where('draft_status', DraftStatus::PENDING_APPROVAL)
            ->latest()
            ->get()
            ->map(fn (DeedCase $c) => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'documents_count' => $c->documents_count,
                'draft_status' => $c->draft_status->value,
                'current_stage_label' => $c->current_stage->label(),
                'documents' => $c->documents,
            ]);

        $pendingDocuments = Document::query()
            ->with(['client.company', 'deedCase:id,nomor,jenis_akta', 'uploader:id,name'])
            ->where('is_verified', false)
            ->where('is_rejected', false)
            ->whereDoesntHave('deedCase', fn ($q) => $q->whereIn('doc_approval_status', ['pending_approval', 'rejected'])
                ->orWhereIn('draft_status', [DraftStatus::PENDING_APPROVAL->value, DraftStatus::REVISION_REQUESTED->value]))
            ->latest()
            ->get();

        $awaitingNotarisCases = DeedCase::query()
            ->with(['client.company', 'payments'])
            ->where('is_completed', false)
            ->whereIn('current_stage', [
                DeedStage::PENANDATANGANAN_MINUTA->value,
                DeedStage::PELUNASAN_BIAYA->value,
            ])
            ->latest()
            ->get()
            ->map(fn (DeedCase $c) => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'current_stage' => $c->current_stage->value,
                'current_stage_label' => $c->current_stage->label(),
                'biaya' => $c->biaya,
                'terbayar' => $c->totalPaid(),
            ]);

        $decidedPayments = Payment::query()
            ->with(['deedCase.client.company', 'confirmer:id,name'])
            ->whereIn('status', [PaymentStatus::LUNAS->value, PaymentStatus::DITOLAK->value])
            ->latest('confirmed_at')
            ->limit(30)
            ->get();

        $decidedDocuments = Document::query()
            ->with(['client.company', 'deedCase:id,nomor,jenis_akta', 'verifier:id,name'])
            ->where(fn ($q) => $q->where('is_verified', true)->orWhere('is_rejected', true))
            ->latest('verified_at')
            ->limit(30)
            ->get();

        $decidedDrafts = DeedCase::query()
            ->with(['client.company', 'draftApprover:id,name', 'histories' => fn ($q) => $q->whereIn('action', ['draft_approved', 'revision_requested'])->latest('id')])
            ->whereIn('draft_status', [DraftStatus::APPROVED->value, DraftStatus::REVISION_REQUESTED->value])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (DeedCase $c) => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'draft_status' => $c->draft_status->value,
                'draft_approver_name' => $c->draftApprover?->name,
                'latest_note' => $c->histories->first()?->notes,
                'updated_at' => $c->updated_at?->toISOString(),
            ]);

        $pendingDocApprovals = DeedCase::query()
            ->with([
                'client.company',
                'documents:id,deed_case_id,client_id,kategori,nama,nomor_dokumen,tanggal_dokumen,file_path,file_name,mime_type,is_verified,is_rejected,catatan_notaris',
            ])
            ->withCount('documents')
            ->where('doc_approval_status', 'pending_approval')
            ->latest('updated_at')
            ->get()
            ->map(fn (DeedCase $c) => [
                'id' => $c->id,
                'client_id' => $c->client_id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'documents_count' => $c->documents_count,
                'current_stage_label' => $c->current_stage->label(),
                'documents' => $c->documents,
            ]);

        $decidedDocApprovals = DeedCase::query()
            ->with(['client.company', 'docApprover:id,name'])
            ->whereIn('doc_approval_status', ['approved', 'rejected'])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn (DeedCase $c) => [
                'id' => $c->id,
                'nomor' => $c->nomor,
                'jenis_akta' => $c->jenis_akta,
                'client_name' => $c->client->displayName(),
                'doc_approval_status' => $c->doc_approval_status,
                'doc_approver_name' => $c->docApprover?->name,
                'doc_approval_notes' => $c->doc_approval_notes,
            ]);

        return Inertia::render('approvals/index', [
            'pendingPayments' => $pendingPayments,
            'pendingDrafts' => $pendingDrafts,
            'pendingDocuments' => $pendingDocuments,
            'pendingDocApprovals' => $pendingDocApprovals,
            'awaitingNotarisCases' => $awaitingNotarisCases,
            'decidedPayments' => $decidedPayments,
            'decidedDocuments' => $decidedDocuments,
            'decidedDrafts' => $decidedDrafts,
            'decidedDocApprovals' => $decidedDocApprovals,
        ]);
    }

    /**
     * Admin/Staf cancels a pending or rejected approval request so it no longer appears on Notaris or Admin queues.
     */
    public function cancel(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'in:payment,document,doc_approval,draft'],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        $label = $this->performRemoval($data['kind'], (int) $data['id'], onlyPendingOrRejected: true);
        $this->activityLog->record($request->user(), 'Batalkan permintaan persetujuan', null, $label);

        return back()->with('success', "Permintaan {$label} berhasil dibatalkan.");
    }

    /**
     * Notaris deletes/removes a duplicate or erroneous approval request from all queues.
     */
    public function remove(Request $request): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'kind' => ['required', 'in:payment,document,doc_approval,draft'],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        $label = $this->performRemoval($data['kind'], (int) $data['id'], onlyPendingOrRejected: false);
        $this->activityLog->record($request->user(), 'Hapus permintaan persetujuan', null, $label);

        return back()->with('success', "Data {$label} berhasil dihapus.");
    }

    private function performRemoval(string $kind, int $id, bool $onlyPendingOrRejected): string
    {
        return match ($kind) {
            'payment' => (function () use ($id, $onlyPendingOrRejected): string {
                $payment = Payment::findOrFail($id);
                if ($onlyPendingOrRejected) {
                    abort_unless(
                        in_array($payment->status, [PaymentStatus::MENUNGGU, PaymentStatus::DITOLAK], true),
                        422,
                        'Hanya pengajuan pembayaran yang menunggu ACC atau ditolak yang dapat dibatalkan.',
                    );
                }
                $label = "Pembayaran {$payment->no_inv}";
                $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
                $payment->delete();

                return $label;
            })(),
            'document' => (function () use ($id, $onlyPendingOrRejected): string {
                $document = Document::findOrFail($id);
                if ($onlyPendingOrRejected) {
                    abort_if(
                        $document->is_verified,
                        422,
                        'Dokumen yang sudah terverifikasi tidak dapat dibatalkan.',
                    );
                }
                $label = "Dokumen \"{$document->nama}\"";
                $this->fileStorage->delete($document->file_disk, $document->file_path);
                $document->delete();

                return $label;
            })(),
            'doc_approval' => (function () use ($id, $onlyPendingOrRejected): string {
                $case = DeedCase::findOrFail($id);
                if ($onlyPendingOrRejected) {
                    abort_unless(
                        in_array($case->doc_approval_status, ['pending_approval', 'rejected'], true),
                        422,
                        'Pengajuan verifikasi dokumen ini tidak dalam status menunggu atau ditolak.',
                    );
                }
                $case->update([
                    'doc_approval_status' => 'none',
                    'doc_approved_by' => null,
                    'doc_approved_at' => null,
                    'doc_approval_notes' => null,
                ]);

                return "Verifikasi Dokumen {$case->nomor}";
            })(),
            'draft' => (function () use ($id, $onlyPendingOrRejected): string {
                $case = DeedCase::findOrFail($id);
                if ($onlyPendingOrRejected) {
                    abort_unless(
                        in_array($case->draft_status, [DraftStatus::PENDING_APPROVAL, DraftStatus::REVISION_REQUESTED], true),
                        422,
                        'Pengajuan draf akta ini tidak dalam status menunggu atau revisi.',
                    );
                }
                $case->update([
                    'draft_status' => DraftStatus::NONE,
                    'draft_approved_by' => null,
                    'draft_approved_at' => null,
                ]);

                return "Draf Akta {$case->nomor}";
            })(),
        };
    }
}
