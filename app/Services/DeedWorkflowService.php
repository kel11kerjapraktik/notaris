<?php

namespace App\Services;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\CaseStageHistory;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeedWorkflowService
{
    public function __construct(
        private readonly CodeGeneratorService $codeGenerator,
        private readonly ActivityLogService $activityLog,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createCase(array $data, User $actor): DeedCase
    {
        return DB::transaction(function () use ($data, $actor): DeedCase {
            $isBadanUsaha = $this->resolveIsBadanUsaha((string) $data['jenis_akta']);

            $case = DeedCase::create([
                'nomor' => $this->codeGenerator->nextCaseNumber(),
                'client_id' => $data['client_id'],
                'jenis_akta' => $data['jenis_akta'],
                'is_badan_usaha' => $isBadanUsaha,
                'biaya' => $data['biaya'] ?? 0,
                'target_selesai' => $data['target_selesai'] ?? null,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? $actor->name,
                'assigned_to' => $data['assigned_to'] ?? $actor->id,
                'current_stage' => DeedStage::BIODATA_KLIEN,
                'draft_status' => DraftStatus::NONE,
                'catatan' => $data['catatan'] ?? null,
                'created_by' => $actor->id,
            ]);

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => DeedStage::BIODATA_KLIEN->order(),
                'stage_key' => DeedStage::BIODATA_KLIEN->value,
                'action' => 'started',
                'notes' => 'Berkas dibuat & biodata klien dicatat.',
                'acted_by' => $actor->id,
            ]);

            $this->activityLog->record($actor, 'Buat berkas akta', $case, $case->nomor);

            return $case;
        });
    }

    /**
     * Advance a deed case to the next stage (or complete stage 10).
     *
     * @param  array<string, mixed>  $metadata
     */
    public function advanceStage(DeedCase $case, User $actor, ?string $notes = null, array $metadata = []): DeedCase
    {
        return DB::transaction(function () use ($case, $actor, $notes, $metadata): DeedCase {
            $current = $case->current_stage;

            if ($case->is_completed) {
                throw ValidationException::withMessages([
                    'stage' => 'Berkas akta ini sudah selesai sepenuhnya.',
                ]);
            }

            // Save optional stage-specific metadata first so stage exit guards see submitted values
            $fillableMeta = array_filter(
                array_intersect_key($metadata, array_flip([
                    'nomor_akta',
                    'tanggal_akta',
                    'tanggal_ttd_minuta',
                    'nomor_sk_ahu',
                    'tanggal_sk_ahu',
                    'tanggal_pemilik_manfaat',
                    'status_pemilik_manfaat',
                    'nomor_tbnri',
                    'tanggal_tbnri',
                    'nib_perusahaan',
                    'kbli_oss',
                ])),
                static fn (mixed $value): bool => $value !== null && $value !== '',
            );

            if ($fillableMeta !== []) {
                $case->fill($fillableMeta);
            }

            $this->guardStageExit($case, $current, $actor);

            $next = $current->next();

            if ($next === null) {
                // Completing Stage 10: Pelunasan Biaya (requires Notaris ACC & lunas payment)
                if (! $actor->isNotaris()) {
                    throw ValidationException::withMessages([
                        'stage' => 'Penyelesaian akhir (Pelunasan Biaya) hanya dapat disahkan oleh Notaris.',
                    ]);
                }

                $hasPending = $case->payments()->where('status', PaymentStatus::MENUNGGU)->exists();
                if ($hasPending) {
                    throw ValidationException::withMessages([
                        'stage' => 'Masih ada pembayaran yang menunggu ACC Notaris. Konfirmasi terlebih dahulu di tab Pembayaran.',
                    ]);
                }

                $case->is_completed = true;
                $case->completed_at = now();
                $case->save();

                CaseStageHistory::create([
                    'deed_case_id' => $case->id,
                    'stage_order' => $current->order(),
                    'stage_key' => $current->value,
                    'action' => 'completed',
                    'notes' => $notes ?: 'Pelunasan biaya disahkan & dokumen diserahterimakan.',
                    'acted_by' => $actor->id,
                ]);

                $this->activityLog->record($actor, 'Selesaikan berkas akta', $case, $case->nomor);

                return $case;
            }

            $case->current_stage = $next;

            if ($next === DeedStage::VERIFIKASI_DOKUMEN && $case->doc_approval_status === 'none') {
                if ($this->allCaseDocumentsVerified($case)) {
                    $latestVerified = $case->documents()
                        ->where('is_verified', true)
                        ->latest('verified_at')
                        ->first();

                    $case->doc_approval_status = 'approved';
                    $case->doc_approved_by = $latestVerified?->verified_by ?? ($actor->isNotaris() ? $actor->id : null);
                    $case->doc_approved_at = $latestVerified?->verified_at ?? now();
                } elseif ($case->documents()->exists()) {
                    $case->doc_approval_status = 'pending_approval';
                    $case->doc_approval_notes = null;

                    CaseStageHistory::create([
                        'deed_case_id' => $case->id,
                        'stage_order' => DeedStage::VERIFIKASI_DOKUMEN->order(),
                        'stage_key' => DeedStage::VERIFIKASI_DOKUMEN->value,
                        'action' => 'doc_approval_requested',
                        'notes' => 'Dokumen dari Data Klien otomatis diajukan untuk persetujuan Notaris.',
                        'acted_by' => $actor->id,
                    ]);
                }
            }

            $case->save();

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => $current->order(),
                'stage_key' => $current->value,
                'action' => 'completed',
                'notes' => $notes ?: 'Tahap '.$current->label().' selesai.',
                'acted_by' => $actor->id,
            ]);

            $this->activityLog->record($actor, 'Tahap → '.$next->label(), $case, $case->nomor);

            return $case;
        });
    }

    public function skipStage(DeedCase $case, User $actor, string $notes): DeedCase
    {
        return DB::transaction(function () use ($case, $actor, $notes): DeedCase {
            $current = $case->current_stage;

            if ($case->is_badan_usaha || ! $current->isSkippable()) {
                throw ValidationException::withMessages([
                    'stage' => 'Tahap ini hanya dapat dilewati untuk akta non-badan usaha (tahap 6–9).',
                ]);
            }

            $next = $current->next();
            if ($next === null) {
                throw ValidationException::withMessages([
                    'stage' => 'Tidak ada tahap berikutnya.',
                ]);
            }

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => $current->order(),
                'stage_key' => $current->value,
                'action' => 'skipped',
                'notes' => $notes,
                'acted_by' => $actor->id,
            ]);

            $case->current_stage = $next;

            if ($next === DeedStage::VERIFIKASI_DOKUMEN && $case->doc_approval_status === 'none') {
                if ($this->allCaseDocumentsVerified($case)) {
                    $latestVerified = $case->documents()
                        ->where('is_verified', true)
                        ->latest('verified_at')
                        ->first();

                    $case->doc_approval_status = 'approved';
                    $case->doc_approved_by = $latestVerified?->verified_by ?? ($actor->isNotaris() ? $actor->id : null);
                    $case->doc_approved_at = $latestVerified?->verified_at ?? now();
                } elseif ($case->documents()->exists()) {
                    $case->doc_approval_status = 'pending_approval';
                    $case->doc_approval_notes = null;

                    CaseStageHistory::create([
                        'deed_case_id' => $case->id,
                        'stage_order' => DeedStage::VERIFIKASI_DOKUMEN->order(),
                        'stage_key' => DeedStage::VERIFIKASI_DOKUMEN->value,
                        'action' => 'doc_approval_requested',
                        'notes' => 'Dokumen dari Data Klien otomatis diajukan untuk persetujuan Notaris.',
                        'acted_by' => $actor->id,
                    ]);
                }
            }

            $case->save();

            $this->activityLog->record($actor, 'Lewati tahap '.$current->label(), $case, "{$case->nomor}: {$notes}");

            return $case;
        });
    }

    public function revertStage(DeedCase $case, User $actor, string $notes): DeedCase
    {
        return DB::transaction(function () use ($case, $actor, $notes): DeedCase {
            if ($case->is_completed) {
                if (! $actor->isNotaris()) {
                    throw ValidationException::withMessages([
                        'stage' => 'Hanya Notaris yang dapat membuka kembali berkas yang sudah selesai.',
                    ]);
                }

                $case->is_completed = false;
                $case->completed_at = null;
                $case->save();

                CaseStageHistory::create([
                    'deed_case_id' => $case->id,
                    'stage_order' => $case->current_stage->order(),
                    'stage_key' => $case->current_stage->value,
                    'action' => 'reverted',
                    'notes' => $notes,
                    'acted_by' => $actor->id,
                ]);

                $this->activityLog->record($actor, 'Buka kembali berkas', $case, $case->nomor);

                return $case;
            }

            $prev = $case->current_stage->previous();
            if ($prev === null) {
                throw ValidationException::withMessages([
                    'stage' => 'Berkas sudah berada di tahap pertama.',
                ]);
            }

            $case->current_stage = $prev;
            if ($prev->order() <= DeedStage::VERIFIKASI_DOKUMEN->order()) {
                $case->doc_approval_status = 'none';
                $case->doc_approved_by = null;
                $case->doc_approved_at = null;
                $case->doc_approval_notes = null;
            }
            if ($prev->order() <= DeedStage::PENGERJAAN_AKTA->order()) {
                $case->draft_status = DraftStatus::NONE;
                $case->draft_approved_by = null;
                $case->draft_approved_at = null;
            }
            $case->save();

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => $prev->order(),
                'stage_key' => $prev->value,
                'action' => 'reverted',
                'notes' => $notes,
                'acted_by' => $actor->id,
            ]);

            $this->activityLog->record($actor, 'Kembalikan tahap → '.$prev->label(), $case, $case->nomor);

            return $case;
        });
    }

    public function requestDocApproval(DeedCase $case, User $actor, ?string $notes = null): DeedCase
    {
        $case->update([
            'doc_approval_status' => 'pending_approval',
            'doc_approval_notes' => null,
        ]);

        CaseStageHistory::create([
            'deed_case_id' => $case->id,
            'stage_order' => DeedStage::VERIFIKASI_DOKUMEN->order(),
            'stage_key' => DeedStage::VERIFIKASI_DOKUMEN->value,
            'action' => 'doc_approval_requested',
            'notes' => $notes ?: 'Mengajukan persetujuan verifikasi dokumen ke Notaris.',
            'acted_by' => $actor->id,
        ]);

        $this->activityLog->record($actor, 'Ajukan persetujuan verifikasi dokumen', $case, $case->nomor);

        return $case;
    }

    public function approveDocVerification(DeedCase $case, User $notaris, ?string $notes = null): DeedCase
    {
        abort_unless($notaris->isNotaris(), 403, 'Hanya Notaris yang berwenang menyetujui verifikasi dokumen.');

        return DB::transaction(function () use ($case, $notaris, $notes): DeedCase {
            $case->update([
                'doc_approval_status' => 'approved',
                'doc_approved_by' => $notaris->id,
                'doc_approved_at' => now(),
                'doc_approval_notes' => $notes,
            ]);

            $case->documents()
                ->where('is_verified', false)
                ->where('is_rejected', false)
                ->update([
                    'is_verified' => true,
                    'is_complete_checked' => true,
                    'verified_by' => $notaris->id,
                    'verified_at' => now(),
                ]);

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => DeedStage::VERIFIKASI_DOKUMEN->order(),
                'stage_key' => DeedStage::VERIFIKASI_DOKUMEN->value,
                'action' => 'doc_approval_approved',
                'notes' => $notes ?: 'Verifikasi dokumen disetujui (ACC) Notaris.',
                'acted_by' => $notaris->id,
            ]);

            $this->activityLog->record($notaris, 'ACC verifikasi dokumen', $case, $case->nomor.($notes ? ": {$notes}" : ''));

            if (! $case->is_completed && $case->current_stage === DeedStage::VERIFIKASI_DOKUMEN && $this->hasConfirmedDp($case)) {
                return $this->advanceStage($case, $notaris, $notes ?: 'Verifikasi dokumen di-ACC Notaris.');
            }

            return $case;
        });
    }

    public function hasConfirmedDp(DeedCase $case): bool
    {
        return $case->payments()
            ->whereIn('payment_type', [PaymentType::DP_50->value, PaymentType::TERMIN_LAIN->value])
            ->where('status', PaymentStatus::LUNAS->value)
            ->exists();
    }

    public function allCaseDocumentsVerified(DeedCase $case): bool
    {
        return $case->documents()->exists()
            && ! $case->documents()
                ->where(fn ($q) => $q->where('is_verified', false)->orWhere('is_rejected', true))
                ->exists();
    }

    public function rejectDocVerification(DeedCase $case, User $notaris, string $notes): DeedCase
    {
        abort_unless($notaris->isNotaris(), 403, 'Hanya Notaris yang berwenang menolak verifikasi dokumen.');

        $case->update([
            'doc_approval_status' => 'rejected',
            'doc_approved_by' => null,
            'doc_approved_at' => null,
            'doc_approval_notes' => $notes,
            'current_stage' => DeedStage::VERIFIKASI_DOKUMEN,
        ]);

        CaseStageHistory::create([
            'deed_case_id' => $case->id,
            'stage_order' => DeedStage::VERIFIKASI_DOKUMEN->order(),
            'stage_key' => DeedStage::VERIFIKASI_DOKUMEN->value,
            'action' => 'doc_approval_rejected',
            'notes' => $notes,
            'acted_by' => $notaris->id,
        ]);

        $this->activityLog->record($notaris, 'Tolak verifikasi dokumen', $case, "{$case->nomor}: {$notes}");

        return $case;
    }

    public function resubmitRevisionIfNeeded(DeedCase $case, User $actor, bool $includeDraft = true): void
    {
        if ($actor->isNotaris()) {
            return;
        }

        $case->refresh();

        if ($case->doc_approval_status === 'rejected') {
            $this->requestDocApproval($case, $actor, 'Berkas diperbarui/ditambahkan oleh Admin setelah revisi.');
        }

        if ($includeDraft && $case->draft_status === DraftStatus::REVISION_REQUESTED) {
            $this->requestDraftApproval($case, $actor, 'Berkas/draf diperbarui/ditambahkan oleh Admin setelah revisi.');
        }
    }

    public function requestDraftApproval(DeedCase $case, User $actor, ?string $notes = null): DeedCase
    {
        $hasDraftFile = $case->documents()
            ->where('kategori', 'Draft Akta')
            ->whereNotNull('file_path')
            ->exists();

        if (! $hasDraftFile) {
            throw ValidationException::withMessages([
                'draft' => 'Unggah minimal 1 file Draf Akta terlebih dahulu sebelum mengajukan ACC ke Notaris.',
            ]);
        }

        $case->update(['draft_status' => DraftStatus::PENDING_APPROVAL]);

        CaseStageHistory::create([
            'deed_case_id' => $case->id,
            'stage_order' => DeedStage::PENGERJAAN_AKTA->order(),
            'stage_key' => DeedStage::PENGERJAAN_AKTA->value,
            'action' => 'draft_requested',
            'notes' => $notes ?: 'Mengajukan persetujuan draf akta ke Notaris.',
            'acted_by' => $actor->id,
        ]);

        $this->activityLog->record($actor, 'Ajukan persetujuan draf', $case, $case->nomor);

        return $case;
    }

    public function approveDraft(DeedCase $case, User $notaris, ?string $notes = null): DeedCase
    {
        abort_unless($notaris->isNotaris(), 403, 'Hanya Notaris yang berwenang menyetujui draf akta.');

        return DB::transaction(function () use ($case, $notaris, $notes): DeedCase {
            $case->update([
                'draft_status' => DraftStatus::APPROVED,
                'draft_approved_by' => $notaris->id,
                'draft_approved_at' => now(),
            ]);

            $case->documents()
                ->where('kategori', 'Draft Akta')
                ->where('is_verified', false)
                ->where('is_rejected', false)
                ->update([
                    'is_verified' => true,
                    'is_complete_checked' => true,
                    'verified_by' => $notaris->id,
                    'verified_at' => now(),
                ]);

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => DeedStage::PENGERJAAN_AKTA->order(),
                'stage_key' => DeedStage::PENGERJAAN_AKTA->value,
                'action' => 'draft_approved',
                'notes' => $notes ?: 'Draf akta disetujui Notaris.',
                'acted_by' => $notaris->id,
            ]);

            $this->activityLog->record($notaris, 'Setujui draf akta', $case, $case->nomor);

            if (! $case->is_completed && $case->current_stage === DeedStage::PENGERJAAN_AKTA) {
                return $this->advanceStage($case, $notaris, $notes ?: 'Draf akta disetujui Notaris.');
            }

            return $case;
        });
    }

    public function requestDraftRevision(DeedCase $case, User $notaris, string $notes): DeedCase
    {
        abort_unless($notaris->isNotaris(), 403, 'Hanya Notaris yang berwenang meminta revisi draf.');

        $case->update([
            'draft_status' => DraftStatus::REVISION_REQUESTED,
            'draft_approved_by' => null,
            'draft_approved_at' => null,
            'current_stage' => DeedStage::PENGERJAAN_AKTA,
        ]);

        CaseStageHistory::create([
            'deed_case_id' => $case->id,
            'stage_order' => DeedStage::PENGERJAAN_AKTA->order(),
            'stage_key' => DeedStage::PENGERJAAN_AKTA->value,
            'action' => 'revision_requested',
            'notes' => $notes,
            'acted_by' => $notaris->id,
        ]);

        $this->activityLog->record($notaris, 'Minta revisi draf', $case, "{$case->nomor}: {$notes}");

        return $case;
    }

    private function guardStageExit(DeedCase $case, DeedStage $current, User $actor): void
    {
        if ($current === DeedStage::PEMBAYARAN_DP) {
            $hasDpProof = $case->payments()
                ->whereIn('payment_type', [PaymentType::DP_50->value, PaymentType::TERMIN_LAIN->value])
                ->whereIn('status', [PaymentStatus::MENUNGGU->value, PaymentStatus::LUNAS->value])
                ->exists();

            if (! $hasDpProof && ! $actor->isNotaris()) {
                throw ValidationException::withMessages([
                    'stage' => 'Unggah/catat bukti pembayaran DP 50% terlebih dahulu sebelum melanjutkan ke Verifikasi Dokumen.',
                ]);
            }
        }

        if ($current === DeedStage::VERIFIKASI_DOKUMEN) {
            if ($case->doc_approval_status !== 'approved') {
                if ($this->allCaseDocumentsVerified($case)) {
                    $latestVerified = $case->documents()
                        ->where('is_verified', true)
                        ->latest('verified_at')
                        ->first();

                    $case->doc_approval_status = 'approved';
                    $case->doc_approved_by = $latestVerified?->verified_by ?? ($actor->isNotaris() ? $actor->id : null);
                    $case->doc_approved_at = $latestVerified?->verified_at ?? now();
                } else {
                    throw ValidationException::withMessages([
                        'stage' => 'Verifikasi dokumen harus diajukan dan di-ACC oleh Notaris terlebih dahulu sebelum Pengerjaan Akta.',
                    ]);
                }
            }

            if (! $this->hasConfirmedDp($case)) {
                throw ValidationException::withMessages([
                    'stage' => 'Pembayaran DP 50% wajib di-ACC (Lunas) oleh Notaris terlebih dahulu sebelum masuk ke tahap Pengerjaan Akta.',
                ]);
            }
        }

        if ($current === DeedStage::PENGERJAAN_AKTA && $case->draft_status !== DraftStatus::APPROVED) {
            throw ValidationException::withMessages([
                'stage' => 'Draf akta harus disetujui (ACC) oleh Notaris terlebih dahulu sebelum Penandatanganan Minuta Akta.',
            ]);
        }

        if ($current === DeedStage::PENANDATANGANAN_MINUTA) {
            if (! $actor->isNotaris()) {
                throw ValidationException::withMessages([
                    'stage' => 'Pengesahan Penandatanganan Minuta Akta hanya dapat dilakukan oleh Notaris.',
                ]);
            }

            if (empty($case->tanggal_ttd_minuta)) {
                throw ValidationException::withMessages([
                    'stage' => 'Tanggal TTD Minuta wajib diisi sebelum mengesahkan ke Penerbitan Akta & SK AHU.',
                ]);
            }
        }

        if ($current === DeedStage::PENERBITAN_AKTA_SK_AHU) {
            if (blank($case->nomor_akta) || empty($case->tanggal_akta)) {
                throw ValidationException::withMessages([
                    'stage' => 'Nomor Akta dan Tanggal Akta wajib terisi sebelum melanjutkan tahap.',
                ]);
            }

            if ($case->is_badan_usaha && (blank($case->nomor_sk_ahu) || empty($case->tanggal_sk_ahu))) {
                throw ValidationException::withMessages([
                    'stage' => 'Nomor SK AHU dan Tanggal SK AHU wajib diisi untuk akta Badan Usaha sebelum Pengisian Pemilik Manfaat.',
                ]);
            }
        }
    }

    public function syncOrphanClientsIfNeeded(User $actor): void
    {
        Cache::rememberForever('notaris:orphan_clients_synced', function () use ($actor): bool {
            if (Client::query()->whereDoesntHave('deedCases')->exists()) {
                DB::transaction(function () use ($actor): void {
                    $clientsWithoutCase = Client::query()
                        ->select(['id', 'jenis', 'catatan'])
                        ->whereDoesntHave('deedCases')
                        ->get();

                    foreach ($clientsWithoutCase as $client) {
                        $defaultJenis = $client->jenis === 'perusahaan' ? 'Akta Pendirian PT' : 'Lainnya';
                        $createdCase = $this->createCase([
                            'client_id' => $client->id,
                            'jenis_akta' => $defaultJenis,
                            'biaya' => 0,
                            'penanggung_jawab' => $actor->name,
                            'catatan' => $client->catatan,
                        ], $actor);

                        Document::query()
                            ->where('client_id', $client->id)
                            ->whereNull('deed_case_id')
                            ->update(['deed_case_id' => $createdCase->id]);
                    }
                });
            }

            return true;
        });
    }

    private function resolveIsBadanUsaha(string $jenisAkta): bool
    {
        foreach (config('notaris.jenis_akta', []) as $item) {
            if (($item['label'] ?? '') === $jenisAkta) {
                return (bool) ($item['is_badan_usaha'] ?? false);
            }
        }

        return false;
    }
}
