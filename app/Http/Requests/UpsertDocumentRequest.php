<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertDocumentRequest extends FormRequest
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

        return [
            'client_id' => ['required', 'exists:clients,id'],
            'deed_case_id' => ['nullable', 'exists:deed_cases,id'],
            'kategori' => ['required', 'string', 'max:64'],
            'nama' => ['required', 'string', 'max:255'],
            'nomor_dokumen' => ['nullable', 'string', 'max:100'],
            'tanggal_dokumen' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
            'is_complete_checked' => ['boolean'],
            'submit_doc_approval' => ['boolean'],
            'submit_draft_approval' => ['boolean'],
            'file' => [
                Rule::requiredIf($this->boolean('submit_draft_approval')),
                'nullable',
                'file',
                'mimes:pdf,doc,docx,zip,jpg,jpeg,png,webp',
                "max:{$maxKb}",
            ],
        ];
    }
}
