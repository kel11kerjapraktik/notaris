import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Clock,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Pencil,
    Wallet,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PaymentBadge } from '@/components/notaris/payment-badge';
import { StageBadge } from '@/components/notaris/stage-badge';
import { StatCard } from '@/components/notaris/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatDate, formatRupiah } from '@/lib/format';
import approvalsRoute from '@/routes/approvals';
import casesRoute from '@/routes/cases';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import paymentsRoute from '@/routes/payments';
import type {
    BreadcrumbItem,
    DocumentItem,
    NotarisConfig,
    PaymentItem,
} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Persetujuan', href: approvalsRoute.index() },
];

type StaffDocumentItem = DocumentItem & {
    updated_at?: string;
    deed_case?: {
        id: number;
        nomor: string;
        jenis_akta: string;
        current_stage?: string;
        current_stage_order?: number;
        current_stage_label?: string;
        is_completed?: boolean;
    } | null;
};

type CaseDocPreviewItem = {
    id: number;
    kategori: string;
    nama: string;
    nomor_dokumen: string | null;
    tanggal_dokumen: string | null;
    file_path: string | null;
    file_name: string | null;
    mime_type: string | null;
    is_verified: boolean;
    is_rejected: boolean;
    catatan_notaris: string | null;
};

type StaffDraftItem = {
    id: number;
    client_id: number;
    nomor: string;
    jenis_akta: string;
    client_name: string;
    draft_status: string;
    draft_approver_name: string | null;
    draft_approved_at: string | null;
    latest_note: string | null;
    current_stage_order: number;
    current_stage_label: string;
    documents?: CaseDocPreviewItem[];
    updated_at?: string | null;
};

type StaffDocApprovalItem = {
    id: number;
    client_id: number;
    nomor: string;
    jenis_akta: string;
    client_name: string;
    documents_count: number;
    doc_approval_status: string;
    doc_approval_notes: string | null;
    current_stage_order: number;
    current_stage_label: string;
    documents?: CaseDocPreviewItem[];
};

type StaffReviewCaseData = {
    id: number;
    client_id: number;
    nomor: string;
    jenis_akta: string;
    client_name: string;
    current_stage_label: string;
    note?: string | null;
    documents: CaseDocPreviewItem[];
};

type PreviewPayload = {
    title: string;
    url: string;
    downloadUrl: string;
    mime: string | null;
};

