<?php

namespace App\Services;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\CaseStageHistory;
use App\Models\DeedCase;
use App\Models\User;
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
                'action' => 'completed',
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

            $this->guardStageExit($case, $current, $actor);

            // Save optional stage-specific metadata (nomor_akta, nomor_sk_ahu, nib_perusahaan, etc.)
            $fillableMeta = array_intersect_key($metadata, array_flip([
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
            ]));

            if ($fillableMeta !== []) {
                $case->fill($fillableMeta);
            }

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
            $case->save();

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => $next->order(),
                'stage_key' => $next->value,
                'action' => 'completed',
                'notes' => $notes,
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
            $case->save();

            CaseStageHistory::create([
                'deed_case_id' => $case->id,
                'stage_order' => $next->order(),
                'stage_key' => $next->value,
                'action' => 'completed',
                'notes' => 'Melanjutkan setelah melewati tahap '.$current->label(),
                'acted_by' => $actor->id,
            ]);

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

        $case->update([
            'doc_approval_status' => 'approved',
            'doc_approved_by' => $notaris->id,
            'doc_approved_at' => now(),
            'doc_approval_notes' => $notes,
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

        if (! $case->is_completed && $case->current_stage === DeedStage::VERIFIKASI_DOKUMEN) {
            return $this->advanceStage($case, $notaris, $notes ?: 'Verifikasi dokumen di-ACC Notaris.');
        }

        return $case;
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

    public function resubmitRevisionIfNeeded(DeedCase $case, User $actor): void
    {
        if ($actor->isNotaris()) {
            return;
        }

        $case->refresh();

        if ($case->doc_approval_status === 'rejected') {
            $this->requestDocApproval($case, $actor, 'Berkas diperbarui/ditambahkan oleh Admin setelah revisi.');
        }

        if ($case->draft_status === DraftStatus::REVISION_REQUESTED) {
            $this->requestDraftApproval($case, $actor, 'Berkas/draf diperbarui/ditambahkan oleh Admin setelah revisi.');
        }
    }

    public function requestDraftApproval(DeedCase $case, User $actor, ?string $notes = null): DeedCase
    {
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

        $case->update([
            'draft_status' => DraftStatus::APPROVED,
            'draft_approved_by' => $notaris->id,
            'draft_approved_at' => now(),
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

        if ($current === DeedStage::VERIFIKASI_DOKUMEN && $case->doc_approval_status !== 'approved') {
            throw ValidationException::withMessages([
                'stage' => 'Verifikasi dokumen harus diajukan dan di-ACC oleh Notaris terlebih dahulu sebelum Pengerjaan Akta.',
            ]);
        }

        if ($current === DeedStage::PENGERJAAN_AKTA && $case->draft_status !== DraftStatus::APPROVED) {
            throw ValidationException::withMessages([
                'stage' => 'Draf akta harus disetujui (ACC) oleh Notaris terlebih dahulu sebelum Penandatanganan Minuta Akta.',
            ]);
        }

        if ($current === DeedStage::PENANDATANGANAN_MINUTA && ! $actor->isNotaris()) {
            throw ValidationException::withMessages([
                'stage' => 'Pengesahan Penandatanganan Minuta Akta hanya dapat dilakukan oleh Notaris.',
            ]);
        }
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
