<?php

namespace App\Http\Controllers;

use App\Enums\DraftStatus;
use App\Http\Requests\UpsertDocumentRequest;
use App\Models\Document;
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
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(
        private readonly FileStorageService $fileStorage,
        private readonly ActivityLogService $activityLog,
        private readonly DeedWorkflowService $workflow,
        private readonly NotarisStatsService $stats,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $kategori = (string) $request->query('kategori', 'semua');

        $documents = Document::query()
            ->select([
                'id',
                'client_id',
                'deed_case_id',
                'kategori',
                'nama',
                'nomor_dokumen',
                'tanggal_dokumen',
                'keterangan',
                'file_path',
                'file_name',
                'mime_type',
                'is_complete_checked',
                'is_verified',
                'is_rejected',
                'catatan_notaris',
                'verified_by',
                'created_at',
            ])
            ->with([
                'client:id,nama,jenis',
                'client.company:id,client_id,nama',
                'deedCase:id,nomor,jenis_akta',
                'verifier:id,name',
            ])
            ->when($kategori !== 'semua', fn ($q) => $q->where('kategori', $kategori))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    DatabaseSearch::orWhereLikeAny($q, ['nama', 'nomor_dokumen', 'kategori'], $search)
                        ->orWhereHas('client', fn ($cq) => DatabaseSearch::whereLike($cq, 'nama', $search));
                });
            })
            ->latest()
            ->get();

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'clients' => $this->stats->clientOptions(),
            'cases' => $this->stats->caseOptions(),
            'filters' => [
                'search' => $search,
                'kategori' => $kategori,
            ],
        ]);
    }

    public function store(UpsertDocumentRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $fileMeta = [];
        if ($request->hasFile('file')) {
            $stored = $this->fileStorage->store($request->file('file'), "clients/{$data['client_id']}/documents");
            $fileMeta = [
                'file_disk' => $stored['disk'],
                'file_path' => $stored['path'],
                'file_name' => $stored['name'],
                'mime_type' => $stored['mime'],
                'file_size' => $stored['size'],
            ];
        }

        $doc = Document::create([
            'client_id' => $data['client_id'],
            'deed_case_id' => ! empty($data['deed_case_id']) ? $data['deed_case_id'] : null,
            'kategori' => $data['kategori'],
            'nama' => $data['nama'],
            'nomor_dokumen' => $data['nomor_dokumen'] ?? null,
            'tanggal_dokumen' => $data['tanggal_dokumen'] ?? now()->toDateString(),
            'keterangan' => $data['keterangan'] ?? null,
            'is_complete_checked' => (bool) ($data['is_complete_checked'] ?? false),
            'uploaded_by' => $request->user()->id,
            ...$fileMeta,
        ]);

        $targetCase = $doc->deedCase ?? $doc->client?->deedCases()->latest('id')->first();
        if ($targetCase) {
            if (! $doc->deed_case_id) {
                $doc->update(['deed_case_id' => $targetCase->id]);
            }

            if ($request->boolean('submit_doc_approval') && $targetCase->doc_approval_status !== 'pending_approval') {
                $this->workflow->requestDocApproval(
                    $targetCase,
                    $request->user(),
                    "Dokumen \"{$doc->nama}\" diunggah dan diajukan untuk persetujuan Notaris.",
                );
            } elseif ($request->boolean('submit_draft_approval') && $targetCase->draft_status !== DraftStatus::PENDING_APPROVAL) {
                $this->workflow->requestDraftApproval(
                    $targetCase,
                    $request->user(),
                    "Draf \"{$doc->nama}\" diunggah dan diajukan untuk ACC Notaris.",
                );
            } else {
                $this->workflow->resubmitRevisionIfNeeded($targetCase, $request->user());
            }
        }

        $this->activityLog->record($request->user(), 'Tambah dokumen', $doc, $doc->nama);

        return back()->with('success', "Dokumen \"{$doc->nama}\" berhasil disimpan.");
    }

    public function update(UpsertDocumentRequest $request, Document $document): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('file')) {
            $this->fileStorage->delete($document->file_disk, $document->file_path);
            $stored = $this->fileStorage->store($request->file('file'), "clients/{$data['client_id']}/documents");
            $document->fill([
                'file_disk' => $stored['disk'],
                'file_path' => $stored['path'],
                'file_name' => $stored['name'],
                'mime_type' => $stored['mime'],
                'file_size' => $stored['size'],
                'is_verified' => false,
                'verified_by' => null,
                'verified_at' => null,
            ]);
        }

        $document->fill([
            'client_id' => $data['client_id'],
            'deed_case_id' => ! empty($data['deed_case_id']) ? $data['deed_case_id'] : null,
            'kategori' => $data['kategori'],
            'nama' => $data['nama'],
            'nomor_dokumen' => $data['nomor_dokumen'] ?? null,
            'tanggal_dokumen' => $data['tanggal_dokumen'] ?? null,
            'keterangan' => $data['keterangan'] ?? null,
            'is_complete_checked' => (bool) ($data['is_complete_checked'] ?? false),
            'is_rejected' => false,
            'catatan_notaris' => null,
        ]);
        $document->save();

        $targetCase = $document->deedCase ?? $document->client?->deedCases()->latest('id')->first();
        if ($targetCase) {
            if (! $document->deed_case_id) {
                $document->update(['deed_case_id' => $targetCase->id]);
            }
            $this->workflow->resubmitRevisionIfNeeded($targetCase, $request->user());
        }

        $this->activityLog->record($request->user(), 'Ubah dokumen', $document, $document->nama);

        return back()->with('success', "Dokumen \"{$document->nama}\" berhasil diperbarui.");
    }

    public function verify(Request $request, Document $document): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $caseId = $document->deed_case_id
            ?? $document->client?->deedCases()->latest('id')->value('id');

        $document->update([
            'deed_case_id' => $caseId,
            'is_verified' => true,
            'is_rejected' => false,
            'is_complete_checked' => true,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'catatan_notaris' => $data['notes'] ?? null,
        ]);

        $detail = $document->nama.(! empty($data['notes']) ? ": {$data['notes']}" : '');
        $this->activityLog->record($request->user(), 'ACC / Verifikasi dokumen', $document, $detail);

        $targetCase = $caseId ? DeedCase::find($caseId) : null;
        if (
            $targetCase
            && ! $targetCase->is_completed
            && $targetCase->doc_approval_status !== 'approved'
            && $this->workflow->allCaseDocumentsVerified($targetCase)
        ) {
            $this->workflow->approveDocVerification($targetCase, $request->user(), $data['notes'] ?? null);
        }

        return back()->with('success', "Dokumen \"{$document->nama}\" di-ACC & dinyatakan sah.");
    }

    public function reject(Request $request, Document $document): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $document->update([
            'is_verified' => false,
            'is_rejected' => true,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'catatan_notaris' => $data['notes'],
        ]);

        $this->activityLog->record($request->user(), 'Tolak dokumen', $document, "{$document->nama}: {$data['notes']}");

        $targetCase = $document->deedCase;
        if (
            $targetCase
            && ! $targetCase->is_completed
            && in_array($targetCase->doc_approval_status, ['pending_approval', 'approved'], true)
        ) {
            $this->workflow->rejectDocVerification($targetCase, $request->user(), $data['notes']);
        }

        return back()->with('success', "Dokumen \"{$document->nama}\" ditolak dengan catatan.");
    }

    public function download(Request $request, Document $document): StreamedResponse
    {
        abort_unless($document->file_path !== null, 404, 'Dokumen ini tidak memiliki lampiran file.');

        return $this->fileStorage->serve(
            $document->file_disk ?: (string) config('filesystems.default', 'local'),
            $document->file_path,
            $document->file_name ?: 'dokumen',
            $request->boolean('download'),
        );
    }

    public function destroy(Request $request, Document $document): RedirectResponse
    {
        Gate::authorize('notaris');

        $name = $document->nama;
        $this->fileStorage->delete($document->file_disk, $document->file_path);
        $document->delete();

        $this->activityLog->record($request->user(), 'Hapus dokumen', null, $name);

        return back()->with('success', "Dokumen \"{$name}\" berhasil dihapus.");
    }
}
