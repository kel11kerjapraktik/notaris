<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AdvanceDeedStageRequest extends FormRequest
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
            'notes' => ['nullable', 'string', 'max:1000'],
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

    /**
     * @return array<string, mixed>
     */
    public function stageMetadata(): array
    {
        $data = $this->validated();
        unset($data['notes']);

        return $data;
    }
}
