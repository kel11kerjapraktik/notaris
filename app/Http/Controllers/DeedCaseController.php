<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Services\ActivityLogService;
use App\Services\DeedWorkflowService;
use App\Services\FileStorageService;
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
    ) {}

    public function index(Request $request): Response
    {
        // Automatically ensure every client without a deed case appears in Monitoring Akta
        $clientsWithoutCase = Client::query()
            ->with('company')
            ->whereDoesntHave('deedCases')
            ->get();

        foreach ($clientsWithoutCase as $client) {
            $defaultJenis = $client->jenis === 'perusahaan' ? 'Akta Pendirian PT' : 'Lainnya';
            $createdCase = $this->workflow->createCase([
                'client_id' => $client->id,
                'jenis_akta' => $defaultJenis,
                'biaya' => 0,
                'penanggung_jawab' => $request->user()->name,
                'catatan' => $client->catatan,
            ], $request->user());

            Document::query()
                ->where('client_id', $client->id)
                ->whereNull('deed_case_id')
                ->update(['deed_case_id' => $createdCase->id]);
        }

        $search = trim((string) $request->query('search', ''));
        $stage = (string) $request->query('stage', 'semua');

        $cases = DeedCase::query()
            ->with(['client.company'])
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
                $like = '%'.$search.'%';
                $query->where(function ($q) use ($like) {
                    $q->where('nomor', 'ilike', $like)
                        ->orWhere('jenis_akta', 'ilike', $like)
                        ->orWhereHas('client', function ($cq) use ($like) {
                            $cq->where('nama', 'ilike', $like)
                                ->orWhereHas('company', fn ($ccq) => $ccq->where('nama', 'ilike', $like));
                        });
                });
            })
            ->latest()
            ->get()
            ->map(fn (DeedCase $case) => [
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

        $clients = Client::query()
            ->with('company')
            ->orderBy('nama')
            ->get()
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'kode' => $c->kode,
                'label' => $c->kode.' — '.$c->nama.($c->company?->nama ? " ({$c->company->nama})" : ''),
            ]);

        return Inertia::render('cases/index', [
            'cases' => $cases,
            'clients' => $clients,
            'filters' => [
                'search' => $search,
                'stage' => $stage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'jenis_akta' => ['required', 'string', 'max:255'],
            'biaya' => ['required', 'numeric', 'min:0'],
            'target_selesai' => ['nullable', 'date'],
            'penanggung_jawab' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $case = $this->workflow->createCase($data, $request->user());

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

    public function update(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'jenis_akta' => ['required', 'string', 'max:255'],
            'biaya' => ['required', 'numeric', 'min:0'],
            'target_selesai' => ['nullable', 'date'],
            'penanggung_jawab' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'nomor_akta' => ['nullable', 'string', 'max:64'],
            'tanggal_akta' => ['nullable', 'date'],
            'tanggal_ttd_minuta' => ['nullable', 'date'],
            'nomor_sk_ahu' => ['nullable', 'string', 'max:100'],
            'tanggal_sk_ahu' => ['nullable', 'date'],
            'tanggal_pemilik_manfaat' => ['nullable', 'date'],
            'status_pemilik_manfaat' => ['nullable', 'string', 'max:64'],
            'nomor_tbnri' => ['nullable', 'string', 'max:100'],
            'tanggal_tbnri' => ['nullable', 'date'],
            'nib_perusahaan' => ['nullable', 'string', 'max:64'],
            'kbli_oss' => ['nullable', 'string', 'max:100'],
        ]);

        $case->update($data);
        $this->workflow->resubmitRevisionIfNeeded($case, $request->user());
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

    public function advance(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'nomor_akta' => ['nullable', 'string', 'max:64'],
            'tanggal_akta' => ['nullable', 'date'],
            'tanggal_ttd_minuta' => ['nullable', 'date'],
            'nomor_sk_ahu' => ['nullable', 'string', 'max:100'],
            'tanggal_sk_ahu' => ['nullable', 'date'],
            'tanggal_pemilik_manfaat' => ['nullable', 'date'],
            'status_pemilik_manfaat' => ['nullable', 'string', 'max:64'],
            'nomor_tbnri' => ['nullable', 'string', 'max:100'],
            'tanggal_tbnri' => ['nullable', 'date'],
            'nib_perusahaan' => ['nullable', 'string', 'max:64'],
            'kbli_oss' => ['nullable', 'string', 'max:100'],
        ]);

        $notes = $data['notes'] ?? null;
        unset($data['notes']);

        $updated = $this->workflow->advanceStage($case, $request->user(), $notes, $data);

        if ($updated->is_completed) {
            $updated->loadMissing('client');

            return redirect()
                ->route('archives.index', ['search' => $updated->client?->kode])
                ->with('success', "Seluruh tahapan berkas {$updated->nomor} telah selesai & otomatis dialihkan ke Pengarsipan.");
        }

        return back()->with('success', 'Tahapan berkas berhasil diperbarui.');
    }

    public function skip(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $this->workflow->skipStage($case, $request->user(), $data['notes']);

        return back()->with('success', 'Tahapan non-badan usaha berhasil dilewati.');
    }

    public function revert(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $this->workflow->revertStage($case, $request->user(), $data['notes']);

        return back()->with('success', 'Berkas dikembalikan ke tahap sebelumnya.');
    }

    public function requestDocApproval(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->workflow->requestDocApproval($case, $request->user(), $data['notes'] ?? null);

        return back()->with('success', 'Permohonan persetujuan verifikasi dokumen dikirim ke Notaris.');
    }

    public function approveDocVerification(Request $request, DeedCase $case): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->workflow->approveDocVerification($case, $request->user(), $data['notes'] ?? null);

        return back()->with('success', 'Verifikasi dokumen telah di-ACC Notaris.');
    }

    public function rejectDocVerification(Request $request, DeedCase $case): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $this->workflow->rejectDocVerification($case, $request->user(), $data['notes']);

        return back()->with('success', 'Verifikasi dokumen ditolak dengan catatan.');
    }

    public function requestDraft(Request $request, DeedCase $case): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->workflow->requestDraftApproval($case, $request->user(), $data['notes'] ?? null);

        return back()->with('success', 'Permohonan persetujuan draf dikirim ke Notaris.');
    }

    public function approveDraft(Request $request, DeedCase $case): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->workflow->approveDraft($case, $request->user(), $data['notes'] ?? null);

        return back()->with('success', 'Draf akta disetujui.');
    }

    public function requestRevision(Request $request, DeedCase $case): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $this->workflow->requestDraftRevision($case, $request->user(), $data['notes']);

        return back()->with('success', 'Permintaan revisi draf dikirim.');
    }
}
