import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Download, FileCheck2, Folder, Printer, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { escapeHtml, exportCsv, formatDate, formatRupiah, printDocument } from '@/lib/format';
import archivesRoute from '@/routes/archives';
import casesRoute from '@/routes/cases';
import documentsRoute from '@/routes/documents';
import type { Auth, BreadcrumbItem, DocumentItem, NotarisConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pengarsipan', href: archivesRoute.index() },
];

type ArchiveFolder = {
    id: number;
    kode: string;
    jenis: string;
    nama: string;
    nik: string | null;
    telepon: string | null;
    email: string | null;
    company_name: string | null;
    cases: {
        id: number;
        nomor: string;
        jenis_akta: string;
        current_stage_label: string;
        is_completed: boolean;
        biaya: number;
        terbayar: number;
        nomor_akta: string | null;
        tanggal_akta: string | null;
        nomor_sk_ahu: string | null;
        tanggal_sk_ahu: string | null;
        completed_at: string | null;
        bast_document: DocumentItem | null;
    }[];
    documents: DocumentItem[];
};

export default function ArchivesIndex({
    folders,
    filters,
}: {
    folders: ArchiveFolder[];
    filters: { search: string };
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;

    const [search, setSearch] = useState(filters.search ?? '');
    const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
    const [bastTarget, setBastTarget] = useState<{
        folder: ArchiveFolder;
        deedCase: ArchiveFolder['cases'][number];
    } | null>(null);

    const bastForm = useForm<{
        file: File | null;
        tanggal_dokumen: string;
        keterangan: string;
    }>({
        file: null,
        tanggal_dokumen: new Date().toISOString().slice(0, 10),
        keterangan: '',
    });

    const openBastUpload = (folder: ArchiveFolder, deedCase: ArchiveFolder['cases'][number]) => {
        bastForm.reset();
        bastForm.clearErrors();
        bastForm.setData({
            file: null,
            tanggal_dokumen: new Date().toISOString().slice(0, 10),
            keterangan: `BAST bertanda tangan untuk ${deedCase.nomor} (${deedCase.jenis_akta})`,
        });
        setBastTarget({ folder, deedCase });
    };

    const handleUploadBast = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bastTarget) return;
        bastForm.post(archivesRoute.uploadBast(bastTarget.deedCase.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setBastTarget(null);
                bastForm.reset();
            },
        });
    };

    const handlePrintBast = (f: ArchiveFolder, c: ArchiveFolder['cases'][number]) => {
        const body = `
            <p style="margin:0 0 12px;">
                Pada hari ini, <strong>${escapeHtml(formatDate(new Date().toISOString()))}</strong>, telah dilakukan serah terima dokumen akta yang telah selesai diproses oleh <strong>${escapeHtml(notarisConfig.office.name)}</strong> kepada pihak penerima dengan rincian sebagai berikut:
            </p>
            <h3>Data Penerima</h3>
            <dl>
                <dt>Kode / Nama Klien</dt><dd>${escapeHtml(f.kode)} — ${escapeHtml(f.nama)}</dd>
                <dt>NIK</dt><dd>${escapeHtml(f.nik || '-')}</dd>
                <dt>Perusahaan</dt><dd>${escapeHtml(f.company_name || '-')}</dd>
                <dt>Kontak</dt><dd>${escapeHtml([f.telepon, f.email].filter(Boolean).join(' / ') || '-')}</dd>
            </dl>
            <h3>Data Berkas &amp; Akta yang Diserahkan</h3>
            <dl>
                <dt>Nomor Berkas</dt><dd>${escapeHtml(c.nomor)}</dd>
                <dt>Jenis Akta</dt><dd>${escapeHtml(c.jenis_akta)}</dd>
                <dt>Nomor / Tgl Akta</dt><dd>${escapeHtml(c.nomor_akta || '-')} / ${escapeHtml(formatDate(c.tanggal_akta))}</dd>
                <dt>Nomor / Tgl SK AHU</dt><dd>${escapeHtml(c.nomor_sk_ahu || '-')} / ${escapeHtml(formatDate(c.tanggal_sk_ahu))}</dd>
                <dt>Tanggal Selesai</dt><dd>${escapeHtml(formatDate(c.completed_at))}</dd>
            </dl>
            <p style="margin:14px 0 0;">
                Dengan ditandatanganinya Berita Acara Serah Terima ini, Klien menyatakan telah menerima dokumen akta sebagaimana tersebut di atas dalam keadaan baik dan lengkap.
            </p>
            <div style="margin-top:34px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; text-align:center;">
                <div>
                    <div style="font-weight:600;">Yang Menerima,</div>
                    <div style="font-size:11px; color:#555;">Klien</div>
                    <div class="sign-line">( ${escapeHtml(f.nama)} )</div>
                </div>
                <div>
                    <div style="font-weight:600;">Mengetahui,</div>
                    <div style="font-size:11px; color:#555;">Notaris</div>
                    <div class="sign-line">( ${escapeHtml(notarisConfig.office.notaris_name)} )</div>
                </div>
                <div>
                    <div style="font-weight:600;">Yang Memproses,</div>
                    <div style="font-size:11px; color:#555;">Admin / Staf</div>
                    <div class="sign-line">( ${escapeHtml(auth.user.name)} )</div>
                </div>
            </div>
        `;
        printDocument(
            'Berita Acara Serah Terima',
            `No: BAST/${c.nomor} • Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
    };

    const toggleFolder = (id: number) => {
        setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        router.get(archivesRoute.index().url, val ? { search: val } : {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePrintClient = (f: ArchiveFolder) => {
        const caseRows = f.cases
            .map(
                (c) => `<tr>
                    <td>${escapeHtml(c.nomor)}</td>
                    <td>${escapeHtml(c.jenis_akta)}</td>
                    <td>${c.is_completed ? 'Selesai' : escapeHtml(c.current_stage_label)}</td>
                    <td>${escapeHtml(formatRupiah(c.biaya))}</td>
                    <td>${escapeHtml(formatRupiah(c.terbayar))}</td>
                </tr>`,
            )
            .join('');
        const docRows = f.documents
            .map(
                (d, idx) => `<tr>
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(d.nama)}</td>
                    <td>${escapeHtml(d.kategori)}</td>
                    <td>${escapeHtml(d.nomor_dokumen || '-')}</td>
                    <td>${escapeHtml(formatDate(d.tanggal_dokumen))}</td>
                    <td>${d.is_verified ? 'Terverifikasi' : 'Belum'}</td>
                </tr>`,
            )
            .join('');

        const isImageDoc = (d: DocumentItem) =>
            Boolean(
                d.file_path &&
                    (d.mime_type?.startsWith('image/') ||
                        /\.(png|jpe?g|webp|gif)$/i.test(d.file_name ?? d.file_path)),
            );

        const isPdfDoc = (d: DocumentItem) =>
            Boolean(
                d.file_path &&
                    (d.mime_type === 'application/pdf' ||
                        /\.pdf$/i.test(d.file_name ?? d.file_path)),
            );

        const attachmentsHtml = f.documents
            .map((d, idx) => {
                const meta = [
                    d.kategori,
                    d.nomor_dokumen ? `No: ${d.nomor_dokumen}` : null,
                    `Tanggal: ${formatDate(d.tanggal_dokumen)}`,
                    d.file_name ? `File: ${d.file_name}` : null,
                ]
                    .filter(Boolean)
                    .join(' • ');

                let contentHtml = `<div class="attachment-note">Dokumen ini belum memiliki file lampiran yang diunggah.</div>`;
                if (d.file_path) {
                    const fileUrl = new URL(documentsRoute.download(d.id).url, window.location.origin).toString();
                    if (isImageDoc(d)) {
                        contentHtml = `<img class="attachment-img" src="${escapeHtml(fileUrl)}" alt="${escapeHtml(d.nama)}" />`;
                    } else if (isPdfDoc(d)) {
                        contentHtml = `<div class="attachment-note">Lampiran berformat PDF (<strong>${escapeHtml(d.file_name || d.nama)}</strong>).<br/>Silakan cetak atau unduh file PDF ini secara terpisah melalui tombol <em>Lihat</em> di halaman Pengarsipan.</div>`;
                    } else {
                        contentHtml = `<div class="attachment-note">Lampiran file: <strong>${escapeHtml(d.file_name || d.nama)}</strong>.</div>`;
                    }
                }

                return `
                    <div class="attachment-page">
                        <div class="attachment-head">
                            <div class="attachment-title">Lampiran ${idx + 1}: ${escapeHtml(d.nama)}</div>
                            <div class="attachment-meta">${escapeHtml(meta)}</div>
                        </div>
                        <div class="attachment-box">${contentHtml}</div>
                    </div>
                `;
            })
            .join('');

        const body = `
            <dl>
                <dt>Nama Klien</dt><dd>${escapeHtml(f.nama)}</dd>
                <dt>NIK</dt><dd>${escapeHtml(f.nik || '-')}</dd>
                <dt>Perusahaan</dt><dd>${escapeHtml(f.company_name || '-')}</dd>
                <dt>Kontak</dt><dd>${escapeHtml([f.telepon, f.email].filter(Boolean).join(' / ') || '-')}</dd>
            </dl>
            <h3>Daftar Berkas Akta</h3>
            <table><thead><tr><th>No. Berkas</th><th>Jenis</th><th>Tahapan</th><th>Biaya</th><th>Terbayar</th></tr></thead><tbody>${caseRows || '<tr><td colspan="5">-</td></tr>'}</tbody></table>
            <h3>Daftar Dokumen Arsip</h3>
            <table><thead><tr><th>No</th><th>Dokumen</th><th>Kategori</th><th>Nomor</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>${docRows || '<tr><td colspan="6">-</td></tr>'}</tbody></table>
            <div class="sign-row">
                <div></div>
                <div class="sign-box"><div>Petugas Arsip,</div><div class="sign-line">( ${escapeHtml(auth.user.name)} )</div></div>
            </div>
            ${attachmentsHtml}
        `;
        printDocument(
            'Lembar Arsip Klien',
            `${f.kode} — ${f.nama} • Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
    };

    const handlePrintBook = () => {
        const rows = folders.flatMap((f) =>
            f.documents.map(
                (d) => `<tr>
                    <td>${escapeHtml(f.kode)}</td>
                    <td>${escapeHtml(f.company_name || f.nama)}</td>
                    <td>${escapeHtml(d.nama)}</td>
                    <td>${escapeHtml(d.kategori)}</td>
                    <td>${escapeHtml(formatDate(d.tanggal_dokumen))}</td>
                </tr>`,
            ),
        );
        const body = `<table><thead><tr><th>Kode</th><th>Klien</th><th>Dokumen</th><th>Kategori</th><th>Tanggal</th></tr></thead><tbody>${rows.join('') || '<tr><td colspan="5">-</td></tr>'}</tbody></table>`;
        printDocument('Buku Arsip Dokumen', `Dicetak ${formatDate(new Date().toISOString())}`, body, notarisConfig.office);
    };

    const handleExportCsv = () => {
        const rows = folders.flatMap((f) =>
            f.documents.map((d) => ({
                KodeKlien: f.kode,
                Klien: f.company_name || f.nama,
                Dokumen: d.nama,
                Kategori: d.kategori,
                Nomor: d.nomor_dokumen ?? '',
                Tanggal: d.tanggal_dokumen ?? '',
                Verifikasi: d.is_verified ? 'Ya' : 'Tidak',
            })),
        );
        exportCsv('daftar-arsip', rows);
    };

    const totalDocs = folders.reduce((s, f) => s + f.documents.length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengarsipan — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Pengarsipan Digital</h1>
                        <p className="text-sm text-muted-foreground">
                            Arsip terstruktur per folder klien ({folders.length} folder • {totalDocs} dokumen).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={totalDocs === 0}>
                            <Download className="mr-1.5 size-4" /> Ekspor CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrintBook} disabled={totalDocs === 0}>
                            <Printer className="mr-1.5 size-4" /> Cetak Buku Arsip
                        </Button>
                    </div>
                </div>

                <div className="relative max-w-sm">
                    <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari folder klien…"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="space-y-3">
                    {folders.length === 0 ? (
                        <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
                            Belum ada folder arsip klien.
                        </div>
                    ) : (
                        folders.map((f) => {
                            const isOpen = Boolean(openIds[f.id]);
                            return (
                                <div key={f.id} className="overflow-hidden rounded-xl border bg-card">
                                    <button
                                        type="button"
                                        onClick={() => toggleFolder(f.id)}
                                        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40"
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                                            <Folder className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-semibold">
                                                {f.kode} — {f.nama}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {f.company_name ? `${f.company_name} • ` : ''}
                                                {f.documents.length} dokumen • {f.cases.length} berkas akta
                                            </div>
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown className="size-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="size-4 text-muted-foreground" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="border-t bg-muted/20 p-4 space-y-3">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handlePrintClient(f)}>
                                                    <Printer className="mr-1.5 size-3.5" /> Cetak Lembar Arsip
                                                </Button>
                                            </div>
                                            {f.cases.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                                                        Berkas Akta
                                                    </div>
                                                    {f.cases.map((c) => (
                                                        <div
                                                            key={c.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div>
                                                                    <span className="font-semibold">{c.nomor}</span> —{' '}
                                                                    {c.jenis_akta}
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        ({c.is_completed ? 'Selesai' : c.current_stage_label})
                                                                    </span>
                                                                </div>
                                                                {c.bast_document && (
                                                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                        <FileCheck2 className="mr-1 size-3" /> BAST Tersimpan
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {c.is_completed && (
                                                                    <>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handlePrintBast(f, c)}
                                                                        >
                                                                            <Printer className="mr-1.5 size-3.5" /> Cetak BAST
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => openBastUpload(f, c)}
                                                                        >
                                                                            <Upload className="mr-1.5 size-3.5" />{' '}
                                                                            {c.bast_document ? 'Perbarui BAST' : 'Unggah BAST'}
                                                                        </Button>
                                                                        {c.bast_document?.file_path && (
                                                                            <Button asChild size="sm" variant="outline">
                                                                                <a
                                                                                    href={documentsRoute.download(c.bast_document.id).url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                >
                                                                                    Lihat BAST
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <Button asChild size="sm" variant="outline">
                                                                    <Link href={casesRoute.show(c.id)}>Buka</Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="space-y-1.5">
                                                <div className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Dokumen Arsip
                                                </div>
                                                {f.documents.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Belum ada dokumen di folder ini.
                                                    </p>
                                                ) : (
                                                    f.documents.map((d) => (
                                                        <div
                                                            key={d.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                                                        >
                                                            <div>
                                                                <span className="font-medium">{d.nama}</span>
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    {d.kategori} • {formatDate(d.tanggal_dokumen)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={d.is_verified ? 'default' : 'secondary'}
                                                                    className={
                                                                        d.is_verified
                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                            : ''
                                                                    }
                                                                >
                                                                    {d.is_verified ? '✓ Sudah di-ACC Notaris' : 'Belum'}
                                                                </Badge>
                                                                {d.file_path && (
                                                                    <Button asChild size="sm" variant="outline">
                                                                        <a
                                                                            href={documentsRoute.download(d.id).url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                        >
                                                                            Lihat
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <Dialog
                open={Boolean(bastTarget)}
                onOpenChange={(open) => {
                    if (!open) setBastTarget(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unggah BAST Bertanda Tangan</DialogTitle>
                        <DialogDescription>
                            {bastTarget
                                ? `Berkas ${bastTarget.deedCase.nomor} (${bastTarget.deedCase.jenis_akta}) — Klien ${bastTarget.folder.nama}. File akan tersimpan otomatis pada arsip berkas akta terkait.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadBast} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="bast-file">
                                File Scan / Foto BAST (PDF/JPG/PNG/WEBP, maks.{' '}
                                {Math.round((notarisConfig.maxFileKb || 2048) / 1024)} MB)
                            </Label>
                            <Input
                                id="bast-file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                required
                                onChange={(e) => bastForm.setData('file', e.target.files?.[0] ?? null)}
                            />
                            <InputError message={bastForm.errors.file} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bast-date">Tanggal Serah Terima</Label>
                            <Input
                                id="bast-date"
                                type="date"
                                value={bastForm.data.tanggal_dokumen}
                                onChange={(e) => bastForm.setData('tanggal_dokumen', e.target.value)}
                            />
                            <InputError message={bastForm.errors.tanggal_dokumen} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bast-notes">Catatan (Opsional)</Label>
                            <Input
                                id="bast-notes"
                                value={bastForm.data.keterangan}
                                onChange={(e) => bastForm.setData('keterangan', e.target.value)}
                                placeholder="Catatan serah terima dokumen akta..."
                            />
                            <InputError message={bastForm.errors.keterangan} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBastTarget(null)}
                                disabled={bastForm.processing}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={bastForm.processing || !bastForm.data.file}>
                                {bastForm.processing ? 'Mengunggah…' : 'Simpan BAST ke Arsip'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
