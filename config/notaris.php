<?php

return [
    'office' => [
        'name' => 'Kantor Notaris Nurul Huda Nelson, S.H., M.Kn.',
        'notaris_name' => 'Nurul Huda Nelson, S.H., M.Kn.',
        'sk_number' => 'AHU-00472.AH.02.01 Tahun 2022',
        'address' => 'Jl. Trip Jamaksari, RT.001/RW.006, Sumurpecung, Kec. Serang, Kota Serang, Banten 42118',
    ],

    'max_file_kb' => 2048,

    'allowed_mimes' => ['pdf', 'jpg', 'jpeg', 'png', 'webp'],

    'draft_mimes' => ['pdf', 'doc', 'docx', 'zip', 'jpg', 'jpeg', 'png', 'webp'],

    'jenis_akta' => [
        ['label' => 'Akta Pendirian PT', 'is_badan_usaha' => true],
        ['label' => 'Akta Pendirian CV', 'is_badan_usaha' => true],
        ['label' => 'Akta Perubahan Anggaran Dasar', 'is_badan_usaha' => true],
        ['label' => 'Akta Pernyataan Keputusan Rapat', 'is_badan_usaha' => true],
        ['label' => 'Akta Pendirian Yayasan', 'is_badan_usaha' => true],
        ['label' => 'Akta Pendirian Koperasi', 'is_badan_usaha' => true],
        ['label' => 'Akta Jual Beli (AJB)', 'is_badan_usaha' => false],
        ['label' => 'Akta Hibah', 'is_badan_usaha' => false],
        ['label' => 'Akta Waris', 'is_badan_usaha' => false],
        ['label' => 'Akta Perjanjian', 'is_badan_usaha' => false],
        ['label' => 'Akta Kuasa', 'is_badan_usaha' => false],
        ['label' => 'Akta Wasiat', 'is_badan_usaha' => false],
        ['label' => 'Legalisasi / Waarmerking', 'is_badan_usaha' => false],
        ['label' => 'Lainnya', 'is_badan_usaha' => false],
    ],

    'kategori_dokumen' => [
        'KTP',
        'Kartu Keluarga',
        'NPWP',
        'Akta Kelahiran',
        'Akta Nikah',
        'Akta Pendirian',
        'Akta Perubahan',
        'SK Kemenkumham / AHU',
        'Pemilik Manfaat (BO)',
        'TBNRI',
        'NIB / OSS',
        'Sertifikat Tanah',
        'PBB',
        'Surat Kuasa',
        'Surat Pernyataan',
        'Draft Akta',
        'Salinan Akta',
        'Bukti Pembayaran',
        'Berita Acara Serah Terima (BAST)',
        'Berkas Pendukung',
        'Lainnya',
    ],

    'bentuk_badan' => [
        'PT (Perseroan Terbatas)',
        'PT Perorangan',
        'CV (Persekutuan Komanditer)',
        'Firma',
        'Yayasan',
        'Perkumpulan',
        'Koperasi',
        'UD (Usaha Dagang)',
    ],
];