export default function StaffApprovals({
    payments,
    documents,
    drafts,
    docApprovals = [],
    clients,
    cases,
}: {
    payments: PaymentItem[];
    documents: StaffDocumentItem[];
    drafts: StaffDraftItem[];
    docApprovals?: StaffDocApprovalItem[];
    clients: { id: number; label: string }[];
    cases: { id: number; client_id: number; label: string }[];
}) {
    const { notarisConfig } = usePage<{ notarisConfig: NotarisConfig }>().props;

    const [preview, setPreview] = useState<PreviewPayload | null>(null);
    const [reviewCase, setReviewCase] = useState<StaffReviewCaseData | null>(
        null,
    );
    const [inlineDoc, setInlineDoc] = useState<CaseDocPreviewItem | null>(null);
    const [editingDoc, setEditingDoc] = useState<StaffDocumentItem | null>(
        null,
    );
    const [editingPay, setEditingPay] = useState<PaymentItem | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [cancelTarget, setCancelTarget] = useState<{
        kind: 'payment' | 'document' | 'doc_approval' | 'draft';
        id: number;
        label: string;
    } | null>(null);
    const [cancelBusy, setCancelBusy] = useState(false);

    const handleConfirmCancel = () => {
        if (!cancelTarget) return;
        setCancelBusy(true);
        router.post(
            approvalsRoute.cancel().url,
            { kind: cancelTarget.kind, id: cancelTarget.id },
            {
                preserveScroll: true,
                onFinish: () => {
                    setCancelBusy(false);
                    setCancelTarget(null);
                },
            },
        );
    };

    const docForm = useForm<{
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
        client_id: '',
        deed_case_id: '',
        kategori: 'KTP',
        nama: '',
        nomor_dokumen: '',
        tanggal_dokumen: '',
        keterangan: '',
        is_complete_checked: false,
        file: null,
    });

    const payForm = useForm<{
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

    const openEditDoc = (doc: StaffDocumentItem) => {
        setFileError(null);
        setEditingDoc(doc);
        docForm.setData({
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
    };

    const openEditPay = (pay: PaymentItem) => {
        setFileError(null);
        setEditingPay(pay);
        payForm.setData({
            tanggal_bayar:
                pay.tanggal_bayar ?? new Date().toISOString().slice(0, 10),
            metode: pay.metode ?? 'Transfer Bank',
            no_referensi: pay.no_referensi ?? '',
            bukti: null,
        });
    };

    const handleDocSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoc || fileError) return;
        router.post(
            documentsRoute.update(editingDoc.id).url,
            { _method: 'put', ...docForm.data },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setEditingDoc(null),
            },
        );
    };

    const handlePaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPay || fileError) return;
        payForm.post(paymentsRoute.submitProof(editingPay.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setEditingPay(null),
        });
    };

    const [queueFilter, setQueueFilter] = useState<
        'all' | 'pending' | 'attention'
    >('all');

    const attentionCount =
        payments.filter((p) => p.status === 'ditolak').length +
        documents.filter((d) => d.is_rejected).length +
        docApprovals.filter((da) => da.doc_approval_status === 'rejected')
            .length +
        drafts.filter((dr) => dr.draft_status === 'revision_requested').length;

    const totalItems =
        payments.length +
        documents.length +
        drafts.length +
        docApprovals.length;
    const waitingCount = Math.max(0, totalItems - attentionCount);

    const visiblePayments = payments.filter((p) =>
        queueFilter === 'all'
            ? true
            : queueFilter === 'attention'
              ? p.status === 'ditolak'
              : p.status !== 'ditolak',
    );
    const visibleDocuments = documents.filter((d) =>
        queueFilter === 'all'
            ? true
            : queueFilter === 'attention'
              ? d.is_rejected
              : !d.is_rejected,
    );
    const visibleDocApprovals = docApprovals.filter((da) =>
        queueFilter === 'all'
            ? true
            : queueFilter === 'attention'
              ? da.doc_approval_status === 'rejected'
              : da.doc_approval_status !== 'rejected',
    );
    const visibleDrafts = drafts.filter((dr) =>
        queueFilter === 'all'
            ? true
            : queueFilter === 'attention'
              ? dr.draft_status === 'revision_requested'
              : dr.draft_status !== 'revision_requested',
    );
    const visibleCount =
        visiblePayments.length +
        visibleDocuments.length +
        visibleDocApprovals.length +
        visibleDrafts.length;

    const selectCls =
        'flex h-9 w-full rounded-xl border border-input bg-background/85 px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Persetujuan — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-sm dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                Antrean Persetujuan Staf
                            </p>
                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                Persetujuan
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Semua permintaan persetujuan Notaris yang sedang
                                menunggu (hold), ditolak, maupun perlu direvisi.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-500/20 bg-card/85 p-1.5 shadow-xs">
                            <Button
                                size="sm"
                                variant={
                                    queueFilter === 'all' ? 'default' : 'ghost'
                                }
                                onClick={() => setQueueFilter('all')}
                            >
                                Semua
                                <Badge variant="secondary" className="ml-2">
                                    {totalItems}
                                </Badge>
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    queueFilter === 'pending'
                                        ? 'default'
                                        : 'ghost'
                                }
                                onClick={() => setQueueFilter('pending')}
                            >
                                <Clock className="mr-1.5 size-3.5" />
                                Menunggu ACC
                                <Badge variant="secondary" className="ml-2">
                                    {waitingCount}
                                </Badge>
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    queueFilter === 'attention'
                                        ? 'default'
                                        : 'ghost'
                                }
                                onClick={() => setQueueFilter('attention')}
                            >
                                <AlertCircle className="mr-1.5 size-3.5" />
                                Ditolak / Revisi
                                <Badge variant="secondary" className="ml-2">
                                    {attentionCount}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Total Dalam Antrean"
                        value={totalItems}
                        valueClassName="text-amber-600 dark:text-amber-400"
                        icon={<FileCheck2 className="size-4" />}
                    />
                    <StatCard
                        label="Menunggu ACC Notaris"
                        value={waitingCount}
                        note="Hold / sedang ditinjau"
                        icon={<Clock className="size-4" />}
                    />
                    <StatCard
                        label="Ditolak / Perlu Revisi"
                        value={attentionCount}
                        note="Butuh tindak lanjut staf"
                        valueClassName={
                            attentionCount > 0 ? 'text-destructive' : ''
                        }
                        icon={<AlertCircle className="size-4" />}
                    />
                </div>

                {/* Satu daftar datar tanpa pengelompokan */}
                <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                    {visibleCount === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {totalItems === 0
                                ? 'Tidak ada permintaan persetujuan yang menunggu, ditolak, atau perlu direvisi.'
                                : 'Tidak ada item pada kategori filter ini.'}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/70">
                            {visiblePayments.map((p) => (
                                <div
                                    key={`pay-${p.id}`}
                                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                            <Wallet className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="font-semibold text-foreground">
                                                Pembayaran {p.no_inv} —{' '}
                                                <span className="tabular-nums">
                                                    {formatRupiah(p.jumlah)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {p.deed_case?.nomor || '-'} •{' '}
                                                {p.deed_case?.client?.company
                                                    ?.nama ||
                                                    p.deed_case?.client?.nama ||
                                                    '-'}{' '}
                                                •{' '}
                                                {p.keterangan ||
                                                    `Termin ${p.termin_ke}`}
                                            </div>
                                            {p.catatan_notaris && (
                                                <div className="mt-1.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-1.5 text-xs text-destructive">
                                                    <strong>
                                                        Catatan Notaris:
                                                    </strong>{' '}
                                                    {p.catatan_notaris}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <PaymentBadge status={p.status} />
                                        {p.bukti_path && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setPreview({
                                                        title: `Bukti ${p.no_inv}`,
                                                        url: paymentsRoute.proof(
                                                            p.id,
                                                        ).url,
                                                        downloadUrl:
                                                            paymentsRoute.proof(
                                                                p.id,
                                                                {
                                                                    query: {
                                                                        download: 1,
                                                                    },
                                                                },
                                                            ).url,
                                                        mime: p.bukti_mime,
                                                    })
                                                }
                                            >
                                                <Eye className="mr-1 size-3.5" />{' '}
                                                Lihat File
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditPay(p)}
                                        >
                                            <Pencil className="mr-1 size-3.5" />{' '}
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setCancelTarget({
                                                    kind: 'payment',
                                                    id: p.id,
                                                    label: `Pembayaran ${p.no_inv}`,
                                                })
                                            }
                                        >
                                            <X className="mr-1 size-3.5" />{' '}
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {visibleDocuments.map((d) => (
                                <div
                                    key={`doc-${d.id}`}
                                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                            <FileText className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="font-semibold text-foreground">
                                                {d.nama}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {d.kategori} •{' '}
                                                {d.client?.company?.nama ||
                                                    d.client?.nama}
                                                {d.nomor_dokumen
                                                    ? ` • No. ${d.nomor_dokumen}`
                                                    : ''}{' '}
                                                •{' '}
                                                {formatDate(d.tanggal_dokumen)}
                                                {d.file_name
                                                    ? ` • ${d.file_name}`
                                                    : ''}
                                            </div>
                                            {d.catatan_notaris && (
                                                <div className="mt-1.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-1.5 text-xs text-destructive">
                                                    <strong>
                                                        Catatan Notaris:
                                                    </strong>{' '}
                                                    {d.catatan_notaris}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {d.deed_case && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge variant="outline">
                                                    {d.deed_case.nomor}
                                                </Badge>
                                                {d.deed_case
                                                    .current_stage_order &&
                                                    d.deed_case
                                                        .current_stage_label && (
                                                        <StageBadge
                                                            order={
                                                                d.deed_case
                                                                    .current_stage_order
                                                            }
                                                            label={
                                                                d.deed_case
                                                                    .current_stage_label
                                                            }
                                                            isCompleted={Boolean(
                                                                d.deed_case
                                                                    .is_completed,
                                                            )}
                                                        />
                                                    )}
                                            </div>
                                        )}
                                        <Badge
                                            variant={
                                                d.is_rejected
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {d.is_rejected
                                                ? 'Ditolak Notaris'
                                                : 'Menunggu ACC (Hold)'}
                                        </Badge>
                                        {d.file_path && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setPreview({
                                                        title: d.nama,
                                                        url: documentsRoute.download(
                                                            d.id,
                                                        ).url,
                                                        downloadUrl:
                                                            documentsRoute.download(
                                                                d.id,
                                                                {
                                                                    query: {
                                                                        download: 1,
                                                                    },
                                                                },
                                                            ).url,
                                                        mime: d.mime_type,
                                                    })
                                                }
                                            >
                                                <Eye className="mr-1 size-3.5" />{' '}
                                                Lihat File
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditDoc(d)}
                                        >
                                            <Pencil className="mr-1 size-3.5" />{' '}
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setCancelTarget({
                                                    kind: 'document',
                                                    id: d.id,
                                                    label: `Dokumen "${d.nama}"`,
                                                })
                                            }
                                        >
                                            <X className="mr-1 size-3.5" />{' '}
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {visibleDocApprovals.map((da) => (
                                <div
                                    key={`docapp-${da.id}`}
                                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300">
                                            <FileCheck2 className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="font-semibold text-foreground">
                                                Verifikasi Dokumen {da.nomor} —{' '}
                                                {da.jenis_akta}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Klien: {da.client_name} •{' '}
                                                {da.documents_count} dokumen
                                                terlampir
                                            </div>
                                            {da.doc_approval_notes && (
                                                <div className="mt-1.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-1.5 text-xs text-destructive">
                                                    <strong>
                                                        Catatan Notaris:
                                                    </strong>{' '}
                                                    {da.doc_approval_notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StageBadge
                                            order={da.current_stage_order}
                                            label={da.current_stage_label}
                                        />
                                        <Badge
                                            variant={
                                                da.doc_approval_status ===
                                                'rejected'
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {da.doc_approval_status ===
                                            'rejected'
                                                ? 'Ditolak Notaris'
                                                : 'Menunggu ACC (Hold)'}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setReviewCase({
                                                    id: da.id,
                                                    client_id: da.client_id,
                                                    nomor: da.nomor,
                                                    jenis_akta: da.jenis_akta,
                                                    client_name: da.client_name,
                                                    current_stage_label:
                                                        da.current_stage_label,
                                                    note: da.doc_approval_notes,
                                                    documents:
                                                        da.documents ?? [],
                                                })
                                            }
                                        >
                                            <Eye className="mr-1 size-3.5" />{' '}
                                            Tinjau Berkas
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link href={casesRoute.show(da.id)}>
                                                <Pencil className="mr-1 size-3.5" />{' '}
                                                Edit / Tindak Lanjut
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setCancelTarget({
                                                    kind: 'doc_approval',
                                                    id: da.id,
                                                    label: `Verifikasi Dokumen ${da.nomor}`,
                                                })
                                            }
                                        >
                                            <X className="mr-1 size-3.5" />{' '}
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {visibleDrafts.map((dr) => (
                                <div
                                    key={`draft-${dr.id}`}
                                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                            <FileCheck2 className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="font-semibold text-foreground">
                                                Draf Akta {dr.nomor} —{' '}
                                                {dr.jenis_akta}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Klien: {dr.client_name}
                                            </div>
                                            {dr.latest_note && (
                                                <div className="mt-1.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-1.5 text-xs text-destructive">
                                                    <strong>
                                                        Catatan Notaris:
                                                    </strong>{' '}
                                                    {dr.latest_note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StageBadge
                                            order={dr.current_stage_order}
                                            label={dr.current_stage_label}
                                        />
                                        <Badge
                                            variant={
                                                dr.draft_status ===
                                                'revision_requested'
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {dr.draft_status ===
                                            'revision_requested'
                                                ? 'Perlu Revisi'
                                                : 'Menunggu ACC (Hold)'}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setReviewCase({
                                                    id: dr.id,
                                                    client_id: dr.client_id,
                                                    nomor: dr.nomor,
                                                    jenis_akta: dr.jenis_akta,
                                                    client_name: dr.client_name,
                                                    current_stage_label:
                                                        dr.current_stage_label,
                                                    note: dr.latest_note,
                                                    documents:
                                                        dr.documents ?? [],
                                                })
                                            }
                                        >
                                            <Eye className="mr-1 size-3.5" />{' '}
                                            Tinjau Berkas
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link href={casesRoute.show(dr.id)}>
                                                <Pencil className="mr-1 size-3.5" />{' '}
                                                Edit / Tindak Lanjut
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setCancelTarget({
                                                    kind: 'draft',
                                                    id: dr.id,
                                                    label: `Draf Akta ${dr.nomor}`,
                                                })
                                            }
                                        >
                                            <X className="mr-1 size-3.5" />{' '}
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tinjau Berkas (Daftar Dokumen + Catatan Revisi Notaris) */}
            <Dialog
                open={reviewCase !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReviewCase(null);
                        setInlineDoc(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {inlineDoc
                                ? inlineDoc.nama
                                : `Tinjau Berkas ${reviewCase?.nomor ?? ''} — ${reviewCase?.jenis_akta ?? ''}`}
                        </DialogTitle>
                    </DialogHeader>
                    {reviewCase && (
                        <div className="space-y-4">
                            {inlineDoc ? (
                                <div className="space-y-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInlineDoc(null)}
                                    >
                                        <ArrowLeft className="mr-1.5 size-3.5" />{' '}
                                        Kembali ke Daftar Berkas
                                    </Button>
                                    {inlineDoc.mime_type?.startsWith(
                                        'image/',
                                    ) ? (
                                        <img
                                            src={
                                                documentsRoute.download(
                                                    inlineDoc.id,
                                                ).url
                                            }
                                            alt={inlineDoc.nama}
                                            className="max-h-[65vh] w-full rounded-lg border object-contain"
                                        />
                                    ) : inlineDoc.mime_type ===
                                      'application/pdf' ? (
                                        <iframe
                                            src={
                                                documentsRoute.download(
                                                    inlineDoc.id,
                                                ).url
                                            }
                                            title={inlineDoc.nama}
                                            className="h-[65vh] w-full rounded-lg border"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-8 text-center">
                                            <FileText className="size-10 text-muted-foreground" />
                                            <div>
                                                <div className="font-medium">
                                                    {inlineDoc.file_name ||
                                                        inlineDoc.nama}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Pratinjau langsung hanya
                                                    mendukung gambar &amp; PDF.
                                                    Unduh file untuk meninjau
                                                    dokumen ini.
                                                </div>
                                            </div>
                                            <Button asChild size="sm">
                                                <a
                                                    href={
                                                        documentsRoute.download(
                                                            inlineDoc.id,
                                                            {
                                                                query: {
                                                                    download: 1,
                                                                },
                                                            },
                                                        ).url
                                                    }
                                                    download
                                                >
                                                    <Download className="mr-1.5 size-3.5" />{' '}
                                                    Unduh File
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                        <div>
                                            <strong>Klien:</strong>{' '}
                                            {reviewCase.client_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Tahap:{' '}
                                            {reviewCase.current_stage_label} •{' '}
                                            {reviewCase.documents.length} berkas
                                            tersimpan
                                        </div>
                                    </div>

                                    {reviewCase.note && (
                                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                                            <strong>
                                                Catatan Revisi / Penolakan
                                                Notaris:
                                            </strong>{' '}
                                            {reviewCase.note}
                                        </div>
                                    )}

                                    <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                                        {reviewCase.documents.length === 0 ? (
                                            <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                                                Belum ada dokumen pada berkas
                                                ini. Tambahkan melalui Edit
                                                Biodata & Berkas Klien.
                                            </div>
                                        ) : (
                                            reviewCase.documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
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
                                                                {doc.file_name
                                                                    ? ` • ${doc.file_name}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {doc.file_path && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setInlineDoc(
                                                                            doc,
                                                                        )
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
                                                                            )
                                                                                .url
                                                                        }
                                                                        download
                                                                    >
                                                                        <Download className="size-3.5" />
                                                                    </a>
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}

                            <DialogFooter className="flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setReviewCase(null);
                                        setInlineDoc(null);
                                    }}
                                >
                                    Tutup
                                </Button>
                                <Button asChild variant="outline">
                                    <Link
                                        href={clientsRoute.edit(
                                            reviewCase.client_id,
                                        )}
                                    >
                                        Tambah / Perbaiki Berkas Klien
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={casesRoute.show(reviewCase.id)}>
                                        Buka Monitoring Akta
                                    </Link>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Lihat File Langsung */}
            <Dialog
                open={preview !== null}
                onOpenChange={(open) => !open && setPreview(null)}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{preview?.title}</DialogTitle>
                    </DialogHeader>
                    {preview && (
                        <div className="space-y-4">
                            {preview.mime?.startsWith('image/') ? (
                                <img
                                    src={preview.url}
                                    alt={preview.title}
                                    className="max-h-[70vh] w-full rounded-lg border object-contain"
                                />
                            ) : preview.mime === 'application/pdf' ? (
                                <iframe
                                    src={preview.url}
                                    title={preview.title}
                                    className="h-[70vh] w-full rounded-lg border"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-8 text-center">
                                    <FileText className="size-10 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">
                                            {preview.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Pratinjau langsung hanya mendukung
                                            gambar &amp; PDF. Gunakan tombol
                                            Unduh File di bawah untuk membuka
                                            dokumen ini.
                                        </div>
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setPreview(null)}
                                >
                                    Tutup
                                </Button>
                                <Button asChild>
                                    <a href={preview.downloadUrl} download>
                                        <Download className="mr-1.5 size-4" />{' '}
                                        Unduh File
                                    </a>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Edit Dokumen */}
            <Dialog
                open={editingDoc !== null}
                onOpenChange={(open) => !open && setEditingDoc(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit & Perbarui Dokumen</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleDocSubmit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>Klien *</Label>
                                <select
                                    className={selectCls}
                                    value={docForm.data.client_id}
                                    onChange={(e) =>
                                        docForm.setData(
                                            'client_id',
                                            e.target.value,
                                        )
                                    }
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
                                <Label>Berkas Akta</Label>
                                <select
                                    className={selectCls}
                                    value={docForm.data.deed_case_id}
                                    onChange={(e) =>
                                        docForm.setData(
                                            'deed_case_id',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        — tidak dikaitkan —
                                    </option>
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
                                    value={docForm.data.kategori}
                                    onChange={(e) =>
                                        docForm.setData(
                                            'kategori',
                                            e.target.value,
                                        )
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
                                <Label>Nama Dokumen *</Label>
                                <Input
                                    value={docForm.data.nama}
                                    onChange={(e) =>
                                        docForm.setData('nama', e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nomor Dokumen</Label>
                                <Input
                                    value={docForm.data.nomor_dokumen}
                                    onChange={(e) =>
                                        docForm.setData(
                                            'nomor_dokumen',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal Dokumen</Label>
                                <Input
                                    type="date"
                                    value={docForm.data.tanggal_dokumen}
                                    onChange={(e) =>
                                        docForm.setData(
                                            'tanggal_dokumen',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>
                                Ganti File (Maks 2 MB — PDF, Word, ZIP, Gambar)
                            </Label>
                            <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.zip,image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    if (
                                        f &&
                                        f.size > notarisConfig.maxFileKb * 1024
                                    ) {
                                        setFileError(
                                            'Ukuran file maksimal 2 MB.',
                                        );
                                        docForm.setData('file', null);
                                        return;
                                    }
                                    setFileError(null);
                                    docForm.setData('file', f);
                                }}
                            />
                            {editingDoc?.file_name && (
                                <p className="text-xs text-muted-foreground">
                                    Saat ini: {editingDoc.file_name}
                                </p>
                            )}
                            {fileError && (
                                <p className="text-xs text-destructive">
                                    {fileError}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="chk-edit-doc"
                                checked={docForm.data.is_complete_checked}
                                onCheckedChange={(c) =>
                                    docForm.setData(
                                        'is_complete_checked',
                                        Boolean(c),
                                    )
                                }
                            />
                            <Label
                                htmlFor="chk-edit-doc"
                                className="cursor-pointer text-sm"
                            >
                                Sudah diperiksa kelengkapannya
                            </Label>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingDoc(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    docForm.processing || Boolean(fileError)
                                }
                            >
                                Simpan & Ajukan Ulang
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Edit / Upload Ulang Bukti Pembayaran */}
            <Dialog
                open={editingPay !== null}
                onOpenChange={(open) => !open && setEditingPay(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Edit & Upload Ulang Bukti ({editingPay?.no_inv})
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaySubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Tanggal Bayar</Label>
                            <Input
                                type="date"
                                value={payForm.data.tanggal_bayar}
                                onChange={(e) =>
                                    payForm.setData(
                                        'tanggal_bayar',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Metode Pembayaran</Label>
                            <select
                                className={selectCls}
                                value={payForm.data.metode}
                                onChange={(e) =>
                                    payForm.setData('metode', e.target.value)
                                }
                            >
                                {[
                                    'Transfer Bank',
                                    'Tunai',
                                    'QRIS',
                                    'Cek / Giro',
                                    'Virtual Account',
                                ].map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>No. Referensi</Label>
                            <Input
                                value={payForm.data.no_referensi}
                                onChange={(e) =>
                                    payForm.setData(
                                        'no_referensi',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Bukti Transfer Baru (Maks 2 MB)</Label>
                            <Input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    if (
                                        f &&
                                        f.size > notarisConfig.maxFileKb * 1024
                                    ) {
                                        setFileError(
                                            'Ukuran bukti maksimal 2 MB.',
                                        );
                                        payForm.setData('bukti', null);
                                        return;
                                    }
                                    setFileError(null);
                                    payForm.setData('bukti', f);
                                }}
                            />
                            {fileError && (
                                <p className="text-xs text-destructive">
                                    {fileError}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingPay(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    payForm.processing || Boolean(fileError)
                                }
                            >
                                Simpan & Ajukan Ulang
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={cancelTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setCancelTarget(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Batalkan {cancelTarget?.label}
                        </DialogTitle>
                        <DialogDescription>
                            Permintaan persetujuan ini akan dibatalkan dan
                            otomatis dihapus dari antrean Notaris maupun Admin.
                            Lanjutkan?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCancelTarget(null)}
                            disabled={cancelBusy}
                        >
                            Kembali
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={cancelBusy}
                        >
                            {cancelBusy ? 'Membatalkan…' : 'Ya, Batalkan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
