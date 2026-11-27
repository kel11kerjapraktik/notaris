import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, Eye, FileText, FolderArchive, Pencil, Printer } from 'lucide-react';
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
import { escapeHtml, formatDate, formatRupiah, printDocument } from '@/lib/format';
import archivesRoute from '@/routes/archives';
import casesRoute from '@/routes/cases';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import type { Auth, BreadcrumbItem, Client, DeedCaseDetail, DocumentItem, NotarisConfig } from '@/types';

type ClientShowProps = {
    client: Client & {
        deed_cases?: (Omit<DeedCaseDetail, 'client' | 'histories' | 'documents'> & {
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
        const body = `
            <h3>A. Biodata Diri</h3>
            <dl>
                ${dlRow('Nama Lengkap', client.nama)}${dlRow('NIK', client.nik)}${dlRow('NPWP', client.npwp)}
                ${dlRow('Alamat', client.alamat)}${dlRow('Telepon', client.telepon)}${dlRow('Email', client.email)}
            </dl>
            <div class="sign-row">
                <div class="sign-box"><div>Klien,</div><div class="sign-line">( ${escapeHtml(client.nama)} )</div></div>
                <div class="sign-box"><div>Petugas,</div><div class="sign-line">( ${escapeHtml(auth.user.name)} )</div></div>
            </div>
        `;
        printDocument('Formulir Biodata Klien', `Kode: ${client.kode}`, body, notarisConfig.office);
    };

    const co = client.company;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${client.kode} — ${client.nama}`} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="sm">
                            <Link href={clientsRoute.index()}>
                                <ArrowLeft className="mr-1 size-4" /> Kembali
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
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
                                <Pencil className="mr-1.5 size-4" /> Edit Biodata & Berkas
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="mr-1.5 size-4" /> Cetak Biodata
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border bg-card p-5">
                        <h2 className="mb-3 text-sm font-semibold">A. Biodata Diri (Sesuai KTP)</h2>
                        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">NIK</dt>
                            <dd className="col-span-2 font-medium">{client.nik || '-'}</dd>
                            <dt className="text-muted-foreground">NPWP</dt>
                            <dd className="col-span-2">{client.npwp || '-'}</dd>
                            <dt className="text-muted-foreground">TTL</dt>
                            <dd className="col-span-2">
                                {client.tempat_lahir || '-'},{' '}
                                {client.tanggal_lahir ? formatDate(client.tanggal_lahir) : '-'}
                            </dd>
                            <dt className="text-muted-foreground">Telepon</dt>
                            <dd className="col-span-2">{client.telepon || '-'}</dd>
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="col-span-2">{client.email || '-'}</dd>
                            <dt className="text-muted-foreground">Alamat</dt>
                            <dd className="col-span-2">
                                {[client.alamat, client.rt_rw ? `RT/RW ${client.rt_rw}` : '', client.kelurahan, client.kecamatan, client.kota, client.provinsi]
                                    .filter(Boolean)
                                    .join(', ') || '-'}
                            </dd>
                        </dl>
                    </div>

                    {client.jenis === 'perusahaan' && co && (
                        <div className="rounded-xl border bg-card p-5">
                            <h2 className="mb-3 text-sm font-semibold">B. Biodata Perusahaan</h2>
                            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted-foreground">Nama</dt>
                                <dd className="col-span-2 font-medium">{co.nama || '-'}</dd>
                                <dt className="text-muted-foreground">Bentuk Badan</dt>
                                <dd className="col-span-2">{co.bentuk_badan || '-'}</dd>
                                <dt className="text-muted-foreground">KBLI</dt>
                                <dd className="col-span-2">{co.kbli || '-'}</dd>
                                <dt className="text-muted-foreground">NIB / OSS</dt>
                                <dd className="col-span-2">{co.nib || '-'}</dd>
                                <dt className="text-muted-foreground">SK AHU</dt>
                                <dd className="col-span-2">{co.sk_kemenkumham || '-'}</dd>
                                <dt className="text-muted-foreground">Modal Dasar</dt>
                                <dd className="col-span-2">
                                    {co.modal_dasar ? formatRupiah(co.modal_dasar) : '-'}
                                </dd>
                                <dt className="text-muted-foreground">Direktur / Komisaris</dt>
                                <dd className="col-span-2">
                                    {[co.direktur, co.komisaris].filter(Boolean).join(' / ') || '-'}
                                </dd>
                            </dl>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-5">
                    <h2 className="mb-3 text-sm font-semibold">
                        Berkas Akta Terkait ({client.deed_cases?.length ?? 0})
                    </h2>
                    {!client.deed_cases?.length ? (
                        <p className="text-sm text-muted-foreground">Belum ada berkas akta untuk klien ini.</p>
                    ) : (
                        <div className="divide-y">
                            {client.deed_cases.map((dc) => (
                                <div key={dc.id} className="flex items-center justify-between py-2.5 text-sm">
                                    <div>
                                        <span className="font-semibold">{dc.nomor}</span> — {dc.jenis_akta}
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        {dc.is_completed ? (
                                            <Link href={archivesRoute.index({ query: { search: client.kode } })}>
                                                <FolderArchive className="mr-1.5 size-3.5" /> Buka Pengarsipan
                                            </Link>
                                        ) : (
                                            <Link href={casesRoute.show(dc.id)}>Buka Monitoring</Link>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-5">
                    <h2 className="mb-3 text-sm font-semibold">
                        Kelengkapan Berkas Klien ({client.documents?.length ?? 0})
                    </h2>
                    {!client.documents?.length ? (
                        <p className="text-sm text-muted-foreground">Belum ada berkas kelengkapan yang diunggah.</p>
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
                                            <div className="font-medium">{doc.nama}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {doc.kategori}
                                                {doc.nomor_dokumen ? ` • No. ${doc.nomor_dokumen}` : ''} •{' '}
                                                {formatDate(doc.tanggal_dokumen)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={doc.is_verified ? 'default' : 'secondary'}>
                                            {doc.is_verified ? 'Terverifikasi' : 'Tersimpan'}
                                        </Badge>
                                        {doc.file_path && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setPreviewDoc(doc)}
                                                >
                                                    <Eye className="mr-1 size-3.5" /> Lihat
                                                </Button>
                                                <Button asChild size="sm" variant="outline">
                                                    <a
                                                        href={documentsRoute.download(doc.id, { query: { download: 1 } }).url}
                                                        download
                                                    >
                                                        <Download className="mr-1 size-3.5" /> Unduh File
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

            <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.nama}</DialogTitle>
                    </DialogHeader>
                    {previewDoc && (
                        <div className="space-y-4">
                            {previewDoc.mime_type?.startsWith('image/') ? (
                                <img
                                    src={documentsRoute.download(previewDoc.id).url}
                                    alt={previewDoc.nama}
                                    className="max-h-[70vh] w-full rounded-lg border object-contain"
                                />
                            ) : (
                                <iframe
                                    src={documentsRoute.download(previewDoc.id).url}
                                    title={previewDoc.nama}
                                    className="h-[70vh] w-full rounded-lg border"
                                />
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                                    Tutup
                                </Button>
                                <Button asChild>
                                    <a
                                        href={documentsRoute.download(previewDoc.id, { query: { download: 1 } }).url}
                                        download
                                    >
                                        <Download className="mr-1.5 size-4" /> Unduh File
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
