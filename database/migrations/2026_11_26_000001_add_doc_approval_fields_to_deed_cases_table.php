<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deed_cases', function (Blueprint $table) {
            $table->string('doc_approval_status', 32)->default('none')->after('draft_approved_at');
            $table->foreignId('doc_approved_by')->nullable()->after('doc_approval_status')->constrained('users')->nullOnDelete();
            $table->timestamp('doc_approved_at')->nullable()->after('doc_approved_by');
            $table->text('doc_approval_notes')->nullable()->after('doc_approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('deed_cases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('doc_approved_by');
            $table->dropColumn(['doc_approval_status', 'doc_approved_at', 'doc_approval_notes']);
        });
    }
};
