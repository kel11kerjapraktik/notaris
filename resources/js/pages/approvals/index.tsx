import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Download,
    Eye,
    FileCheck2,
    FileText,
    ShieldCheck,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { PaymentBadge } from '@/components/notaris/payment-badge';
import { StageBadge } from '@/components/notaris/stage-badge';
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
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import approvals from '@/routes/approvals';
import cases from '@/routes/cases';
import documentsRoute from '@/routes/documents';
import payments from '@/routes/payments';
import type { BreadcrumbItem, DocumentItem, PaymentItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Persetujuan Notaris', href: approvals.index() },
];

type ApprovalAction =
    | { kind: 'payment_acc'; id: number; label: string }
    | { kind: 'payment_reject'; id: number; label: string }
    | { kind: 'doc_acc'; id: number; label: string }
    | { kind: 'doc_reject'; id: number; label: string }
    | { kind: 'draft_acc'; id: number; label: string }
    | { kind: 'draft_reject'; id: number; label: string }
    | { kind: 'case_doc_acc'; id: number; label: string }
    | { kind: 'case_doc_reject'; id: number; label: string }
    | { kind: 'case_advance'; id: number; label: string };

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

type ReviewCaseModalData = {
    id: number;
    nomor: string;
    jenis_akta: string;
    client_name: string;
    current_stage_label: string;
    kind?: 'doc_approval' | 'draft';
    note?: string | null;
    documents: CaseDocPreviewItem[];
};

type ApprovalProps = {
    pendingPayments: PaymentItem[];
    pendingDrafts: {
        id: number;
        client_id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        documents_count: number;
        draft_files_count?: number;
        draft_status: string;
        current_stage_order: number;
        current_stage_label: string;
        latest_note?: string | null;
        documents: CaseDocPreviewItem[];
    }[];
    pendingDocuments: (DocumentItem & {
        uploader?: { id: number; name: string } | null;
        deed_case?: {
            id: number;
            nomor: string;
            jenis_akta: string;
            current_stage?: string;
            current_stage_order?: number;
            current_stage_label?: string;
            is_completed?: boolean;
        } | null;
    })[];
    pendingDocApprovals: {
        id: number;
        client_id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        documents_count: number;
        current_stage_order: number;
        current_stage_label: string;
        documents: CaseDocPreviewItem[];
    }[];
    awaitingNotarisCases: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        current_stage: string;
        current_stage_order: number;
        current_stage_label: string;
        biaya: number;
        terbayar: number;
        tanggal_ttd_minuta?: string | null;
        nomor_akta?: string | null;
        tanggal_akta?: string | null;
        is_minuta_ready?: boolean;
        has_pending_payment?: boolean;
    }[];
    decidedPayments?: PaymentItem[];
    decidedDocuments?: DocumentItem[];
    decidedDrafts?: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        draft_status: string;
        draft_approver_name: string | null;
        draft_approved_at?: string | null;
        latest_note: string | null;
        updated_at: string | null;
    }[];
    decidedDocApprovals?: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        doc_approval_status: string;
        doc_approver_name: string | null;
        doc_approval_notes: string | null;
        doc_approved_at?: string | null;
        updated_at?: string | null;
    }[];
};

