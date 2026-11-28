<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertPaymentRequest extends FormRequest
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
        $maxKb = (int) config('notaris.max_file_kb', 2048);

        $rules = [
            'termin_ke' => ['required', 'integer', 'min:1'],
            'payment_type' => ['required', 'in:dp_50,pelunasan,termin_lain'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'jumlah' => ['required', 'numeric', 'min:1'],
            'jatuh_tempo' => ['nullable', 'date'],
            'tanggal_bayar' => ['nullable', 'date'],
            'metode' => ['required', 'string', 'max:40'],
            'no_referensi' => ['nullable', 'string', 'max:100'],
            'bukti' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
        ];

        if ($this->isMethod('post')) {
            $rules['deed_case_id'] = ['required', 'exists:deed_cases,id'];
            $rules['mark_as_paid'] = ['boolean'];
        }

        return $rules;
    }
}
