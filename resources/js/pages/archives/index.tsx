import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Folder,
    FolderArchive,
    FolderOpen,
    Printer,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { SearchInput } from '@/components/notaris/search-input';
import { StatCard } from '@/components/notaris/stat-card';
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
import casesRoute from '@/routes/cases';
import documentsRoute from '@/routes/documents';
import type {
    Auth,
    BreadcrumbItem,
    DocumentItem,
    NotarisConfig,
} from '@/types';

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
    const [folderFilter, setFolderFilter] = useState<
        'semua' | 'selesai' | 'proses'
    >('semua');
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

    const openBastUpload = (
        folder: ArchiveFolder,
        deedCase: ArchiveFolder['cases'][number],
    ) => {
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

    const handlePrintBast = (
        f: ArchiveFolder,
        c: ArchiveFolder['cases'][number],
    ) => {
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

    const debouncedSearch = useDebouncedCallback((val: string) => {
        router.get(archivesRoute.index().url, val ? { search: val } : {}, {
            preserveState: true,
            replace: true,
        });
    }, 300);

    const handleSearch = (val: string) => {
        setSearch(val);
        debouncedSearch(val);
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
                    /\.(png|jpe?g|webp|gif)$/i.test(
                        d.file_name ?? d.file_path,
                    )),
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
                    const fileUrl = new URL(
                        documentsRoute.download(d.id).url,
                        window.location.origin,
                    ).toString();
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
        printDocument(
            'Buku Arsip Dokumen',
            `Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
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
    const completedCasesCount = folders.reduce(
        (s, f) => s + f.cases.filter((c) => c.is_completed).length,
        0,
    );
    const bastCount = folders.reduce(
        (s, f) => s + f.cases.filter((c) => Boolean(c.bast_document)).length,
        0,
    );

    const visibleFolders = folders.filter((f) => {
        if (folderFilter === 'semua') return true;
        const hasCompleted = f.cases.some((c) => c.is_completed);
        const allCompleted =
            f.cases.length > 0 && f.cases.every((c) => c.is_completed);
        return folderFilter === 'selesai'
            ? allCompleted || hasCompleted
            : !allCompleted;
    });

    const anyOpen = visibleFolders.some((f) => Boolean(openIds[f.id]));
    const handleToggleAll = () => {
        if (anyOpen) {
            setOpenIds({});
            return;
        }
        const next: Record<number, boolean> = {};
        for (const f of visibleFolders) next[f.id] = true;
        setOpenIds(next);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengarsipan — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-sm dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/12 text-amber-700 shadow-xs sm:flex dark:bg-amber-500/15 dark:text-amber-300">
                                <FolderArchive className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                    Repositori Dokumen
                                </p>
                                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                    Pengarsipan Digital
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Arsip terstruktur per folder klien (
                                    {folders.length} folder • {totalDocs}{' '}
                                    dokumen).
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCsv}
                                disabled={totalDocs === 0}
                            >
                                <Download className="mr-1.5 size-4" /> Ekspor
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrintBook}
                                disabled={totalDocs === 0}
                            >
                                <Printer className="mr-1.5 size-4" /> Cetak Buku
                                Arsip
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Folder Klien"
                        value={folders.length}
                        valueClassName="text-amber-600 dark:text-amber-400"
                        icon={<Folder className="size-4" />}
                    />
                    <StatCard
                        label="Berkas Akta Selesai"
                        value={completedCasesCount}
                        note="siap cetak BAST"
                        valueClassName="text-emerald-600 dark:text-emerald-400"
                        icon={<CheckCircle2 className="size-4" />}
                    />
                    <StatCard
                        label="Dokumen Terarsip"
                        value={totalDocs}
                        icon={<FileText className="size-4" />}
                    />
                    <StatCard
                        label="BAST Tersimpan"
                        value={bastCount}
                        note="bertanda tangan"
                        icon={<FileCheck2 className="size-4" />}
                    />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-card/90 p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { key: 'semua', label: 'Semua Folder' },
                            { key: 'selesai', label: 'Ada Akta Selesai' },
                            { key: 'proses', label: 'Masih Proses' },
                        ].map((opt) => (
                            <Button
                                key={opt.key}
                                type="button"
                                size="sm"
                                variant={
                                    folderFilter === opt.key
                                        ? 'default'
                                        : 'ghost'
                                }
                                onClick={() =>
                                    setFolderFilter(
                                        opt.key as typeof folderFilter,
                                    )
                                }
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SearchInput
                            value={search}
                            onChange={handleSearch}
                            placeholder="Cari kode / nama klien…"
                            ariaLabel="Cari folder arsip klien"
                            className="flex-1 sm:w-64 lg:flex-none"
                        />
                        {visibleFolders.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleToggleAll}
                            >
                                {anyOpen ? 'Tutup Semua' : 'Buka Semua'}
                            </Button>
                        )}
                        <Badge
                            variant="secondary"
                            className="border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-300"
                        >
                            {visibleFolders.length} folder
                        </Badge>
                    </div>
                </div>

                <div className="space-y-3">
                    {visibleFolders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-card py-12 text-center text-sm text-muted-foreground shadow-sm">
                            <span className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <FolderArchive className="size-5" />
                            </span>
                            <span>
                                {search || folderFilter !== 'semua'
                                    ? 'Tidak ditemukan folder arsip yang sesuai.'
                                    : 'Belum ada folder arsip klien.'}
                            </span>
                        </div>
                    ) : (
                        visibleFolders.map((f) => {
                            const isOpen = Boolean(openIds[f.id]);
                            const folderBastCount = f.cases.filter((c) =>
                                Boolean(c.bast_document),
                            ).length;
                            const folderDoneCount = f.cases.filter(
                                (c) => c.is_completed,
                            ).length;

                            return (
                                <div
                                    key={f.id}
                                    className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm transition-colors"
                                >
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => toggleFolder(f.id)}
                                        className="flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-amber-500/5 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:outline-none"
                                    >
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                            {isOpen ? (
                                                <FolderOpen className="size-5" />
                                            ) : (
                                                <Folder className="size-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-500/35 bg-amber-500/10 font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-300"
                                                >
                                                    {f.kode}
                                                </Badge>
                                                <span className="truncate font-serif text-base font-bold text-foreground">
                                                    {f.nama}
                                                </span>
                                                {f.company_name && (
                                                    <span className="truncate text-xs font-medium text-muted-foreground">
                                                        • {f.company_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span>
                                                    {f.documents.length} dokumen
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {f.cases.length} berkas akta
                                                </span>
                                                {folderDoneCount > 0 && (
                                                    <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        {folderDoneCount}{' '}
                                                        Selesai
                                                    </Badge>
                                                )}
                                                {folderBastCount > 0 && (
                                                    <Badge className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                        {folderBastCount} BAST
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                                        ) : (
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="space-y-5 border-t border-amber-500/15 bg-amber-500/[0.03] p-4 sm:p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-4 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                        Ringkasan Folder Klien
                                                    </span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handlePrintClient(f)
                                                    }
                                                >
                                                    <Printer className="mr-1.5 size-3.5" />{' '}
                                                    Cetak Lembar Arsip
                                                </Button>
                                            </div>

                                            {f.cases.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                        Berkas Akta (
                                                        {f.cases.length})
                                                    </div>
                                                    {f.cases.map((c) => (
                                                        <div
                                                            key={c.id}
                                                            className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-card p-3.5 text-sm shadow-xs transition-colors hover:border-amber-500/40 sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div className="min-w-0 space-y-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-semibold text-foreground">
                                                                        {
                                                                            c.nomor
                                                                        }
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        —
                                                                    </span>
                                                                    <span className="font-medium text-foreground/90">
                                                                        {
                                                                            c.jenis_akta
                                                                        }
                                                                    </span>
                                                                    <Badge
                                                                        variant={
                                                                            c.is_completed
                                                                                ? 'default'
                                                                                : 'secondary'
                                                                        }
                                                                        className={
                                                                            c.is_completed
                                                                                ? 'border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                                : 'text-[11px]'
                                                                        }
                                                                    >
                                                                        {c.is_completed
                                                                            ? '✓ Selesai'
                                                                            : c.current_stage_label}
                                                                    </Badge>
                                                                    {c.bast_document && (
                                                                        <Badge className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                            <FileCheck2 className="mr-1 size-3" />{' '}
                                                                            BAST
                                                                            Tersimpan
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {(c.nomor_akta ||
                                                                    c.completed_at) && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {c.nomor_akta
                                                                            ? `No. Akta ${c.nomor_akta}`
                                                                            : ''}
                                                                        {c.nomor_akta &&
                                                                        c.completed_at
                                                                            ? ' • '
                                                                            : ''}
                                                                        {c.completed_at
                                                                            ? `Selesai ${formatDate(c.completed_at)}`
                                                                            : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {c.is_completed && (
                                                                    <>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                handlePrintBast(
                                                                                    f,
                                                                                    c,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Printer className="mr-1.5 size-3.5" />{' '}
                                                                            Cetak
                                                                            BAST
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                openBastUpload(
                                                                                    f,
                                                                                    c,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Upload className="mr-1.5 size-3.5" />{' '}
                                                                            {c.bast_document
                                                                                ? 'Perbarui BAST'
                                                                                : 'Unggah BAST'}
                                                                        </Button>
                                                                        {c
                                                                            .bast_document
                                                                            ?.file_path && (
                                                                            <Button
                                                                                asChild
                                                                                size="sm"
                                                                                variant="outline"
                                                                            >
                                                                                <a
                                                                                    href={
                                                                                        documentsRoute.download(
                                                                                            c
                                                                                                .bast_document
                                                                                                .id,
                                                                                        )
                                                                                            .url
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                >
                                                                                    <Eye className="mr-1.5 size-3.5" />{' '}
                                                                                    Lihat
                                                                                    BAST
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <Button
                                                                    asChild
                                                                    size="sm"
                                                                    variant="outline"
                                                                >
                                                                    <Link
                                                                        href={casesRoute.show(
                                                                            c.id,
                                                                        )}
                                                                    >
                                                                        Buka
                                                                        Berkas
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Dokumen Arsip (
                                                    {f.documents.length})
                                                </div>
                                                {f.documents.length === 0 ? (
                                                    <div className="rounded-xl border border-dashed border-amber-500/25 bg-card/60 px-4 py-4 text-xs text-muted-foreground">
                                                        Belum ada dokumen di
                                                        folder ini.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {f.documents.map(
                                                            (d) => (
                                                                <div
                                                                    key={d.id}
                                                                    className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-amber-500/35 hover:bg-amber-500/[0.03] sm:flex-row sm:items-center sm:justify-between"
                                                                >
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                                            <FileText className="size-4" />
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <div className="truncate font-medium text-foreground">
                                                                                {
                                                                                    d.nama
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {
                                                                                    d.kategori
                                                                                }{' '}
                                                                                •{' '}
                                                                                {formatDate(
                                                                                    d.tanggal_dokumen,
                                                                                )}
                                                                                {d.nomor_dokumen
                                                                                    ? ` • No. ${d.nomor_dokumen}`
                                                                                    : ''}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <Badge
                                                                            variant={
                                                                                d.is_verified
                                                                                    ? 'default'
                                                                                    : 'secondary'
                                                                            }
                                                                            className={
                                                                                d.is_verified
                                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                                    : ''
                                                                            }
                                                                        >
                                                                            {d.is_verified
                                                                                ? '✓ Sudah di-ACC Notaris'
                                                                                : 'Belum'}
                                                                        </Badge>
                                                                        {d.file_path && (
                                                                            <Button
                                                                                asChild
                                                                                size="sm"
                                                                                variant="outline"
                                                                            >
                                                                                <a
                                                                                    href={
                                                                                        documentsRoute.download(
                                                                                            d.id,
                                                                                        )
                                                                                            .url
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                >
                                                                                    <Eye className="mr-1.5 size-3.5" />{' '}
                                                                                    Lihat
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
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
                                {Math.round(
                                    (notarisConfig.maxFileKb || 2048) / 1024,
                                )}{' '}
                                MB)
                            </Label>
                            <Input
                                id="bast-file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                required
                                onChange={(e) =>
                                    bastForm.setData(
                                        'file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            <InputError message={bastForm.errors.file} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bast-date">
                                Tanggal Serah Terima
                            </Label>
                            <Input
                                id="bast-date"
                                type="date"
                                value={bastForm.data.tanggal_dokumen}
                                onChange={(e) =>
                                    bastForm.setData(
                                        'tanggal_dokumen',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={bastForm.errors.tanggal_dokumen}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bast-notes">
                                Catatan (Opsional)
                            </Label>
                            <Input
                                id="bast-notes"
                                value={bastForm.data.keterangan}
                                onChange={(e) =>
                                    bastForm.setData(
                                        'keterangan',
                                        e.target.value,
                                    )
                                }
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
                            <Button
                                type="submit"
                                disabled={
                                    bastForm.processing || !bastForm.data.file
                                }
                            >
                                {bastForm.processing
                                    ? 'Mengunggah…'
                                    : 'Simpan BAST ke Arsip'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
