<?php

namespace App\Models;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeedCase extends Model
{
    use HasFactory;

    protected $fillable = [
        'nomor',
        'client_id',
        'jenis_akta',
        'is_badan_usaha',
        'biaya',
        'target_selesai',
        'penanggung_jawab',
        'assigned_to',
        'current_stage',
        'is_completed',
        'completed_at',
        'draft_status',
        'draft_approved_by',
        'draft_approved_at',
        'doc_approval_status',
        'doc_approved_by',
        'doc_approved_at',
        'doc_approval_notes',
        'catatan',
        'nomor_akta',
        'tanggal_akta',
        'tanggal_ttd_minuta',
        'nomor_sk_ahu',
        'tanggal_sk_ahu',
        'tanggal_pemilik_manfaat',
        'status_pemilik_manfaat',
        'nomor_tbnri',
        'tanggal_tbnri',
        'nib_perusahaan',
        'kbli_oss',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_badan_usaha' => 'boolean',
            'biaya' => 'float',
            'target_selesai' => 'date:Y-m-d',
            'current_stage' => DeedStage::class,
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'draft_status' => DraftStatus::class,
            'draft_approved_at' => 'datetime',
            'doc_approved_at' => 'datetime',
            'tanggal_akta' => 'date:Y-m-d',
            'tanggal_ttd_minuta' => 'date:Y-m-d',
            'tanggal_sk_ahu' => 'date:Y-m-d',
            'tanggal_pemilik_manfaat' => 'date:Y-m-d',
            'tanggal_tbnri' => 'date:Y-m-d',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function draftApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'draft_approved_by');
    }

    public function docApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doc_approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(CaseStageHistory::class)->orderBy('created_at');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class)->latest();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('termin_ke');
    }

    public function totalPaid(): float
    {
        return (float) $this->payments
            ->where('status', PaymentStatus::LUNAS)
            ->sum('jumlah');
    }
}
