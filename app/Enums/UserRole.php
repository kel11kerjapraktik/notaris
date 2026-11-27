<?php

namespace App\Enums;

enum UserRole: string
{
    case NOTARIS = 'notaris';
    case STAF = 'staf';

    public function label(): string
    {
        return match ($this) {
            self::NOTARIS => 'Notaris / Pemilik',
            self::STAF => 'Staf / Admin',
        };
    }
}
