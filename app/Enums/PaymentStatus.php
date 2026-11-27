<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case BELUM = 'belum';
    case MENUNGGU = 'menunggu';
    case LUNAS = 'lunas';
    case DITOLAK = 'ditolak';

    public function label(): string
    {
        return match ($this) {
            self::BELUM => 'Belum Dibayar',
            self::MENUNGGU => 'Menunggu ACC Notaris',
            self::LUNAS => 'Lunas (Disetujui)',
            self::DITOLAK => 'Ditolak Notaris',
        };
    }
}
