<?php

namespace App\Enums;

enum PaymentType: string
{
    case DP_50 = 'dp_50';
    case PELUNASAN = 'pelunasan';
    case TERMIN_LAIN = 'termin_lain';

    public function label(): string
    {
        return match ($this) {
            self::DP_50 => 'DP 50%',
            self::PELUNASAN => 'Pelunasan Biaya',
            self::TERMIN_LAIN => 'Termin Lainnya',
        };
    }
}
