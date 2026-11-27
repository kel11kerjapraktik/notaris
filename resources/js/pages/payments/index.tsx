import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Download, Eye, Pencil, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { PaymentBadge } from '@/components/notaris/payment-badge';
import { StatCard } from '@/components/notaris/stat-card';
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
import { escapeHtml, exportCsv, formatDate, formatRupiah, printDocument } from '@/lib/format';
import paymentsRoute from '@/routes/payments';
import type { Auth, BreadcrumbItem, NotarisConfig, PaymentItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Keuangan / Termin', href: paymentsRoute.index() },
];

type CaseOption = {
    id: number;
    nomor: string;
    client_name: string;
    jenis_akta: string;
    biaya: number;
    terbayar: number;
    next_termin: number;
};

export default function PaymentsIndex({
    payments,
    cases,
    summary,
    filters,
}: {
    payments: PaymentItem[];
    cases: CaseOption[];
    summary: {
        total_kontrak: number;
        total_diterima: number;
        total_menunggu: number;
        count_menunggu: number;
        total_belum: number;
        count_belum: number;
    };
    filters: { status: string };
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;
    const isNotaris = auth?.user?.is_notaris ?? false;

    const [status, setStatus] = useState(filters.status ?? 'semua');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
    const [proofTarget, setProofTarget] = useState<PaymentItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PaymentItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const form = useForm<{
        deed_case_id: string;
        termin_ke: number;
        payment_type: 'dp_50' | 'pelunasan' | 'termin_lain';
        keterangan: string;
        jumlah: string;
        jatuh_tempo: string;
        metode: string;
        no_referensi: string;
        mark_as_paid: boolean;
        bukti: File | null;
    }>({
        deed_case_id: cases[0]?.id ? String(cases[0].id) : '',
        termin_ke: cases[0]?.next_termin ?? 1,
        payment_type: 'dp_50',
        keterangan: 'DP 50%',
        jumlah: cases[0] ? String(Math.round(Number(cases[0].biaya) * 0.5)) : '',
        jatuh_tempo: new Date().toISOString().slice(0, 10),
        metode: 'Transfer Bank',
        no_referensi: '',
        mark_as_paid: false,
        bukti: null,
    });

    const proofForm = useForm<{
        tanggal_bayar: string;
        metode: string;
        no_referensi: string;
        bukti: File | null;
    }>({
        tanggal_bayar: new Date().toISOString().slice(0, 10),
        metode: 'Transfer Bank',
        no_referensi: '',
        bukti: null,
    });

    const handleFilterStatus = (val: string) => {
        setStatus(val);
        router.get(paymentsRoute.index().url, val !== 'semua' ? { status: val } : {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handleCaseChange = (caseId: string) => {
        const found = cases.find((c) => String(c.id) === caseId);
        form.setData({
            ...form.data,
            deed_case_id: caseId,
            termin_ke: found?.next_termin ?? 1,
            jumlah: found
                ? form.data.payment_type === 'dp_50'
                    ? String(Math.round(Number(found.biaya) * 0.5))
                    : String(Math.max(0, Number(found.biaya) - Number(found.terbayar)))
                : '',
        });
    };

    const openCreate = () => {
        setEditingPayment(null);
        setFileError(null);
        form.setData({
            deed_case_id: cases[0]?.id ? String(cases[0].id) : '',
            termin_ke: cases[0]?.next_termin ?? 1,
            payment_type: 'dp_50',
            keterangan: 'DP 50%',
            jumlah: cases[0] ? String(Math.round(Number(cases[0].biaya) * 0.5)) : '',
            jatuh_tempo: new Date().toISOString().slice(0, 10),
            metode: 'Transfer Bank',
            no_referensi: '',
            mark_as_paid: false,
            bukti: null,
        });
        setModalOpen(true);
    };

    const openEdit = (p: PaymentItem) => {
        setEditingPayment(p);
        setFileError(null);
        form.setData({
            deed_case_id: String(p.deed_case_id),
            termin_ke: p.termin_ke,
            payment_type: p.payment_type,
            keterangan: p.keterangan ?? '',
            jumlah: String(p.jumlah),
            jatuh_tempo: p.jatuh_tempo ?? '',
            metode: p.metode ?? 'Transfer Bank',
            no_referensi: p.no_referensi ?? '',
            mark_as_paid: p.status !== 'belum',
            bukti: null,
        });
        setModalOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (fileError) return;
        if (editingPayment) {
            router.post(
                paymentsRoute.update(editingPayment.id).url,
                { _method: 'put', ...form.data },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => setModalOpen(false),
                },
            );
            return;
        }
        form.post(paymentsRoute.store().url, {
            forceFormData: true,
            onSuccess: () => setModalOpen(false),
        });
    };

    const handleSubmitProof = (e: React.FormEvent) => {
        e.preventDefault();
        if (!proofTarget || fileError) return;
        proofForm.post(paymentsRoute.submitProof(proofTarget.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setProofTarget(null),
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(paymentsRoute.destroy(deleteTarget.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const handlePrintReceipt = (p: PaymentItem) => {
        const c = p.deed_case;
        const body = `
            <dl>
                <dt>Diterima dari</dt><dd>${escapeHtml(c?.client?.company?.nama || c?.client?.nama || '-')}</dd>
                <dt>Untuk Pembayaran</dt><dd>${escapeHtml(c?.jenis_akta || '-')} (${escapeHtml(c?.nomor || '-')})</dd>
                <dt>Termin</dt><dd>Termin ${p.termin_ke} — ${escapeHtml(p.keterangan || '')}</dd>
                <dt>Metode</dt><dd>${escapeHtml(p.metode)} ${p.no_referensi ? `• Ref. ${escapeHtml(p.no_referensi)}` : ''}</dd>
                <dt>Status</dt><dd>${p.status === 'lunas' ? 'LUNAS (DISAHKAN NOTARIS)' : p.status === 'menunggu' ? 'Menunggu ACC Notaris' : 'Belum Dibayar'}</dd>
            </dl>
            <div class="amount-box">${escapeHtml(formatRupiah(p.jumlah))}</div>
            <div class="sign-row">
                <div></div>
                <div class="sign-box">
                    <div>Penerima / Notaris,</div>
                    <div class="sign-line">( ${escapeHtml(p.confirmer?.name || auth.user.name)} )</div>
                </div>
            </div>
        `;
        printDocument(
            p.status === 'lunas' ? 'Kuitansi Pembayaran' : 'Invoice / Tagihan',
            `${p.no_inv} • ${formatDate(p.tanggal_bayar || p.jatuh_tempo)}`,
            body,
            notarisConfig.office,
        );
    };

    const handleExport = () => {
        exportCsv(
            'termin-pembayaran',
            payments.map((p) => ({
                Invoice: p.no_inv,
                Berkas: p.deed_case?.nomor ?? '',
                Klien: p.deed_case?.client?.nama ?? '',
                Termin: p.termin_ke,
                Tipe: p.payment_type,
                Nominal: p.jumlah,
                Status: p.status,
                TanggalBayar: p.tanggal_bayar ?? '',
                DisetujuiOleh: p.confirmer?.name ?? '',
            })),
        );
    };

    const selectCls =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Keuangan & Termin — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Keuangan & Termin Pembayaran</h1>
                        <p className="text-sm text-muted-foreground">
                            Pencatatan DP 50%, termin, pelunasan biaya, serta ACC resmi oleh Notaris.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={payments.length === 0}>
                            <Download className="mr-1.5 size-4" /> Ekspor CSV
                        </Button>
                        <Button size="sm" onClick={openCreate} disabled={cases.length === 0}>
                            <Plus className="mr-1.5 size-4" /> Tambah Termin
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Nilai Kontrak"
                        value={formatRupiah(summary.total_kontrak)}
                        note={`${cases.length} berkas`}
                        valueClassName="text-xl"
                    />
                    <StatCard
                        label="Dana Diterima (ACC)"
                        value={formatRupiah(summary.total_diterima)}
                        note="terkonfirmasi Notaris"
                        valueClassName="text-xl text-emerald-600 dark:text-emerald-400"
                    />
                    <StatCard
                        label="Menunggu ACC Notaris"
                        value={formatRupiah(summary.total_menunggu)}
                        note={`${summary.count_menunggu} termin`}
                        valueClassName="text-xl text-amber-600 dark:text-amber-400"
                    />
                    <StatCard
                        label="Belum Dibayar"
                        value={formatRupiah(summary.total_belum)}
                        note={`${summary.count_belum} termin`}
                        valueClassName="text-xl"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        className={`${selectCls} max-w-56`}
                        value={status}
                        onChange={(e) => handleFilterStatus(e.target.value)}
                    >
                        <option value="semua">Semua status</option>
                        <option value="belum">Belum dibayar</option>
                        <option value="menunggu">Menunggu ACC Notaris</option>
                        <option value="lunas">Lunas (Disetujui)</option>
                        <option value="ditolak">Ditolak Notaris</option>
                    </select>
                    <Badge variant="secondary">{payments.length} termin</Badge>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                    {payments.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Belum ada data termin pembayaran.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Invoice</th>
                                        <th className="px-4 py-3 font-medium">Berkas / Klien</th>
                                        <th className="px-4 py-3 font-medium">Termin</th>
                                        <th className="px-4 py-3 font-medium">Nominal</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 text-right font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{p.no_inv}</div>
                                                <div className="text-xs text-muted-foreground">{p.metode}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{p.deed_case?.nomor || '-'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {p.deed_case?.client?.company?.nama || p.deed_case?.client?.nama || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div>
                                                    Termin {p.termin_ke} — {p.keterangan}
                                                </div>
                                                {p.tanggal_bayar && (
                                                    <div className="text-muted-foreground">
                                                        Bayar {formatDate(p.tanggal_bayar)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold">{formatRupiah(p.jumlah)}</td>
                                            <td className="px-4 py-3">
                                                <PaymentBadge status={p.status} />
                                                {p.confirmer && (
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        {p.status === 'ditolak' ? 'Ditolak: ' : 'ACC: '}
                                                        {p.confirmer.name}
                                                    </div>
                                                )}
                                                {p.catatan_notaris && (
                                                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                        Catatan: {p.catatan_notaris}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    {(p.status === 'belum' || p.status === 'ditolak') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setFileError(null);
                                                                setProofTarget(p);
                                                            }}
                                                        >
                                                            Upload Bukti
                                                        </Button>
                                                    )}
                                                    {p.bukti_path && (
                                                        <Button asChild size="sm" variant="outline">
                                                            <a
                                                                href={paymentsRoute.proof(p.id).url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Eye className="size-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {isNotaris && p.status === 'menunggu' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                router.post(
                                                                    paymentsRoute.confirm(p.id).url,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <Check className="mr-1 size-3.5" /> ACC
                                                        </Button>
                                                    )}
                                                    {isNotaris && p.status === 'lunas' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.post(
                                                                    paymentsRoute.cancelConfirm(p.id).url,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                            title="Batalkan ACC"
                                                        >
                                                            <RotateCcw className="size-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEdit(p)}
                                                        title="Edit Pembayaran"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePrintReceipt(p)}
                                                        title="Cetak Kuitansi / Invoice"
                                                    >
                                                        <Printer className="size-3.5" />
                                                    </Button>
                                                    {isNotaris && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => setDeleteTarget(p)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah / Edit Termin */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPayment ? `Edit Termin Pembayaran (${editingPayment.no_inv})` : 'Tambah Termin Pembayaran'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Berkas Akta *</Label>
                            <select
                                className={selectCls}
                                value={form.data.deed_case_id}
                                onChange={(e) => handleCaseChange(e.target.value)}
                                disabled={Boolean(editingPayment)}
                                required
                            >
                                {cases.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nomor} • {c.client_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>Jenis Pembayaran *</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.payment_type}
                                    onChange={(e) => {
                                        const val = e.target.value as 'dp_50' | 'pelunasan' | 'termin_lain';
                                        form.setData({
                                            ...form.data,
                                            payment_type: val,
                                            keterangan:
                                                val === 'dp_50'
                                                    ? 'DP 50%'
                                                    : val === 'pelunasan'
                                                      ? 'Pelunasan Biaya'
                                                      : 'Termin Lainnya',
                                        });
                                    }}
                                >
                                    <option value="dp_50">DP 50%</option>
                                    <option value="pelunasan">Pelunasan Biaya</option>
                                    <option value="termin_lain">Termin Lainnya</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Termin ke-</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.data.termin_ke}
                                    onChange={(e) => form.setData('termin_ke', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nominal (Rp) *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.data.jumlah}
                                    onChange={(e) => form.setData('jumlah', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Metode Pembayaran</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.metode}
                                    onChange={(e) => form.setData('metode', e.target.value)}
                                >
                                    {['Transfer Bank', 'Tunai', 'QRIS', 'Cek / Giro', 'Virtual Account'].map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Jatuh Tempo</Label>
                                <Input
                                    type="date"
                                    value={form.data.jatuh_tempo}
                                    onChange={(e) => form.setData('jatuh_tempo', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>No. Referensi</Label>
                                <Input
                                    value={form.data.no_referensi}
                                    onChange={(e) => form.setData('no_referensi', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Bukti Transfer / Kuitansi (Maks 2 MB — PDF/Gambar)</Label>
                            <Input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (file && file.size > notarisConfig.maxFileKb * 1024) {
                                        setFileError('Ukuran bukti maksimal 2 MB.');
                                        form.setData('bukti', null);
                                        return;
                                    }
                                    setFileError(null);
                                    form.setData('bukti', file);
                                }}
                            />
                            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="mark-paid"
                                checked={form.data.mark_as_paid}
                                onCheckedChange={(c) => form.setData('mark_as_paid', Boolean(c))}
                            />
                            <Label htmlFor="mark-paid" className="cursor-pointer text-sm">
                                Tandai sudah dibayar (ajukan ACC Notaris)
                            </Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing || Boolean(fileError)}>
                                {form.processing ? 'Menyimpan…' : 'Simpan Termin'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Upload Bukti */}
            <Dialog open={proofTarget !== null} onOpenChange={(open) => !open && setProofTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unggah Bukti Pembayaran ({proofTarget?.no_inv})</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitProof} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Tanggal Bayar</Label>
                            <Input
                                type="date"
                                value={proofForm.data.tanggal_bayar}
                                onChange={(e) => proofForm.setData('tanggal_bayar', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>No. Referensi</Label>
                            <Input
                                value={proofForm.data.no_referensi}
                                onChange={(e) => proofForm.setData('no_referensi', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>File Bukti (Maks 2 MB)</Label>
                            <Input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (file && file.size > notarisConfig.maxFileKb * 1024) {
                                        setFileError('Ukuran bukti maksimal 2 MB.');
                                        proofForm.setData('bukti', null);
                                        return;
                                    }
                                    setFileError(null);
                                    proofForm.setData('bukti', file);
                                }}
                            />
                            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setProofTarget(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={proofForm.processing || Boolean(fileError)}>
                                Kirim untuk ACC Notaris
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmNoteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Hapus Termin Pembayaran"
                description={`Yakin ingin menghapus termin ${deleteTarget?.no_inv}?`}
                confirmLabel="Hapus Permanen"
                confirmVariant="destructive"
                showNote={false}
                processing={deleting}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
