<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertClientRequest;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Services\ActivityLogService;
use App\Services\CodeGeneratorService;
use App\Services\DeedWorkflowService;
use App\Services\FileStorageService;
use App\Services\NotarisStatsService;
use App\Support\DatabaseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        private readonly CodeGeneratorService $codeGenerator,
        private readonly ActivityLogService $activityLog,
        private readonly FileStorageService $fileStorage,
        private readonly DeedWorkflowService $workflow,
        private readonly NotarisStatsService $stats,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'proses');
        if (! in_array($status, ['proses', 'selesai'], true)) {
            $status = 'proses';
        }

        $clients = Client::query()
            ->select(['id', 'kode', 'jenis', 'nama', 'nik', 'telepon', 'email', 'created_at'])
            ->with([
                'company:id,client_id,nama',
                'deedCases' => fn ($q) => $q->select(['id', 'client_id', 'nomor', 'current_stage', 'is_completed'])->latest('id'),
            ])
            ->withCount([
                'deedCases',
                'documents',
                'deedCases as active_cases_count' => fn ($q) => $q->where('is_completed', false),
                'deedCases as completed_cases_count' => fn ($q) => $q->where('is_completed', true),
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    DatabaseSearch::orWhereLikeAny($q, ['kode', 'nama', 'nik', 'telepon', 'email'], $search)
                        ->orWhereHas('company', fn ($cq) => DatabaseSearch::whereLike($cq, 'nama', $search));
                });
            }, function ($query) use ($status) {
                if ($status === 'selesai') {
                    $query->whereHas('deedCases')
                        ->whereDoesntHave('deedCases', fn ($q) => $q->where('is_completed', false));
                } else {
                    $query->where(function ($q) {
                        $q->whereDoesntHave('deedCases')
                            ->orWhereHas('deedCases', fn ($cq) => $cq->where('is_completed', false));
                    });
                }
            })
            ->latest()
            ->get()
            ->map(function (Client $client) {
                $activeCases = $client->deedCases
                    ->where('is_completed', false)
                    ->values()
                    ->map(fn (DeedCase $dc) => [
                        'id' => $dc->id,
                        'nomor' => $dc->nomor,
                        'stage_order' => $dc->current_stage->order(),
                        'stage_label' => $dc->current_stage->label(),
                        'is_completed' => $dc->is_completed,
                    ]);

                $latestCase = $client->deedCases->first();

                return [
                    ...$client->toArray(),
                    'active_stages' => $activeCases->isNotEmpty()
                        ? $activeCases
                        : ($latestCase ? [[
                            'id' => $latestCase->id,
                            'nomor' => $latestCase->nomor,
                            'stage_order' => $latestCase->current_stage->order(),
                            'stage_label' => $latestCase->current_stage->label(),
                            'is_completed' => $latestCase->is_completed,
                        ]] : []),
                ];
            });

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'counts' => $this->stats->clientTabCounts(),
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('clients/form', [
            'client' => null,
            'suggestedKode' => $this->codeGenerator->nextClientCode(),
        ]);
    }

    public function store(UpsertClientRequest $request): RedirectResponse
    {
        $validated = $request->sections();

        [$client, $deedCase] = DB::transaction(function () use ($validated, $request): array {
            $requestedKode = trim((string) ($validated['client']['kode'] ?? ''));
            $kode = ($requestedKode !== '' && ! Client::where('kode', $requestedKode)->exists())
                ? $requestedKode
                : $this->codeGenerator->nextClientCode();

            $client = Client::create([
                ...$validated['client'],
                'kode' => $kode,
                'created_by' => $request->user()->id,
            ]);

            if ($client->jenis === 'perusahaan' && ! empty($validated['company'])) {
                $client->company()->create($validated['company']);
            }

            $defaultJenis = $client->jenis === 'perusahaan' ? 'Akta Pendirian PT' : 'Lainnya';
            $deedCase = $this->workflow->createCase([
                'client_id' => $client->id,
                'jenis_akta' => $validated['case']['jenis_akta'] ?: $defaultJenis,
                'biaya' => $validated['case']['biaya'] ?? 0,
                'target_selesai' => $validated['case']['target_selesai'] ?? null,
                'penanggung_jawab' => $request->user()->name,
                'catatan' => $client->catatan,
            ], $request->user());

            $this->storeAttachments($request, $client, $deedCase);

            $this->activityLog->record($request->user(), 'Tambah klien', $client, "{$client->kode} — {$client->nama}");

            return [$client, $deedCase];
        });

        return redirect()
            ->route('clients.show', $client)
            ->with('success', "Data klien {$client->kode} tersimpan & otomatis masuk Monitoring Akta ({$deedCase->nomor}).");
    }

    public function show(Client $client): Response
    {
        $client->load([
            'company',
            'deedCases.payments',
            'documents',
        ]);

        return Inertia::render('clients/show', [
            'client' => $client,
        ]);
    }

    public function edit(Client $client): Response
    {
        $client->load([
            'company',
            'documents',
            'deedCases' => fn ($q) => $q->latest('id'),
        ]);

        return Inertia::render('clients/form', [
            'client' => $client,
        ]);
    }

    public function update(UpsertClientRequest $request, Client $client): RedirectResponse
    {
        $validated = $request->sections();

        DB::transaction(function () use ($validated, $client, $request): void {
            $kode = trim((string) ($validated['client']['kode'] ?? ''));
            $validated['client']['kode'] = $kode !== '' ? $kode : $client->kode;

            $client->update($validated['client']);

            if ($client->jenis === 'perusahaan') {
                $client->company()->updateOrCreate(
                    ['client_id' => $client->id],
                    $validated['company'] ?? [],
                );
            } else {
                $client->company()?->delete();
            }

            $latestCase = $client->deedCases()->latest('id')->first();
            $defaultJenis = $client->jenis === 'perusahaan' ? 'Akta Pendirian PT' : 'Lainnya';
            $jenisAkta = $validated['case']['jenis_akta'] ?: ($latestCase?->jenis_akta ?? $defaultJenis);

            if ($latestCase && ! $latestCase->is_completed) {
                $isBadanUsaha = collect(config('notaris.jenis_akta', []))
                    ->firstWhere('label', $jenisAkta)['is_badan_usaha'] ?? false;

                $latestCase->update([
                    'jenis_akta' => $jenisAkta,
                    'is_badan_usaha' => (bool) $isBadanUsaha,
                    'biaya' => $validated['case']['biaya'] ?? $latestCase->biaya,
                    'target_selesai' => $validated['case']['target_selesai'] ?? $latestCase->target_selesai,
                ]);
            } elseif (! $latestCase) {
                $latestCase = $this->workflow->createCase([
                    'client_id' => $client->id,
                    'jenis_akta' => $jenisAkta,
                    'biaya' => $validated['case']['biaya'] ?? 0,
                    'target_selesai' => $validated['case']['target_selesai'] ?? null,
                    'penanggung_jawab' => $request->user()->name,
                    'catatan' => $client->catatan,
                ], $request->user());
            }

            $this->storeAttachments($request, $client, $latestCase);

            $this->activityLog->record($request->user(), 'Ubah data klien', $client, "{$client->kode} — {$client->nama}");
        });

        return redirect()
            ->route('clients.show', $client)
            ->with('success', "Data klien {$client->kode} berhasil diperbarui.");
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        Gate::authorize('notaris');

        $label = "{$client->kode} — {$client->displayName()}";

        // Collect file paths first, delete DB rows atomically, then purge files from storage
        $client->load(['documents', 'deedCases.payments']);
        $filesToDelete = [];
        foreach ($client->documents as $doc) {
            $filesToDelete[] = [$doc->file_disk, $doc->file_path];
        }
        foreach ($client->deedCases as $case) {
            foreach ($case->payments as $payment) {
                $filesToDelete[] = [$payment->bukti_disk, $payment->bukti_path];
            }
        }

        DB::transaction(function () use ($client, $request, $label): void {
            $client->delete();
            $this->activityLog->record($request->user(), 'Hapus klien', null, $label);
        });

        foreach ($filesToDelete as [$disk, $path]) {
            $this->fileStorage->delete($disk, $path);
        }

        return back()->with('success', "Data klien {$label} beserta berkas terkait berhasil dihapus.");
    }

    private function storeAttachments(Request $request, Client $client, ?DeedCase $deedCase = null): void
    {
        $attachments = $request->input('attachments', []);
        if (! is_array($attachments)) {
            return;
        }

        $uploadedCount = 0;

        foreach ($attachments as $index => $item) {
            $file = $request->file("attachments.{$index}.file");
            if (! $file) {
                continue;
            }

            $stored = $this->fileStorage->store($file, "clients/{$client->id}/documents");

            Document::create([
                'client_id' => $client->id,
                'deed_case_id' => $deedCase?->id,
                'kategori' => $item['kategori'] ?? 'Berkas Pendukung',
                'nama' => $item['nama'] ?? $stored['name'],
                'nomor_dokumen' => $item['nomor_dokumen'] ?? null,
                'tanggal_dokumen' => now()->toDateString(),
                'file_disk' => $stored['disk'],
                'file_path' => $stored['path'],
                'file_name' => $stored['name'],
                'mime_type' => $stored['mime'],
                'file_size' => $stored['size'],
                'is_complete_checked' => true,
                'uploaded_by' => $request->user()->id,
            ]);

            $uploadedCount++;
        }

        if ($uploadedCount > 0 && $deedCase) {
            $this->workflow->resubmitRevisionIfNeeded($deedCase, $request->user(), includeDraft: false);
        }
    }
}
