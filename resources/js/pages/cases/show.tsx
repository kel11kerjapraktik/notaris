import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    ChevronRight,
    FileUp,
    Printer,
    RotateCcw,
    SkipForward,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { PaymentBadge } from '@/components/notaris/payment-badge';
import { StageBadge } from '@/components/notaris/stage-badge';
import { StatCard } from '@/components/notaris/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { escapeHtml, formatDate, formatDateTime, formatRupiah, printDocument } from '@/lib/format';
import casesRoute from '@/routes/cases';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import paymentsRoute from '@/routes/payments';
import type { Auth, BreadcrumbItem, DeedCaseDetail, NotarisConfig } from '@/types';

export default function CasesShow({
    deedCase,
    totalPaid,
}: {
    deedCase: DeedCaseDetail;
    totalPaid: number;
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;
    const isNotaris = auth?.user?.is_notaris ?? false;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Monitoring Akta', href: casesRoute.index() },
        { title: deedCase.nomor, href: casesRoute.show(deedCase.id) },
    ];

    const [activeTab, setActiveTab] = useState<'alur' | 'dok' | 'uang' | 'info'>('alur');
    const [dialogMode, setDialogMode] = useState<
        'advance' | 'skip' | 'revert' | 'revision' | 'reject_doc' | 'delete' | null
    >(null);
    const [actionBusy, setActionBusy] = useState(false);

    const stages = notarisConfig.stages;
    const currentIdx = stages.findIndex((s) => s.key === deedCase.current_stage);
    const currentStageObj = stages[currentIdx];
    const nextStageObj = stages[currentIdx + 1];
    const sisa = Math.max(0, Number(deedCase.biaya) - Number(totalPaid));

    // Inline quick payment proof form for Stage 2 (DP 50%) & Stage 10 (Pelunasan)
    const isPaymentStage =
        deedCase.current_stage === 'pembayaran_dp' || deedCase.current_stage === 'pelunasan_biaya';
    const defaultPaymentType = deedCase.current_stage === 'pembayaran_dp' ? 'dp_50' : 'pelunasan';
    const defaultAmount =
        deedCase.current_stage === 'pembayaran_dp'
            ? String(Math.round(Number(deedCase.biaya) * 0.5))
            : String(Math.max(0, sisa));
    const hasPendingStagePayment =
        isPaymentStage &&
        deedCase.payments.some((p) => p.payment_type === defaultPaymentType && p.status === 'menunggu');

    const payForm = useForm<{
        deed_case_id: number;
        termin_ke: number;
        payment_type: 'dp_50' | 'pelunasan' | 'termin_lain';
        keterangan: string;
        jumlah: string;
        metode: string;
        no_referensi: string;
        mark_as_paid: boolean;
        bukti: File | null;
    }>({
        deed_case_id: deedCase.id,
        termin_ke: deedCase.payments.length + 1,
        payment_type: defaultPaymentType,
        keterangan: defaultPaymentType === 'dp_50' ? 'DP 50%' : 'Pelunasan Biaya',
        jumlah: defaultAmount,
        metode: 'Transfer Bank',
        no_referensi: '',
        mark_as_paid: true,
        bukti: null,
    });

    // Metadata form for stages 5-9
    const metaForm = useForm({
        jenis_akta: deedCase.jenis_akta,
        biaya: String(deedCase.biaya),
        target_selesai: deedCase.target_selesai ?? '',
        penanggung_jawab: deedCase.penanggung_jawab ?? '',
        catatan: deedCase.catatan ?? '',
        nomor_akta: deedCase.nomor_akta ?? '',
        tanggal_akta: deedCase.tanggal_akta ?? '',
        tanggal_ttd_minuta: deedCase.tanggal_ttd_minuta ?? '',
        nomor_sk_ahu: deedCase.nomor_sk_ahu ?? '',
        tanggal_sk_ahu: deedCase.tanggal_sk_ahu ?? '',
        tanggal_pemilik_manfaat: deedCase.tanggal_pemilik_manfaat ?? '',
        status_pemilik_manfaat: deedCase.status_pemilik_manfaat ?? '',
        nomor_tbnri: deedCase.nomor_tbnri ?? '',
        tanggal_tbnri: deedCase.tanggal_tbnri ?? '',
        nib_perusahaan: deedCase.nib_perusahaan ?? '',
        kbli_oss: deedCase.kbli_oss ?? '',
    });

    const handlePaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasPendingStagePayment) return;
        payForm.post(paymentsRoute.store().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => payForm.reset('no_referensi', 'bukti'),
        });
    };

    const stageDocForm = useForm<{
        client_id: number;
        deed_case_id: number;
        kategori: string;
        nama: string;
        nomor_dokumen: string;
        keterangan: string;
        is_complete_checked: boolean;
        submit_doc_approval: boolean;
        submit_draft_approval: boolean;
        file: File | null;
    }>({
        client_id: deedCase.client_id,
        deed_case_id: deedCase.id,
        kategori:
            deedCase.current_stage === 'pengerjaan_akta'
                ? 'Draft Akta'
                : notarisConfig.kategoriDokumen[0] ?? 'KTP',
        nama: deedCase.current_stage === 'pengerjaan_akta' ? `Draf ${deedCase.jenis_akta}` : '',
        nomor_dokumen: '',
        keterangan: '',
        is_complete_checked: true,
        submit_doc_approval: deedCase.current_stage === 'verifikasi_dokumen',
        submit_draft_approval: deedCase.current_stage === 'pengerjaan_akta',
        file: null,
    });

    const handleStageDocSubmit = (e: React.FormEvent, mode: 'doc' | 'draft') => {
        e.preventDefault();
        stageDocForm.transform((data) => ({
            ...data,
            kategori: mode === 'draft' ? 'Draft Akta' : data.kategori,
            submit_doc_approval: mode === 'doc',
            submit_draft_approval: mode === 'draft',
        }));
        stageDocForm.post(documentsRoute.store().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => stageDocForm.reset('nama', 'nomor_dokumen', 'keterangan', 'file'),
        });
    };

    const handleStageMetaSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        metaForm.put(casesRoute.update(deedCase.id).url, {
            preserveScroll: true,
        });
    };

    const handleDialogConfirm = (note: string) => {
        setActionBusy(true);
        const opts = {
            preserveScroll: true,
            onFinish: () => {
                setActionBusy(false);
                setDialogMode(null);
            },
        };

        if (dialogMode === 'advance') {
            router.post(casesRoute.advance(deedCase.id).url, { notes: note }, opts);
        } else if (dialogMode === 'skip') {
            router.post(casesRoute.skip(deedCase.id).url, { notes: note }, opts);
        } else if (dialogMode === 'revert') {
            router.post(casesRoute.revert(deedCase.id).url, { notes: note }, opts);
        } else if (dialogMode === 'revision') {
            router.post(casesRoute.requestRevision(deedCase.id).url, { notes: note }, opts);
        } else if (dialogMode === 'reject_doc') {
            router.post(casesRoute.rejectDoc(deedCase.id).url, { notes: note }, opts);
        } else if (dialogMode === 'delete') {
            router.delete(casesRoute.destroy(deedCase.id).url, opts);
        }
    };

    const handlePrint = () => {
        const rows = stages
            .map((s) => {
                const h = [...deedCase.histories]
                    .reverse()
                    .find((x) => x.stage_key === s.key && (x.action === 'completed' || x.action === 'skipped'));
                return `<tr>
                    <td>${s.order}</td>
                    <td>${escapeHtml(s.label)}</td>
                    <td>${h ? (h.action === 'skipped' ? 'Dilewati' : 'Selesai') : '-'}</td>
                    <td>${h ? escapeHtml(formatDateTime(h.created_at)) : '-'}</td>
                    <td>${h?.actor ? escapeHtml(h.actor.name) : '-'}</td>
                    <td>${h?.notes ? escapeHtml(h.notes) : ''}</td>
                </tr>`;
            })
            .join('');

        const payRows = deedCase.payments
            .map(
                (p) => `<tr>
                    <td>${p.termin_ke}</td>
                    <td>${escapeHtml(p.no_inv)}</td>
                    <td>${escapeHtml(formatRupiah(p.jumlah))}</td>
                    <td>${escapeHtml(p.status)}</td>
                </tr>`,
            )
            .join('');

        const body = `
            <dl>
                <dt>Klien</dt><dd>${escapeHtml(deedCase.client.company?.nama || deedCase.client.nama)}</dd>
                <dt>Jenis Akta</dt><dd>${escapeHtml(deedCase.jenis_akta)}</dd>
                <dt>Penanggung Jawab</dt><dd>${escapeHtml(deedCase.penanggung_jawab || '-')}</dd>
                <dt>Total Biaya</dt><dd>${escapeHtml(formatRupiah(deedCase.biaya))} (Terbayar ${escapeHtml(formatRupiah(totalPaid))})</dd>
                <dt>Tahapan Saat Ini</dt><dd>${currentStageObj ? `${currentStageObj.order}. ${escapeHtml(currentStageObj.label)}` : '-'}</dd>
            </dl>
            <h3>Riwayat 10 Tahapan</h3>
            <table><thead><tr><th>#</th><th>Tahapan</th><th>Status</th><th>Waktu</th><th>Petugas</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table>
            <h3>Termin Pembayaran</h3>
            <table><thead><tr><th>Termin</th><th>Invoice</th><th>Nominal</th><th>Status</th></tr></thead><tbody>${payRows || '<tr><td colspan="4">-</td></tr>'}</tbody></table>
        `;
        printDocument(
            'Lembar Monitoring Proses Akta',
            `${deedCase.nomor} • Dicetak ${formatDate(new Date().toISOString())}`,
            body,
            notarisConfig.office,
        );
    };

    const canAdvance = (() => {
        if (deedCase.is_completed) return false;
        if (deedCase.current_stage === 'verifikasi_dokumen' && deedCase.doc_approval_status !== 'approved') {
            return false;
        }
        if (deedCase.current_stage === 'pengerjaan_akta' && deedCase.draft_status !== 'approved') {
            return false;
        }
        if (deedCase.current_stage === 'penandatanganan_minuta' && !isNotaris) {
            return false;
        }
        if (deedCase.current_stage === 'pelunasan_biaya' && !isNotaris) {
            return false;
        }
        return true;
    })();

    const blockReason = (() => {
        if (deedCase.is_completed) return 'Berkas akta telah selesai sepenuhnya.';
        if (deedCase.current_stage === 'verifikasi_dokumen' && deedCase.doc_approval_status !== 'approved') {
            return 'Verifikasi dokumen wajib diajukan dan di-ACC oleh Notaris sebelum Pengerjaan Akta.';
        }
        if (deedCase.current_stage === 'pengerjaan_akta' && deedCase.draft_status !== 'approved') {
            return 'Draf akta wajib di-ACC oleh Notaris sebelum Penandatanganan Minuta Akta.';
        }
        if (deedCase.current_stage === 'penandatanganan_minuta' && !isNotaris) {
            return 'Pengesahan Penandatanganan Minuta Akta hanya dapat dilakukan oleh Notaris.';
        }
        if (deedCase.current_stage === 'pelunasan_biaya' && !isNotaris) {
            return 'Pengesahan akhir Pelunasan Biaya hanya dapat diselesaikan oleh Notaris.';
        }
        return '';
    })();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${deedCase.nomor} — Monitoring Akta`} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="sm">
                            <Link href={casesRoute.index()}>
                                <ArrowLeft className="mr-1 size-4" /> Kembali
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight">{deedCase.nomor}</h1>
                                <Badge variant={deedCase.is_badan_usaha ? 'default' : 'secondary'}>
                                    {deedCase.is_badan_usaha ? 'Badan Usaha' : 'Non-Badan Usaha'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {deedCase.client.company?.nama || deedCase.client.nama} • {deedCase.jenis_akta}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="mr-1.5 size-4" /> Cetak Monitoring
                        </Button>
                        {isNotaris && (
                            <Button variant="destructive" size="sm" onClick={() => setDialogMode('delete')}>
                                <Trash2 className="mr-1.5 size-4" /> Hapus
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Klien"
                        value={deedCase.client.company?.nama || deedCase.client.nama}
                        note={deedCase.jenis_akta}
                        valueClassName="text-lg"
                    />
                    <StatCard
                        label="Tahapan Saat Ini"
                        value={
                            <div className="mt-1">
                                <StageBadge
                                    order={currentStageObj?.order ?? 1}
                                    label={currentStageObj?.label ?? ''}
                                    isCompleted={deedCase.is_completed}
                                />
                            </div>
                        }
                        note={`Tahap ${currentStageObj?.order ?? 1} dari ${stages.length} • PJ ${deedCase.penanggung_jawab || '-'}`}
                    />
                    <StatCard
                        label="Keuangan"
                        value={`${formatRupiah(totalPaid)} / ${formatRupiah(deedCase.biaya)}`}
                        note={sisa > 0 ? `Sisa ${formatRupiah(sisa)}` : 'Lunas'}
                        valueClassName="text-lg"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b pb-2">
                    {[
                        { k: 'alur', l: 'Alur 10 Tahap' },
                        { k: 'dok', l: `Dokumen (${deedCase.documents.length})` },
                        { k: 'uang', l: `Pembayaran (${deedCase.payments.length})` },
                        { k: 'info', l: 'Metadata & Info Akta' },
                    ].map((t) => (
                        <Button
                            key={t.k}
                            size="sm"
                            variant={activeTab === t.k ? 'default' : 'ghost'}
                            onClick={() => setActiveTab(t.k as typeof activeTab)}
                        >
                            {t.l}
                        </Button>
                    ))}
                </div>

                {activeTab === 'alur' && (
                    <div className="grid gap-6 lg:grid-cols-5">
                        {/* Timeline 10 Tahap */}
                        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
                            <h2 className="mb-4 text-sm font-semibold">Timeline Proses Akta (10 Tahapan)</h2>
                            <ol className="space-y-4">
                                {stages.map((s, idx) => {
                                    const hist = [...deedCase.histories]
                                        .reverse()
                                        .find((h) => h.stage_key === s.key && (h.action === 'completed' || h.action === 'skipped'));
                                    const isDone = deedCase.is_completed || idx < currentIdx;
                                    const isCurrent = !deedCase.is_completed && idx === currentIdx;
                                    const isSkipped = hist?.action === 'skipped';

                                    return (
                                        <li key={s.key} className="flex gap-3">
                                            <div
                                                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                    isDone
                                                        ? isSkipped
                                                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                            : 'bg-emerald-600 text-white'
                                                        : isCurrent
                                                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                                          : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {isDone ? (isSkipped ? '↷' : '✓') : s.order}
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">{s.label}</span>
                                                    {s.requires_notaris && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            ACC Notaris
                                                        </Badge>
                                                    )}
                                                    {s.skippable && !deedCase.is_badan_usaha && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            Opsional (Non-Badan Usaha)
                                                        </Badge>
                                                    )}
                                                    {s.key === 'pembayaran_dp' &&
                                                        (deedCase.payments.some(
                                                            (p) => p.payment_type === 'dp_50' && p.status === 'lunas',
                                                        ) ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) => p.payment_type === 'dp_50' && p.status === 'menunggu',
                                                          ) ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) => p.payment_type === 'dp_50' && p.status === 'ditolak',
                                                          ) ? (
                                                            <Badge variant="destructive" className="text-[10px]">
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key === 'verifikasi_dokumen' &&
                                                        (deedCase.doc_approval_status === 'approved' ||
                                                        deedCase.documents.some((d) => d.is_verified) ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.doc_approval_status === 'pending_approval' ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.doc_approval_status === 'rejected' ? (
                                                            <Badge variant="destructive" className="text-[10px]">
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key === 'pengerjaan_akta' &&
                                                        (deedCase.draft_status === 'approved' ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.draft_status === 'pending_approval' ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.draft_status === 'revision_requested' ? (
                                                            <Badge variant="destructive" className="text-[10px]">
                                                                Perlu Revisi
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key === 'penandatanganan_minuta' &&
                                                        (isDone && !isSkipped ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC Notaris
                                                            </Badge>
                                                        ) : isCurrent ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key === 'pelunasan_biaya' &&
                                                        (deedCase.is_completed ||
                                                        deedCase.payments.some(
                                                            (p) =>
                                                                p.payment_type === 'pelunasan' &&
                                                                p.status === 'lunas',
                                                        ) ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) =>
                                                                  p.payment_type === 'pelunasan' &&
                                                                  p.status === 'menunggu',
                                                          ) ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) =>
                                                                  p.payment_type === 'pelunasan' &&
                                                                  p.status === 'ditolak',
                                                          ) ? (
                                                            <Badge variant="destructive" className="text-[10px]">
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{s.description}</p>
                                                {hist && (
                                                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                                                        {isSkipped ? '↷ Dilewati: ' : '✓ '}
                                                        {formatDateTime(hist.created_at)} oleh{' '}
                                                        {hist.actor?.name || '-'}
                                                        {hist.notes ? ` — ${hist.notes}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* Panel Aksi Tahap Saat Ini */}
                        <div className="space-y-4 lg:col-span-2">
                            <div className="rounded-xl border bg-card p-5 space-y-4">
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase">
                                        Kontrol Tahapan
                                    </div>
                                    <div className="mt-1 text-base font-bold">
                                        {deedCase.is_completed
                                            ? 'Berkas Selesai & Lunas'
                                            : `${currentStageObj?.order}. ${currentStageObj?.label}`}
                                    </div>
                                </div>

                                {/* Sub-alur Verifikasi Dokumen pada Tahap 3 */}
                                {deedCase.current_stage === 'verifikasi_dokumen' && !deedCase.is_completed && (
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                        <div className="text-xs font-semibold">Status Persetujuan Verifikasi Dokumen</div>
                                        <div className="text-xs">
                                            {deedCase.doc_approval_status === 'approved' && (
                                                <span className="font-medium text-emerald-600">
                                                    ✓ Disetujui (ACC) oleh {deedCase.doc_approver?.name}
                                                    {deedCase.doc_approval_notes ? ` — ${deedCase.doc_approval_notes}` : ''}
                                                </span>
                                            )}
                                            {deedCase.doc_approval_status === 'pending_approval' && (
                                                <span className="font-medium text-amber-600">
                                                    Menunggu persetujuan Notaris
                                                </span>
                                            )}
                                            {deedCase.doc_approval_status === 'rejected' && (
                                                <span className="font-medium text-destructive">
                                                    Ditolak Notaris: {deedCase.doc_approval_notes || 'Periksa kembali dokumen'}
                                                </span>
                                            )}
                                            {deedCase.doc_approval_status === 'none' && (
                                                <span className="text-muted-foreground">Belum diajukan ke Notaris</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {!isNotaris &&
                                                (deedCase.doc_approval_status === 'none' ||
                                                    deedCase.doc_approval_status === 'rejected') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.post(
                                                                casesRoute.requestDocApproval(deedCase.id).url,
                                                                {},
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                    >
                                                        Ajukan Persetujuan ke Notaris
                                                    </Button>
                                                )}
                                            {isNotaris && deedCase.doc_approval_status !== 'approved' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            router.post(
                                                                casesRoute.approveDoc(deedCase.id).url,
                                                                {},
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                    >
                                                        <Check className="mr-1 size-3.5" /> ACC Verifikasi Dokumen
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setDialogMode('reject_doc')}
                                                    >
                                                        Tolak dengan Catatan
                                                    </Button>
                                                </>
                                            )}
                                        </div>

                                        {!isNotaris && deedCase.doc_approval_status !== 'approved' && (
                                            <form
                                                onSubmit={(e) => handleStageDocSubmit(e, 'doc')}
                                                className="mt-2 space-y-2.5 border-t pt-2.5"
                                            >
                                                <div className="text-xs font-semibold">
                                                    Input &amp; Unggah Dokumen Verifikasi
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Kategori</Label>
                                                        <select
                                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={stageDocForm.data.kategori}
                                                            onChange={(e) =>
                                                                stageDocForm.setData('kategori', e.target.value)
                                                            }
                                                            disabled={
                                                                deedCase.doc_approval_status === 'pending_approval'
                                                            }
                                                        >
                                                            {notarisConfig.kategoriDokumen.map((k) => (
                                                                <option key={k} value={k}>
                                                                    {k}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Nomor Dokumen (Opsional)</Label>
                                                        <Input
                                                            value={stageDocForm.data.nomor_dokumen}
                                                            onChange={(e) =>
                                                                stageDocForm.setData('nomor_dokumen', e.target.value)
                                                            }
                                                            disabled={
                                                                deedCase.doc_approval_status === 'pending_approval'
                                                            }
                                                            placeholder="Nomor KTP/NPWP/dll"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Nama Dokumen</Label>
                                                    <Input
                                                        value={stageDocForm.data.nama}
                                                        onChange={(e) => stageDocForm.setData('nama', e.target.value)}
                                                        disabled={deedCase.doc_approval_status === 'pending_approval'}
                                                        placeholder="Misal: KTP Direktur / NPWP Perusahaan"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Unggah File (Maks 2 MB)</Label>
                                                    <Input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        disabled={deedCase.doc_approval_status === 'pending_approval'}
                                                        onChange={(e) =>
                                                            stageDocForm.setData('file', e.target.files?.[0] ?? null)
                                                        }
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-full"
                                                    disabled={
                                                        stageDocForm.processing ||
                                                        deedCase.doc_approval_status === 'pending_approval'
                                                    }
                                                >
                                                    <FileUp className="mr-1.5 size-3.5" />
                                                    {stageDocForm.processing
                                                        ? 'Mengunggah…'
                                                        : deedCase.doc_approval_status === 'pending_approval'
                                                          ? 'Menunggu ACC Notaris…'
                                                          : 'Simpan & Ajukan Persetujuan ke Notaris'}
                                                </Button>
                                            </form>
                                        )}
                                    </div>
                                )}

                                {/* Sub-alur Draf pada Tahap 4 (Pengerjaan Akta) */}
                                {deedCase.current_stage === 'pengerjaan_akta' && !deedCase.is_completed && (
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                        <div className="text-xs font-semibold">Status Persetujuan Draf Akta</div>
                                        <div className="text-xs">
                                            {deedCase.draft_status === 'approved' && (
                                                <span className="font-medium text-emerald-600">
                                                    ✓ Disetujui oleh {deedCase.draft_approver?.name}
                                                </span>
                                            )}
                                            {deedCase.draft_status === 'pending_approval' && (
                                                <span className="font-medium text-amber-600">
                                                    Menunggu persetujuan Notaris
                                                </span>
                                            )}
                                            {deedCase.draft_status === 'revision_requested' && (
                                                <span className="font-medium text-destructive">
                                                    Perlu revisi sesuai catatan Notaris
                                                </span>
                                            )}
                                            {deedCase.draft_status === 'none' && (
                                                <span className="text-muted-foreground">Belum diajukan</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {!isNotaris &&
                                                (deedCase.draft_status === 'none' ||
                                                    deedCase.draft_status === 'revision_requested') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.post(casesRoute.requestDraft(deedCase.id).url)
                                                        }
                                                    >
                                                        Ajukan ACC Draf ke Notaris
                                                    </Button>
                                                )}
                                            {isNotaris && deedCase.draft_status !== 'approved' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            router.post(casesRoute.approveDraft(deedCase.id).url)
                                                        }
                                                    >
                                                        <Check className="mr-1 size-3.5" /> Setujui Draf
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setDialogMode('revision')}
                                                    >
                                                        Minta Revisi
                                                    </Button>
                                                </>
                                            )}
                                        </div>

                                        {!isNotaris && deedCase.draft_status !== 'approved' && (
                                            <form
                                                onSubmit={(e) => handleStageDocSubmit(e, 'draft')}
                                                className="mt-2 space-y-2.5 border-t pt-2.5"
                                            >
                                                <div className="text-xs font-semibold">
                                                    Input &amp; Unggah Draf Akta
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Nama Draf / Dokumen</Label>
                                                    <Input
                                                        value={stageDocForm.data.nama}
                                                        onChange={(e) => stageDocForm.setData('nama', e.target.value)}
                                                        disabled={deedCase.draft_status === 'pending_approval'}
                                                        placeholder={`Draf ${deedCase.jenis_akta}`}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Unggah File Draf (Maks 2 MB)</Label>
                                                    <Input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        disabled={deedCase.draft_status === 'pending_approval'}
                                                        onChange={(e) =>
                                                            stageDocForm.setData('file', e.target.files?.[0] ?? null)
                                                        }
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-full"
                                                    disabled={
                                                        stageDocForm.processing ||
                                                        deedCase.draft_status === 'pending_approval'
                                                    }
                                                >
                                                    <FileUp className="mr-1.5 size-3.5" />
                                                    {stageDocForm.processing
                                                        ? 'Mengunggah…'
                                                        : deedCase.draft_status === 'pending_approval'
                                                          ? 'Menunggu ACC Notaris…'
                                                          : 'Simpan & Ajukan ACC Draf ke Notaris'}
                                                </Button>
                                            </form>
                                        )}
                                    </div>
                                )}

                                {/* Input Data Tahapan 5–9 langsung di Kontrol Tahapan */}
                                {!deedCase.is_completed &&
                                    ['penandatanganan_minuta', 'penerbitan_akta', 'pemilik_manfaat', 'tbnri', 'nib_oss'].includes(
                                        deedCase.current_stage,
                                    ) && (
                                        <form
                                            onSubmit={handleStageMetaSubmit}
                                            className="rounded-lg border bg-muted/30 p-3 space-y-2.5"
                                        >
                                            <div className="text-xs font-semibold">
                                                Input Data {currentStageObj?.label}
                                            </div>
                                            {deedCase.current_stage === 'penandatanganan_minuta' && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Tanggal TTD Minuta</Label>
                                                    <Input
                                                        type="date"
                                                        value={metaForm.data.tanggal_ttd_minuta}
                                                        onChange={(e) =>
                                                            metaForm.setData('tanggal_ttd_minuta', e.target.value)
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {deedCase.current_stage === 'penerbitan_akta' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Nomor Akta</Label>
                                                        <Input
                                                            value={metaForm.data.nomor_akta}
                                                            onChange={(e) =>
                                                                metaForm.setData('nomor_akta', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal Akta</Label>
                                                        <Input
                                                            type="date"
                                                            value={metaForm.data.tanggal_akta}
                                                            onChange={(e) =>
                                                                metaForm.setData('tanggal_akta', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Nomor SK AHU</Label>
                                                        <Input
                                                            value={metaForm.data.nomor_sk_ahu}
                                                            onChange={(e) =>
                                                                metaForm.setData('nomor_sk_ahu', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal SK AHU</Label>
                                                        <Input
                                                            type="date"
                                                            value={metaForm.data.tanggal_sk_ahu}
                                                            onChange={(e) =>
                                                                metaForm.setData('tanggal_sk_ahu', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage === 'pemilik_manfaat' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal Pelaporan BO</Label>
                                                        <Input
                                                            type="date"
                                                            value={metaForm.data.tanggal_pemilik_manfaat}
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'tanggal_pemilik_manfaat',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Status Pemilik Manfaat</Label>
                                                        <Input
                                                            value={metaForm.data.status_pemilik_manfaat}
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'status_pemilik_manfaat',
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Sudah Dilaporkan / Terverifikasi"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage === 'tbnri' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Nomor TBNRI</Label>
                                                        <Input
                                                            value={metaForm.data.nomor_tbnri}
                                                            onChange={(e) =>
                                                                metaForm.setData('nomor_tbnri', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal TBNRI</Label>
                                                        <Input
                                                            type="date"
                                                            value={metaForm.data.tanggal_tbnri}
                                                            onChange={(e) =>
                                                                metaForm.setData('tanggal_tbnri', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage === 'nib_oss' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">NIB Perusahaan</Label>
                                                        <Input
                                                            value={metaForm.data.nib_perusahaan}
                                                            onChange={(e) =>
                                                                metaForm.setData('nib_perusahaan', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">KBLI OSS</Label>
                                                        <Input
                                                            value={metaForm.data.kbli_oss}
                                                            onChange={(e) =>
                                                                metaForm.setData('kbli_oss', e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                disabled={metaForm.processing}
                                            >
                                                {metaForm.processing ? 'Menyimpan…' : 'Simpan Data Tahap'}
                                            </Button>
                                        </form>
                                    )}

                                {/* Form Cepat Bukti DP 50% (Tahap 2) atau Pelunasan (Tahap 10) */}
                                {isPaymentStage && !deedCase.is_completed && (
                                    <form onSubmit={handlePaySubmit} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                                        <div className="text-xs font-semibold">
                                            {deedCase.current_stage === 'pembayaran_dp'
                                                ? 'Catat & Unggah Bukti DP 50%'
                                                : 'Catat & Unggah Bukti Pelunasan'}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Nominal (Rp)</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={payForm.data.jumlah}
                                                    onChange={(e) => payForm.setData('jumlah', e.target.value)}
                                                    disabled={hasPendingStagePayment}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Metode</Label>
                                                <select
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={payForm.data.metode}
                                                    onChange={(e) => payForm.setData('metode', e.target.value)}
                                                    disabled={hasPendingStagePayment}
                                                >
                                                    {['Transfer Bank', 'Tunai', 'QRIS', 'Virtual Account'].map((m) => (
                                                        <option key={m} value={m}>
                                                            {m}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Unggah Bukti Bayar (Maks 2 MB)</Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,image/*"
                                                disabled={hasPendingStagePayment}
                                                onChange={(e) =>
                                                    payForm.setData('bukti', e.target.files?.[0] ?? null)
                                                }
                                            />
                                        </div>
                                        {hasPendingStagePayment && (
                                            <div className="rounded-md border border-amber-300 bg-amber-50/80 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                                Bukti pembayaran sudah dikirim dan sedang menunggu ACC Notaris.
                                            </div>
                                        )}
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="w-full"
                                            disabled={payForm.processing || hasPendingStagePayment}
                                        >
                                            <FileUp className="mr-1.5 size-3.5" />
                                            {payForm.processing
                                                ? 'Mengunggah…'
                                                : hasPendingStagePayment
                                                  ? 'Menunggu ACC Notaris…'
                                                  : 'Simpan Bukti (Menunggu ACC Notaris)'}
                                        </Button>
                                    </form>
                                )}

                                {blockReason && (
                                    <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                        {blockReason}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {!deedCase.is_completed && canAdvance && (
                                        <Button onClick={() => setDialogMode('advance')}>
                                            {nextStageObj
                                                ? `Lanjut ke ${nextStageObj.order}. ${nextStageObj.label}`
                                                : 'Sahkan Pelunasan & Selesaikan Berkas'}
                                            <ChevronRight className="ml-1 size-4" />
                                        </Button>
                                    )}

                                    {!deedCase.is_completed &&
                                        !deedCase.is_badan_usaha &&
                                        currentStageObj?.skippable && (
                                            <Button
                                                variant="outline"
                                                onClick={() => setDialogMode('skip')}
                                            >
                                                <SkipForward className="mr-1.5 size-4" />
                                                Lewati Tahap (Non-Badan Usaha)
                                            </Button>
                                        )}

                                    {currentIdx > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setDialogMode('revert')}>
                                            <RotateCcw className="mr-1.5 size-3.5" />
                                            Kembalikan ke Tahap Sebelumnya
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dok' && (
                    <div className="rounded-xl border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Dokumen Terkait Berkas</h2>
                            <Button asChild size="sm" variant="outline">
                                <Link href={clientsRoute.edit(deedCase.client_id)}>Tambah / Kelola Berkas Klien</Link>
                            </Button>
                        </div>
                        {deedCase.documents.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada dokumen yang dikaitkan ke berkas ini.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {deedCase.documents.map((d) => (
                                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                        <div>
                                            <div className="font-medium">{d.nama}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {d.kategori} • {d.nomor_dokumen || 'Tanpa nomor'}
                                            </div>
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
                                                {d.is_verified ? '✓ Sudah di-ACC Notaris' : 'Belum Diverifikasi'}
                                            </Badge>
                                            {d.file_path && (
                                                <Button asChild size="sm" variant="outline">
                                                    <a href={documentsRoute.download(d.id).url} target="_blank" rel="noreferrer">
                                                        Lihat File
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'uang' && (
                    <div className="rounded-xl border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Riwayat Termin Pembayaran</h2>
                            <Button asChild size="sm" variant="outline">
                                <Link href={paymentsRoute.index()}>Buka Halaman Keuangan</Link>
                            </Button>
                        </div>
                        {deedCase.payments.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada termin pembayaran pada berkas ini.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {deedCase.payments.map((p) => (
                                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                                        <div>
                                            <div className="font-semibold">
                                                {p.no_inv} — {p.keterangan || `Termin ${p.termin_ke}`}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatRupiah(p.jumlah)} • {p.metode}
                                                {p.tanggal_bayar ? ` • Bayar ${formatDate(p.tanggal_bayar)}` : ''}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PaymentBadge status={p.status} />
                                            {p.bukti_path && (
                                                <Button asChild size="sm" variant="outline">
                                                    <a href={paymentsRoute.proof(p.id).url} target="_blank" rel="noreferrer">
                                                        Bukti
                                                    </a>
                                                </Button>
                                            )}
                                            {isNotaris && p.status === 'menunggu' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        router.post(paymentsRoute.confirm(p.id).url, {}, { preserveScroll: true })
                                                    }
                                                >
                                                    ACC Lunas
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'info' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            metaForm.put(casesRoute.update(deedCase.id).url, { preserveScroll: true });
                        }}
                        className="rounded-xl border bg-card p-5 space-y-4"
                    >
                        <h2 className="text-sm font-semibold">Metadata Legalitas & Informasi Berkas</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <Label>Total Biaya (Rp)</Label>
                                <Input
                                    type="number"
                                    value={metaForm.data.biaya}
                                    onChange={(e) => metaForm.setData('biaya', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Penanggung Jawab</Label>
                                <Input
                                    value={metaForm.data.penanggung_jawab}
                                    onChange={(e) => metaForm.setData('penanggung_jawab', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Target Selesai</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.target_selesai}
                                    onChange={(e) => metaForm.setData('target_selesai', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor Akta</Label>
                                <Input
                                    value={metaForm.data.nomor_akta}
                                    onChange={(e) => metaForm.setData('nomor_akta', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal Akta</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_akta}
                                    onChange={(e) => metaForm.setData('tanggal_akta', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal TTD Minuta</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_ttd_minuta}
                                    onChange={(e) => metaForm.setData('tanggal_ttd_minuta', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor SK AHU</Label>
                                <Input
                                    value={metaForm.data.nomor_sk_ahu}
                                    onChange={(e) => metaForm.setData('nomor_sk_ahu', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal SK AHU</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_sk_ahu}
                                    onChange={(e) => metaForm.setData('tanggal_sk_ahu', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Status Pemilik Manfaat (BO)</Label>
                                <Input
                                    value={metaForm.data.status_pemilik_manfaat}
                                    onChange={(e) => metaForm.setData('status_pemilik_manfaat', e.target.value)}
                                    placeholder="Sudah Dilaporkan / Proses"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor TBNRI</Label>
                                <Input
                                    value={metaForm.data.nomor_tbnri}
                                    onChange={(e) => metaForm.setData('nomor_tbnri', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>NIB Perusahaan (OSS)</Label>
                                <Input
                                    value={metaForm.data.nib_perusahaan}
                                    onChange={(e) => metaForm.setData('nib_perusahaan', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>KBLI OSS</Label>
                                <Input
                                    value={metaForm.data.kbli_oss}
                                    onChange={(e) => metaForm.setData('kbli_oss', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={metaForm.processing}>
                                {metaForm.processing ? 'Menyimpan…' : 'Simpan Metadata Akta'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            <ConfirmNoteDialog
                open={dialogMode !== null}
                onOpenChange={(open) => !open && setDialogMode(null)}
                title={
                    dialogMode === 'advance'
                        ? nextStageObj
                            ? `Lanjut ke Tahap ${nextStageObj.order}: ${nextStageObj.label}`
                            : 'Sahkan Pelunasan & Selesaikan Berkas'
                        : dialogMode === 'skip'
                          ? `Lewati Tahap: ${currentStageObj?.label}`
                          : dialogMode === 'revert'
                            ? 'Kembalikan ke Tahap Sebelumnya'
                            : dialogMode === 'revision'
                              ? 'Minta Revisi Draf Akta'
                              : dialogMode === 'reject_doc'
                                ? 'Tolak Verifikasi Dokumen'
                                : 'Hapus Berkas Akta'
                }
                description={
                    dialogMode === 'delete'
                        ? `Yakin ingin menghapus berkas ${deedCase.nomor} secara permanen?`
                        : dialogMode === 'skip'
                          ? 'Khusus akta non-badan usaha. Wajib menyertakan alasan melewati tahap ini.'
                          : dialogMode === 'reject_doc'
                            ? 'Wajib mengisi catatan penolakan agar Staf dapat melengkapi/memperbaiki dokumen.'
                            : 'Tambahkan catatan untuk riwayat tahapan berkas.'
                }
                confirmLabel={dialogMode === 'delete' ? 'Hapus Permanen' : dialogMode === 'reject_doc' ? 'Tolak dengan Catatan' : 'Konfirmasi'}
                confirmVariant={dialogMode === 'delete' || dialogMode === 'revision' || dialogMode === 'reject_doc' ? 'destructive' : 'default'}
                showNote={dialogMode !== 'delete'}
                requireNote={dialogMode === 'skip' || dialogMode === 'revert' || dialogMode === 'revision' || dialogMode === 'reject_doc'}
                processing={actionBusy}
                onConfirm={handleDialogConfirm}
            />
        </AppLayout>
    );
}
