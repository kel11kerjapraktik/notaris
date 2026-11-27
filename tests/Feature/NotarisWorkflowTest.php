<?php

namespace Tests\Feature;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NotarisWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_staf_and_notaris_10_stage_workflow_with_dp_and_draft_gates(): void
    {
        Storage::fake('local');

        $notaris = User::factory()->create(['role' => UserRole::NOTARIS]);
        $staf = User::factory()->create(['role' => UserRole::STAF]);

        // 1. Staf creates client with completeness attachment -> automatically creates DeedCase in Monitoring Akta
        $this->actingAs($staf)
            ->post(route('clients.store'), [
                'jenis' => 'perusahaan',
                'nama' => 'Budi Santoso',
                'nik' => '3673010101900001',
                'jenis_akta' => 'Akta Pendirian PT',
                'biaya' => 10000000,
                'company' => [
                    'nama' => 'PT Maju Bersama',
                    'bentuk_badan' => 'PT (Perseroan Terbatas)',
                ],
                'attachments' => [
                    [
                        'kategori' => 'KTP',
                        'nama' => 'KTP Budi Santoso',
                        'nomor_dokumen' => '3673010101900001',
                        'file' => UploadedFile::fake()->image('ktp.jpg', 400, 400)->size(500),
                    ],
                ],
            ])
            ->assertRedirect();

        $client = Client::firstOrFail();
        $this->assertSame('KL-0001', $client->kode);
        $this->assertCount(1, $client->documents);

        // Automatically entered Monitoring Akta at Stage 1: biodata_klien
        $case = DeedCase::firstOrFail();
        $this->assertSame($client->id, $case->client_id);
        $this->assertSame(DeedStage::BIODATA_KLIEN, $case->current_stage);
        $this->assertTrue($case->is_badan_usaha);
        $this->assertSame($case->id, $client->documents->first()->deed_case_id);

        // Advance Stage 1 -> Stage 2 (pembayaran_dp)
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertRedirect();
        $this->assertSame(DeedStage::PEMBAYARAN_DP, $case->fresh()->current_stage);

        // Staf cannot advance Stage 2 -> Stage 3 without DP proof
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertSessionHasErrors('stage');

        // Staf uploads DP 50% proof -> status is menunggu (pending Notaris ACC)
        $this->actingAs($staf)
            ->post(route('payments.store'), [
                'deed_case_id' => $case->id,
                'termin_ke' => 1,
                'payment_type' => 'dp_50',
                'jumlah' => 5000000,
                'metode' => 'Transfer Bank',
                'mark_as_paid' => true,
                'bukti' => UploadedFile::fake()->image('dp.jpg', 400, 400)->size(500),
            ])
            ->assertRedirect();

        $dp = Payment::firstOrFail();
        $this->assertSame(PaymentStatus::MENUNGGU, $dp->status);

        // Staf CANNOT ACC payment (403)
        $this->actingAs($staf)
            ->post(route('payments.confirm', $dp))
            ->assertForbidden();

        // Staf CAN advance Stage 2 -> Stage 3 after submitting proof
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertRedirect();
        $this->assertSame(DeedStage::VERIFIKASI_DOKUMEN, $case->fresh()->current_stage);

        // Notaris ACCs payment -> lunas
        $this->actingAs($notaris)
            ->post(route('payments.confirm', $dp))
            ->assertRedirect();
        $this->assertSame(PaymentStatus::LUNAS, $dp->fresh()->status);

        // Staf requests doc verification approval, Notaris ACCs before advancing Stage 3 -> Stage 4
        $this->actingAs($staf)->post(route('cases.advance', $case))->assertSessionHasErrors('stage');
        $this->actingAs($staf)->post(route('cases.request-doc-approval', $case))->assertRedirect();
        $this->assertSame('pending_approval', $case->fresh()->doc_approval_status);
        $this->actingAs($notaris)->post(route('cases.approve-doc', $case))->assertRedirect();
        $this->assertSame('approved', $case->fresh()->doc_approval_status);

        // Advance Stage 3 -> Stage 4 (pengerjaan_akta)
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertRedirect();
        $this->assertSame(DeedStage::PENGERJAAN_AKTA, $case->fresh()->current_stage);

        // Stage 4 -> Stage 5 locked until Notaris approves draft
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertSessionHasErrors('stage');

        // Staf requests draft approval, Notaris approves
        $this->actingAs($staf)->post(route('cases.request-draft', $case))->assertRedirect();
        $this->assertSame(DraftStatus::PENDING_APPROVAL, $case->fresh()->draft_status);

        $this->actingAs($notaris)->post(route('cases.approve-draft', $case))->assertRedirect();
        $this->assertSame(DraftStatus::APPROVED, $case->fresh()->draft_status);

        // Advance Stage 4 -> Stage 5 (penandatanganan_minuta)
        $this->actingAs($staf)->post(route('cases.advance', $case))->assertRedirect();
        $this->assertSame(DeedStage::PENANDATANGANAN_MINUTA, $case->fresh()->current_stage);
    }

    public function test_non_badan_usaha_can_skip_stages_6_to_9_and_document_max_2mb(): void
    {
        Storage::fake('local');

        $notaris = User::factory()->create(['role' => UserRole::NOTARIS]);
        $staf = User::factory()->create(['role' => UserRole::STAF]);

        $client = Client::create([
            'kode' => 'KL-0002',
            'jenis' => 'pribadi',
            'nama' => 'Siti Aminah',
        ]);

        // Document > 2 MB (2049 KB) must be rejected
        $this->actingAs($staf)
            ->post(route('documents.store'), [
                'client_id' => $client->id,
                'kategori' => 'KTP',
                'nama' => 'KTP Siti',
                'file' => UploadedFile::fake()->create('ktp.pdf', 2049, 'application/pdf'),
            ])
            ->assertSessionHasErrors('file');

        // Document <= 2 MB (1024 KB) succeeds
        $this->actingAs($staf)
            ->post(route('documents.store'), [
                'client_id' => $client->id,
                'kategori' => 'KTP',
                'nama' => 'KTP Siti',
                'file' => UploadedFile::fake()->create('ktp.pdf', 1024, 'application/pdf'),
            ])
            ->assertRedirect();

        $case = DeedCase::create([
            'nomor' => 'AKT-2026-0002',
            'client_id' => $client->id,
            'jenis_akta' => 'Akta Jual Beli (AJB)',
            'is_badan_usaha' => false,
            'biaya' => 3000000,
            'current_stage' => DeedStage::PENERBITAN_AKTA_SK_AHU,
            'draft_status' => DraftStatus::APPROVED,
        ]);

        // Non-badan usaha can skip stage 6 -> 7
        $this->actingAs($staf)
            ->post(route('cases.skip', $case), ['notes' => 'Akta AJB tidak memerlukan SK AHU'])
            ->assertRedirect();

        $this->assertSame(DeedStage::PEMILIK_MANFAAT, $case->fresh()->current_stage);
    }
}
