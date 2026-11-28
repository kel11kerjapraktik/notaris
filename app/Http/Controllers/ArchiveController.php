<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Services\ActivityLogService;
use App\Services\FileStorageService;
use App\Support\DatabaseSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    public const BAST_CATEGORY = 'Berita Acara Serah Terima (BAST)';

    public function __construct(
        private FileStorageService $fileStorage,
        private ActivityLogService $activityLog,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $clients = Client::query()
            ->select(['id', 'kode', 'jenis', 'nama', 'nik', 'telepon', 'email'])
            ->with([
                'company:id,client_id,nama',
                'deedCases' => fn ($q) => $q->select([
                    'id',
                    'client_id',
                    'nomor',
                    'jenis_akta',
                    'current_stage',
                    'is_completed',
                    'biaya',
                    'nomor_akta',
                    'tanggal_akta',
                    'nomor_sk_ahu',
                    'tanggal_sk_ahu',
                    'completed_at',
                ])->withSum(
                    ['payments as terbayar' => fn ($pq) => $pq->where('status', PaymentStatus::LUNAS)],
                    'jumlah',
                ),
                'documents' => fn ($q) => $q->select([
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
                    'created_at',
                ])->latest(),
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    DatabaseSearch::orWhereLikeAny($q, ['kode', 'nama'], $search)
                        ->orWhereHas('company', fn ($cq) => DatabaseSearch::whereLike($cq, 'nama', $search));
                });
            })
            ->orderBy('nama')
            ->get()
            ->map(fn (Client $client) => [
                'id' => $client->id,
                'kode' => $client->kode,
                'jenis' => $client->jenis,
                'nama' => $client->nama,
                'nik' => $client->nik,
                'telepon' => $client->telepon,
                'email' => $client->email,
                'company_name' => $client->company?->nama,
                'cases' => $client->deedCases->map(function (DeedCase $case) use ($client): array {
                    $bastDocument = $client->documents->first(
                        fn (Document $doc) => $doc->deed_case_id === $case->id
                            && $doc->kategori === self::BAST_CATEGORY,
                    );

                    return [
                        'id' => $case->id,
                        'nomor' => $case->nomor,
                        'jenis_akta' => $case->jenis_akta,
                        'current_stage_label' => $case->current_stage->label(),
                        'is_completed' => $case->is_completed,
                        'biaya' => $case->biaya,
                        'terbayar' => (float) ($case->getAttribute('terbayar') ?? 0),
                        'nomor_akta' => $case->nomor_akta,
                        'tanggal_akta' => $case->tanggal_akta?->toDateString(),
                        'nomor_sk_ahu' => $case->nomor_sk_ahu,
                        'tanggal_sk_ahu' => $case->tanggal_sk_ahu?->toDateString(),
                        'completed_at' => $case->completed_at?->toDateString(),
                        'bast_document' => $bastDocument,
                    ];
                }),
                'documents' => $client->documents,
            ]);

        return Inertia::render('archives/index', [
            'folders' => $clients,
            'filters' => ['search' => $search],
        ]);
    }

    public function uploadBast(Request $request, DeedCase $deedCase): RedirectResponse
    {
        abort_unless($deedCase->is_completed, 422, 'BAST hanya dapat diunggah setelah seluruh tahapan akta selesai.');

        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
            'tanggal_dokumen' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
        ]);

        $stored = $this->fileStorage->store($request->file('file'), "clients/{$deedCase->client_id}/documents");

        $existing = Document::query()
            ->where('deed_case_id', $deedCase->id)
            ->where('kategori', self::BAST_CATEGORY)
            ->latest('id')
            ->first();

        $payload = [
            'client_id' => $deedCase->client_id,
            'deed_case_id' => $deedCase->id,
            'kategori' => self::BAST_CATEGORY,
            'nama' => "BAST — {$deedCase->nomor} ({$deedCase->jenis_akta})",
            'nomor_dokumen' => "BAST/{$deedCase->nomor}",
            'tanggal_dokumen' => $data['tanggal_dokumen'] ?? now()->toDateString(),
            'keterangan' => $data['keterangan'] ?? "Berita Acara Serah Terima dokumen akta {$deedCase->nomor} yang telah ditandatangani oleh Klien, Notaris, dan Admin.",
            'is_complete_checked' => true,
            'is_verified' => true,
            'is_rejected' => false,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'uploaded_by' => $request->user()->id,
            'file_disk' => $stored['disk'],
            'file_path' => $stored['path'],
            'file_name' => $stored['name'],
            'mime_type' => $stored['mime'],
            'file_size' => $stored['size'],
        ];

        if ($existing) {
            $this->fileStorage->delete($existing->file_disk, $existing->file_path);
            $existing->update($payload);
        } else {
            Document::create($payload);
        }

        $this->activityLog->record(
            $request->user(),
            'Unggah BAST bertanda tangan',
            $deedCase,
            "BAST untuk {$deedCase->nomor} ({$deedCase->jenis_akta})",
        );

        return back()->with('success', "Dokumen BAST bertanda tangan untuk {$deedCase->nomor} berhasil disimpan ke arsip.");
    }
}
