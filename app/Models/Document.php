<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'deed_case_id',
        'kategori',
        'nama',
        'nomor_dokumen',
        'tanggal_dokumen',
        'keterangan',
        'file_disk',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'is_complete_checked',
        'is_verified',
        'is_rejected',
        'verified_by',
        'verified_at',
        'catatan_notaris',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_dokumen' => 'date:Y-m-d',
            'file_size' => 'integer',
            'is_complete_checked' => 'boolean',
            'is_verified' => 'boolean',
            'is_rejected' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function deedCase(): BelongsTo
    {
        return $this->belongsTo(DeedCase::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
