<?php

namespace App\Http\Requests;

use App\Models\Client;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertClientRequest extends FormRequest
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
        $client = $this->route('client');
        $isUpdate = $client instanceof Client || is_numeric($client);
        $clientId = $client instanceof Client ? $client->id : $client;
        $maxKb = (int) config('notaris.max_file_kb', 2048);
        $hasExistingDocs = $client instanceof Client && $client->documents()->exists();
        $requireAttachments = ! $isUpdate || ! $hasExistingDocs;

        return [
            'kode' => [
                $isUpdate ? 'required' : 'nullable',
                'string',
                'max:24',
                Rule::unique('clients', 'kode')->ignore($clientId),
            ],
            'jenis' => ['required', 'in:pribadi,perusahaan'],
            'nama' => ['required', 'string', 'max:255'],
            'nik' => ['required', 'string', 'max:32'],
            'npwp' => ['required', 'string', 'max:32'],
            'tempat_lahir' => ['required', 'string', 'max:120'],
            'tanggal_lahir' => ['required', 'date'],
            'jenis_kelamin' => ['required', 'string', 'max:20'],
            'agama' => ['required', 'string', 'max:30'],
            'kewarganegaraan' => ['required', 'string', 'max:10'],
            'status_perkawinan' => ['required', 'string', 'max:30'],
            'pekerjaan' => ['required', 'string', 'max:120'],
            'nama_ibu_kandung' => ['required', 'string', 'max:255'],
            'telepon' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email', 'max:255'],
            'alamat' => ['required', 'string', 'max:1000'],
            'rt_rw' => ['required', 'string', 'max:20'],
            'kelurahan' => ['required', 'string', 'max:120'],
            'kecamatan' => ['required', 'string', 'max:120'],
            'kota' => ['required', 'string', 'max:120'],
            'provinsi' => ['required', 'string', 'max:120'],
            'kode_pos' => ['required', 'string', 'max:12'],
            'catatan' => ['required', 'string', 'max:2000'],
            'company' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'array'],
            'company.nama' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:255'],
            'company.bentuk_badan' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:64'],
            'company.jabatan' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:120'],
            'company.bidang_usaha' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:255'],
            'company.kbli' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:64'],
            'company.tahun_berdiri' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:10'],
            'company.npwp' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:32'],
            'company.nib' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:64'],
            'company.sk_kemenkumham' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:255'],
            'company.alamat' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:1000'],
            'company.kota' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:120'],
            'company.provinsi' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:120'],
            'company.kode_pos' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:12'],
            'company.telepon' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:32'],
            'company.email' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'email', 'max:255'],
            'company.modal_dasar' => ['exclude_unless:jenis,perusahaan', 'nullable', 'numeric', 'min:0'],
            'company.modal_ditempatkan' => ['exclude_unless:jenis,perusahaan', 'nullable', 'numeric', 'min:0'],
            'company.modal_disetor' => ['exclude_unless:jenis,perusahaan', 'nullable', 'numeric', 'min:0'],
            'company.jumlah_saham' => ['exclude_unless:jenis,perusahaan', 'nullable', 'integer', 'min:0'],
            'company.nominal_saham' => ['exclude_unless:jenis,perusahaan', 'nullable', 'numeric', 'min:0'],
            'company.direktur' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:255'],
            'company.komisaris' => ['exclude_unless:jenis,perusahaan', 'required_if:jenis,perusahaan', 'string', 'max:255'],
            'attachments' => $requireAttachments ? ['required', 'array', 'min:1'] : ['nullable', 'array'],
            'attachments.*.kategori' => [$requireAttachments ? 'required' : 'required_with:attachments.*.file', 'string', 'max:64'],
            'attachments.*.nama' => [$requireAttachments ? 'required' : 'required_with:attachments.*.file', 'string', 'max:255'],
            'attachments.*.nomor_dokumen' => ['nullable', 'string', 'max:100'],
            'attachments.*.file' => [$requireAttachments ? 'required' : 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
            'jenis_akta' => ['required', 'string', 'max:255'],
            'biaya' => ['required', 'numeric', 'min:1'],
            'target_selesai' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'attachments.required' => 'Minimal 1 berkas kelengkapan wajib diunggah.',
            'attachments.min' => 'Minimal 1 berkas kelengkapan wajib diunggah.',
            'attachments.*.file.required' => 'File berkas kelengkapan wajib diunggah.',
            'biaya.min' => 'Biaya layanan akta harus lebih besar dari Rp 0.',
        ];
    }

    /**
     * Split validated payload into client, company, and initial deed case sections.
     *
     * @return array{client: array<string, mixed>, company: array<string, mixed>, case: array<string, mixed>}
     */
    public function sections(): array
    {
        $data = $this->validated();

        $company = $data['company'] ?? [];
        $case = [
            'jenis_akta' => $data['jenis_akta'] ?? null,
            'biaya' => $data['biaya'] ?? 0,
            'target_selesai' => $data['target_selesai'] ?? null,
        ];

        unset($data['company'], $data['attachments'], $data['jenis_akta'], $data['biaya'], $data['target_selesai']);

        return [
            'client' => $data,
            'company' => is_array($company) ? $company : [],
            'case' => $case,
        ];
    }
}
