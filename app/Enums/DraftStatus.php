<?php

namespace App\Enums;

enum DraftStatus: string
{
    case NONE = 'none';
    case PENDING_APPROVAL = 'pending_approval';
    case REVISION_REQUESTED = 'revision_requested';
    case APPROVED = 'approved';

    public function label(): string
    {
        return match ($this) {
            self::NONE => 'Belum Diajukan',
            self::PENDING_APPROVAL => 'Menunggu Persetujuan Notaris',
            self::REVISION_REQUESTED => 'Perlu Revisi',
            self::APPROVED => 'Draf Disetujui',
        };
    }
}
