<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 24)->unique();
            $table->string('jenis', 24)->default('pribadi'); // pribadi | perusahaan
            $table->string('nama');
            $table->string('nik', 32)->nullable()->index();
            $table->string('npwp', 32)->nullable();
            $table->string('tempat_lahir')->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->string('jenis_kelamin', 20)->nullable();
            $table->string('agama', 30)->nullable();
            $table->string('kewarganegaraan', 10)->default('WNI');
            $table->string('status_perkawinan', 30)->nullable();
            $table->string('pekerjaan')->nullable();
            $table->string('nama_ibu_kandung')->nullable();
            $table->string('telepon', 32)->nullable();
            $table->string('email')->nullable();
            $table->text('alamat')->nullable();
            $table->string('rt_rw', 20)->nullable();
            $table->string('kelurahan')->nullable();
            $table->string('kecamatan')->nullable();
            $table->string('kota')->nullable();
            $table->string('provinsi')->nullable();
            $table->string('kode_pos', 12)->nullable();
            $table->text('catatan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('client_companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->unique()->constrained('clients')->cascadeOnDelete();
            $table->string('nama')->nullable();
            $table->string('bentuk_badan', 64)->nullable();
            $table->string('jabatan')->nullable();
            $table->string('bidang_usaha')->nullable();
            $table->string('kbli', 64)->nullable();
            $table->string('tahun_berdiri', 10)->nullable();
            $table->string('npwp', 32)->nullable();
            $table->string('nib', 64)->nullable();
            $table->string('sk_kemenkumham')->nullable();
            $table->text('alamat')->nullable();
            $table->string('kota')->nullable();
            $table->string('provinsi')->nullable();
            $table->string('kode_pos', 12)->nullable();
            $table->string('telepon', 32)->nullable();
            $table->string('email')->nullable();
            $table->decimal('modal_dasar', 18, 2)->nullable();
            $table->decimal('modal_ditempatkan', 18, 2)->nullable();
            $table->decimal('modal_disetor', 18, 2)->nullable();
            $table->unsignedBigInteger('jumlah_saham')->nullable();
            $table->decimal('nominal_saham', 18, 2)->nullable();
            $table->string('direktur')->nullable();
            $table->string('komisaris')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_companies');
        Schema::dropIfExists('clients');
    }
};
