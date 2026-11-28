import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Clock,
    Download,
    Eye,
    FileText,
    FileUp,
    Plus,
    Printer,
    RotateCcw,
    ShieldCheck,
    SkipForward,
    Trash2,
    User,
    Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { CurrencyInput } from '@/components/notaris/currency-input';
import { PaymentBadge } from '@/components/notaris/payment-badge';
import { StageBadge } from '@/components/notaris/stage-badge';
import { StatCard } from '@/components/notaris/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import {
    escapeHtml,
    formatDate,
    formatDateTime,
    formatRupiah,
    printDocument,
} from '@/lib/format';
import casesRoute from '@/routes/cases';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import paymentsRoute from '@/routes/payments';
import type {
    Auth,
    BreadcrumbItem,
    DeedCaseDetail,
    NotarisConfig,
} from '@/types';

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

    const [activeTab, setActiveTab] = useState<
        'alur' | 'dok' | 'uang' | 'info'
    >('alur');
    const [dialogMode, setDialogMode] = useState<
        | 'advance'
        | 'skip'
        | 'revert'
        | 'revision'
        | 'reject_doc'
        | 'delete'
        | null
    >(null);
    const [actionBusy, setActionBusy] = useState(false);

    const stages = notarisConfig.stages;
    const currentIdx = stages.findIndex(
        (s) => s.key === deedCase.current_stage,
    );
    const currentStageObj = stages[currentIdx];
    const nextStageObj = stages[currentIdx + 1];
    const sisa = Math.max(0, Number(deedCase.biaya) - Number(totalPaid));
    const maxBytes = notarisConfig.maxFileKb * 1024;
    const [payFileError, setPayFileError] = useState<string | null>(null);
    const [stageFileError, setStageFileError] = useState<string | null>(null);
    const [showExtraDocUpload, setShowExtraDocUpload] = useState(false);
    const [showStage6Upload, setShowStage6Upload] = useState(false);

    const hasConfirmedDp = deedCase.payments.some(
        (p) =>
            (p.payment_type === 'dp_50' || p.payment_type === 'termin_lain') &&
            p.status === 'lunas',
    );
    const hasPendingDp = deedCase.payments.some(
        (p) =>
            (p.payment_type === 'dp_50' || p.payment_type === 'termin_lain') &&
            p.status === 'menunggu',
    );
    const hasRejectedDp =
        !hasConfirmedDp &&
        !hasPendingDp &&
        deedCase.payments.some(
            (p) =>
                (p.payment_type === 'dp_50' ||
                    p.payment_type === 'termin_lain') &&
                p.status === 'ditolak',
        );

    const allCaseDocsVerified =
        deedCase.documents.length > 0 &&
        deedCase.documents.every((d) => d.is_verified && !d.is_rejected);
    const effectiveDocStatus: DeedCaseDetail['doc_approval_status'] =
        deedCase.doc_approval_status === 'approved' || allCaseDocsVerified
            ? 'approved'
            : deedCase.doc_approval_status;
    const latestDocVerifierName =
        deedCase.doc_approver?.name ||
        deedCase.documents.find((d) => d.is_verified && d.verifier?.name)
            ?.verifier?.name ||
        'Notaris';
    const draftDocs = deedCase.documents.filter(
        (d) => d.kategori === 'Draft Akta',
    );
    const stage6Docs = deedCase.documents.filter(
        (d) =>
            d.kategori === 'Salinan Akta' ||
            d.kategori === 'SK Kemenkumham / AHU',
    );
    const latestDraftRevisionNote =
        [...deedCase.histories]
            .reverse()
            .find((h) => h.action === 'revision_requested')?.notes ?? null;

    // Inline quick payment proof form for Stage 2 (DP 50%) & Stage 10 (Pelunasan)
    const isPaymentStage =
        deedCase.current_stage === 'pembayaran_dp' ||
        deedCase.current_stage === 'pelunasan_biaya';
    const defaultPaymentType =
        deedCase.current_stage === 'pembayaran_dp' ? 'dp_50' : 'pelunasan';
    const defaultAmount =
        deedCase.current_stage === 'pembayaran_dp'
            ? String(Math.round(Number(deedCase.biaya) * 0.5))
            : String(Math.max(0, sisa));
    const hasPendingStagePayment =
        isPaymentStage &&
        deedCase.payments.some(
            (p) =>
                p.payment_type === defaultPaymentType &&
                p.status === 'menunggu',
        );

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
        keterangan:
            defaultPaymentType === 'dp_50' ? 'DP 50%' : 'Pelunasan Biaya',
        jumlah: defaultAmount,
        metode: 'Transfer Bank',
        no_referensi: '',
        mark_as_paid: true,
        bukti: null,
    });

    useEffect(() => {
        payForm.setData({
            ...payForm.data,
            deed_case_id: deedCase.id,
            termin_ke: deedCase.payments.length + 1,
            payment_type: defaultPaymentType,
            keterangan:
                defaultPaymentType === 'dp_50' ? 'DP 50%' : 'Pelunasan Biaya',
            jumlah: defaultAmount,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        deedCase.id,
        deedCase.current_stage,
        deedCase.payments.length,
        defaultPaymentType,
        defaultAmount,
    ]);

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

    useEffect(() => {
        metaForm.setData({
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        deedCase.id,
        deedCase.current_stage,
        deedCase.jenis_akta,
        deedCase.biaya,
        deedCase.target_selesai,
        deedCase.penanggung_jawab,
        deedCase.catatan,
        deedCase.nomor_akta,
        deedCase.tanggal_akta,
        deedCase.tanggal_ttd_minuta,
        deedCase.nomor_sk_ahu,
        deedCase.tanggal_sk_ahu,
        deedCase.tanggal_pemilik_manfaat,
        deedCase.status_pemilik_manfaat,
        deedCase.nomor_tbnri,
        deedCase.tanggal_tbnri,
        deedCase.nib_perusahaan,
        deedCase.kbli_oss,
    ]);

    const handlePaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasPendingStagePayment || payFileError) return;
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
                : (notarisConfig.kategoriDokumen[0] ?? 'KTP'),
        nama:
            deedCase.current_stage === 'pengerjaan_akta'
                ? `Draf ${deedCase.jenis_akta}`
                : '',
        nomor_dokumen: '',
        keterangan: '',
        is_complete_checked: true,
        submit_doc_approval: deedCase.current_stage === 'verifikasi_dokumen',
        submit_draft_approval: deedCase.current_stage === 'pengerjaan_akta',
        file: null,
    });

    useEffect(() => {
        setStageFileError(null);
        setShowExtraDocUpload(false);
        setShowStage6Upload(false);
        stageDocForm.setData({
            ...stageDocForm.data,
            client_id: deedCase.client_id,
            deed_case_id: deedCase.id,
            kategori:
                deedCase.current_stage === 'pengerjaan_akta'
                    ? 'Draft Akta'
                    : deedCase.current_stage === 'penerbitan_akta_sk_ahu'
                      ? 'Salinan Akta'
                      : (notarisConfig.kategoriDokumen[0] ?? 'KTP'),
            nama:
                deedCase.current_stage === 'pengerjaan_akta'
                    ? `Draf ${deedCase.jenis_akta}`
                    : '',
            submit_doc_approval:
                deedCase.current_stage === 'verifikasi_dokumen',
            submit_draft_approval: deedCase.current_stage === 'pengerjaan_akta',
            file: null,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deedCase.id, deedCase.current_stage]);

    const handleStageDocSubmit = (
        e: React.FormEvent,
        mode: 'doc' | 'draft' | 'stage6',
    ) => {
        e.preventDefault();
        if (stageFileError) return;
        if (mode === 'draft' && !stageDocForm.data.file) {
            setStageFileError('Pilih file Draf Akta terlebih dahulu.');
            return;
        }
        stageDocForm.transform((data) => ({
            ...data,
            kategori: mode === 'draft' ? 'Draft Akta' : data.kategori,
            submit_doc_approval: mode === 'doc',
            submit_draft_approval: mode === 'draft',
        }));
        stageDocForm.post(documentsRoute.store().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setStageFileError(null);
                setShowStage6Upload(false);
                stageDocForm.setData({
                    ...stageDocForm.data,
                    nama: mode === 'draft' ? `Draf ${deedCase.jenis_akta}` : '',
                    nomor_dokumen: '',
                    keterangan: '',
                    file: null,
                });
            },
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
            router.post(
                casesRoute.advance(deedCase.id).url,
                {
                    notes: note,
                    nomor_akta: metaForm.data.nomor_akta || null,
                    tanggal_akta: metaForm.data.tanggal_akta || null,
                    tanggal_ttd_minuta:
                        metaForm.data.tanggal_ttd_minuta || null,
                    nomor_sk_ahu: metaForm.data.nomor_sk_ahu || null,
                    tanggal_sk_ahu: metaForm.data.tanggal_sk_ahu || null,
                    tanggal_pemilik_manfaat:
                        metaForm.data.tanggal_pemilik_manfaat || null,
                    status_pemilik_manfaat:
                        metaForm.data.status_pemilik_manfaat || null,
                    nomor_tbnri: metaForm.data.nomor_tbnri || null,
                    tanggal_tbnri: metaForm.data.tanggal_tbnri || null,
                    nib_perusahaan: metaForm.data.nib_perusahaan || null,
                    kbli_oss: metaForm.data.kbli_oss || null,
                },
                opts,
            );
        } else if (dialogMode === 'skip') {
            router.post(
                casesRoute.skip(deedCase.id).url,
                { notes: note },
                opts,
            );
        } else if (dialogMode === 'revert') {
            router.post(
                casesRoute.revert(deedCase.id).url,
                { notes: note },
                opts,
            );
        } else if (dialogMode === 'revision') {
            router.post(
                casesRoute.requestRevision(deedCase.id).url,
                { notes: note },
                opts,
            );
        } else if (dialogMode === 'reject_doc') {
            router.post(
                casesRoute.rejectDoc(deedCase.id).url,
                { notes: note },
                opts,
            );
        } else if (dialogMode === 'delete') {
            router.delete(casesRoute.destroy(deedCase.id).url, opts);
        }
    };

    const handlePrint = () => {
        const rows = stages
            .map((s, idx) => {
                const isDone = deedCase.is_completed || idx < currentIdx;
                const isCurrent = !deedCase.is_completed && idx === currentIdx;
                const h = isDone
                    ? [...deedCase.histories]
                          .reverse()
                          .find(
                              (x) =>
                                  x.stage_key === s.key &&
                                  (x.action === 'completed' ||
                                      x.action === 'skipped'),
                          )
                    : undefined;
                const statusText = isDone
                    ? h?.action === 'skipped'
                        ? 'Dilewati'
                        : 'Selesai'
                    : isCurrent
                      ? 'Sedang Berjalan'
                      : 'Menunggu';
                return `<tr>
                    <td>${s.order}</td>
                    <td>${escapeHtml(s.label)}</td>
                    <td>${statusText}</td>
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

    const effectiveTglMinuta = metaForm.data.tanggal_ttd_minuta.trim();
    const effectiveNomorAkta = metaForm.data.nomor_akta.trim();
    const effectiveTglAkta = metaForm.data.tanggal_akta.trim();
    const effectiveNomorSkAhu = metaForm.data.nomor_sk_ahu.trim();
    const effectiveTglSkAhu = metaForm.data.tanggal_sk_ahu.trim();

    const canAdvance = (() => {
        if (deedCase.is_completed) return false;
        if (
            deedCase.current_stage === 'verifikasi_dokumen' &&
            (effectiveDocStatus !== 'approved' || !hasConfirmedDp)
        ) {
            return false;
        }
        if (
            deedCase.current_stage === 'pengerjaan_akta' &&
            deedCase.draft_status !== 'approved'
        ) {
            return false;
        }
        if (
            deedCase.current_stage === 'penandatanganan_minuta' &&
            (!isNotaris || effectiveTglMinuta === '')
        ) {
            return false;
        }
        if (deedCase.current_stage === 'penerbitan_akta_sk_ahu') {
            if (effectiveNomorAkta === '' || effectiveTglAkta === '') {
                return false;
            }
            if (
                deedCase.is_badan_usaha &&
                (effectiveNomorSkAhu === '' || effectiveTglSkAhu === '')
            ) {
                return false;
            }
        }
        if (deedCase.current_stage === 'pelunasan_biaya' && !isNotaris) {
            return false;
        }
        return true;
    })();

    const blockReason = (() => {
        if (deedCase.is_completed)
            return 'Berkas akta telah selesai sepenuhnya.';
        if (deedCase.current_stage === 'verifikasi_dokumen') {
            if (effectiveDocStatus !== 'approved' && !hasConfirmedDp) {
                return 'Verifikasi dokumen dan pembayaran DP 50% wajib di-ACC oleh Notaris sebelum masuk ke tahap Pengerjaan Akta.';
            }
            if (effectiveDocStatus !== 'approved') {
                return 'Verifikasi dokumen wajib diajukan dan di-ACC oleh Notaris sebelum Pengerjaan Akta.';
            }
            if (!hasConfirmedDp) {
                return 'Verifikasi dokumen sudah di-ACC, namun pembayaran DP 50% wajib di-ACC (Lunas) oleh Notaris terlebih dahulu sebelum Pengerjaan Akta.';
            }
        }
        if (
            deedCase.current_stage === 'pengerjaan_akta' &&
            deedCase.draft_status !== 'approved'
        ) {
            return 'Draf akta wajib di-ACC oleh Notaris sebelum Penandatanganan Minuta Akta.';
        }
        if (deedCase.current_stage === 'penandatanganan_minuta') {
            if (!isNotaris) {
                return 'Pengesahan Penandatanganan Minuta Akta hanya dapat dilakukan oleh Notaris.';
            }
            if (effectiveTglMinuta === '') {
                return 'Tanggal TTD Minuta wajib diisi terlebih dahulu sebelum mengesahkan ke Penerbitan Akta & SK AHU.';
            }
        }
        if (deedCase.current_stage === 'penerbitan_akta_sk_ahu') {
            if (effectiveNomorAkta === '' || effectiveTglAkta === '') {
                return 'Nomor Akta dan Tanggal Akta wajib terisi sebelum melanjutkan ke tahap berikutnya.';
            }
            if (
                deedCase.is_badan_usaha &&
                (effectiveNomorSkAhu === '' || effectiveTglSkAhu === '')
            ) {
                return 'Untuk akta Badan Usaha, Nomor SK AHU dan Tanggal SK AHU wajib diisi sebelum Pengisian Pemilik Manfaat.';
            }
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
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                                <Link href={casesRoute.index()}>
                                    <ArrowLeft className="mr-1 size-4" />{' '}
                                    Kembali
                                </Link>
                            </Button>
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                    Detail Berkas Akta
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                        {deedCase.nomor}
                                    </h1>
                                    <Badge
                                        variant={
                                            deedCase.is_badan_usaha
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {deedCase.is_badan_usaha
                                            ? 'Badan Usaha'
                                            : 'Non-Badan Usaha'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {deedCase.client.company?.nama ||
                                        deedCase.client.nama}{' '}
                                    • {deedCase.jenis_akta}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                            >
                                <Printer className="mr-1.5 size-4" /> Cetak
                                Monitoring
                            </Button>
                            {isNotaris && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setDialogMode('delete')}
                                >
                                    <Trash2 className="mr-1.5 size-4" /> Hapus
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Klien"
                        value={
                            deedCase.client.company?.nama ||
                            deedCase.client.nama
                        }
                        note={deedCase.jenis_akta}
                        valueClassName="text-lg"
                        icon={<User className="size-4" />}
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
                        icon={<Clock className="size-4" />}
                    />
                    <StatCard
                        label="Keuangan"
                        value={`${formatRupiah(totalPaid)} / ${formatRupiah(deedCase.biaya)}`}
                        note={sisa > 0 ? `Sisa ${formatRupiah(sisa)}` : 'Lunas'}
                        valueClassName="text-lg"
                        icon={<Wallet className="size-4" />}
                    />
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-amber-500/20 bg-card/85 p-1.5 shadow-xs">
                    {[
                        { k: 'alur', l: 'Alur 10 Tahap' },
                        {
                            k: 'dok',
                            l: `Dokumen (${deedCase.documents.length})`,
                        },
                        {
                            k: 'uang',
                            l: `Pembayaran (${deedCase.payments.length})`,
                        },
                        { k: 'info', l: 'Metadata & Info Akta' },
                    ].map((t) => (
                        <Button
                            key={t.k}
                            size="sm"
                            variant={activeTab === t.k ? 'default' : 'ghost'}
                            onClick={() =>
                                setActiveTab(t.k as typeof activeTab)
                            }
                        >
                            {t.l}
                        </Button>
                    ))}
                </div>

                {activeTab === 'alur' && (
                    <div className="grid gap-6 lg:grid-cols-5">
                        {/* Timeline 10 Tahap */}
                        <div className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs lg:col-span-3">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-3">
                                <h2 className="text-sm font-semibold text-foreground">
                                    Timeline Proses Akta (10 Tahapan)
                                </h2>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                    {deedCase.is_completed
                                        ? `${stages.length}/${stages.length} Selesai`
                                        : `Tahap ${currentStageObj?.order ?? 1} / ${stages.length}`}
                                </span>
                            </div>
                            <ol className="space-y-1.5">
                                {stages.map((s, idx) => {
                                    const isDone =
                                        deedCase.is_completed ||
                                        idx < currentIdx;
                                    const isCurrent =
                                        !deedCase.is_completed &&
                                        idx === currentIdx;
                                    const hist = isDone
                                        ? [...deedCase.histories]
                                              .reverse()
                                              .find(
                                                  (h) =>
                                                      h.stage_key === s.key &&
                                                      (h.action ===
                                                          'completed' ||
                                                          h.action ===
                                                              'skipped'),
                                              )
                                        : undefined;
                                    const isSkipped =
                                        isDone && hist?.action === 'skipped';
                                    const hasNext = idx < stages.length - 1;

                                    return (
                                        <li
                                            key={s.key}
                                            className={`flex gap-3.5 rounded-xl px-3 py-2.5 transition-colors ${
                                                isCurrent
                                                    ? 'border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent shadow-xs'
                                                    : 'hover:bg-muted/35'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                                        isDone
                                                            ? isSkipped
                                                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                : 'bg-emerald-600 text-white shadow-xs'
                                                            : isCurrent
                                                              ? 'bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/25'
                                                              : 'border border-border/80 bg-muted/70 text-muted-foreground'
                                                    }`}
                                                >
                                                    {isDone
                                                        ? isSkipped
                                                            ? '↷'
                                                            : '✓'
                                                        : s.order}
                                                </div>
                                                {hasNext && (
                                                    <div
                                                        className={`mt-1.5 w-[2px] flex-1 rounded-full ${
                                                            isDone
                                                                ? isSkipped
                                                                    ? 'bg-slate-300/70 dark:bg-slate-700/70'
                                                                    : 'bg-emerald-500/40 dark:bg-emerald-500/35'
                                                                : isCurrent
                                                                  ? 'bg-amber-500/35'
                                                                  : 'bg-border/70'
                                                        }`}
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 pb-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`text-sm font-semibold ${
                                                            isCurrent
                                                                ? 'text-amber-800 dark:text-amber-300'
                                                                : 'text-foreground'
                                                        }`}
                                                    >
                                                        {s.label}
                                                    </span>
                                                    {isCurrent && (
                                                        <Badge className="border-primary/35 bg-primary/15 text-[10px] font-semibold text-amber-800 hover:bg-primary/15 dark:text-amber-300">
                                                            Sedang Berjalan
                                                        </Badge>
                                                    )}
                                                    {s.requires_notaris && (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-amber-500/25 bg-amber-500/[0.06] text-[10px] font-medium text-amber-800 dark:text-amber-300"
                                                        >
                                                            <ShieldCheck className="mr-1 size-3" />
                                                            ACC Notaris
                                                        </Badge>
                                                    )}
                                                    {s.skippable &&
                                                        !deedCase.is_badan_usaha && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px]"
                                                            >
                                                                Opsional
                                                                (Non-Badan
                                                                Usaha)
                                                            </Badge>
                                                        )}
                                                    {s.key ===
                                                        'pembayaran_dp' &&
                                                        (hasConfirmedDp ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ DP Di-ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : hasPendingDp ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : hasRejectedDp ? (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px]"
                                                            >
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key ===
                                                        'verifikasi_dokumen' &&
                                                        (effectiveDocStatus ===
                                                        'approved' ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Dokumen Di-ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : effectiveDocStatus ===
                                                          'pending_approval' ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : effectiveDocStatus ===
                                                          'rejected' ? (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px]"
                                                            >
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key ===
                                                        'pengerjaan_akta' &&
                                                        (deedCase.draft_status ===
                                                        'approved' ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : deedCase.draft_status ===
                                                          'pending_approval' ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : deedCase.draft_status ===
                                                          'revision_requested' ? (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px]"
                                                            >
                                                                Perlu Revisi
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key ===
                                                        'penandatanganan_minuta' &&
                                                        (isDone &&
                                                        !isSkipped ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : isCurrent ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : null)}
                                                    {s.key ===
                                                        'pelunasan_biaya' &&
                                                        (deedCase.is_completed ||
                                                        deedCase.payments.some(
                                                            (p) =>
                                                                p.payment_type ===
                                                                    'pelunasan' &&
                                                                p.status ===
                                                                    'lunas',
                                                        ) ? (
                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                ✓ Sudah di-ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) =>
                                                                  p.payment_type ===
                                                                      'pelunasan' &&
                                                                  p.status ===
                                                                      'menunggu',
                                                          ) ? (
                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Menunggu ACC
                                                                Notaris
                                                            </Badge>
                                                        ) : deedCase.payments.some(
                                                              (p) =>
                                                                  p.payment_type ===
                                                                      'pelunasan' &&
                                                                  p.status ===
                                                                      'ditolak',
                                                          ) ? (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px]"
                                                            >
                                                                Ditolak Notaris
                                                            </Badge>
                                                        ) : null)}
                                                </div>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {s.description}
                                                </p>
                                                {isDone && (
                                                    <div
                                                        className={`mt-2 inline-flex flex-wrap items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                                                            isSkipped
                                                                ? 'border-slate-300/60 bg-slate-100/80 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300'
                                                                : 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {hist ? (
                                                            <>
                                                                {isSkipped
                                                                    ? '↷ Dilewati: '
                                                                    : '✓ '}
                                                                {formatDateTime(
                                                                    hist.created_at,
                                                                )}{' '}
                                                                oleh{' '}
                                                                {hist.actor
                                                                    ?.name ||
                                                                    '-'}
                                                                {hist.notes
                                                                    ? ` — ${hist.notes}`
                                                                    : ''}
                                                            </>
                                                        ) : (
                                                            '✓ Tahap selesai'
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* Panel Aksi Tahap Saat Ini */}
                        <div className="space-y-4 lg:col-span-2">
                            <div className="space-y-4 rounded-2xl border border-amber-500/25 bg-card p-5 shadow-xs lg:sticky lg:top-20">
                                <div className="border-b border-amber-500/15 pb-3">
                                    <div className="text-[11px] font-semibold tracking-[0.18em] text-amber-700 uppercase dark:text-amber-400/90">
                                        Kontrol Tahapan
                                    </div>
                                    <div className="mt-1 font-serif text-lg font-bold tracking-tight text-foreground">
                                        {deedCase.is_completed
                                            ? 'Berkas Selesai & Lunas'
                                            : `${currentStageObj?.order}. ${currentStageObj?.label}`}
                                    </div>
                                </div>

                                {/* Sub-alur Verifikasi Dokumen pada Tahap 3 */}
                                {deedCase.current_stage ===
                                    'verifikasi_dokumen' &&
                                    !deedCase.is_completed && (
                                        <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-xs">
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold">
                                                    Status Persetujuan
                                                    Verifikasi Dokumen
                                                </div>
                                                <div className="text-xs">
                                                    {effectiveDocStatus ===
                                                        'approved' && (
                                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                            ✓ Disetujui (ACC)
                                                            oleh{' '}
                                                            {
                                                                latestDocVerifierName
                                                            }
                                                            {deedCase.doc_approval_notes
                                                                ? ` — ${deedCase.doc_approval_notes}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                    {effectiveDocStatus ===
                                                        'pending_approval' && (
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                                            Menunggu persetujuan
                                                            Notaris
                                                        </span>
                                                    )}
                                                    {effectiveDocStatus ===
                                                        'rejected' && (
                                                        <span className="font-medium text-destructive">
                                                            Ditolak Notaris:{' '}
                                                            {deedCase.doc_approval_notes ||
                                                                'Periksa kembali dokumen'}
                                                        </span>
                                                    )}
                                                    {effectiveDocStatus ===
                                                        'none' && (
                                                        <span className="text-muted-foreground">
                                                            {deedCase.documents
                                                                .length > 0
                                                                ? 'Dokumen dari Data Klien siap diajukan ke Notaris.'
                                                                : 'Belum ada dokumen terlampir.'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {!isNotaris &&
                                                        deedCase.documents
                                                            .length > 0 &&
                                                        (effectiveDocStatus ===
                                                            'none' ||
                                                            effectiveDocStatus ===
                                                                'rejected') && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        casesRoute.requestDocApproval(
                                                                            deedCase.id,
                                                                        ).url,
                                                                        {},
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                {effectiveDocStatus ===
                                                                'rejected'
                                                                    ? 'Ajukan Ulang Persetujuan ke Notaris'
                                                                    : 'Ajukan Persetujuan ke Notaris'}
                                                            </Button>
                                                        )}
                                                    {isNotaris &&
                                                        effectiveDocStatus !==
                                                            'approved' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.post(
                                                                            casesRoute.approveDoc(
                                                                                deedCase.id,
                                                                            )
                                                                                .url,
                                                                            {},
                                                                            {
                                                                                preserveScroll: true,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Check className="mr-1 size-3.5" />{' '}
                                                                    ACC
                                                                    Verifikasi
                                                                    Dokumen
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setDialogMode(
                                                                            'reject_doc',
                                                                        )
                                                                    }
                                                                >
                                                                    Tolak dengan
                                                                    Catatan
                                                                </Button>
                                                            </>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Preview Data Dokumen yang Sudah Diisi di Data Klien */}
                                            <div className="space-y-2 border-t pt-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs font-semibold">
                                                        Preview Data Dokumen
                                                        Klien
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                    >
                                                        {
                                                            deedCase.documents
                                                                .length
                                                        }{' '}
                                                        berkas
                                                    </Badge>
                                                </div>

                                                {deedCase.documents.length ===
                                                0 ? (
                                                    <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                                                        Belum ada dokumen dari
                                                        Data Klien. Unggah
                                                        berkas di bawah ini.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {deedCase.documents.map(
                                                            (d) => {
                                                                const docApproved =
                                                                    d.is_verified ||
                                                                    effectiveDocStatus ===
                                                                        'approved';
                                                                const isImage =
                                                                    Boolean(
                                                                        d.file_path &&
                                                                        d.mime_type?.startsWith(
                                                                            'image/',
                                                                        ),
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={
                                                                            d.id
                                                                        }
                                                                        className="flex flex-col gap-2 rounded-lg border bg-card/80 p-2.5 text-xs"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2.5">
                                                                            <div className="flex min-w-0 items-start gap-2.5">
                                                                                {isImage &&
                                                                                d.file_path ? (
                                                                                    <a
                                                                                        href={
                                                                                            documentsRoute.download(
                                                                                                d.id,
                                                                                            )
                                                                                                .url
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="shrink-0 overflow-hidden rounded-md border bg-muted"
                                                                                    >
                                                                                        <img
                                                                                            src={
                                                                                                documentsRoute.download(
                                                                                                    d.id,
                                                                                                )
                                                                                                    .url
                                                                                            }
                                                                                            alt={
                                                                                                d.nama
                                                                                            }
                                                                                            className="size-11 object-cover"
                                                                                        />
                                                                                    </a>
                                                                                ) : (
                                                                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground">
                                                                                        <FileText className="size-4" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0 space-y-0.5">
                                                                                    <div className="truncate font-semibold text-foreground">
                                                                                        {
                                                                                            d.nama
                                                                                        }
                                                                                    </div>
                                                                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                                                                                            {
                                                                                                d.kategori
                                                                                            }
                                                                                        </span>
                                                                                        <span>
                                                                                            •{' '}
                                                                                            {d.nomor_dokumen ||
                                                                                                'Tanpa nomor'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {d.file_name && (
                                                                                        <div className="truncate text-[11px] text-muted-foreground">
                                                                                            {
                                                                                                d.file_name
                                                                                            }
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                                                {docApproved ? (
                                                                                    <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                                        ✓
                                                                                        Di-ACC
                                                                                    </Badge>
                                                                                ) : d.is_rejected ? (
                                                                                    <Badge
                                                                                        variant="destructive"
                                                                                        className="text-[10px]"
                                                                                    >
                                                                                        Ditolak
                                                                                    </Badge>
                                                                                ) : effectiveDocStatus ===
                                                                                  'pending_approval' ? (
                                                                                    <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                                        Menunggu
                                                                                        ACC
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="text-[10px]"
                                                                                    >
                                                                                        Menunggu
                                                                                        Pengajuan
                                                                                    </Badge>
                                                                                )}
                                                                                {d.file_path && (
                                                                                    <Button
                                                                                        asChild
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        className="h-7 px-2 text-[11px]"
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
                                                                                            <Eye className="mr-1 size-3" />
                                                                                            Lihat
                                                                                            File
                                                                                        </a>
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {d.catatan_notaris && (
                                                                            <div className="rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                                                                                Catatan
                                                                                Notaris:{' '}
                                                                                {
                                                                                    d.catatan_notaris
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {!isNotaris &&
                                                effectiveDocStatus !==
                                                    'approved' &&
                                                (deedCase.documents.length ===
                                                    0 ||
                                                effectiveDocStatus ===
                                                    'rejected' ||
                                                showExtraDocUpload ? (
                                                    <form
                                                        onSubmit={(e) =>
                                                            handleStageDocSubmit(
                                                                e,
                                                                'doc',
                                                            )
                                                        }
                                                        className="space-y-2.5 border-t pt-2.5"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-xs font-semibold">
                                                                Tambah /
                                                                Lengkapi Dokumen
                                                                Susulan
                                                            </div>
                                                            {deedCase.documents
                                                                .length > 0 &&
                                                                effectiveDocStatus !==
                                                                    'rejected' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setShowExtraDocUpload(
                                                                                false,
                                                                            )
                                                                        }
                                                                        className="text-[11px] text-muted-foreground underline hover:text-foreground"
                                                                    >
                                                                        Tutup
                                                                    </button>
                                                                )}
                                                        </div>
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">
                                                                    Kategori
                                                                </Label>
                                                                <select
                                                                    className="flex h-9 w-full rounded-xl border border-input bg-background/85 px-2.5 text-xs text-foreground shadow-xs transition-[color,box-shadow,border-color] focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                                    value={
                                                                        stageDocForm
                                                                            .data
                                                                            .kategori
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        stageDocForm.setData(
                                                                            'kategori',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        effectiveDocStatus ===
                                                                        'pending_approval'
                                                                    }
                                                                >
                                                                    {notarisConfig.kategoriDokumen.map(
                                                                        (k) => (
                                                                            <option
                                                                                key={
                                                                                    k
                                                                                }
                                                                                value={
                                                                                    k
                                                                                }
                                                                            >
                                                                                {
                                                                                    k
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">
                                                                    Nomor
                                                                    Dokumen
                                                                    (Opsional)
                                                                </Label>
                                                                <Input
                                                                    value={
                                                                        stageDocForm
                                                                            .data
                                                                            .nomor_dokumen
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        stageDocForm.setData(
                                                                            'nomor_dokumen',
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        effectiveDocStatus ===
                                                                        'pending_approval'
                                                                    }
                                                                    placeholder="Nomor KTP/NPWP/dll"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Nama Dokumen
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    stageDocForm
                                                                        .data
                                                                        .nama
                                                                }
                                                                onChange={(e) =>
                                                                    stageDocForm.setData(
                                                                        'nama',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    effectiveDocStatus ===
                                                                    'pending_approval'
                                                                }
                                                                placeholder="Misal: KTP Direktur / NPWP Perusahaan"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Unggah File
                                                                (Maks 2 MB)
                                                            </Label>
                                                            <Input
                                                                type="file"
                                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                                disabled={
                                                                    effectiveDocStatus ===
                                                                    'pending_approval'
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const f =
                                                                        e.target
                                                                            .files?.[0] ??
                                                                        null;
                                                                    if (
                                                                        f &&
                                                                        f.size >
                                                                            maxBytes
                                                                    ) {
                                                                        setStageFileError(
                                                                            `Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`,
                                                                        );
                                                                        stageDocForm.setData(
                                                                            'file',
                                                                            null,
                                                                        );
                                                                        return;
                                                                    }
                                                                    setStageFileError(
                                                                        null,
                                                                    );
                                                                    stageDocForm.setData(
                                                                        'file',
                                                                        f,
                                                                    );
                                                                }}
                                                            />
                                                            <InputError
                                                                message={
                                                                    stageFileError ??
                                                                    stageDocForm
                                                                        .errors
                                                                        .file
                                                                }
                                                            />
                                                        </div>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            className="w-full"
                                                            disabled={
                                                                stageDocForm.processing ||
                                                                Boolean(
                                                                    stageFileError,
                                                                ) ||
                                                                effectiveDocStatus ===
                                                                    'pending_approval'
                                                            }
                                                        >
                                                            <FileUp className="mr-1.5 size-3.5" />
                                                            {stageDocForm.processing
                                                                ? 'Mengunggah…'
                                                                : effectiveDocStatus ===
                                                                    'pending_approval'
                                                                  ? 'Menunggu ACC Notaris…'
                                                                  : 'Simpan & Ajukan Persetujuan ke Notaris'}
                                                        </Button>
                                                    </form>
                                                ) : (
                                                    effectiveDocStatus !==
                                                        'pending_approval' && (
                                                        <div className="border-t pt-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full text-xs"
                                                                onClick={() =>
                                                                    setShowExtraDocUpload(
                                                                        true,
                                                                    )
                                                                }
                                                            >
                                                                <Plus className="mr-1 size-3.5" />
                                                                Tambah Dokumen
                                                                Susulan
                                                                (Opsional)
                                                            </Button>
                                                        </div>
                                                    )
                                                ))}
                                        </div>
                                    )}

                                {/* Sub-alur Draf pada Tahap 4 (Pengerjaan Akta) */}
                                {deedCase.current_stage === 'pengerjaan_akta' &&
                                    !deedCase.is_completed && (
                                        <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-xs">
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold">
                                                    Status Persetujuan Draf Akta
                                                </div>
                                                <div className="text-xs">
                                                    {deedCase.draft_status ===
                                                        'approved' && (
                                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                            ✓ Disetujui oleh{' '}
                                                            {
                                                                deedCase
                                                                    .draft_approver
                                                                    ?.name
                                                            }
                                                        </span>
                                                    )}
                                                    {deedCase.draft_status ===
                                                        'pending_approval' && (
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                                            Menunggu persetujuan
                                                            Notaris
                                                        </span>
                                                    )}
                                                    {deedCase.draft_status ===
                                                        'revision_requested' && (
                                                        <div className="space-y-1">
                                                            <span className="font-medium text-destructive">
                                                                Perlu revisi
                                                                sesuai catatan
                                                                Notaris
                                                            </span>
                                                            {latestDraftRevisionNote && (
                                                                <div className="rounded-md border border-destructive/35 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                                                                    <strong>
                                                                        Catatan
                                                                        Notaris:
                                                                    </strong>{' '}
                                                                    {
                                                                        latestDraftRevisionNote
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {deedCase.draft_status ===
                                                        'none' && (
                                                        <span className="text-muted-foreground">
                                                            {draftDocs.length >
                                                            0
                                                                ? 'Draf sudah diunggah — siap diajukan ke Notaris.'
                                                                : 'Belum ada file draf akta yang diunggah.'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {!isNotaris &&
                                                        (deedCase.draft_status ===
                                                            'none' ||
                                                            deedCase.draft_status ===
                                                                'revision_requested') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={
                                                                    draftDocs.length ===
                                                                    0
                                                                }
                                                                onClick={() =>
                                                                    router.post(
                                                                        casesRoute.requestDraft(
                                                                            deedCase.id,
                                                                        ).url,
                                                                        {},
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                Ajukan ACC Draf
                                                                ke Notaris
                                                            </Button>
                                                        )}
                                                    {isNotaris &&
                                                        deedCase.draft_status !==
                                                            'approved' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={
                                                                        draftDocs.length ===
                                                                        0
                                                                    }
                                                                    onClick={() =>
                                                                        router.post(
                                                                            casesRoute.approveDraft(
                                                                                deedCase.id,
                                                                            )
                                                                                .url,
                                                                            {},
                                                                            {
                                                                                preserveScroll: true,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Check className="mr-1 size-3.5" />{' '}
                                                                    Setujui Draf
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setDialogMode(
                                                                            'revision',
                                                                        )
                                                                    }
                                                                >
                                                                    Minta Revisi
                                                                </Button>
                                                            </>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Preview Daftar Draf Akta */}
                                            <div className="space-y-2 border-t pt-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs font-semibold">
                                                        File Draf Akta Terunggah
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                    >
                                                        {draftDocs.length} file
                                                    </Badge>
                                                </div>
                                                {draftDocs.length === 0 ? (
                                                    <p className="rounded-md border border-dashed px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                                                        Unggah file draf akta
                                                        (PDF, Word, ZIP, atau
                                                        gambar) di form bawah
                                                        untuk diajukan ke
                                                        Notaris.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {draftDocs.map((d) => {
                                                            const canInlinePreview =
                                                                Boolean(
                                                                    d.file_path &&
                                                                    (d.mime_type?.startsWith(
                                                                        'image/',
                                                                    ) ||
                                                                        d.mime_type ===
                                                                            'application/pdf'),
                                                                );
                                                            return (
                                                                <div
                                                                    key={d.id}
                                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/80 p-2 text-xs"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="truncate font-semibold">
                                                                            {
                                                                                d.nama
                                                                            }
                                                                        </div>
                                                                        <div className="truncate text-[11px] text-muted-foreground">
                                                                            {d.file_name ||
                                                                                d.kategori}{' '}
                                                                            •{' '}
                                                                            {formatDate(
                                                                                d.created_at,
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                                        {deedCase.draft_status ===
                                                                            'approved' ||
                                                                        d.is_verified ? (
                                                                            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                                ✓
                                                                                Di-ACC
                                                                            </Badge>
                                                                        ) : deedCase.draft_status ===
                                                                          'pending_approval' ? (
                                                                            <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                                Menunggu
                                                                                ACC
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px]"
                                                                            >
                                                                                Perlu
                                                                                Revisi
                                                                            </Badge>
                                                                        )}
                                                                        {d.file_path &&
                                                                            canInlinePreview && (
                                                                                <Button
                                                                                    asChild
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-7 px-2 text-[11px]"
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
                                                                                        <Eye className="mr-1 size-3" />
                                                                                        Lihat
                                                                                    </a>
                                                                                </Button>
                                                                            )}
                                                                        {d.file_path && (
                                                                            <Button
                                                                                asChild
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 px-2 text-[11px]"
                                                                            >
                                                                                <a
                                                                                    href={
                                                                                        documentsRoute.download(
                                                                                            d.id,
                                                                                            {
                                                                                                query: {
                                                                                                    download: 1,
                                                                                                },
                                                                                            },
                                                                                        )
                                                                                            .url
                                                                                    }
                                                                                    download
                                                                                >
                                                                                    <Download className="mr-1 size-3" />
                                                                                    Unduh
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {!isNotaris &&
                                                deedCase.draft_status !==
                                                    'approved' && (
                                                    <form
                                                        onSubmit={(e) =>
                                                            handleStageDocSubmit(
                                                                e,
                                                                'draft',
                                                            )
                                                        }
                                                        className="space-y-2.5 border-t pt-2.5"
                                                    >
                                                        <div className="text-xs font-semibold">
                                                            Input &amp; Unggah
                                                            Draf Akta
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Nama Draf /
                                                                Dokumen *
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    stageDocForm
                                                                        .data
                                                                        .nama
                                                                }
                                                                onChange={(e) =>
                                                                    stageDocForm.setData(
                                                                        'nama',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    deedCase.draft_status ===
                                                                    'pending_approval'
                                                                }
                                                                placeholder={`Draf ${deedCase.jenis_akta}`}
                                                                required
                                                            />
                                                            <InputError
                                                                message={
                                                                    stageDocForm
                                                                        .errors
                                                                        .nama
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Unggah File Draf
                                                                (PDF, Word, ZIP,
                                                                Gambar • Maks 2
                                                                MB) *
                                                            </Label>
                                                            <Input
                                                                type="file"
                                                                accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.webp"
                                                                disabled={
                                                                    deedCase.draft_status ===
                                                                    'pending_approval'
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const f =
                                                                        e.target
                                                                            .files?.[0] ??
                                                                        null;
                                                                    if (
                                                                        f &&
                                                                        f.size >
                                                                            maxBytes
                                                                    ) {
                                                                        setStageFileError(
                                                                            `Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`,
                                                                        );
                                                                        stageDocForm.setData(
                                                                            'file',
                                                                            null,
                                                                        );
                                                                        return;
                                                                    }
                                                                    setStageFileError(
                                                                        null,
                                                                    );
                                                                    stageDocForm.setData(
                                                                        'file',
                                                                        f,
                                                                    );
                                                                }}
                                                                required={
                                                                    deedCase.draft_status !==
                                                                    'pending_approval'
                                                                }
                                                            />
                                                            <InputError
                                                                message={
                                                                    stageFileError ??
                                                                    stageDocForm
                                                                        .errors
                                                                        .file
                                                                }
                                                            />
                                                        </div>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            className="w-full"
                                                            disabled={
                                                                stageDocForm.processing ||
                                                                Boolean(
                                                                    stageFileError,
                                                                ) ||
                                                                deedCase.draft_status ===
                                                                    'pending_approval'
                                                            }
                                                        >
                                                            <FileUp className="mr-1.5 size-3.5" />
                                                            {stageDocForm.processing
                                                                ? 'Mengunggah…'
                                                                : deedCase.draft_status ===
                                                                    'pending_approval'
                                                                  ? 'Menunggu ACC Notaris…'
                                                                  : 'Simpan & Ajukan ACC Draf ke Notaris'}
                                                        </Button>
                                                    </form>
                                                )}
                                        </div>
                                    )}

                                {/* Input Data Tahapan 5–9 langsung di Kontrol Tahapan */}
                                {!deedCase.is_completed &&
                                    [
                                        'penandatanganan_minuta',
                                        'penerbitan_akta_sk_ahu',
                                        'pemilik_manfaat',
                                        'tbnri',
                                        'oss_nib',
                                    ].includes(deedCase.current_stage) && (
                                        <form
                                            onSubmit={handleStageMetaSubmit}
                                            className="space-y-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-xs"
                                        >
                                            <div className="text-xs font-semibold">
                                                Input Data{' '}
                                                {currentStageObj?.label}
                                            </div>
                                            {deedCase.current_stage ===
                                                'penandatanganan_minuta' && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">
                                                        Tanggal TTD Minuta *
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={
                                                            metaForm.data
                                                                .tanggal_ttd_minuta
                                                        }
                                                        onChange={(e) =>
                                                            metaForm.setData(
                                                                'tanggal_ttd_minuta',
                                                                e.target.value,
                                                            )
                                                        }
                                                        required
                                                    />
                                                </div>
                                            )}
                                            {deedCase.current_stage ===
                                                'penerbitan_akta_sk_ahu' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Nomor Akta *
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .nomor_akta
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'nomor_akta',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Tanggal Akta *
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={
                                                                metaForm.data
                                                                    .tanggal_akta
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'tanggal_akta',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Nomor SK AHU{' '}
                                                            {deedCase.is_badan_usaha
                                                                ? '*'
                                                                : '(Opsional)'}
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .nomor_sk_ahu
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'nomor_sk_ahu',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required={
                                                                deedCase.is_badan_usaha
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Tanggal SK AHU{' '}
                                                            {deedCase.is_badan_usaha
                                                                ? '*'
                                                                : '(Opsional)'}
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={
                                                                metaForm.data
                                                                    .tanggal_sk_ahu
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'tanggal_sk_ahu',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required={
                                                                deedCase.is_badan_usaha
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage ===
                                                'pemilik_manfaat' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Tanggal Pelaporan BO
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={
                                                                metaForm.data
                                                                    .tanggal_pemilik_manfaat
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'tanggal_pemilik_manfaat',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Status Pemilik
                                                            Manfaat
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .status_pemilik_manfaat
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'status_pemilik_manfaat',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Sudah Dilaporkan / Terverifikasi"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage ===
                                                'tbnri' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Nomor TBNRI
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .nomor_tbnri
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'nomor_tbnri',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Tanggal TBNRI
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={
                                                                metaForm.data
                                                                    .tanggal_tbnri
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'tanggal_tbnri',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {deedCase.current_stage ===
                                                'oss_nib' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            NIB Perusahaan
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .nib_perusahaan
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'nib_perusahaan',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            KBLI OSS
                                                        </Label>
                                                        <Input
                                                            value={
                                                                metaForm.data
                                                                    .kbli_oss
                                                            }
                                                            onChange={(e) =>
                                                                metaForm.setData(
                                                                    'kbli_oss',
                                                                    e.target
                                                                        .value,
                                                                )
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
                                                {metaForm.processing
                                                    ? 'Menyimpan…'
                                                    : 'Simpan Data Tahap'}
                                            </Button>
                                        </form>
                                    )}

                                {/* Preview & Upload Opsional Salinan Akta / SK AHU (Tahap 6) */}
                                {!deedCase.is_completed &&
                                    deedCase.current_stage ===
                                        'penerbitan_akta_sk_ahu' && (
                                        <div className="space-y-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs font-semibold">
                                                    Salinan Akta &amp; SK AHU
                                                    (Opsional)
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    {stage6Docs.length} berkas
                                                </Badge>
                                            </div>
                                            {stage6Docs.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {stage6Docs.map((d) => (
                                                        <div
                                                            key={d.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/80 p-2 text-xs"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate font-semibold">
                                                                    {d.nama}
                                                                </div>
                                                                <div className="truncate text-[11px] text-muted-foreground">
                                                                    {d.kategori}
                                                                    {d.nomor_dokumen
                                                                        ? ` • No. ${d.nomor_dokumen}`
                                                                        : ''}
                                                                </div>
                                                            </div>
                                                            {d.file_path && (
                                                                <Button
                                                                    asChild
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-[11px]"
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
                                                                        <Eye className="mr-1 size-3" />
                                                                        Lihat
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {showStage6Upload ? (
                                                <form
                                                    onSubmit={(e) =>
                                                        handleStageDocSubmit(
                                                            e,
                                                            'stage6',
                                                        )
                                                    }
                                                    className="space-y-2 border-t pt-2.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold">
                                                            Unggah Salinan Akta
                                                            / SK AHU
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowStage6Upload(
                                                                    false,
                                                                )
                                                            }
                                                            className="text-[11px] text-muted-foreground underline hover:text-foreground"
                                                        >
                                                            Tutup
                                                        </button>
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Kategori
                                                            </Label>
                                                            <select
                                                                className="flex h-9 w-full rounded-xl border border-input bg-background/85 px-2.5 text-xs text-foreground shadow-xs transition-[color,box-shadow,border-color] focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none"
                                                                value={
                                                                    stageDocForm
                                                                        .data
                                                                        .kategori
                                                                }
                                                                onChange={(e) =>
                                                                    stageDocForm.setData(
                                                                        'kategori',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            >
                                                                <option value="Salinan Akta">
                                                                    Salinan Akta
                                                                </option>
                                                                <option value="SK Kemenkumham / AHU">
                                                                    SK
                                                                    Kemenkumham
                                                                    / AHU
                                                                </option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">
                                                                Nomor Dokumen
                                                                (Opsional)
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    stageDocForm
                                                                        .data
                                                                        .nomor_dokumen
                                                                }
                                                                onChange={(e) =>
                                                                    stageDocForm.setData(
                                                                        'nomor_dokumen',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Nomor Akta / SK AHU"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Nama Dokumen *
                                                        </Label>
                                                        <Input
                                                            value={
                                                                stageDocForm
                                                                    .data.nama
                                                            }
                                                            onChange={(e) =>
                                                                stageDocForm.setData(
                                                                    'nama',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Misal: Salinan Akta Pendirian / SK AHU PT"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">
                                                            Unggah File
                                                            (Opsional • Maks 2
                                                            MB)
                                                        </Label>
                                                        <Input
                                                            type="file"
                                                            accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.webp"
                                                            onChange={(e) => {
                                                                const f =
                                                                    e.target
                                                                        .files?.[0] ??
                                                                    null;
                                                                if (
                                                                    f &&
                                                                    f.size >
                                                                        maxBytes
                                                                ) {
                                                                    setStageFileError(
                                                                        `Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`,
                                                                    );
                                                                    stageDocForm.setData(
                                                                        'file',
                                                                        null,
                                                                    );
                                                                    return;
                                                                }
                                                                setStageFileError(
                                                                    null,
                                                                );
                                                                stageDocForm.setData(
                                                                    'file',
                                                                    f,
                                                                );
                                                            }}
                                                        />
                                                        <InputError
                                                            message={
                                                                stageFileError ??
                                                                stageDocForm
                                                                    .errors.file
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        className="w-full"
                                                        disabled={
                                                            stageDocForm.processing ||
                                                            Boolean(
                                                                stageFileError,
                                                            )
                                                        }
                                                    >
                                                        <FileUp className="mr-1.5 size-3.5" />
                                                        {stageDocForm.processing
                                                            ? 'Menyimpan…'
                                                            : 'Simpan Dokumen Penerbitan'}
                                                    </Button>
                                                </form>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs"
                                                    onClick={() =>
                                                        setShowStage6Upload(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <Plus className="mr-1 size-3.5" />
                                                    Unggah Salinan Akta / SK AHU
                                                    (Opsional)
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                {/* Form Cepat Bukti DP 50% (Tahap 2) atau Pelunasan (Tahap 10) */}
                                {isPaymentStage &&
                                    !deedCase.is_completed &&
                                    (deedCase.current_stage ===
                                        'pembayaran_dp' && hasConfirmedDp ? (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            ✓ Pembayaran DP 50% sudah di-ACC
                                            (Lunas) oleh Notaris. Silakan lanjut
                                            ke tahap berikutnya.
                                        </div>
                                    ) : (
                                        <form
                                            onSubmit={handlePaySubmit}
                                            className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-xs"
                                        >
                                            <div className="text-xs font-semibold">
                                                {deedCase.current_stage ===
                                                'pembayaran_dp'
                                                    ? 'Catat & Unggah Bukti DP 50%'
                                                    : 'Catat & Unggah Bukti Pelunasan'}
                                            </div>
                                            {deedCase.current_stage ===
                                                'pembayaran_dp' &&
                                                hasRejectedDp && (
                                                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
                                                        Bukti pembayaran DP
                                                        sebelumnya ditolak
                                                        Notaris. Unggah ulang
                                                        bukti yang valid.
                                                    </div>
                                                )}
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">
                                                        Nominal (Rp)
                                                    </Label>
                                                    <CurrencyInput
                                                        minAmount={1}
                                                        value={
                                                            payForm.data.jumlah
                                                        }
                                                        onValueChange={(val) =>
                                                            payForm.setData(
                                                                'jumlah',
                                                                val,
                                                            )
                                                        }
                                                        disabled={
                                                            hasPendingStagePayment
                                                        }
                                                        required
                                                    />
                                                    <InputError
                                                        message={
                                                            payForm.errors
                                                                .jumlah
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">
                                                        Metode
                                                    </Label>
                                                    <select
                                                        className="flex h-9 w-full rounded-xl border border-input bg-background/85 px-2.5 text-xs text-foreground shadow-xs transition-[color,box-shadow,border-color] focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={
                                                            payForm.data.metode
                                                        }
                                                        onChange={(e) =>
                                                            payForm.setData(
                                                                'metode',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={
                                                            hasPendingStagePayment
                                                        }
                                                    >
                                                        {[
                                                            'Transfer Bank',
                                                            'Tunai',
                                                            'QRIS',
                                                            'Virtual Account',
                                                        ].map((m) => (
                                                            <option
                                                                key={m}
                                                                value={m}
                                                            >
                                                                {m}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">
                                                    Unggah Bukti Bayar (Maks 2
                                                    MB)
                                                </Label>
                                                <Input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    disabled={
                                                        hasPendingStagePayment
                                                    }
                                                    onChange={(e) => {
                                                        const f =
                                                            e.target
                                                                .files?.[0] ??
                                                            null;
                                                        if (
                                                            f &&
                                                            f.size > maxBytes
                                                        ) {
                                                            setPayFileError(
                                                                `Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`,
                                                            );
                                                            payForm.setData(
                                                                'bukti',
                                                                null,
                                                            );
                                                            return;
                                                        }
                                                        setPayFileError(null);
                                                        payForm.setData(
                                                            'bukti',
                                                            f,
                                                        );
                                                    }}
                                                />
                                                <InputError
                                                    message={
                                                        payFileError ??
                                                        payForm.errors.bukti
                                                    }
                                                />
                                            </div>
                                            {hasPendingStagePayment && (
                                                <div className="rounded-md border border-amber-300 bg-amber-50/80 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                                    Bukti pembayaran sudah
                                                    dikirim dan sedang menunggu
                                                    ACC Notaris.
                                                </div>
                                            )}
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="outline"
                                                className="w-full border-amber-500/35 bg-amber-500/10 font-semibold text-amber-800 hover:border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
                                                disabled={
                                                    payForm.processing ||
                                                    Boolean(payFileError) ||
                                                    hasPendingStagePayment
                                                }
                                            >
                                                <FileUp className="mr-1.5 size-3.5" />
                                                {payForm.processing
                                                    ? 'Mengunggah…'
                                                    : hasPendingStagePayment
                                                      ? 'Menunggu ACC Notaris…'
                                                      : 'Simpan Bukti (Menunggu ACC Notaris)'}
                                            </Button>
                                        </form>
                                    ))}

                                {blockReason && (
                                    <div className="rounded-xl border border-amber-500/30 bg-amber-50/85 p-3 text-xs font-medium text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
                                        {blockReason}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 border-t border-amber-500/15 pt-3">
                                    {!deedCase.is_completed && canAdvance && (
                                        <Button
                                            onClick={() =>
                                                setDialogMode('advance')
                                            }
                                        >
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
                                                onClick={() =>
                                                    setDialogMode('skip')
                                                }
                                            >
                                                <SkipForward className="mr-1.5 size-4" />
                                                Lewati Tahap (Non-Badan Usaha)
                                            </Button>
                                        )}

                                    {currentIdx > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setDialogMode('revert')
                                            }
                                        >
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
                    <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">
                                Dokumen Terkait Berkas
                            </h2>
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={clientsRoute.edit(deedCase.client_id)}
                                >
                                    Tambah / Kelola Berkas Klien
                                </Link>
                            </Button>
                        </div>
                        {deedCase.documents.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada dokumen yang dikaitkan ke berkas ini.
                            </p>
                        ) : (
                            <div className="divide-y divide-border/70">
                                {deedCase.documents.map((d) => (
                                    <div
                                        key={d.id}
                                        className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl px-2.5 py-3 text-sm transition-colors hover:bg-amber-500/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                <FileText className="size-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {d.nama}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {d.kategori} •{' '}
                                                    {d.nomor_dokumen ||
                                                        'Tanpa nomor'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                                    : 'Belum Diverifikasi'}
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
                                                            ).url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
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
                    <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">
                                Riwayat Termin Pembayaran
                            </h2>
                            <Button asChild size="sm" variant="outline">
                                <Link href={paymentsRoute.index()}>
                                    Buka Halaman Keuangan
                                </Link>
                            </Button>
                        </div>
                        {deedCase.payments.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Belum ada termin pembayaran pada berkas ini.
                            </p>
                        ) : (
                            <div className="divide-y divide-border/70">
                                {deedCase.payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl px-2.5 py-3 text-sm transition-colors hover:bg-amber-500/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                <Wallet className="size-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">
                                                    {p.no_inv} —{' '}
                                                    {p.keterangan ||
                                                        `Termin ${p.termin_ke}`}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatRupiah(p.jumlah)} •{' '}
                                                    {p.metode}
                                                    {p.tanggal_bayar
                                                        ? ` • Bayar ${formatDate(p.tanggal_bayar)}`
                                                        : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PaymentBadge status={p.status} />
                                            {p.bukti_path && (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={
                                                            paymentsRoute.proof(
                                                                p.id,
                                                            ).url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Bukti
                                                    </a>
                                                </Button>
                                            )}
                                            {isNotaris &&
                                                p.status === 'menunggu' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            router.post(
                                                                paymentsRoute.confirm(
                                                                    p.id,
                                                                ).url,
                                                                {},
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            )
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
                            metaForm.put(casesRoute.update(deedCase.id).url, {
                                preserveScroll: true,
                            });
                        }}
                        className="space-y-4 rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs"
                    >
                        <h2 className="text-sm font-semibold">
                            Metadata Legalitas & Informasi Berkas
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <Label>Biaya (Rp)</Label>
                                <CurrencyInput
                                    minAmount={1}
                                    value={metaForm.data.biaya}
                                    onValueChange={(val) =>
                                        metaForm.setData('biaya', val)
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Penanggung Jawab</Label>
                                <Input
                                    value={metaForm.data.penanggung_jawab}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'penanggung_jawab',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Target Selesai</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.target_selesai}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'target_selesai',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor Akta</Label>
                                <Input
                                    value={metaForm.data.nomor_akta}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'nomor_akta',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal Akta</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_akta}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'tanggal_akta',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal TTD Minuta</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_ttd_minuta}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'tanggal_ttd_minuta',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor SK AHU</Label>
                                <Input
                                    value={metaForm.data.nomor_sk_ahu}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'nomor_sk_ahu',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal SK AHU</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_sk_ahu}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'tanggal_sk_ahu',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal Pelaporan BO</Label>
                                <Input
                                    type="date"
                                    value={
                                        metaForm.data.tanggal_pemilik_manfaat
                                    }
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'tanggal_pemilik_manfaat',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Status Pemilik Manfaat (BO)</Label>
                                <Input
                                    value={metaForm.data.status_pemilik_manfaat}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'status_pemilik_manfaat',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Sudah Dilaporkan / Proses"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor TBNRI</Label>
                                <Input
                                    value={metaForm.data.nomor_tbnri}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'nomor_tbnri',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal TBNRI</Label>
                                <Input
                                    type="date"
                                    value={metaForm.data.tanggal_tbnri}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'tanggal_tbnri',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>NIB Perusahaan (OSS)</Label>
                                <Input
                                    value={metaForm.data.nib_perusahaan}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'nib_perusahaan',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>KBLI OSS</Label>
                                <Input
                                    value={metaForm.data.kbli_oss}
                                    onChange={(e) =>
                                        metaForm.setData(
                                            'kbli_oss',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={metaForm.processing}
                            >
                                {metaForm.processing
                                    ? 'Menyimpan…'
                                    : 'Simpan Metadata Akta'}
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
                confirmLabel={
                    dialogMode === 'delete'
                        ? 'Hapus Permanen'
                        : dialogMode === 'reject_doc'
                          ? 'Tolak dengan Catatan'
                          : 'Konfirmasi'
                }
                confirmVariant={
                    dialogMode === 'delete' ||
                    dialogMode === 'revision' ||
                    dialogMode === 'reject_doc'
                        ? 'destructive'
                        : 'default'
                }
                showNote={dialogMode !== 'delete'}
                requireNote={
                    dialogMode === 'skip' ||
                    dialogMode === 'revert' ||
                    dialogMode === 'revision' ||
                    dialogMode === 'reject_doc'
                }
                processing={actionBusy}
                onConfirm={handleDialogConfirm}
            />
        </AppLayout>
    );
}
