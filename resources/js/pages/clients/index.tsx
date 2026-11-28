import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Download,
    Eye,
    FolderArchive,
    Pencil,
    Plus,
    Printer,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { SearchInput } from '@/components/notaris/search-input';
import { StageBadge } from '@/components/notaris/stage-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import AppLayout from '@/layouts/app-layout';
import {
    escapeHtml,
    exportCsv,
    formatDate,
    formatRupiah,
    printDocument,
} from '@/lib/format';
import archivesRoute from '@/routes/archives';
import clientsRoute from '@/routes/clients';
import type { Auth, BreadcrumbItem, Client, NotarisConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Data Klien', href: clientsRoute.index() },
];

type ClientRow = Client & {
    active_cases_count?: number;
    completed_cases_count?: number;
    active_stages?: {
        id: number;
        nomor: string;
        stage_order: number;
        stage_label: string;
        is_completed: boolean;
    }[];
};

export default function ClientsIndex({
    clients,
    counts,
    filters,
}: {
    clients: ClientRow[];
    counts: { proses: number; selesai: number };
    filters: { search: string; status: 'proses' | 'selesai' };
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;
    const isNotaris = auth?.user?.is_notaris ?? false;

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState<'proses' | 'selesai'>(
        filters.status ?? 'proses',
    );
    const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const applyFilters = (
        nextSearch: string,
        nextStatus: 'proses' | 'selesai',
    ) => {
        const params: Record<string, string> = {};
        if (nextSearch) params.search = nextSearch;
        if (nextStatus !== 'proses') params.status = nextStatus;
        router.get(clientsRoute.index().url, params, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedApplyFilters = useDebouncedCallback(applyFilters, 300);

    const handleSearch = (value: string) => {
        setSearch(value);
        debouncedApplyFilters(value, status);
    };

    const handleStatusChange = (nextStatus: 'proses' | 'selesai') => {
        setStatus(nextStatus);
        applyFilters(search, nextStatus);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(clientsRoute.destroy(deleteTarget.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const handlePrint = (c: ClientRow) => {
        const dlRow = (l: string, v: string | null | undefined) =>
            `<dt>${l}</dt><dd>${escapeHtml(v || '-')}</dd>`;
        const alamatDiri = [
            c.alamat,
            c.rt_rw ? `RT/RW ${c.rt_rw}` : '',
            c.kelurahan,
            c.kecamatan,
            c.kota,
            c.provinsi,
            c.kode_pos,
        ]
            .filter(Boolean)
            .join(', ');
        const co = c.company;
        const companyHtml =
            c.jenis === 'perusahaan' && co
                ? `<h3>B. Biodata Perusahaan / Badan Usaha</h3><dl>
                    ${dlRow('Nama Perusahaan', co.nama)}${dlRow('Bentuk Badan', co.bentuk_badan)}${dlRow('Jabatan Klien', co.jabatan)}
                    ${dlRow('Bidang Usaha', co.bidang_usaha)}${dlRow('KBLI', co.kbli)}${dlRow('Tahun Berdiri', co.tahun_berdiri)}
                    ${dlRow('NPWP Perusahaan', co.npwp)}${dlRow('NIB / OSS', co.nib)}${dlRow('SK Kemenkumham', co.sk_kemenkumham)}
                    ${dlRow('Alamat', [co.alamat, co.kota, co.provinsi, co.kode_pos].filter(Boolean).join(', '))}
                    ${dlRow('Telepon / Email', [co.telepon, co.email].filter(Boolean).join(' / '))}
                    ${dlRow('Modal Dasar', co.modal_dasar ? formatRupiah(co.modal_dasar) : '-')}
                    ${dlRow('Modal Ditempatkan', co.modal_ditempatkan ? formatRupiah(co.modal_ditempatkan) : '-')}
                    ${dlRow('Modal Disetor', co.modal_disetor ? formatRupiah(co.modal_disetor) : '-')}
                    ${dlRow('Saham', `${co.jumlah_saham ?? '-'} lembar @ ${co.nominal_saham ? formatRupiah(co.nominal_saham) : '-'}`)}
                    ${dlRow('Direktur', co.direktur)}${dlRow('Komisaris', co.komisaris)}
                  </dl>`
                : '';

        const body = `
            <h3>A. Biodata Diri (Sesuai KTP)</h3>
            <dl>
                ${dlRow('Nama Lengkap', c.nama)}${dlRow('NIK', c.nik)}${dlRow('NPWP', c.npwp)}
                ${dlRow('Tempat / Tgl Lahir', `${c.tempat_lahir || '-'}, ${c.tanggal_lahir ? formatDate(c.tanggal_lahir) : '-'}`)}
                ${dlRow('Jenis Kelamin', c.jenis_kelamin)}${dlRow('Agama', c.agama)}${dlRow('Kewarganegaraan', c.kewarganegaraan)}
                ${dlRow('Status Perkawinan', c.status_perkawinan)}${dlRow('Pekerjaan', c.pekerjaan)}${dlRow('Nama Ibu Kandung', c.nama_ibu_kandung)}
                ${dlRow('Alamat', alamatDiri)}${dlRow('Telepon', c.telepon)}${dlRow('Email', c.email)}
            </dl>
            ${companyHtml}
            ${c.catatan ? `<h3>Catatan</h3><p>${escapeHtml(c.catatan)}</p>` : ''}
            <div class="sign-row">
                <div class="sign-box"><div>Klien,</div><div class="sign-line">( ${escapeHtml(c.nama)} )</div></div>
                <div class="sign-box"><div>Petugas / Notaris,</div><div class="sign-line">( ${escapeHtml(auth.user.name)} )</div></div>
            </div>
        `;
        printDocument(
            'Formulir Biodata Klien',
            `No. Klien: ${c.kode} • Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
    };

    const handleExportCsv = () => {
        exportCsv(
            'data-klien',
            clients.map((c) => ({
                Kode: c.kode,
                Nama: c.nama,
                NIK: c.nik ?? '',
                NPWP: c.npwp ?? '',
                Jenis: c.jenis,
                Telepon: c.telepon ?? '',
                Email: c.email ?? '',
                Kota: c.kota ?? '',
                Perusahaan: c.company?.nama ?? '',
                BentukBadan: c.company?.bentuk_badan ?? '',
                NIB: c.company?.nib ?? '',
            })),
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Klien — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                Manajemen Klien
                            </p>
                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                Data Klien
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Menampilkan klien yang masih dalam proses; klien
                                yang sudah selesai otomatis masuk ke
                                Pengarsipan.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCsv}
                                disabled={clients.length === 0}
                            >
                                <Download className="mr-1.5 size-4" /> Ekspor
                                CSV
                            </Button>
                            <Button asChild size="sm">
                                <Link href={clientsRoute.create()}>
                                    <Plus className="mr-1.5 size-4" /> Tambah
                                    Klien
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tab Bagian Klien Masih Proses & Klien Sudah Selesai */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/15 bg-card/85 p-3 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={
                                status === 'proses' && !search
                                    ? 'default'
                                    : 'outline'
                            }
                            onClick={() => handleStatusChange('proses')}
                        >
                            Klien Masih Proses
                            <Badge variant="secondary" className="ml-2">
                                {counts.proses}
                            </Badge>
                        </Button>
                        <Button
                            size="sm"
                            variant={
                                status === 'selesai' && !search
                                    ? 'default'
                                    : 'outline'
                            }
                            onClick={() => handleStatusChange('selesai')}
                        >
                            Klien Sudah Selesai (Arsip)
                            <Badge variant="secondary" className="ml-2">
                                {counts.selesai}
                            </Badge>
                        </Button>
                    </div>

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <SearchInput
                            value={search}
                            onChange={handleSearch}
                            placeholder="Cari semua klien (nama / NIK / kode)…"
                            ariaLabel="Cari data klien berdasarkan nama, NIK, atau kode"
                            className="flex-1 sm:w-72"
                        />
                        <Badge
                            variant="secondary"
                            className="border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        >
                            {clients.length} tampil
                        </Badge>
                    </div>
                </div>

                {search && (
                    <div className="text-xs text-muted-foreground">
                        Menampilkan hasil pencarian dari{' '}
                        <strong>seluruh klien</strong> (baik yang masih proses
                        maupun yang sudah selesai diarsipkan).
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs">
                    {clients.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {search
                                ? `Tidak ditemukan klien untuk kata kunci "${search}".`
                                : status === 'selesai'
                                  ? 'Belum ada klien yang seluruh tahapannya selesai.'
                                  : 'Belum ada klien yang sedang dalam proses. Klik + Tambah Klien untuk memulai.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-amber-500/15 bg-amber-500/5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="px-4 py-3">Kode</th>
                                        <th className="px-4 py-3">
                                            Nama Klien
                                        </th>
                                        <th className="px-4 py-3">Jenis</th>
                                        <th className="px-4 py-3">Kontak</th>
                                        <th className="px-4 py-3">
                                            Perusahaan
                                        </th>
                                        <th className="px-4 py-3">
                                            Status Proses
                                        </th>
                                        <th className="px-4 py-3">
                                            Tahapan Berkas
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {clients.map((c) => {
                                        const isDone =
                                            (c.completed_cases_count ?? 0) >
                                                0 &&
                                            (c.active_cases_count ?? 0) === 0;
                                        return (
                                            <tr
                                                key={c.id}
                                                className="transition-colors hover:bg-amber-500/5"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">
                                                        {c.kode}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            c.created_at,
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {c.nama}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        NIK: {c.nik || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.jenis ===
                                                    'perusahaan' ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-sky-300 text-sky-700 dark:text-sky-300"
                                                        >
                                                            Perorangan + Badan
                                                            Usaha
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            Perorangan
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <div>
                                                        {c.telepon || '-'}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {c.email || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="font-medium">
                                                        {c.company?.nama || '—'}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {c.company
                                                            ?.bentuk_badan ||
                                                            ''}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {isDone ? (
                                                        <div className="space-y-1">
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                Selesai • Masuk
                                                                Arsip
                                                            </Badge>
                                                            <div>
                                                                <Link
                                                                    href={archivesRoute.index(
                                                                        {
                                                                            query: {
                                                                                search: c.kode,
                                                                            },
                                                                        },
                                                                    )}
                                                                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                                                >
                                                                    <FolderArchive className="size-3" />{' '}
                                                                    Lihat di
                                                                    Arsip
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <Badge
                                                                variant="outline"
                                                                className="border-amber-300 text-amber-700 dark:text-amber-300"
                                                            >
                                                                Masih Proses (
                                                                {c.active_cases_count ??
                                                                    0}{' '}
                                                                berkas)
                                                            </Badge>
                                                            <div className="mt-1 text-muted-foreground">
                                                                {c.documents_count ??
                                                                    0}{' '}
                                                                dokumen
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {c.active_stages &&
                                                    c.active_stages.length >
                                                        0 ? (
                                                        <div className="space-y-1.5">
                                                            {c.active_stages.map(
                                                                (st) => (
                                                                    <div
                                                                        key={
                                                                            st.id
                                                                        }
                                                                        className="space-y-0.5"
                                                                    >
                                                                        <StageBadge
                                                                            order={
                                                                                st.stage_order
                                                                            }
                                                                            label={
                                                                                st.stage_label
                                                                            }
                                                                            isCompleted={
                                                                                st.is_completed
                                                                            }
                                                                        />
                                                                        <div className="text-[11px] text-muted-foreground">
                                                                            {
                                                                                st.nomor
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            title="Detail"
                                                            aria-label={`Lihat detail ${c.nama}`}
                                                        >
                                                            <Link
                                                                href={clientsRoute.show(
                                                                    c.id,
                                                                )}
                                                            >
                                                                <Eye
                                                                    className="size-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handlePrint(c)
                                                            }
                                                            title="Cetak Biodata"
                                                            aria-label={`Cetak biodata ${c.nama}`}
                                                        >
                                                            <Printer
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                        </Button>
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            title="Edit"
                                                            aria-label={`Edit data ${c.nama}`}
                                                        >
                                                            <Link
                                                                href={clientsRoute.edit(
                                                                    c.id,
                                                                )}
                                                            >
                                                                <Pencil
                                                                    className="size-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                            </Link>
                                                        </Button>
                                                        {isNotaris && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    setDeleteTarget(
                                                                        c,
                                                                    )
                                                                }
                                                                title="Hapus"
                                                                aria-label={`Hapus klien ${c.nama}`}
                                                            >
                                                                <Trash2
                                                                    className="size-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmNoteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Hapus Data Klien"
                description={`Yakin ingin menghapus klien ${deleteTarget?.kode} (${deleteTarget?.nama}) beserta seluruh berkas dan dokumennya?`}
                confirmLabel="Hapus Permanen"
                confirmVariant="destructive"
                showNote={false}
                processing={deleting}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
