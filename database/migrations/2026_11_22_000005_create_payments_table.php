<?php

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deed_case_id')->constrained('deed_cases')->cascadeOnDelete();
            $table->string('no_inv', 32)->unique();
            $table->unsignedSmallInteger('termin_ke')->default(1);
            $table->string('payment_type', 24)->default(PaymentType::DP_50->value);
            $table->string('keterangan')->nullable();
            $table->decimal('jumlah', 15, 2);
            $table->date('jatuh_tempo')->nullable();
            $table->date('tanggal_bayar')->nullable();
            $table->string('metode', 40)->default('Transfer Bank');
            $table->string('no_referensi', 100)->nullable();
            $table->string('status', 24)->default(PaymentStatus::BELUM->value)->index();
            $table->string('bukti_disk', 32)->nullable();
            $table->string('bukti_path')->nullable();
            $table->string('bukti_name')->nullable();
            $table->string('bukti_mime', 100)->nullable();
            $table->unsignedBigInteger('bukti_size')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
