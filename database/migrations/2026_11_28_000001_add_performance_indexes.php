<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deed_cases', function (Blueprint $table): void {
            $table->index('client_id');
            $table->index('draft_status');
            $table->index('doc_approval_status');
            $table->index(['is_completed', 'current_stage']);
            $table->index('created_at');
            $table->index('updated_at');
        });

        Schema::table('documents', function (Blueprint $table): void {
            $table->index('client_id');
            $table->index('deed_case_id');
            $table->index(['is_verified', 'is_rejected']);
            $table->index('verified_at');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->index('deed_case_id');
            $table->index('confirmed_at');
        });

        Schema::table('case_stage_histories', function (Blueprint $table): void {
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::table('case_stage_histories', function (Blueprint $table): void {
            $table->dropIndex(['action']);
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->dropIndex(['deed_case_id']);
            $table->dropIndex(['confirmed_at']);
        });

        Schema::table('documents', function (Blueprint $table): void {
            $table->dropIndex(['client_id']);
            $table->dropIndex(['deed_case_id']);
            $table->dropIndex(['is_verified', 'is_rejected']);
            $table->dropIndex(['verified_at']);
        });

        Schema::table('deed_cases', function (Blueprint $table): void {
            $table->dropIndex(['client_id']);
            $table->dropIndex(['draft_status']);
            $table->dropIndex(['doc_approval_status']);
            $table->dropIndex(['is_completed', 'current_stage']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['updated_at']);
        });
    }
};
