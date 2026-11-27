<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientCompany extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'nama',
        'bentuk_badan',
        'jabatan',
        'bidang_usaha',
        'kbli',
        'tahun_berdiri',
        'npwp',
        'nib',
        'sk_kemenkumham',
        'alamat',
        'kota',
        'provinsi',
        'kode_pos',
        'telepon',
        'email',
        'modal_dasar',
        'modal_ditempatkan',
        'modal_disetor',
        'jumlah_saham',
        'nominal_saham',
        'direktur',
        'komisaris',
    ];

    protected function casts(): array
    {
        return [
            'modal_dasar' => 'float',
            'modal_ditempatkan' => 'float',
            'modal_disetor' => 'float',
            'jumlah_saham' => 'integer',
            'nominal_saham' => 'float',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
