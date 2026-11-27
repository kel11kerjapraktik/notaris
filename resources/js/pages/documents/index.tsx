import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { exportCsv, formatDate } from '@/lib/format';
import documentsRoute from '@/routes/documents';
import type { Auth, BreadcrumbItem, DocumentItem, NotarisConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Manajemen Dokumen', href: documentsRoute.index() },
];

export default function DocumentsIndex({
    documents,
    clients,
    cases,
    filters,
}: {
    documents: DocumentItem[];
    clients: { id: number; label: string }[];
    cases: { id: number; client_id: number; label: string }[];
    filters: { search: string; kategori: string };
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;
    const isNotaris = auth?.user?.is_notaris ?? false;

    const [search, setSearch] = useState(filters.search ?? '');
    const [kategori, setKategori] = useState(filters.kategori ?? 'semua');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const form = useForm<{
        client_id: string;
        deed_case_id: string;
        kategori: string;
        nama: string;
        nomor_dokumen: string;
        tanggal_dokumen: string;
        keterangan: string;
        is_complete_checked: boolean;
        file: File | null;
    }>({
        client_id: clients[0]?.id ? String(clients[0].id) : '',
        deed_case_id: '',
        kategori: notarisConfig.kategoriDokumen[0] ?? 'KTP',
        nama: '',
        nomor_dokumen: '',
        tanggal_dokumen: new Date().toISOString().slice(0, 10),
        keterangan: '',
        is_complete_checked: false,
        file: null,
    });

    const applyFilter = (nextSearch: string, nextKat: string) => {
        const params: Record<string, string> = {};
        if (nextSearch) params.search = nextSearch;
        if (nextKat !== 'semua') params.kategori = nextKat;
        router.get(documentsRoute.index().url, params, { preserveState: true, replace: true });
    };

    const openCreate = () => {
        setEditingDoc(null);
        setFileError(null);
        form.setData({
            client_id: clients[0]?.id ? String(clients[0].id) : '',
            deed_case_id: '',
            kategori: notarisConfig.kategoriDokumen[0] ?? 'KTP',
            nama: '',
            nomor_dokumen: '',
            tanggal_dokumen: new Date().toISOString().slice(0, 10),
            keterangan: '',
            is_complete_checked: false,
            file: null,
        });
        setModalOpen(true);
    };

    const openEdit = (doc: DocumentItem) => {
        setEditingDoc(doc);
        setFileError(null);
        form.setData({
            client_id: String(doc.client_id),
            deed_case_id: doc.deed_case_id ? String(doc.deed_case_id) : '',
            kategori: doc.kategori,
            nama: doc.nama,
            nomor_dokumen: doc.nomor_dokumen ?? '',
            tanggal_dokumen: doc.tanggal_dokumen ?? '',
            keterangan: doc.keterangan ?? '',
            is_complete_checked: doc.is_complete_checked,
            file: null,
        });
        setModalOpen(true);
    };

    const handleFileChange = (file: File | null) => {
        if (file && file.size > notarisConfig.maxFileKb * 1024) {
            setFileError(`Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`);
            form.setData('file', null);
            return;
        }
        setFileError(null);
        form.setData('file', file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fileError) return;

        if (editingDoc) {
            router.post(
                documentsRoute.update(editingDoc.id).url,
                { _method: 'put', ...form.data },
                {
                    forceFormData: true,
                    onSuccess: () => setModalOpen(false),
                },
            );
        } else {
            form.post(documentsRoute.store().url, {
                forceFormData: true,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(documentsRoute.destroy(deleteTarget.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const handleExport = () => {
        exportCsv(
            'daftar-dokumen',
            documents.map((d) => ({
                Nama: d.nama,
                Kategori: d.kategori,
                Nomor: d.nomor_dokumen ?? '',
                Klien: d.client?.nama ?? '',
                Berkas: d.deed_case?.nomor ?? '',
                Tanggal: d.tanggal_dokumen ?? '',
                KelengkapanStaf: d.is_complete_checked ? 'Lengkap' : 'Belum',
                VerifikasiNotaris: d.is_verified ? 'Sah' : 'Belum',
                File: d.file_name ?? '',
            })),
        );
    };

    const selectCls =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Dokumen — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Manajemen Dokumen</h1>
                        <p className="text-sm text-muted-foreground">
                            Dokumen persyaratan klien, salinan akta, SK AHU, TBNRI, dan NIB (maks 2 MB/file).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={documents.length === 0}>
                            <Download className="mr-1.5 size-4" /> Ekspor CSV
                        </Button>
                        <Button size="sm" onClick={openCreate} disabled={clients.length === 0}>
                            <Plus className="mr-1.5 size-4" /> Tambah Dokumen
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Cari nama / nomor dokumen…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                applyFilter(e.target.value, kategori);
                            }}
                            className="pl-9"
                        />
                    </div>
                    <select
                        className={`${selectCls} sm:max-w-56`}
                        value={kategori}
                        onChange={(e) => {
                            setKategori(e.target.value);
                            applyFilter(search, e.target.value);
                        }}
                    >
                        <option value="semua">Semua kategori</option>
                        {notarisConfig.kategoriDokumen.map((k) => (
                            <option key={k} value={k}>
                                {k}
                            </option>
                        ))}
                    </select>
                    <Badge variant="secondary">{documents.length} dokumen</Badge>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                    {documents.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Belum ada dokumen tersimpan.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {documents.map((d) => (
                                <div key={d.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/30">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <FileText className="size-5" />
                                    </div>
                                    <div className="min-w-48 flex-1">
                                        <div className="font-semibold">{d.nama}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {d.kategori} • {d.client?.company?.nama || d.client?.nama}
                                            {d.nomor_dokumen ? ` • No. ${d.nomor_dokumen}` : ''} •{' '}
                                            {formatDate(d.tanggal_dokumen)}
                                            {d.file_name ? ` • ${d.file_name}` : ''}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {d.deed_case && <Badge variant="outline">{d.deed_case.nomor}</Badge>}
                                        <Badge
                                            variant={
                                                d.is_rejected
                                                    ? 'destructive'
                                                    : d.is_verified
                                                      ? 'default'
                                                      : 'secondary'
                                            }
                                        >
                                            {d.is_rejected
                                                ? 'Ditolak Notaris'
                                                : d.is_verified
                                                  ? 'Sah (Notaris)'
                                                  : d.is_complete_checked
                                                    ? 'Lengkap (Staf)'
                                                    : 'Belum Diperiksa'}
                                        </Badge>
                                        {d.catatan_notaris && (
                                            <span className="text-xs text-muted-foreground">
                                                ({d.catatan_notaris})
                                            </span>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => setPreviewDoc(d)}>
                                            <Eye className="size-3.5" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                                            <Pencil className="size-3.5" />
                                        </Button>
                                        {isNotaris && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => setDeleteTarget(d)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah / Edit Dokumen */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingDoc ? 'Edit Dokumen' : 'Tambah Dokumen'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>Klien *</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.client_id}
                                    onChange={(e) => form.setData('client_id', e.target.value)}
                                    required
                                >
                                    {clients.map((cl) => (
                                        <option key={cl.id} value={cl.id}>
                                            {cl.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Kaitkan ke Berkas Akta</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.deed_case_id}
                                    onChange={(e) => form.setData('deed_case_id', e.target.value)}
                                >
                                    <option value="">— tidak dikaitkan —</option>
                                    {cases.map((cs) => (
                                        <option key={cs.id} value={cs.id}>
                                            {cs.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Kategori *</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.kategori}
                                    onChange={(e) => form.setData('kategori', e.target.value)}
                                >
                                    {notarisConfig.kategoriDokumen.map((k) => (
                                        <option key={k} value={k}>
                                            {k}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Nama / Judul Dokumen *</Label>
                                <Input
                                    value={form.data.nama}
                                    onChange={(e) => form.setData('nama', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor Dokumen</Label>
                                <Input
                                    value={form.data.nomor_dokumen}
                                    onChange={(e) => form.setData('nomor_dokumen', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal Dokumen</Label>
                                <Input
                                    type="date"
                                    value={form.data.tanggal_dokumen}
                                    onChange={(e) => form.setData('tanggal_dokumen', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Unggah Berkas (Maks 2 MB — PDF / Gambar)</Label>
                            <Input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                            />
                            {editingDoc?.file_name && (
                                <p className="text-xs text-muted-foreground">Tersimpan: {editingDoc.file_name}</p>
                            )}
                            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label>Keterangan</Label>
                            <textarea
                                className="flex min-h-18 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                value={form.data.keterangan}
                                onChange={(e) => form.setData('keterangan', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="chk-complete"
                                checked={form.data.is_complete_checked}
                                onCheckedChange={(c) => form.setData('is_complete_checked', Boolean(c))}
                            />
                            <Label htmlFor="chk-complete" className="cursor-pointer text-sm">
                                Sudah diperiksa kelengkapannya oleh Staf
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing || Boolean(fileError)}>
                                {form.processing ? 'Menyimpan…' : 'Simpan Dokumen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Pratinjau Dokumen */}
            <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Pratinjau Dokumen</DialogTitle>
                    </DialogHeader>
                    {previewDoc && (
                        <div className="space-y-4 text-sm">
                            <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
                                <dt className="text-muted-foreground">Nama</dt>
                                <dd className="col-span-2 font-medium">{previewDoc.nama}</dd>
                                <dt className="text-muted-foreground">Kategori</dt>
                                <dd className="col-span-2">{previewDoc.kategori}</dd>
                                <dt className="text-muted-foreground">Nomor</dt>
                                <dd className="col-span-2">{previewDoc.nomor_dokumen || '-'}</dd>
                                <dt className="text-muted-foreground">Tanggal</dt>
                                <dd className="col-span-2">{formatDate(previewDoc.tanggal_dokumen)}</dd>
                                <dt className="text-muted-foreground">Klien</dt>
                                <dd className="col-span-2">{previewDoc.client?.nama || '-'}</dd>
                                <dt className="text-muted-foreground">Status</dt>
                                <dd className="col-span-2">
                                    {previewDoc.is_verified
                                        ? `Terverifikasi oleh ${previewDoc.verifier?.name ?? 'Notaris'}`
                                        : previewDoc.is_complete_checked
                                          ? 'Lengkap (Menunggu Verifikasi Notaris)'
                                          : 'Belum Diperiksa'}
                                </dd>
                            </dl>
                            {previewDoc.file_path ? (
                                previewDoc.mime_type?.startsWith('image/') ? (
                                    <img
                                        src={documentsRoute.download(previewDoc.id).url}
                                        alt={previewDoc.nama}
                                        className="max-h-72 w-full rounded-lg border object-contain"
                                    />
                                ) : (
                                    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                                        Lampiran: <strong>{previewDoc.file_name}</strong>
                                    </div>
                                )
                            ) : (
                                <p className="text-xs text-muted-foreground">Tidak ada lampiran file.</p>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                                    Tutup
                                </Button>
                                {previewDoc.file_path && (
                                    <Button asChild>
                                        <a href={documentsRoute.download(previewDoc.id, { query: { download: 1 } }).url}>
                                            <Download className="mr-1.5 size-4" /> Unduh Lampiran
                                        </a>
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmNoteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Hapus Dokumen"
                description={`Yakin ingin menghapus dokumen "${deleteTarget?.nama}"?`}
                confirmLabel="Hapus Permanen"
                confirmVariant="destructive"
                showNote={false}
                processing={deleting}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
