<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'kode',
        'jenis',
        'nama',
        'nik',
        'npwp',
        'tempat_lahir',
        'tanggal_lahir',
        'jenis_kelamin',
        'agama',
        'kewarganegaraan',
        'status_perkawinan',
        'pekerjaan',
        'nama_ibu_kandung',
        'telepon',
        'email',
        'alamat',
        'rt_rw',
        'kelurahan',
        'kecamatan',
        'kota',
        'provinsi',
        'kode_pos',
        'catatan',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date:Y-m-d',
        ];
    }

    public function company(): HasOne
    {
        return $this->hasOne(ClientCompany::class);
    }

    public function deedCases(): HasMany
    {
        return $this->hasMany(DeedCase::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function displayName(): string
    {
        if ($this->jenis === 'perusahaan' && $this->company?->nama) {
            return $this->company->nama;
        }

        return $this->nama;
    }
}
