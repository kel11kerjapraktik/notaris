<?php

namespace App\Http\Controllers;

use App\Enums\DeedStage;
use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\DeedCase;
use App\Models\Payment;
use App\Services\ActivityLogService;
use App\Services\CodeGeneratorService;
use App\Services\DeedWorkflowService;
use App\Services\FileStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentController extends Controller
{
    public function __construct(
        private readonly CodeGeneratorService $codeGenerator,
        private readonly FileStorageService $fileStorage,
        private readonly ActivityLogService $activityLog,
        private readonly DeedWorkflowService $workflow,
    ) {}

    public function index(Request $request): Response
    {
        $status = (string) $request->query('status', 'semua');

        $payments = Payment::query()
            ->with(['deedCase.client.company', 'submitter:id,name', 'confirmer:id,name'])
            ->when($status !== 'semua', fn ($q) => $q->where('status', $status))
            ->latest()
            ->get();

        $cases = DeedCase::query()
            ->with(['client.company'])
            ->withCount('payments')
            ->withSum(['payments as terbayar' => fn ($q) => $q->where('status', PaymentStatus::LUNAS)], 'jumlah')
            ->latest()
            ->get()
            ->map(fn (DeedCase $case) => [
                'id' => $case->id,
                'nomor' => $case->nomor,
                'client_name' => $case->client->displayName(),
                'jenis_akta' => $case->jenis_akta,
                'biaya' => $case->biaya,
                'terbayar' => (float) ($case->getAttribute('terbayar') ?? 0),
                'next_termin' => ((int) $case->getAttribute('payments_count')) + 1,
            ]);

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

        $summary = [
            'total_kontrak' => (float) ($paymentAgg?->total_kontrak ?? 0),
            'total_diterima' => (float) ($paymentAgg?->total_diterima ?? 0),
            'total_menunggu' => (float) ($paymentAgg?->total_menunggu ?? 0),
            'count_menunggu' => (int) ($paymentAgg?->count_menunggu ?? 0),
            'total_belum' => (float) ($paymentAgg?->total_belum ?? 0),
            'count_belum' => (int) ($paymentAgg?->count_belum ?? 0),
        ];

        return Inertia::render('payments/index', [
            'payments' => $payments,
            'cases' => $cases,
            'summary' => $summary,
            'filters' => ['status' => $status],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $data = $request->validate([
            'deed_case_id' => ['required', 'exists:deed_cases,id'],
            'termin_ke' => ['required', 'integer', 'min:1'],
            'payment_type' => ['required', 'in:dp_50,pelunasan,termin_lain'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'jumlah' => ['required', 'numeric', 'min:1'],
            'jatuh_tempo' => ['nullable', 'date'],
            'tanggal_bayar' => ['nullable', 'date'],
            'metode' => ['required', 'string', 'max:40'],
            'no_referensi' => ['nullable', 'string', 'max:100'],
            'mark_as_paid' => ['boolean'],
            'bukti' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
        ]);

        $fileMeta = [];
        if ($request->hasFile('bukti')) {
            $stored = $this->fileStorage->store($request->file('bukti'), "cases/{$data['deed_case_id']}/payments");
            $fileMeta = [
                'bukti_disk' => $stored['disk'],
                'bukti_path' => $stored['path'],
                'bukti_name' => $stored['name'],
                'bukti_mime' => $stored['mime'],
                'bukti_size' => $stored['size'],
            ];
        }

        $isSubmitted = (bool) ($data['mark_as_paid'] ?? false) || $request->hasFile('bukti');
        $status = $isSubmitted ? PaymentStatus::MENUNGGU : PaymentStatus::BELUM;

        $payment = Payment::create([
            'deed_case_id' => $data['deed_case_id'],
            'no_inv' => $this->codeGenerator->nextInvoiceNumber(),
            'termin_ke' => $data['termin_ke'],
            'payment_type' => PaymentType::from($data['payment_type']),
            'keterangan' => $data['keterangan'] ?? PaymentType::from($data['payment_type'])->label(),
            'jumlah' => $data['jumlah'],
            'jatuh_tempo' => $data['jatuh_tempo'] ?? now()->toDateString(),
            'tanggal_bayar' => $isSubmitted ? ($data['tanggal_bayar'] ?? now()->toDateString()) : null,
            'metode' => $data['metode'],
            'no_referensi' => $data['no_referensi'] ?? null,
            'status' => $status,
            'submitted_by' => $isSubmitted ? $request->user()->id : null,
            ...$fileMeta,
        ]);

        $this->activityLog->record($request->user(), 'Tambah termin pembayaran', $payment, $payment->no_inv);

        return back()->with('success', $isSubmitted
            ? "Bukti pembayaran {$payment->no_inv} dicatat & menunggu ACC Notaris."
            : "Tagihan {$payment->no_inv} berhasil dibuat.");
    }

    public function update(Request $request, Payment $payment): RedirectResponse
    {
        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $data = $request->validate([
            'termin_ke' => ['required', 'integer', 'min:1'],
            'payment_type' => ['required', 'in:dp_50,pelunasan,termin_lain'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'jumlah' => ['required', 'numeric', 'min:1'],
            'jatuh_tempo' => ['nullable', 'date'],
            'tanggal_bayar' => ['nullable', 'date'],
            'metode' => ['required', 'string', 'max:40'],
            'no_referensi' => ['nullable', 'string', 'max:100'],
            'bukti' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
        ]);

        if ($request->hasFile('bukti')) {
            $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
            $stored = $this->fileStorage->store($request->file('bukti'), "cases/{$payment->deed_case_id}/payments");
            $payment->fill([
                'bukti_disk' => $stored['disk'],
                'bukti_path' => $stored['path'],
                'bukti_name' => $stored['name'],
                'bukti_mime' => $stored['mime'],
                'bukti_size' => $stored['size'],
            ]);
            if ($payment->status === PaymentStatus::BELUM) {
                $payment->status = PaymentStatus::MENUNGGU;
                $payment->submitted_by = $request->user()->id;
                $payment->tanggal_bayar = $data['tanggal_bayar'] ?? now()->toDateString();
            }
        }

        $payment->fill([
            'termin_ke' => $data['termin_ke'],
            'payment_type' => PaymentType::from($data['payment_type']),
            'keterangan' => $data['keterangan'] ?? null,
            'jumlah' => $data['jumlah'],
            'jatuh_tempo' => $data['jatuh_tempo'] ?? null,
            'tanggal_bayar' => $data['tanggal_bayar'] ?? $payment->tanggal_bayar,
            'metode' => $data['metode'],
            'no_referensi' => $data['no_referensi'] ?? null,
        ]);
        $payment->save();

        $this->activityLog->record($request->user(), 'Ubah termin pembayaran', $payment, $payment->no_inv);

        return back()->with('success', "Termin {$payment->no_inv} berhasil diperbarui.");
    }

    public function submitProof(Request $request, Payment $payment): RedirectResponse
    {
        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $data = $request->validate([
            'tanggal_bayar' => ['nullable', 'date'],
            'metode' => ['nullable', 'string', 'max:40'],
            'no_referensi' => ['nullable', 'string', 'max:100'],
            'bukti' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
        ]);

        if ($request->hasFile('bukti')) {
            $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
            $stored = $this->fileStorage->store($request->file('bukti'), "cases/{$payment->deed_case_id}/payments");
            $payment->fill([
                'bukti_disk' => $stored['disk'],
                'bukti_path' => $stored['path'],
                'bukti_name' => $stored['name'],
                'bukti_mime' => $stored['mime'],
                'bukti_size' => $stored['size'],
            ]);
        }

        $payment->fill([
            'status' => PaymentStatus::MENUNGGU,
            'tanggal_bayar' => $data['tanggal_bayar'] ?? now()->toDateString(),
            'metode' => $data['metode'] ?? $payment->metode,
            'no_referensi' => $data['no_referensi'] ?? $payment->no_referensi,
            'submitted_by' => $request->user()->id,
            'catatan_notaris' => null,
        ]);
        $payment->save();

        $this->activityLog->record($request->user(), 'Ajukan konfirmasi pembayaran', $payment, $payment->no_inv);

        return back()->with('success', "Bukti pembayaran {$payment->no_inv} dikirim. Menunggu ACC Notaris.");
    }

    public function confirm(Request $request, Payment $payment): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $payment->update([
            'status' => PaymentStatus::LUNAS,
            'tanggal_bayar' => $payment->tanggal_bayar ?? now()->toDateString(),
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
            'catatan_notaris' => $data['notes'] ?? null,
        ]);

        $detail = $payment->no_inv.(! empty($data['notes']) ? ": {$data['notes']}" : '');
        $this->activityLog->record($request->user(), 'ACC / Konfirmasi pembayaran', $payment, $detail);

        $case = $payment->deedCase;
        if ($case && ! $case->is_completed) {
            $shouldAdvanceDp = $case->current_stage === DeedStage::PEMBAYARAN_DP
                && in_array($payment->payment_type, [PaymentType::DP_50, PaymentType::TERMIN_LAIN], true);

            $shouldCompleteFinal = $case->current_stage === DeedStage::PELUNASAN_BIAYA
                && $payment->payment_type === PaymentType::PELUNASAN
                && ! $case->payments()->where('status', PaymentStatus::MENUNGGU)->exists();

            if ($shouldAdvanceDp || $shouldCompleteFinal) {
                $this->workflow->advanceStage(
                    $case,
                    $request->user(),
                    $data['notes'] ?? ($shouldCompleteFinal
                        ? 'Pelunasan biaya di-ACC Notaris & berkas selesai.'
                        : 'Pembayaran DP 50% di-ACC Notaris.'),
                );
            }
        }

        return back()->with('success', "Pembayaran {$payment->no_inv} telah di-ACC & dinyatakan Lunas.");
    }

    public function reject(Request $request, Payment $payment): RedirectResponse
    {
        Gate::authorize('notaris');

        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $payment->update([
            'status' => PaymentStatus::DITOLAK,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
            'catatan_notaris' => $data['notes'],
        ]);

        $this->activityLog->record($request->user(), 'Tolak pembayaran', $payment, "{$payment->no_inv}: {$data['notes']}");

        return back()->with('success', "Pembayaran {$payment->no_inv} ditolak dengan catatan.");
    }

    public function cancelConfirm(Request $request, Payment $payment): RedirectResponse
    {
        Gate::authorize('notaris');

        $payment->update([
            'status' => PaymentStatus::BELUM,
            'confirmed_by' => null,
            'confirmed_at' => null,
        ]);

        $this->activityLog->record($request->user(), 'Batalkan konfirmasi pembayaran', $payment, $payment->no_inv);

        return back()->with('success', "Konfirmasi pembayaran {$payment->no_inv} dibatalkan.");
    }

    public function downloadProof(Request $request, Payment $payment): StreamedResponse
    {
        abort_unless($payment->bukti_path !== null, 404, 'Bukti pembayaran tidak ditemukan.');

        return $this->fileStorage->serve(
            $payment->bukti_disk ?: (string) config('filesystems.default', 'local'),
            $payment->bukti_path,
            $payment->bukti_name ?: 'bukti-pembayaran',
            $request->boolean('download'),
        );
    }

    public function destroy(Request $request, Payment $payment): RedirectResponse
    {
        Gate::authorize('notaris');

        $inv = $payment->no_inv;
        $this->fileStorage->delete($payment->bukti_disk, $payment->bukti_path);
        $payment->delete();

        $this->activityLog->record($request->user(), 'Hapus termin pembayaran', null, $inv);

        return back()->with('success', "Termin {$inv} berhasil dihapus.");
    }
}
