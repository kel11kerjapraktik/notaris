<?php

namespace App\Http\Controllers;

use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Models\DeedCase;
use App\Models\Document;
use App\Models\Payment;
use App\Services\ActivityLogService;
use App\Services\ApprovalQueryService;
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
        private readonly ApprovalQueryService $queries,
    ) {}

    public function index(Request $request): Response
    {
        $isNotaris = $request->user()?->isNotaris() ?? false;

        if (! $isNotaris) {
            return Inertia::render('approvals/staff', $this->queries->getStaffData());
        }

        return Inertia::render('approvals/index', [
            ...$this->queries->getNotarisPendingData(),
            'decidedPayments' => Inertia::defer(
                fn () => $this->queries->getNotarisHistoryData()['decidedPayments'],
                'history',
            ),
            'decidedDocuments' => Inertia::defer(
                fn () => $this->queries->getNotarisHistoryData()['decidedDocuments'],
                'history',
            ),
            'decidedDrafts' => Inertia::defer(
                fn () => $this->queries->getNotarisHistoryData()['decidedDrafts'],
                'history',
            ),
            'decidedDocApprovals' => Inertia::defer(
                fn () => $this->queries->getNotarisHistoryData()['decidedDocApprovals'],
                'history',
            ),
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
