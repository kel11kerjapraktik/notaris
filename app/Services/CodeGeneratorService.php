<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CodeGeneratorService
{
    public function nextClientCode(): string
    {
        return $this->nextSequence('clients', 'kode', 'KL-');
    }

    public function nextCaseNumber(): string
    {
        return $this->nextSequence('deed_cases', 'nomor', 'AKT-'.now()->format('Y').'-');
    }

    public function nextInvoiceNumber(): string
    {
        return $this->nextSequence('payments', 'no_inv', 'INV-'.now()->format('Y').'-');
    }

    private function nextSequence(string $table, string $column, string $prefix): string
    {
        return DB::transaction(function () use ($table, $column, $prefix): string {
            $query = DB::table($table)
                ->where($column, 'like', "{$prefix}%")
                ->orderByDesc('id');

            if (DB::connection()->getDriverName() === 'pgsql') {
                $query->lockForUpdate();
            }

            $last = $query->value($column);
            $seq = $last ? (int) substr((string) $last, strlen($prefix)) + 1 : 1;

            while (DB::table($table)->where($column, $code = $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT))->exists()) {
                $seq++;
            }

            return $code;
        });
    }
}
