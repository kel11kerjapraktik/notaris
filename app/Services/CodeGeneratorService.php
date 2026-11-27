<?php

namespace App\Services;

use App\Models\Client;
use App\Models\DeedCase;
use App\Models\Payment;

class CodeGeneratorService
{
    public function nextClientCode(): string
    {
        $last = Client::query()
            ->where('kode', 'like', 'KL-%')
            ->orderByDesc('id')
            ->value('kode');

        $seq = $last ? (int) substr((string) $last, 3) + 1 : 1;

        while (Client::where('kode', $code = 'KL-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT))->exists()) {
            $seq++;
        }

        return $code;
    }

    public function nextCaseNumber(): string
    {
        $year = now()->format('Y');
        $prefix = "AKT-{$year}-";

        $last = DeedCase::query()
            ->where('nomor', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->value('nomor');

        $seq = $last ? (int) substr((string) $last, strlen($prefix)) + 1 : 1;

        while (DeedCase::where('nomor', $code = $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT))->exists()) {
            $seq++;
        }

        return $code;
    }

    public function nextInvoiceNumber(): string
    {
        $year = now()->format('Y');
        $prefix = "INV-{$year}-";

        $last = Payment::query()
            ->where('no_inv', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->value('no_inv');

        $seq = $last ? (int) substr((string) $last, strlen($prefix)) + 1 : 1;

        while (Payment::where('no_inv', $code = $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT))->exists()) {
            $seq++;
        }

        return $code;
    }
}
