<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Services\ActivityLogService;
use App\Services\CodeGeneratorService;
use App\Services\DeedWorkflowService;
use App\Services\FileStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        private readonly CodeGeneratorService $codeGenerator,
        private readonly ActivityLogService $activityLog,
        private readonly FileStorageService $fileStorage,
        private readonly DeedWorkflowService $workflow,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'proses');
        if (! in_array($status, ['proses', 'selesai'], true)) {
            $status = 'proses';
        }

        $clients = Client::query()
            ->with([
                'company',
                'deedCases' => fn ($q) => $q->select(['id', 'client_id', 'nomor', 'current_stage', 'is_completed'])->latest('id'),
            ])
            ->withCount([
                'deedCases',
                'documents',
                'deedCases as active_cases_count' => fn ($q) => $q->where('is_completed', false),
                'deedCases as completed_cases_count' => fn ($q) => $q->where('is_completed', true),
            ])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where(function ($q) use ($like) {
                    $q->where('kode', 'ilike', $like)
                        ->orWhere('nama', 'ilike', $like)
                        ->orWhere('nik', 'ilike', $like)
                        ->orWhere('telepon', 'ilike', $like)
                        ->orWhere('email', 'ilike', $like)
                        ->orWhereHas('company', fn ($cq) => $cq->where('nama', 'ilike', $like));
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

        $prosesCount = Client::query()
            ->where(function ($q) {
                $q->whereDoesntHave('deedCases')
                    ->orWhereHas('deedCases', fn ($cq) => $cq->where('is_completed', false));
            })
            ->count();

        $selesaiCount = Client::query()
            ->whereHas('deedCases')
            ->whereDoesntHave('deedCases', fn ($q) => $q->where('is_completed', false))
            ->count();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'counts' => [
                'proses' => $prosesCount,
                'selesai' => $selesaiCount,
            ],
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

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateClient($request);

        [$client, $deedCase] = DB::transaction(function () use ($validated, $request): array {
            $kode = trim((string) ($validated['client']['kode'] ?? ''));

            $client = Client::create([
                ...$validated['client'],
                'kode' => $kode !== '' ? $kode : $this->codeGenerator->nextClientCode(),
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

    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $this->validateClient($request, $client);

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

            if ($latestCase) {
                $isBadanUsaha = collect(config('notaris.jenis_akta', []))
                    ->firstWhere('label', $jenisAkta)['is_badan_usaha'] ?? false;

                $latestCase->update([
                    'jenis_akta' => $jenisAkta,
                    'is_badan_usaha' => (bool) $isBadanUsaha,
                    'biaya' => $validated['case']['biaya'] ?? $latestCase->biaya,
                    'target_selesai' => $validated['case']['target_selesai'] ?? $latestCase->target_selesai,
                ]);
            } else {
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
            $this->workflow->resubmitRevisionIfNeeded($latestCase, $request->user());

            $this->activityLog->record($request->user(), 'Ubah data klien', $client, "{$client->kode} — {$client->nama}");
        });

        return redirect()
            ->route('clients.show', $client)
            ->with('success', "Data klien {$client->kode} berhasil diperbarui.");
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        $label = "{$client->kode} — {$client->displayName()}";

        // Clean up attached files from storage before deleting database rows
        $client->load(['documents', 'deedCases.payments']);
        foreach ($client->documents as $doc) {
            $this->fileStorage->delete($doc->file_disk, $doc->file_path);
        }
        foreach ($client->deedCases as $case) {
            foreach ($case->payments as $payment) {
                $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
            }
        }

        $client->delete();

        $this->activityLog->record($request->user(), 'Hapus klien', null, $label);

        return back()->with('success', "Data klien {$label} beserta berkas terkait berhasil dihapus.");
    }

    /**
     * @return array{client: array<string, mixed>, company: array<string, mixed>, case: array<string, mixed>}
     */
    private function validateClient(Request $request, ?Client $client = null): array
    {
        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $data = $request->validate([
            'kode' => ['nullable', 'string', 'max:24', Rule::unique('clients', 'kode')->ignore($client?->id)],
            'jenis' => ['required', 'in:pribadi,perusahaan'],
            'nama' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'string', 'max:32'],
            'npwp' => ['nullable', 'string', 'max:32'],
            'tempat_lahir' => ['nullable', 'string', 'max:120'],
            'tanggal_lahir' => ['nullable', 'date'],
            'jenis_kelamin' => ['nullable', 'string', 'max:20'],
            'agama' => ['nullable', 'string', 'max:30'],
            'kewarganegaraan' => ['nullable', 'string', 'max:10'],
            'status_perkawinan' => ['nullable', 'string', 'max:30'],
            'pekerjaan' => ['nullable', 'string', 'max:120'],
            'nama_ibu_kandung' => ['nullable', 'string', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'alamat' => ['nullable', 'string', 'max:1000'],
            'rt_rw' => ['nullable', 'string', 'max:20'],
            'kelurahan' => ['nullable', 'string', 'max:120'],
            'kecamatan' => ['nullable', 'string', 'max:120'],
            'kota' => ['nullable', 'string', 'max:120'],
            'provinsi' => ['nullable', 'string', 'max:120'],
            'kode_pos' => ['nullable', 'string', 'max:12'],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'company' => ['nullable', 'array'],
            'company.nama' => ['nullable', 'string', 'max:255'],
            'company.bentuk_badan' => ['nullable', 'string', 'max:64'],
            'company.jabatan' => ['nullable', 'string', 'max:120'],
            'company.bidang_usaha' => ['nullable', 'string', 'max:255'],
            'company.kbli' => ['nullable', 'string', 'max:64'],
            'company.tahun_berdiri' => ['nullable', 'string', 'max:10'],
            'company.npwp' => ['nullable', 'string', 'max:32'],
            'company.nib' => ['nullable', 'string', 'max:64'],
            'company.sk_kemenkumham' => ['nullable', 'string', 'max:255'],
            'company.alamat' => ['nullable', 'string', 'max:1000'],
            'company.kota' => ['nullable', 'string', 'max:120'],
            'company.provinsi' => ['nullable', 'string', 'max:120'],
            'company.kode_pos' => ['nullable', 'string', 'max:12'],
            'company.telepon' => ['nullable', 'string', 'max:32'],
            'company.email' => ['nullable', 'email', 'max:255'],
            'company.modal_dasar' => ['nullable', 'numeric', 'min:0'],
            'company.modal_ditempatkan' => ['nullable', 'numeric', 'min:0'],
            'company.modal_disetor' => ['nullable', 'numeric', 'min:0'],
            'company.jumlah_saham' => ['nullable', 'integer', 'min:0'],
            'company.nominal_saham' => ['nullable', 'numeric', 'min:0'],
            'company.direktur' => ['nullable', 'string', 'max:255'],
            'company.komisaris' => ['nullable', 'string', 'max:255'],
            'attachments' => ['nullable', 'array'],
            'attachments.*.kategori' => ['required_with:attachments.*.file', 'string', 'max:64'],
            'attachments.*.nama' => ['required_with:attachments.*.file', 'string', 'max:255'],
            'attachments.*.nomor_dokumen' => ['nullable', 'string', 'max:100'],
            'attachments.*.file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
            'jenis_akta' => ['nullable', 'string', 'max:255'],
            'biaya' => ['nullable', 'numeric', 'min:0'],
            'target_selesai' => ['nullable', 'date'],
        ]);

        $company = $data['company'] ?? [];
        $case = [
            'jenis_akta' => $data['jenis_akta'] ?? null,
            'biaya' => $data['biaya'] ?? 0,
            'target_selesai' => $data['target_selesai'] ?? null,
        ];
        unset($data['company'], $data['attachments'], $data['jenis_akta'], $data['biaya'], $data['target_selesai']);

        return [
            'client' => $data,
            'company' => $company,
            'case' => $case,
        ];
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
            $this->workflow->resubmitRevisionIfNeeded($deedCase, $request->user());
        }
    }
}
