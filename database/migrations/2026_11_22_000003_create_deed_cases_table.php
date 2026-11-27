<?php

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deed_cases', function (Blueprint $table) {
            $table->id();
            $table->string('nomor', 32)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('jenis_akta');
            $table->boolean('is_badan_usaha')->default(true);
            $table->decimal('biaya', 15, 2)->default(0);
            $table->date('target_selesai')->nullable();
            $table->string('penanggung_jawab')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('current_stage', 40)->default(DeedStage::BIODATA_KLIEN->value)->index();
            $table->boolean('is_completed')->default(false)->index();
            $table->timestamp('completed_at')->nullable();
            $table->string('draft_status', 32)->default(DraftStatus::NONE->value);
            $table->foreignId('draft_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('draft_approved_at')->nullable();
            $table->text('catatan')->nullable();

            // Metadata khusus tahapan notaris (Tahap 5-9)
            $table->string('nomor_akta', 64)->nullable();
            $table->date('tanggal_akta')->nullable();
            $table->date('tanggal_ttd_minuta')->nullable();
            $table->string('nomor_sk_ahu', 100)->nullable();
            $table->date('tanggal_sk_ahu')->nullable();
            $table->date('tanggal_pemilik_manfaat')->nullable();
            $table->string('status_pemilik_manfaat', 64)->nullable();
            $table->string('nomor_tbnri', 100)->nullable();
            $table->date('tanggal_tbnri')->nullable();
            $table->string('nib_perusahaan', 64)->nullable();
            $table->string('kbli_oss', 100)->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('case_stage_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deed_case_id')->constrained('deed_cases')->cascadeOnDelete();
            $table->unsignedTinyInteger('stage_order');
            $table->string('stage_key', 40);
            $table->string('action', 32); // completed | reverted | skipped | draft_requested | draft_approved | revision_requested
            $table->text('notes')->nullable();
            $table->foreignId('acted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['deed_case_id', 'stage_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_stage_histories');
        Schema::dropIfExists('deed_cases');
    }
};