export default function ApprovalsIndex({
    pendingPayments,
    pendingDrafts,
    pendingDocuments,
    pendingDocApprovals,
    awaitingNotarisCases,
    decidedPayments: decidedPaymentsProp,
    decidedDocuments: decidedDocumentsProp,
    decidedDrafts: decidedDraftsProp,
    decidedDocApprovals: decidedDocApprovalsProp,
}: ApprovalProps) {
    const decidedPayments = decidedPaymentsProp ?? [];
    const decidedDocuments = decidedDocumentsProp ?? [];
    const decidedDrafts = decidedDraftsProp ?? [];
    const decidedDocApprovals = decidedDocApprovalsProp ?? [];
    const isHistoryLoading = decidedPaymentsProp === undefined;
    const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
    const [activeAction, setActiveAction] = useState<ApprovalAction | null>(
        null,
    );
    const [reviewCase, setReviewCase] = useState<ReviewCaseModalData | null>(
        null,
    );
    const [inlineDoc, setInlineDoc] = useState<CaseDocPreviewItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{
        kind: 'payment' | 'document' | 'doc_approval' | 'draft';
        id: number;
        label: string;
    } | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        router.delete(approvals.remove().url, {
            data: { kind: deleteTarget.kind, id: deleteTarget.id },
            preserveScroll: true,
            onFinish: () => {
                setDeleteBusy(false);
                setDeleteTarget(null);
            },
        });
    };

    const totalPending =
        pendingPayments.length +
        pendingDrafts.length +
        pendingDocuments.length +
        pendingDocApprovals.length +
        awaitingNotarisCases.length;
    const totalDecided =
        decidedPayments.length +
        decidedDocuments.length +
        decidedDrafts.length +
        decidedDocApprovals.length;
    const totalPaymentAmount = pendingPayments.reduce(
        (s, p) => s + Number(p.jumlah),
        0,
    );

    const isRejectAction =
        activeAction?.kind === 'payment_reject' ||
        activeAction?.kind === 'doc_reject' ||
        activeAction?.kind === 'draft_reject' ||
        activeAction?.kind === 'case_doc_reject';

    const handleConfirmAction = (notes: string) => {
        if (!activeAction) return;
        setProcessing(true);

        const opts = {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setActiveAction(null);
            },
        };

        switch (activeAction.kind) {
            case 'payment_acc':
                router.post(
                    payments.confirm(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'payment_reject':
                router.post(
                    payments.reject(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'doc_acc':
                router.post(
                    documentsRoute.verify(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'doc_reject':
                router.post(
                    documentsRoute.reject(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'draft_acc':
                router.post(
                    cases.approveDraft(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'draft_reject':
                router.post(
                    cases.requestRevision(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'case_doc_acc':
                router.post(
                    cases.approveDoc(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'case_doc_reject':
                router.post(
                    cases.rejectDoc(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
            case 'case_advance':
                router.post(
                    cases.advance(activeAction.id).url,
                    { notes },
                    opts,
                );
                break;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Persetujuan Notaris — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                Otoritas Notaris
                            </p>
                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                Persetujuan & Pengesahan Notaris
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Semua permintaan persetujuan dari Admin/Staf
                                masuk ke sini. Pilih <strong>ACC</strong>{' '}
                                (catatan opsional) atau <strong>Ditolak</strong>{' '}
                                (catatan wajib).
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-card/85 p-1.5 shadow-xs">
                            <Button
                                size="sm"
                                variant={
                                    viewMode === 'pending' ? 'default' : 'ghost'
                                }
                                onClick={() => setViewMode('pending')}
                            >
                                Menunggu ACC
                                <Badge variant="secondary" className="ml-2">
                                    {totalPending}
                                </Badge>
                            </Button>
                            <Button
                                size="sm"
                                variant={
                                    viewMode === 'history' ? 'default' : 'ghost'
                                }
                                onClick={() => setViewMode('history')}
                            >
                                Hasil Persetujuan (ACC & Ditolak)
                                <Badge variant="secondary" className="ml-2">
                                    {isHistoryLoading ? '…' : totalDecided}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </div>

                {viewMode === 'pending' ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            <StatCard
                                label="Total Menunggu ACC"
                                value={totalPending}
                                valueClassName="text-amber-600 dark:text-amber-400"
                                icon={<ShieldCheck className="size-4" />}
                            />
                            <StatCard
                                label="Konfirmasi Pembayaran"
                                value={pendingPayments.length}
                                note={formatRupiah(totalPaymentAmount)}
                                icon={<Wallet className="size-4" />}
                            />
                            <StatCard
                                label="Verifikasi Dokumen"
                                value={
                                    pendingDocuments.length +
                                    pendingDocApprovals.length
                                }
                                icon={<FileText className="size-4" />}
                            />
                            <StatCard
                                label="Persetujuan Draf Akta"
                                value={pendingDrafts.length}
                                icon={<FileCheck2 className="size-4" />}
                            />
                            <StatCard
                                label="Pengesahan Minuta / Akhir"
                                value={awaitingNotarisCases.length}
                                icon={<Check className="size-4" />}
                            />
                        </div>

                        {/* Konfirmasi Pembayaran */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <Wallet className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Konfirmasi Pembayaran (DP 50% /
                                        Pelunasan)
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {pendingPayments.length} item
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {pendingPayments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-9 text-center text-sm text-muted-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <Check className="size-4" />
                                        </span>
                                        <span>
                                            Tidak ada pembayaran yang menunggu
                                            ACC Notaris.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-amber-500/15 bg-amber-500/5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                    <th className="px-4 py-3">
                                                        Invoice
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Berkas / Klien
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Termin
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Nominal
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3 text-right">
                                                        Aksi
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/70">
                                                {pendingPayments.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        className="transition-colors hover:bg-amber-500/5"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-foreground">
                                                                {p.no_inv}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {p.metode}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">
                                                                {p.deed_case ? (
                                                                    <Link
                                                                        href={cases.show(
                                                                            p
                                                                                .deed_case
                                                                                .id,
                                                                        )}
                                                                        className="text-foreground transition-colors hover:text-amber-700 hover:underline dark:hover:text-amber-300"
                                                                    >
                                                                        {
                                                                            p
                                                                                .deed_case
                                                                                .nomor
                                                                        }
                                                                    </Link>
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {p.deed_case
                                                                    ?.client
                                                                    ?.company
                                                                    ?.nama ||
                                                                    p.deed_case
                                                                        ?.client
                                                                        ?.nama ||
                                                                    '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            <div className="font-medium text-foreground/90">
                                                                Termin{' '}
                                                                {p.termin_ke} —{' '}
                                                                {p.keterangan}
                                                            </div>
                                                            {p.tanggal_bayar && (
                                                                <div className="text-muted-foreground">
                                                                    Bayar{' '}
                                                                    {formatDate(
                                                                        p.tanggal_bayar,
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold tabular-nums">
                                                            {formatRupiah(
                                                                p.jumlah,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <PaymentBadge
                                                                status={
                                                                    p.status
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                {p.bukti_path && (
                                                                    <Button
                                                                        asChild
                                                                        size="sm"
                                                                        variant="outline"
                                                                    >
                                                                        <a
                                                                            href={
                                                                                payments.proof(
                                                                                    p.id,
                                                                                )
                                                                                    .url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                        >
                                                                            <Eye className="mr-1 size-3.5" />{' '}
                                                                            Bukti
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setActiveAction(
                                                                            {
                                                                                kind: 'payment_acc',
                                                                                id: p.id,
                                                                                label: `Pembayaran ${p.no_inv}`,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Check className="mr-1 size-3.5" />{' '}
                                                                    ACC
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setActiveAction(
                                                                            {
                                                                                kind: 'payment_reject',
                                                                                id: p.id,
                                                                                label: `Pembayaran ${p.no_inv}`,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <X className="mr-1 size-3.5" />{' '}
                                                                    Ditolak
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            {
                                                                                kind: 'payment',
                                                                                id: p.id,
                                                                                label: `Pembayaran ${p.no_inv}`,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1 size-3.5 text-destructive" />{' '}
                                                                    Hapus
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Persetujuan Tahap Verifikasi Dokumen (Berkas Akta) */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <FileCheck2 className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Persetujuan Tahap Verifikasi Dokumen
                                        (Berkas Akta)
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {pendingDocApprovals.length} item
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {pendingDocApprovals.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-9 text-center text-sm text-muted-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <Check className="size-4" />
                                        </span>
                                        <span>
                                            Tidak ada pengajuan verifikasi
                                            dokumen berkas yang menunggu ACC.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {pendingDocApprovals.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                                                        <Link
                                                            href={cases.show(
                                                                c.id,
                                                            )}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {c.nomor}
                                                        </Link>
                                                        <span>
                                                            — {c.jenis_akta}
                                                        </span>
                                                        <StageBadge
                                                            order={
                                                                c.current_stage_order
                                                            }
                                                            label={
                                                                c.current_stage_label
                                                            }
                                                        />
                                                        <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                            Menunggu ACC
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.client_name} •{' '}
                                                        {c.documents_count}{' '}
                                                        dokumen terlampir
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setReviewCase({
                                                                ...c,
                                                                kind: 'doc_approval',
                                                            })
                                                        }
                                                    >
                                                        <Eye className="mr-1 size-3.5" />{' '}
                                                        Tinjau Berkas
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'case_doc_acc',
                                                                id: c.id,
                                                                label: `Verifikasi Dokumen ${c.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <Check className="mr-1 size-3.5" />{' '}
                                                        ACC
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'case_doc_reject',
                                                                id: c.id,
                                                                label: `Verifikasi Dokumen ${c.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <X className="mr-1 size-3.5" />{' '}
                                                        Ditolak
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setDeleteTarget({
                                                                kind: 'doc_approval',
                                                                id: c.id,
                                                                label: `Verifikasi Dokumen ${c.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" />{' '}
                                                        Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Persetujuan / Verifikasi Dokumen */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <FileText className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Persetujuan &amp; Verifikasi Keabsahan
                                        Dokumen
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {pendingDocuments.length} item
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {pendingDocuments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-9 text-center text-sm text-muted-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <Check className="size-4" />
                                        </span>
                                        <span>
                                            Semua dokumen sudah diproses oleh
                                            Notaris.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {pendingDocuments.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                                        <FileText className="size-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 font-semibold">
                                                            <span>
                                                                {doc.nama}
                                                            </span>
                                                            <Badge variant="outline">
                                                                {doc.kategori}
                                                            </Badge>
                                                            {doc.deed_case
                                                                ?.current_stage_order &&
                                                                doc.deed_case
                                                                    ?.current_stage_label && (
                                                                    <StageBadge
                                                                        order={
                                                                            doc
                                                                                .deed_case
                                                                                .current_stage_order
                                                                        }
                                                                        label={
                                                                            doc
                                                                                .deed_case
                                                                                .current_stage_label
                                                                        }
                                                                        isCompleted={Boolean(
                                                                            doc
                                                                                .deed_case
                                                                                .is_completed,
                                                                        )}
                                                                    />
                                                                )}
                                                            <Badge
                                                                variant={
                                                                    doc.is_complete_checked
                                                                        ? 'secondary'
                                                                        : 'outline'
                                                                }
                                                            >
                                                                {doc.is_complete_checked
                                                                    ? 'Lengkap (Staf)'
                                                                    : 'Belum Dicek Staf'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Klien:{' '}
                                                            {doc.client?.company
                                                                ?.nama ||
                                                                doc.client
                                                                    ?.nama ||
                                                                '-'}
                                                            {doc.deed_case ? (
                                                                <>
                                                                    {' '}
                                                                    • Berkas{' '}
                                                                    <Link
                                                                        href={cases.show(
                                                                            doc
                                                                                .deed_case
                                                                                .id,
                                                                        )}
                                                                        className="font-medium underline hover:text-primary"
                                                                    >
                                                                        {
                                                                            doc
                                                                                .deed_case
                                                                                .nomor
                                                                        }
                                                                    </Link>
                                                                </>
                                                            ) : null}
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
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {doc.file_path && (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <a
                                                                href={
                                                                    documentsRoute.download(
                                                                        doc.id,
                                                                    ).url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Eye className="mr-1 size-3.5" />{' '}
                                                                Lihat File
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'doc_acc',
                                                                id: doc.id,
                                                                label: `Dokumen "${doc.nama}"`,
                                                            })
                                                        }
                                                    >
                                                        <Check className="mr-1 size-3.5" />{' '}
                                                        ACC
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'doc_reject',
                                                                id: doc.id,
                                                                label: `Dokumen "${doc.nama}"`,
                                                            })
                                                        }
                                                    >
                                                        <X className="mr-1 size-3.5" />{' '}
                                                        Ditolak
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setDeleteTarget({
                                                                kind: 'document',
                                                                id: doc.id,
                                                                label: `Dokumen "${doc.nama}"`,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" />{' '}
                                                        Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Persetujuan Draf Akta */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <FileCheck2 className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Persetujuan Draf Akta
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {pendingDrafts.length} item
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {pendingDrafts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-9 text-center text-sm text-muted-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <Check className="size-4" />
                                        </span>
                                        <span>
                                            Tidak ada draf akta yang menunggu
                                            persetujuan.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {pendingDrafts.map((d) => (
                                            <div
                                                key={d.id}
                                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                                                        <Link
                                                            href={cases.show(
                                                                d.id,
                                                            )}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {d.nomor}
                                                        </Link>
                                                        <span>
                                                            — {d.jenis_akta}
                                                        </span>
                                                        <StageBadge
                                                            order={
                                                                d.current_stage_order
                                                            }
                                                            label={
                                                                d.current_stage_label
                                                            }
                                                        />
                                                        <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                            Menunggu ACC
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {d.client_name} •{' '}
                                                        {d.draft_files_count ??
                                                            0}{' '}
                                                        file Draf Akta (
                                                        {d.documents_count}{' '}
                                                        total berkas)
                                                    </div>
                                                    {d.latest_note && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan:{' '}
                                                            {d.latest_note}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setReviewCase({
                                                                ...d,
                                                                kind: 'draft',
                                                                note: d.latest_note,
                                                            })
                                                        }
                                                    >
                                                        <Eye className="mr-1 size-3.5" />{' '}
                                                        Tinjau Berkas
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'draft_acc',
                                                                id: d.id,
                                                                label: `Draf Akta ${d.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <Check className="mr-1 size-3.5" />{' '}
                                                        ACC
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            setActiveAction({
                                                                kind: 'draft_reject',
                                                                id: d.id,
                                                                label: `Draf Akta ${d.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <X className="mr-1 size-3.5" />{' '}
                                                        Ditolak
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setDeleteTarget({
                                                                kind: 'draft',
                                                                id: d.id,
                                                                label: `Draf Akta ${d.nomor}`,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" />{' '}
                                                        Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Berkas Siap Pengesahan Notaris */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <ShieldCheck className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Berkas di Tahap Pengesahan Notaris
                                        (Minuta / Pelunasan Akhir)
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {awaitingNotarisCases.length} item
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {awaitingNotarisCases.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-9 text-center text-sm text-muted-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <Check className="size-4" />
                                        </span>
                                        <span>
                                            Tidak ada berkas pada tahap
                                            pengesahan Notaris.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {awaitingNotarisCases.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                                                        <Link
                                                            href={cases.show(
                                                                c.id,
                                                            )}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {c.nomor}
                                                        </Link>
                                                        <span>
                                                            — {c.jenis_akta}
                                                        </span>
                                                        <StageBadge
                                                            order={
                                                                c.current_stage_order
                                                            }
                                                            label={
                                                                c.current_stage_label
                                                            }
                                                        />
                                                        {c.current_stage ===
                                                            'penandatanganan_minuta' &&
                                                            (c.is_minuta_ready ? (
                                                                <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                    ✓ Tgl TTD
                                                                    Minuta
                                                                    Terisi
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                                                    Isi Tgl TTD
                                                                    Minuta
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.client_name}
                                                        {c.current_stage ===
                                                        'penandatanganan_minuta' ? (
                                                            <>
                                                                {' '}
                                                                • Tgl TTD
                                                                Minuta:{' '}
                                                                {c.tanggal_ttd_minuta
                                                                    ? formatDate(
                                                                          c.tanggal_ttd_minuta,
                                                                      )
                                                                    : 'Belum diisi'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {' '}
                                                                • Terbayar{' '}
                                                                {formatRupiah(
                                                                    c.terbayar,
                                                                )}{' '}
                                                                /{' '}
                                                                {formatRupiah(
                                                                    c.biaya,
                                                                )}
                                                                {c.has_pending_payment
                                                                    ? ' • Ada bukti menunggu ACC'
                                                                    : ''}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {c.current_stage ===
                                                        'penandatanganan_minuta' &&
                                                        c.is_minuta_ready && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    setActiveAction(
                                                                        {
                                                                            kind: 'case_advance',
                                                                            id: c.id,
                                                                            label: `Penandatanganan Minuta ${c.nomor}`,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Check className="mr-1 size-3.5" />{' '}
                                                                Sahkan Minuta
                                                            </Button>
                                                        )}
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant={
                                                            c.current_stage ===
                                                                'penandatanganan_minuta' &&
                                                            c.is_minuta_ready
                                                                ? 'outline'
                                                                : 'default'
                                                        }
                                                    >
                                                        <Link
                                                            href={cases.show(
                                                                c.id,
                                                            )}
                                                        >
                                                            Buka Berkas
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                ) : isHistoryLoading ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-card p-10 text-center text-sm text-muted-foreground shadow-xs">
                        Memuat riwayat persetujuan Notaris…
                    </div>
                ) : (
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <Wallet className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Hasil Persetujuan Pembayaran
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {decidedPayments.length} riwayat
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {decidedPayments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan
                                        pembayaran.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {decidedPayments.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-amber-500/5"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        {p.no_inv} —{' '}
                                                        {p.deed_case?.nomor} (
                                                        {formatRupiah(p.jumlah)}
                                                        )
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {p.deed_case?.client
                                                            ?.nama || '-'}{' '}
                                                        • {p.keterangan}
                                                    </div>
                                                    {p.catatan_notaris && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan:{' '}
                                                            {p.catatan_notaris}
                                                        </div>
                                                    )}
                                                </div>
                                                <PaymentBadge
                                                    status={p.status}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <FileText className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Hasil Persetujuan Dokumen
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {decidedDocuments.length} riwayat
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {decidedDocuments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan
                                        dokumen.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {decidedDocuments.map((d) => (
                                            <div
                                                key={d.id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-amber-500/5"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        {d.nama}{' '}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            ({d.kategori})
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Klien:{' '}
                                                        {d.client?.company
                                                            ?.nama ||
                                                            d.client?.nama ||
                                                            '-'}
                                                    </div>
                                                    {d.catatan_notaris && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan:{' '}
                                                            {d.catatan_notaris}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant={
                                                        d.is_rejected
                                                            ? 'destructive'
                                                            : 'default'
                                                    }
                                                >
                                                    {d.is_rejected
                                                        ? 'Ditolak Notaris'
                                                        : 'Di-ACC (Sah)'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <FileCheck2 className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Hasil Persetujuan Tahap Verifikasi
                                        Dokumen
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {decidedDocApprovals.length} riwayat
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {decidedDocApprovals.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan
                                        verifikasi dokumen berkas.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {decidedDocApprovals.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-amber-500/5"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        <Link
                                                            href={cases.show(
                                                                c.id,
                                                            )}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {c.nomor}
                                                        </Link>{' '}
                                                        — {c.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.client_name}
                                                        {c.doc_approver_name
                                                            ? ` • Oleh ${c.doc_approver_name}`
                                                            : ''}
                                                        {c.doc_approved_at ||
                                                        c.updated_at
                                                            ? ` • ${formatDate(c.doc_approved_at || c.updated_at)}`
                                                            : ''}
                                                    </div>
                                                    {c.doc_approval_notes && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan:{' '}
                                                            {
                                                                c.doc_approval_notes
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant={
                                                        c.doc_approval_status ===
                                                        'approved'
                                                            ? 'default'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {c.doc_approval_status ===
                                                    'approved'
                                                        ? 'Di-ACC Notaris'
                                                        : 'Ditolak Notaris'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
                                        <ShieldCheck className="size-3.5" />
                                    </span>
                                    <h2 className="font-serif text-base font-bold tracking-tight text-foreground">
                                        Hasil Persetujuan Draf Akta
                                    </h2>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="border border-amber-500/25 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                >
                                    {decidedDrafts.length} riwayat
                                </Badge>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                                {decidedDrafts.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan draf
                                        akta.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/70">
                                        {decidedDrafts.map((d) => (
                                            <div
                                                key={d.id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-amber-500/5"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        <Link
                                                            href={cases.show(
                                                                d.id,
                                                            )}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {d.nomor}
                                                        </Link>{' '}
                                                        — {d.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {d.client_name}
                                                        {d.draft_approver_name
                                                            ? ` • Oleh ${d.draft_approver_name}`
                                                            : ''}
                                                        {d.draft_approved_at ||
                                                        d.updated_at
                                                            ? ` • ${formatDate(d.draft_approved_at || d.updated_at)}`
                                                            : ''}
                                                    </div>
                                                    {d.latest_note && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan:{' '}
                                                            {d.latest_note}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant={
                                                        d.draft_status ===
                                                        'approved'
                                                            ? 'default'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {d.draft_status ===
                                                    'approved'
                                                        ? 'Di-ACC Notaris'
                                                        : 'Ditolak (Perlu Revisi)'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>

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
                                            className="max-h-[65vh] w-full rounded-xl border border-amber-500/20 bg-background/50 object-contain"
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
                                            className="h-[65vh] w-full rounded-xl border border-amber-500/20"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
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
                                            dimasukkan Admin/Staf
                                        </div>
                                    </div>

                                    {reviewCase.note && (
                                        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                                            <strong>Catatan Pengajuan:</strong>{' '}
                                            {reviewCase.note}
                                        </div>
                                    )}

                                    <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                                        {reviewCase.documents.length === 0 ? (
                                            <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                                                Belum ada berkas/dokumen yang
                                                dimasukkan Admin pada berkas
                                                ini.
                                            </div>
                                        ) : (
                                            reviewCase.documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                                                        doc.kategori ===
                                                        'Draft Akta'
                                                            ? 'border-primary/40 bg-primary/5'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                                                <span>
                                                                    {doc.nama}
                                                                </span>
                                                                {doc.kategori ===
                                                                    'Draft Akta' && (
                                                                    <Badge className="border-primary/35 bg-primary/15 text-[10px] text-amber-800 hover:bg-primary/15 dark:text-amber-300">
                                                                        Draf
                                                                        Akta
                                                                    </Badge>
                                                                )}
                                                                {doc.is_verified && (
                                                                    <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                        ✓ Di-ACC
                                                                    </Badge>
                                                                )}
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
                                {reviewCase.kind && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                const target = reviewCase;
                                                setReviewCase(null);
                                                setInlineDoc(null);
                                                setActiveAction({
                                                    kind:
                                                        target.kind === 'draft'
                                                            ? 'draft_reject'
                                                            : 'case_doc_reject',
                                                    id: target.id,
                                                    label:
                                                        target.kind === 'draft'
                                                            ? `Draf Akta ${target.nomor}`
                                                            : `Verifikasi Dokumen ${target.nomor}`,
                                                });
                                            }}
                                        >
                                            <X className="mr-1 size-3.5" />{' '}
                                            Ditolak
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const target = reviewCase;
                                                setReviewCase(null);
                                                setInlineDoc(null);
                                                setActiveAction({
                                                    kind:
                                                        target.kind === 'draft'
                                                            ? 'draft_acc'
                                                            : 'case_doc_acc',
                                                    id: target.id,
                                                    label:
                                                        target.kind === 'draft'
                                                            ? `Draf Akta ${target.nomor}`
                                                            : `Verifikasi Dokumen ${target.nomor}`,
                                                });
                                            }}
                                        >
                                            <Check className="mr-1 size-3.5" />{' '}
                                            ACC Sekarang
                                        </Button>
                                    </>
                                )}
                                <Button asChild variant="outline">
                                    <Link href={cases.show(reviewCase.id)}>
                                        Buka Detail Monitoring
                                    </Link>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmNoteDialog
                open={activeAction !== null}
                onOpenChange={(open) => !open && setActiveAction(null)}
                title={
                    activeAction?.kind === 'case_advance'
                        ? `Sahkan ${activeAction.label}`
                        : isRejectAction
                          ? `Tolak ${activeAction?.label ?? ''}`
                          : `ACC ${activeAction?.label ?? ''}`
                }
                description={
                    isRejectAction
                        ? 'Wajib mengisi keterangan / alasan penolakan agar Staf dapat menindaklanjuti.'
                        : 'Tambahkan catatan pengesahan / persetujuan jika diperlukan (opsional).'
                }
                confirmLabel={
                    activeAction?.kind === 'case_advance'
                        ? 'Sahkan & Lanjut Tahap'
                        : isRejectAction
                          ? 'Tolak dengan Catatan'
                          : 'ACC Sekarang'
                }
                confirmVariant={isRejectAction ? 'destructive' : 'default'}
                requireNote={isRejectAction}
                noteLabel={
                    isRejectAction
                        ? 'Keterangan Penolakan'
                        : 'Catatan (Opsional)'
                }
                notePlaceholder={
                    isRejectAction
                        ? 'Jelaskan alasan penolakan (minimal 3 karakter)…'
                        : 'Catatan tambahan (boleh dikosongkan)…'
                }
                processing={processing}
                onConfirm={handleConfirmAction}
            />

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus {deleteTarget?.label}</DialogTitle>
                        <DialogDescription>
                            Data ini akan dihapus dari daftar persetujuan
                            Notaris maupun Admin. Lanjutkan?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleteBusy}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteBusy}
                        >
                            {deleteBusy ? 'Menghapus…' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
