import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Eye,
    FileText,
    FolderArchive,
    Pencil,
    Printer,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import {
    escapeHtml,
    formatDate,
    formatRupiah,
    printDocument,
} from '@/lib/format';
import archivesRoute from '@/routes/archives';
import casesRoute from '@/routes/cases';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import type {
    Auth,
    BreadcrumbItem,
    Client,
    DeedCaseDetail,
    DocumentItem,
    NotarisConfig,
} from '@/types';

type ClientShowProps = {
    client: Client & {
        deed_cases?: (Omit<
            DeedCaseDetail,
            'client' | 'histories' | 'documents'
        > & {
            current_stage: string;
        })[];
        documents?: DocumentItem[];
    };
};

export default function ClientsShow({ client }: ClientShowProps) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;

    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Data Klien', href: clientsRoute.index() },
        { title: client.kode, href: clientsRoute.show(client.id) },
    ];

    const handlePrint = () => {
        const dlRow = (l: string, v: string | null | undefined) =>
            `<dt>${l}</dt><dd>${escapeHtml(v || '-')}</dd>`;
        const alamatDiri = [
            client.alamat,
            client.rt_rw ? `RT/RW ${client.rt_rw}` : '',
            client.kelurahan,
            client.kecamatan,
            client.kota,
            client.provinsi,
            client.kode_pos,
        ]
            .filter(Boolean)
            .join(', ');
        const coData = client.company;
        const companyHtml =
            client.jenis === 'perusahaan' && coData
                ? `<h3>B. Biodata Perusahaan / Badan Usaha</h3><dl>
                    ${dlRow('Nama Perusahaan', coData.nama)}${dlRow('Bentuk Badan', coData.bentuk_badan)}${dlRow('Jabatan Klien', coData.jabatan)}
                    ${dlRow('Bidang Usaha', coData.bidang_usaha)}${dlRow('KBLI', coData.kbli)}${dlRow('Tahun Berdiri', coData.tahun_berdiri)}
                    ${dlRow('NPWP Perusahaan', coData.npwp)}${dlRow('NIB / OSS', coData.nib)}${dlRow('SK Kemenkumham', coData.sk_kemenkumham)}
                    ${dlRow('Alamat', [coData.alamat, coData.kota, coData.provinsi, coData.kode_pos].filter(Boolean).join(', '))}
                    ${dlRow('Telepon / Email', [coData.telepon, coData.email].filter(Boolean).join(' / '))}
                    ${dlRow('Modal Dasar', coData.modal_dasar ? formatRupiah(coData.modal_dasar) : '-')}
                    ${dlRow('Modal Ditempatkan', coData.modal_ditempatkan ? formatRupiah(coData.modal_ditempatkan) : '-')}
                    ${dlRow('Modal Disetor', coData.modal_disetor ? formatRupiah(coData.modal_disetor) : '-')}
                    ${dlRow('Saham', `${coData.jumlah_saham ?? '-'} lembar @ ${coData.nominal_saham ? formatRupiah(coData.nominal_saham) : '-'}`)}
                    ${dlRow('Direktur', coData.direktur)}${dlRow('Komisaris', coData.komisaris)}
                  </dl>`
                : '';

        const body = `
            <h3>A. Biodata Diri (Sesuai KTP)</h3>
            <dl>
                ${dlRow('Nama Lengkap', client.nama)}${dlRow('NIK', client.nik)}${dlRow('NPWP', client.npwp)}
                ${dlRow('Tempat / Tgl Lahir', `${client.tempat_lahir || '-'}, ${client.tanggal_lahir ? formatDate(client.tanggal_lahir) : '-'}`)}
                ${dlRow('Jenis Kelamin', client.jenis_kelamin)}${dlRow('Agama', client.agama)}${dlRow('Kewarganegaraan', client.kewarganegaraan)}
                ${dlRow('Status Perkawinan', client.status_perkawinan)}${dlRow('Pekerjaan', client.pekerjaan)}${dlRow('Nama Ibu Kandung', client.nama_ibu_kandung)}
                ${dlRow('Alamat', alamatDiri)}${dlRow('Telepon', client.telepon)}${dlRow('Email', client.email)}
            </dl>
            ${companyHtml}
            ${client.catatan ? `<h3>Catatan</h3><p>${escapeHtml(client.catatan)}</p>` : ''}
            <div class="sign-row">
                <div class="sign-box"><div>Klien,</div><div class="sign-line">( ${escapeHtml(client.nama)} )</div></div>
                <div class="sign-box"><div>Petugas / Notaris,</div><div class="sign-line">( ${escapeHtml(auth.user.name)} )</div></div>
            </div>
        `;
        printDocument(
            'Formulir Biodata Klien',
            `No. Klien: ${client.kode} • Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
    };

    const co = client.company;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${client.kode} — ${client.nama}`} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                                <Link href={clientsRoute.index()}>
                                    <ArrowLeft className="mr-1 size-4" />{' '}
                                    Kembali
                                </Link>
                            </Button>
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                    Profil Klien
                                </p>
                                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                    {client.kode} — {client.nama}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {client.jenis === 'perusahaan' && co?.nama
                                        ? `${co.nama} (${co.bentuk_badan || 'Badan Usaha'})`
                                        : 'Klien Perorangan'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={clientsRoute.edit(client.id)}>
                                    <Pencil className="mr-1.5 size-4" /> Edit
                                    Biodata & Berkas
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                            >
                                <Printer className="mr-1.5 size-4" /> Cetak
                                Biodata
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                        <h2 className="mb-3 border-b border-amber-500/15 pb-2.5 text-sm font-semibold text-foreground">
                            A. Biodata Diri (Sesuai KTP)
                        </h2>
                        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">NIK</dt>
                            <dd className="col-span-2 font-medium">
                                {client.nik || '-'}
                            </dd>
                            <dt className="text-muted-foreground">NPWP</dt>
                            <dd className="col-span-2">{client.npwp || '-'}</dd>
                            <dt className="text-muted-foreground">TTL</dt>
                            <dd className="col-span-2">
                                {client.tempat_lahir || '-'},{' '}
                                {client.tanggal_lahir
                                    ? formatDate(client.tanggal_lahir)
                                    : '-'}
                            </dd>
                            <dt className="text-muted-foreground">Telepon</dt>
                            <dd className="col-span-2">
                                {client.telepon || '-'}
                            </dd>
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="col-span-2">
                                {client.email || '-'}
                            </dd>
                            <dt className="text-muted-foreground">Alamat</dt>
                            <dd className="col-span-2">
                                {[
                                    client.alamat,
                                    client.rt_rw ? `RT/RW ${client.rt_rw}` : '',
                                    client.kelurahan,
                                    client.kecamatan,
                                    client.kota,
                                    client.provinsi,
                                ]
                                    .filter(Boolean)
                                    .join(', ') || '-'}
                            </dd>
                        </dl>
                    </div>

                    {client.jenis === 'perusahaan' && co && (
                        <div className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                            <h2 className="mb-3 border-b border-amber-500/15 pb-2.5 text-sm font-semibold text-foreground">
                                B. Biodata Perusahaan
                            </h2>
                            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">Nama</dt>
                                <dd className="col-span-2 font-medium">
                                    {co.nama || '-'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Bentuk Badan
                                </dt>
                                <dd className="col-span-2">
                                    {co.bentuk_badan || '-'}
                                </dd>
                                <dt className="text-muted-foreground">KBLI</dt>
                                <dd className="col-span-2">{co.kbli || '-'}</dd>
                                <dt className="text-muted-foreground">
                                    NIB / OSS
                                </dt>
                                <dd className="col-span-2">{co.nib || '-'}</dd>
                                <dt className="text-muted-foreground">
                                    SK AHU
                                </dt>
                                <dd className="col-span-2">
                                    {co.sk_kemenkumham || '-'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Modal Dasar
                                </dt>
                                <dd className="col-span-2">
                                    {co.modal_dasar
                                        ? formatRupiah(co.modal_dasar)
                                        : '-'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Direktur / Komisaris
                                </dt>
                                <dd className="col-span-2">
                                    {[co.direktur, co.komisaris]
                                        .filter(Boolean)
                                        .join(' / ') || '-'}
                                </dd>
                            </dl>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                    <h2 className="mb-3 border-b border-amber-500/15 pb-2.5 text-sm font-semibold text-foreground">
                        Berkas Akta Terkait ({client.deed_cases?.length ?? 0})
                    </h2>
                    {!client.deed_cases?.length ? (
                        <p className="text-sm text-muted-foreground">
                            Belum ada berkas akta untuk klien ini.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {client.deed_cases.map((dc) => (
                                <div
                                    key={dc.id}
                                    className="flex items-center justify-between py-2.5 text-sm"
                                >
                                    <div>
                                        <span className="font-semibold">
                                            {dc.nomor}
                                        </span>{' '}
                                        — {dc.jenis_akta}
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        {dc.is_completed ? (
                                            <Link
                                                href={archivesRoute.index({
                                                    query: {
                                                        search: client.kode,
                                                    },
                                                })}
                                            >
                                                <FolderArchive className="mr-1.5 size-3.5" />{' '}
                                                Buka Pengarsipan
                                            </Link>
                                        ) : (
                                            <Link href={casesRoute.show(dc.id)}>
                                                Buka Monitoring
                                            </Link>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                    <h2 className="mb-3 border-b border-amber-500/15 pb-2.5 text-sm font-semibold text-foreground">
                        Kelengkapan Berkas Klien (
                        {client.documents?.length ?? 0})
                    </h2>
                    {!client.documents?.length ? (
                        <p className="text-sm text-muted-foreground">
                            Belum ada berkas kelengkapan yang diunggah.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {client.documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <FileText className="size-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium">
                                                {doc.nama}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {doc.kategori}
                                                {doc.nomor_dokumen
                                                    ? ` • No. ${doc.nomor_dokumen}`
                                                    : ''}{' '}
                                                •{' '}
                                                {formatDate(
                                                    doc.tanggal_dokumen,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                doc.is_verified
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {doc.is_verified
                                                ? 'Terverifikasi'
                                                : 'Tersimpan'}
                                        </Badge>
                                        {doc.file_path && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setPreviewDoc(doc)
                                                    }
                                                >
                                                    <Eye className="mr-1 size-3.5" />{' '}
                                                    Lihat
                                                </Button>
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={
                                                            documentsRoute.download(
                                                                doc.id,
                                                                {
                                                                    query: {
                                                                        download: 1,
                                                                    },
                                                                },
                                                            ).url
                                                        }
                                                        download
                                                    >
                                                        <Download className="mr-1 size-3.5" />{' '}
                                                        Unduh File
                                                    </a>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => !open && setPreviewDoc(null)}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.nama}</DialogTitle>
                    </DialogHeader>
                    {previewDoc && (
                        <div className="space-y-4">
                            {previewDoc.mime_type?.startsWith('image/') ? (
                                <img
                                    src={
                                        documentsRoute.download(previewDoc.id)
                                            .url
                                    }
                                    alt={previewDoc.nama}
                                    className="max-h-[70vh] w-full rounded-lg border object-contain"
                                />
                            ) : (
                                <iframe
                                    src={
                                        documentsRoute.download(previewDoc.id)
                                            .url
                                    }
                                    title={previewDoc.nama}
                                    className="h-[70vh] w-full rounded-lg border"
                                />
                            )}
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setPreviewDoc(null)}
                                >
                                    Tutup
                                </Button>
                                <Button asChild>
                                    <a
                                        href={
                                            documentsRoute.download(
                                                previewDoc.id,
                                                { query: { download: 1 } },
                                            ).url
                                        }
                                        download
                                    >
                                        <Download className="mr-1.5 size-4" />{' '}
                                        Unduh File
                                    </a>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
