<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->boolean('is_rejected')->default(false)->after('is_verified');
            $table->text('catatan_notaris')->nullable()->after('verified_at');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->text('catatan_notaris')->nullable()->after('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['is_rejected', 'catatan_notaris']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['catatan_notaris']);
        });
    }
};
