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

        // Staf requests doc verification approval, Notaris ACCs -> auto-advances Stage 3 -> Stage 4
        $this->actingAs($staf)->post(route('cases.advance', $case))->assertSessionHasErrors('stage');
        $this->actingAs($staf)->post(route('cases.request-doc-approval', $case))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame('pending_approval', $case->fresh()->doc_approval_status);
        $this->actingAs($notaris)->post(route('cases.approve-doc', $case))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame('approved', $case->fresh()->doc_approval_status);
        $this->assertSame(DeedStage::PENGERJAAN_AKTA, $case->fresh()->current_stage);

        // Stage 4 -> Stage 5 locked until Notaris approves draft
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertSessionHasErrors('stage');

        // Staf requests draft approval, Notaris approves -> auto-advances Stage 4 -> Stage 5
        $this->actingAs($staf)->post(route('cases.request-draft', $case))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(DraftStatus::PENDING_APPROVAL, $case->fresh()->draft_status);

        $this->actingAs($notaris)->post(route('cases.approve-draft', $case))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(DraftStatus::APPROVED, $case->fresh()->draft_status);
        $this->assertSame(DeedStage::PENANDATANGANAN_MINUTA, $case->fresh()->current_stage);

        // Stage 5 (Penandatanganan Minuta) can only be advanced by Notaris
        $this->actingAs($staf)
            ->post(route('cases.advance', $case))
            ->assertSessionHasErrors('stage');

        $this->actingAs($notaris)
            ->post(route('cases.advance', $case))
            ->assertSessionHasNoErrors()
            ->assertRedirect();
        $this->assertSame(DeedStage::PENERBITAN_AKTA_SK_AHU, $case->fresh()->current_stage);
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

    public function test_inactive_users_cannot_login_or_access_authenticated_routes(): void
    {
        $inactive = User::factory()->create(['is_active' => false]);

        $this->post(route('login.store'), [
            'email' => $inactive->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();

        $this->actingAs($inactive)
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_authorization_search_and_lunas_payment_immutability(): void
    {
        $notaris = User::factory()->create(['role' => UserRole::NOTARIS]);
        $staf = User::factory()->create(['role' => UserRole::STAF]);

        $client = Client::create([
            'kode' => 'KL-0009',
            'jenis' => 'pribadi',
            'nama' => 'Budi Santoso',
        ]);

        $case = DeedCase::create([
            'nomor' => 'AKT-2026-0009',
            'client_id' => $client->id,
            'jenis_akta' => 'Akta Hibah',
            'is_badan_usaha' => false,
            'biaya' => 5000000,
            'current_stage' => DeedStage::PEMBAYARAN_DP,
            'draft_status' => DraftStatus::NONE,
        ]);

        // Search endpoints must work across database drivers (SQLite & PostgreSQL)
        $this->actingAs($staf)->get(route('clients.index', ['search' => 'budi']))->assertOk();
        $this->actingAs($staf)->get(route('cases.index', ['search' => 'hibah']))->assertOk();
        $this->actingAs($staf)->get(route('documents.index', ['search' => 'ktp']))->assertOk();
        $this->actingAs($staf)->get(route('archives.index', ['search' => 'budi']))->assertOk();

        // Staf cannot delete client; Notaris can
        $this->actingAs($staf)->delete(route('clients.destroy', $client))->assertForbidden();

        // Confirmed (LUNAS) payment cannot be edited directly
        $payment = Payment::create([
            'deed_case_id' => $case->id,
            'no_inv' => 'INV-2026-0009',
            'termin_ke' => 1,
            'payment_type' => 'dp_50',
            'jumlah' => 2500000,
            'metode' => 'Transfer Bank',
            'status' => PaymentStatus::LUNAS,
        ]);

        $this->actingAs($staf)
            ->put(route('payments.update', $payment), [
                'termin_ke' => 1,
                'payment_type' => 'dp_50',
                'jumlah' => 1000000,
                'metode' => 'Transfer Bank',
            ])
            ->assertSessionHasErrors('status');

        $this->assertSame(2500000.0, (float) $payment->fresh()->jumlah);

        $this->actingAs($notaris)->delete(route('clients.destroy', $client))->assertRedirect();
        $this->assertNull($client->fresh());
    }

    public function test_notaris_can_verify_document_attached_to_deed_case(): void
    {
        $notaris = User::factory()->create(['role' => UserRole::NOTARIS]);
        $client = Client::create([
            'kode' => 'KL-0099',
            'jenis' => 'perusahaan',
            'nama' => 'Ridwan Anang',
            'status' => 'Aktif',
        ]);
        $case = DeedCase::create([
            'nomor' => 'AKT-2026-0003',
            'client_id' => $client->id,
            'jenis_akta' => 'Akta Pendirian PT',
            'is_badan_usaha' => true,
            'biaya' => 5000000,
            'current_stage' => DeedStage::PELUNASAN_BIAYA,
            'is_completed' => true,
        ]);
        $doc = $client->documents()->create([
            'deed_case_id' => $case->id,
            'kategori' => 'Salinan Akta',
            'nama' => 'Akta Pendirian',
            'is_complete_checked' => true,
            'is_verified' => false,
        ]);

        $this->actingAs($notaris)
            ->post(route('documents.verify', $doc), [
                'notes' => 'Dokumen sah',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $fresh = $doc->fresh();
        $this->assertTrue($fresh->is_verified);
        $this->assertFalse($fresh->is_rejected);
        $this->assertSame($notaris->id, $fresh->verified_by);
    }
}
