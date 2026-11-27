<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'deed_case_id',
        'no_inv',
        'termin_ke',
        'payment_type',
        'keterangan',
        'jumlah',
        'jatuh_tempo',
        'tanggal_bayar',
        'metode',
        'no_referensi',
        'status',
        'bukti_disk',
        'bukti_path',
        'bukti_name',
        'bukti_mime',
        'bukti_size',
        'submitted_by',
        'confirmed_by',
        'confirmed_at',
        'catatan_notaris',
    ];

    protected function casts(): array
    {
        return [
            'termin_ke' => 'integer',
            'payment_type' => PaymentType::class,
            'jumlah' => 'float',
            'jatuh_tempo' => 'date:Y-m-d',
            'tanggal_bayar' => 'date:Y-m-d',
            'status' => PaymentStatus::class,
            'bukti_size' => 'integer',
            'confirmed_at' => 'datetime',
        ];
    }

    public function deedCase(): BelongsTo
    {
        return $this->belongsTo(DeedCase::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
