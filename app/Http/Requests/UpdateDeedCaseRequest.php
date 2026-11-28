<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDeedCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'jenis_akta' => ['required', 'string', 'max:255'],
            'biaya' => ['required', 'numeric', 'min:0'],
            'target_selesai' => ['nullable', 'date'],
            'penanggung_jawab' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'nomor_akta' => ['nullable', 'string', 'max:64'],
            'tanggal_akta' => ['nullable', 'date'],
            'tanggal_ttd_minuta' => ['nullable', 'date'],
            'nomor_sk_ahu' => ['nullable', 'string', 'max:100'],
            'tanggal_sk_ahu' => ['nullable', 'date'],
            'tanggal_pemilik_manfaat' => ['nullable', 'date'],
            'status_pemilik_manfaat' => ['nullable', 'string', 'max:64'],
            'nomor_tbnri' => ['nullable', 'string', 'max:100'],
            'tanggal_tbnri' => ['nullable', 'date'],
            'nib_perusahaan' => ['nullable', 'string', 'max:64'],
            'kbli_oss' => ['nullable', 'string', 'max:100'],
        ];
    }
}
