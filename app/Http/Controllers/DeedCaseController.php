<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Http\Requests\AdvanceDeedStageRequest;
use App\Http\Requests\StageNoteRequest;
use App\Http\Requests\StoreDeedCaseRequest;
use App\Http\Requests\UpdateDeedCaseRequest;
use App\Models\DeedCase;
use App\Services\ActivityLogService;
use App\Services\DeedWorkflowService;
use App\Services\FileStorageService;
use App\Services\NotarisStatsService;
use App\Support\DatabaseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DeedCaseController extends Controller
{
    public function __construct(
        private readonly DeedWorkflowService $workflow,
        private readonly ActivityLogService $activityLog,
        private readonly FileStorageService $fileStorage,
        private readonly NotarisStatsService $stats,
    ) {}

    public function index(Request $request): Response
    {
        if ($user = $request->user()) {
            $this->workflow->syncOrphanClientsIfNeeded($user);
        }

        $search = trim((string) $request->query('search', ''));
        $stage = (string) $request->query('stage', 'semua');

        $cases = DeedCase::query()
            ->select([
                'id',
                'nomor',
                'client_id',
                'jenis_akta',
                'is_badan_usaha',
                'biaya',
                'target_selesai',
                'penanggung_jawab',
                'current_stage',
                'is_completed',
                'draft_status',
                'created_at',
            ])
            ->with(['client:id,nama,jenis', 'client.company:id,client_id,nama'])
            ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
            ->when($stage !== 'semua', function ($query) use ($stage) {
                if ($stage === 'selesai') {
                    $query->where('is_completed', true);
                } else {
                    $query->where('current_stage', $stage)->where('is_completed', false);
                }
            }, function ($query) use ($search) {
                if ($search === '') {
                    $query->where('is_completed', false);
                }
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    DatabaseSearch::orWhereLikeAny($q, ['nomor', 'jenis_akta'], $search)
                        ->orWhereHas('client', function ($cq) use ($search) {
                            DatabaseSearch::whereLike($cq, 'nama', $search)
                                ->orWhereHas('company', fn ($ccq) => DatabaseSearch::whereLike($ccq, 'nama', $search));
                        });
                });
            })
            ->latest()
            ->get()
            ->map(fn (DeedCase $case): array => [
                'id' => $case->id,
                'nomor' => $case->nomor,
                'client_id' => $case->client_id,
                'client_name' => $case->client->displayName(),
                'jenis_akta' => $case->jenis_akta,
                'is_badan_usaha' => $case->is_badan_usaha,
                'biaya' => $case->biaya,
                'terbayar' => (float) ($case->getAttribute('terbayar') ?? 0),
                'target_selesai' => $case->target_selesai?->format('Y-m-d'),
                'penanggung_jawab' => $case->penanggung_jawab,
                'current_stage' => $case->current_stage->value,
                'current_stage_order' => $case->current_stage->order(),
                'current_stage_label' => $case->current_stage->label(),
                'is_completed' => $case->is_completed,
                'draft_status' => $case->draft_status->value,
                'created_at' => $case->created_at?->toISOString(),
            ]);

        return Inertia::render('cases/index', [
            'cases' => $cases,
            'clients' => $this->stats->clientOptions(),
            'filters' => [
                'search' => $search,
                'stage' => $stage,
            ],
        ]);
    }

    public function store(StoreDeedCaseRequest $request): RedirectResponse
    {
        $case = $this->workflow->createCase($request->validated(), $request->user());

        return redirect()
            ->route('cases.show', $case)
            ->with('success', "Berkas akta {$case->nomor} berhasil dibuat.");
    }

    public function show(DeedCase $case): Response
    {
        $case->load([
            'client.company',
            'draftApprover:id,name',
            'docApprover:id,name',
            'histories.actor:id,name,role',
            'documents.verifier:id,name',
            'payments.submitter:id,name',
            'payments.confirmer:id,name',
        ]);

        return Inertia::render('cases/show', [
            'deedCase' => $case,
            'totalPaid' => $case->totalPaid(),
        ]);
    }

    public function update(UpdateDeedCaseRequest $request, DeedCase $case): RedirectResponse
    {
        $case->update($request->validated());
        $this->activityLog->record($request->user(), 'Ubah berkas akta', $case, $case->nomor);

        return back()->with('success', "Berkas {$case->nomor} berhasil diperbarui.");
    }

    public function destroy(Request $request, DeedCase $case): RedirectResponse
    {
        Gate::authorize('notaris');

        $nomor = $case->nomor;
        $case->load('payments');
        foreach ($case->payments as $payment) {
            $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
        }

        $case->delete();
        $this->activityLog->record($request->user(), 'Hapus berkas akta', null, $nomor);

        return redirect()->route('cases.index')->with('success', "Berkas {$nomor} berhasil dihapus.");
    }

    public function advance(AdvanceDeedStageRequest $request, DeedCase $case): RedirectResponse
    {
        $updated = $this->workflow->advanceStage(
            $case,
            $request->user(),
            $request->validated('notes'),
            $request->stageMetadata(),
        );

        if ($updated->is_completed) {
            $updated->loadMissing('client:id,kode');

            return redirect()
                ->route('archives.index', ['search' => $updated->client?->kode])
                ->with('success', "Seluruh tahapan berkas {$updated->nomor} telah selesai & otomatis dialihkan ke Pengarsipan.");
        }

        return back()->with('success', 'Tahapan berkas berhasil diperbarui.');
    }

    public function skip(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->skipStage($case, $request->user(), (string) $request->validated('notes'));

        return back()->with('success', 'Tahapan non-badan usaha berhasil dilewati.');
    }

    public function revert(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->revertStage($case, $request->user(), (string) $request->validated('notes'));

        return back()->with('success', 'Berkas dikembalikan ke tahap sebelumnya.');
    }

    public function requestDocApproval(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->requestDocApproval($case, $request->user(), $request->validated('notes'));

        return back()->with('success', 'Permohonan persetujuan verifikasi dokumen dikirim ke Notaris.');
    }

    public function approveDocVerification(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->approveDocVerification($case, $request->user(), $request->validated('notes'));

        return back()->with('success', 'Verifikasi dokumen telah di-ACC Notaris.');
    }

    public function rejectDocVerification(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->rejectDocVerification($case, $request->user(), (string) $request->validated('notes'));

        return back()->with('success', 'Verifikasi dokumen ditolak dengan catatan.');
    }

    public function requestDraft(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->requestDraftApproval($case, $request->user(), $request->validated('notes'));

        return back()->with('success', 'Permohonan persetujuan draf dikirim ke Notaris.');
    }

    public function approveDraft(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->approveDraft($case, $request->user(), $request->validated('notes'));

        return back()->with('success', 'Draf akta disetujui.');
    }

    public function requestRevision(StageNoteRequest $request, DeedCase $case): RedirectResponse
    {
        $this->workflow->requestDraftRevision($case, $request->user(), (string) $request->validated('notes'));

        return back()->with('success', 'Permintaan revisi draf dikirim.');
    }
}
