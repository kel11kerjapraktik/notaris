<?php

namespace App\Enums;

enum DeedStage: string
{
    case BIODATA_KLIEN = 'biodata_klien';
    case PEMBAYARAN_DP = 'pembayaran_dp';
    case VERIFIKASI_DOKUMEN = 'verifikasi_dokumen';
    case PENGERJAAN_AKTA = 'pengerjaan_akta';
    case PENANDATANGANAN_MINUTA = 'penandatanganan_minuta';
    case PENERBITAN_AKTA_SK_AHU = 'penerbitan_akta_sk_ahu';
    case PEMILIK_MANFAAT = 'pemilik_manfaat';
    case TBNRI = 'tbnri';
    case OSS_NIB = 'oss_nib';
    case PELUNASAN_BIAYA = 'pelunasan_biaya';

    public function order(): int
    {
        return match ($this) {
            self::BIODATA_KLIEN => 1,
            self::PEMBAYARAN_DP => 2,
            self::VERIFIKASI_DOKUMEN => 3,
            self::PENGERJAAN_AKTA => 4,
            self::PENANDATANGANAN_MINUTA => 5,
            self::PENERBITAN_AKTA_SK_AHU => 6,
            self::PEMILIK_MANFAAT => 7,
            self::TBNRI => 8,
            self::OSS_NIB => 9,
            self::PELUNASAN_BIAYA => 10,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::BIODATA_KLIEN => 'Pengisian Biodata Klien',
            self::PEMBAYARAN_DP => 'Pembayaran DP 50%',
            self::VERIFIKASI_DOKUMEN => 'Verifikasi Dokumen',
            self::PENGERJAAN_AKTA => 'Pengerjaan Akta',
            self::PENANDATANGANAN_MINUTA => 'Penandatanganan Minuta Akta',
            self::PENERBITAN_AKTA_SK_AHU => 'Penerbitan Akta & SK AHU',
            self::PEMILIK_MANFAAT => 'Pengisian Pemilik Manfaat',
            self::TBNRI => 'TBNRI',
            self::OSS_NIB => 'Pengurusan OSS NIB Perusahaan',
            self::PELUNASAN_BIAYA => 'Pelunasan Biaya',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::BIODATA_KLIEN => 'Data diri & perusahaan klien diterima dan dicatat.',
            self::PEMBAYARAN_DP => 'Pembayaran uang muka 50% beserta bukti transfer (diverifikasi Notaris).',
            self::VERIFIKASI_DOKUMEN => 'Pemeriksaan kelengkapan oleh Staf dan keabsahan oleh Notaris.',
            self::PENGERJAAN_AKTA => 'Penyusunan draf akta, revisi, dan persetujuan draf oleh Notaris.',
            self::PENANDATANGANAN_MINUTA => 'Pembacaan & penandatanganan minuta akta oleh para pihak dan Notaris.',
            self::PENERBITAN_AKTA_SK_AHU => 'Penerbitan salinan akta & pengurusan SK Kemenkumham (AHU).',
            self::PEMILIK_MANFAAT => 'Pelaporan data Pemilik Manfaat (Beneficial Ownership) perseroan.',
            self::TBNRI => 'Pengurusan Tambahan Berita Negara Republik Indonesia.',
            self::OSS_NIB => 'Pengurusan Nomor Induk Berusaha (NIB) & perizinan di OSS.',
            self::PELUNASAN_BIAYA => 'Pelunasan sisa biaya (verifikasi Notaris) & serah terima dokumen.',
        };
    }

    public function isSkippable(): bool
    {
        return in_array($this, [
            self::PENERBITAN_AKTA_SK_AHU,
            self::PEMILIK_MANFAAT,
            self::TBNRI,
            self::OSS_NIB,
        ], true);
    }

    public function requiresNotarisApproval(): bool
    {
        return in_array($this, [
            self::PENANDATANGANAN_MINUTA,
            self::PELUNASAN_BIAYA,
        ], true);
    }

    public function next(): ?self
    {
        $cases = self::cases();
        $index = array_search($this, $cases, true);

        return $cases[$index + 1] ?? null;
    }

    public function previous(): ?self
    {
        $cases = self::cases();
        $index = array_search($this, $cases, true);

        return $index > 0 ? $cases[$index - 1] : null;
    }

    /**
     * @return array<int, array{key: string, order: int, label: string, description: string, skippable: bool, requires_notaris: bool}>
     */
    public static function toFrontendList(): array
    {
        return array_map(
            fn (self $stage) => [
                'key' => $stage->value,
                'order' => $stage->order(),
                'label' => $stage->label(),
                'description' => $stage->description(),
                'skippable' => $stage->isSkippable(),
                'requires_notaris' => $stage->requiresNotarisApproval(),
            ],
            self::cases(),
        );
    }
}
