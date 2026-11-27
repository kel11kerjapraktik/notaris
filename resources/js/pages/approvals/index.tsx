import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Download, Eye, FileText, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmNoteDialog } from '@/components/notaris/confirm-note-dialog';
import { PaymentBadge } from '@/components/notaris/payment-badge';
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
    | { kind: 'case_doc_reject'; id: number; label: string };

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
        draft_status: string;
        current_stage_label: string;
        documents: CaseDocPreviewItem[];
    }[];
    pendingDocuments: (DocumentItem & {
        uploader?: { id: number; name: string } | null;
    })[];
    pendingDocApprovals: {
        id: number;
        client_id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        documents_count: number;
        current_stage_label: string;
        documents: CaseDocPreviewItem[];
    }[];
    awaitingNotarisCases: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        current_stage: string;
        current_stage_label: string;
        biaya: number;
        terbayar: number;
    }[];
    decidedPayments: PaymentItem[];
    decidedDocuments: DocumentItem[];
    decidedDrafts: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        draft_status: string;
        draft_approver_name: string | null;
        latest_note: string | null;
        updated_at: string | null;
    }[];
    decidedDocApprovals: {
        id: number;
        nomor: string;
        jenis_akta: string;
        client_name: string;
        doc_approval_status: string;
        doc_approver_name: string | null;
        doc_approval_notes: string | null;
    }[];
};

export default function ApprovalsIndex({
    pendingPayments,
    pendingDrafts,
    pendingDocuments,
    pendingDocApprovals,
    awaitingNotarisCases,
    decidedPayments,
    decidedDocuments,
    decidedDrafts,
    decidedDocApprovals,
}: ApprovalProps) {
    const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
    const [activeAction, setActiveAction] = useState<ApprovalAction | null>(null);
    const [reviewCase, setReviewCase] = useState<ReviewCaseModalData | null>(null);
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
        pendingPayments.length + pendingDrafts.length + pendingDocuments.length + pendingDocApprovals.length;
    const totalDecided =
        decidedPayments.length + decidedDocuments.length + decidedDrafts.length + decidedDocApprovals.length;
    const totalPaymentAmount = pendingPayments.reduce((s, p) => s + Number(p.jumlah), 0);

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
                router.post(payments.confirm(activeAction.id).url, { notes }, opts);
                break;
            case 'payment_reject':
                router.post(payments.reject(activeAction.id).url, { notes }, opts);
                break;
            case 'doc_acc':
                router.post(documentsRoute.verify(activeAction.id).url, { notes }, opts);
                break;
            case 'doc_reject':
                router.post(documentsRoute.reject(activeAction.id).url, { notes }, opts);
                break;
            case 'draft_acc':
                router.post(cases.approveDraft(activeAction.id).url, { notes }, opts);
                break;
            case 'draft_reject':
                router.post(cases.requestRevision(activeAction.id).url, { notes }, opts);
                break;
            case 'case_doc_acc':
                router.post(cases.approveDoc(activeAction.id).url, { notes }, opts);
                break;
            case 'case_doc_reject':
                router.post(cases.rejectDoc(activeAction.id).url, { notes }, opts);
                break;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Persetujuan Notaris — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Persetujuan & Pengesahan Notaris</h1>
                        <p className="text-sm text-muted-foreground">
                            Semua permintaan persetujuan dari Admin/Staf masuk ke sini. Pilih <strong>ACC</strong> (catatan opsional) atau <strong>Ditolak</strong> (catatan wajib).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={viewMode === 'pending' ? 'default' : 'outline'}
                            onClick={() => setViewMode('pending')}
                        >
                            Menunggu ACC
                            <Badge variant="secondary" className="ml-2">
                                {totalPending}
                            </Badge>
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'history' ? 'default' : 'outline'}
                            onClick={() => setViewMode('history')}
                        >
                            Hasil Persetujuan (ACC & Ditolak)
                            <Badge variant="secondary" className="ml-2">
                                {totalDecided}
                            </Badge>
                        </Button>
                    </div>
                </div>

                {viewMode === 'pending' ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard label="Menunggu ACC" value={totalPending} />
                            <StatCard
                                label="Konfirmasi Pembayaran"
                                value={pendingPayments.length}
                                note={formatRupiah(totalPaymentAmount)}
                            />
                            <StatCard label="Verifikasi Dokumen" value={pendingDocuments.length} />
                            <StatCard label="Persetujuan Draf Akta" value={pendingDrafts.length} />
                        </div>

                        {/* Konfirmasi Pembayaran */}
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Konfirmasi Pembayaran (DP 50% / Pelunasan)</h2>
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                                {pendingPayments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Tidak ada pembayaran yang menunggu ACC Notaris.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                                    <th className="px-4 py-2.5 font-medium">Invoice</th>
                                                    <th className="px-4 py-2.5 font-medium">Berkas / Klien</th>
                                                    <th className="px-4 py-2.5 font-medium">Termin</th>
                                                    <th className="px-4 py-2.5 font-medium">Nominal</th>
                                                    <th className="px-4 py-2.5 font-medium">Status</th>
                                                    <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {pendingPayments.map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold">{p.no_inv}</div>
                                                            <div className="text-xs text-muted-foreground">{p.metode}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{p.deed_case?.nomor}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {p.deed_case?.client?.nama}
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
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                {p.bukti_path && (
                                                                    <Button asChild size="sm" variant="outline">
                                                                        <a
                                                                            href={payments.proof(p.id).url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                        >
                                                                            <Eye className="mr-1 size-3.5" /> Bukti
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setActiveAction({
                                                                            kind: 'payment_acc',
                                                                            id: p.id,
                                                                            label: `Pembayaran ${p.no_inv}`,
                                                                        })
                                                                    }
                                                                >
                                                                    <Check className="mr-1 size-3.5" /> ACC
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setActiveAction({
                                                                            kind: 'payment_reject',
                                                                            id: p.id,
                                                                            label: `Pembayaran ${p.no_inv}`,
                                                                        })
                                                                    }
                                                                >
                                                                    <X className="mr-1 size-3.5" /> Ditolak
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setDeleteTarget({
                                                                            kind: 'payment',
                                                                            id: p.id,
                                                                            label: `Pembayaran ${p.no_inv}`,
                                                                        })
                                                                    }
                                                                >
                                                                    <Trash2 className="mr-1 size-3.5 text-destructive" /> Hapus
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
                            <h2 className="text-sm font-semibold">
                                Persetujuan Tahap Verifikasi Dokumen (Berkas Akta)
                            </h2>
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                                {pendingDocApprovals.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Tidak ada pengajuan verifikasi dokumen berkas yang menunggu ACC.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {pendingDocApprovals.map((c) => (
                                            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                                <div>
                                                    <div className="font-semibold">
                                                        {c.nomor} — {c.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.client_name} • {c.documents_count} dokumen terlampir • Tahap: {c.current_stage_label}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setReviewCase(c)}
                                                    >
                                                        <Eye className="mr-1 size-3.5" /> Tinjau Berkas
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
                                                        <Check className="mr-1 size-3.5" /> ACC
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
                                                        <X className="mr-1 size-3.5" /> Ditolak
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
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" /> Hapus
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
                            <h2 className="text-sm font-semibold">Persetujuan & Verifikasi Keabsahan Dokumen</h2>
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                                {pendingDocuments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Semua dokumen sudah diproses oleh Notaris.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {pendingDocuments.map((doc) => (
                                            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                        <FileText className="size-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 font-semibold">
                                                            <span>{doc.nama}</span>
                                                            <Badge variant="outline">{doc.kategori}</Badge>
                                                            <Badge variant={doc.is_complete_checked ? 'secondary' : 'outline'}>
                                                                {doc.is_complete_checked
                                                                    ? 'Lengkap (Staf)'
                                                                    : 'Belum Dicek Staf'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Klien: {doc.client?.company?.nama || doc.client?.nama || '-'}
                                                            {doc.deed_case ? ` • Berkas ${doc.deed_case.nomor}` : ''}
                                                            {doc.nomor_dokumen ? ` • No. ${doc.nomor_dokumen}` : ''} •{' '}
                                                            {formatDate(doc.tanggal_dokumen)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {doc.file_path && (
                                                        <Button asChild size="sm" variant="outline">
                                                            <a
                                                                href={documentsRoute.download(doc.id).url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Eye className="mr-1 size-3.5" /> Lihat File
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
                                                        <Check className="mr-1 size-3.5" /> ACC
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
                                                        <X className="mr-1 size-3.5" /> Ditolak
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
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" /> Hapus
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
                            <h2 className="text-sm font-semibold">Persetujuan Draf Akta</h2>
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                                {pendingDrafts.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Tidak ada draf akta yang menunggu persetujuan.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {pendingDrafts.map((d) => (
                                            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                                <div>
                                                    <div className="font-semibold">
                                                        {d.nomor} — {d.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {d.client_name} • {d.documents_count} dokumen terlampir
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setReviewCase(d)}
                                                    >
                                                        <Eye className="mr-1 size-3.5" /> Tinjau Berkas
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
                                                        <Check className="mr-1 size-3.5" /> ACC
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
                                                        <X className="mr-1 size-3.5" /> Ditolak
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
                                                        <Trash2 className="mr-1 size-3.5 text-destructive" /> Hapus
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
                            <h2 className="text-sm font-semibold">
                                Berkas di Tahap Pengesahan Notaris (Minuta / Pelunasan Akhir)
                            </h2>
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                                {awaitingNotarisCases.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Tidak ada berkas pada tahap pengesahan Notaris.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {awaitingNotarisCases.map((c) => (
                                            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                                <div>
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <span>{c.nomor}</span>
                                                        <Badge variant="outline">{c.current_stage_label}</Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {c.client_name} • {c.jenis_akta} • Terbayar {formatRupiah(c.terbayar)} /{' '}
                                                        {formatRupiah(c.biaya)}
                                                    </div>
                                                </div>
                                                <Button asChild size="sm">
                                                    <Link href={cases.show(c.id)}>Buka Berkas</Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Hasil Persetujuan Pembayaran</h2>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {decidedPayments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan pembayaran.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {decidedPayments.map((p) => (
                                            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                                                <div>
                                                    <div className="font-semibold">
                                                        {p.no_inv} — {p.deed_case?.nomor} ({formatRupiah(p.jumlah)})
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {p.deed_case?.client?.nama || '-'} • {p.keterangan}
                                                    </div>
                                                    {p.catatan_notaris && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan: {p.catatan_notaris}
                                                        </div>
                                                    )}
                                                </div>
                                                <PaymentBadge status={p.status} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Hasil Persetujuan Dokumen</h2>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {decidedDocuments.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan dokumen.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {decidedDocuments.map((d) => (
                                            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                                                <div>
                                                    <div className="font-semibold">
                                                        {d.nama} <span className="text-xs font-normal text-muted-foreground">({d.kategori})</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Klien: {d.client?.company?.nama || d.client?.nama || '-'}
                                                    </div>
                                                    {d.catatan_notaris && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan: {d.catatan_notaris}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge variant={d.is_rejected ? 'destructive' : 'default'}>
                                                    {d.is_rejected ? 'Ditolak Notaris' : 'Di-ACC (Sah)'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Hasil Persetujuan Tahap Verifikasi Dokumen</h2>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {decidedDocApprovals.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan verifikasi dokumen berkas.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {decidedDocApprovals.map((c) => (
                                            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                                                <div>
                                                    <div className="font-semibold">
                                                        {c.nomor} — {c.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{c.client_name}</div>
                                                    {c.doc_approval_notes && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan: {c.doc_approval_notes}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge variant={c.doc_approval_status === 'approved' ? 'default' : 'destructive'}>
                                                    {c.doc_approval_status === 'approved' ? 'Di-ACC Notaris' : 'Ditolak Notaris'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Hasil Persetujuan Draf Akta</h2>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {decidedDrafts.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        Belum ada riwayat ACC / penolakan draf akta.
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {decidedDrafts.map((d) => (
                                            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                                                <div>
                                                    <div className="font-semibold">
                                                        {d.nomor} — {d.jenis_akta}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{d.client_name}</div>
                                                    {d.latest_note && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Catatan: {d.latest_note}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge variant={d.draft_status === 'approved' ? 'default' : 'destructive'}>
                                                    {d.draft_status === 'approved' ? 'Di-ACC Notaris' : 'Ditolak (Perlu Revisi)'}
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
                                        <ArrowLeft className="mr-1.5 size-3.5" /> Kembali ke Daftar Berkas
                                    </Button>
                                    {inlineDoc.mime_type?.startsWith('image/') ? (
                                        <img
                                            src={documentsRoute.download(inlineDoc.id).url}
                                            alt={inlineDoc.nama}
                                            className="max-h-[65vh] w-full rounded-lg border object-contain"
                                        />
                                    ) : (
                                        <iframe
                                            src={documentsRoute.download(inlineDoc.id).url}
                                            title={inlineDoc.nama}
                                            className="h-[65vh] w-full rounded-lg border"
                                        />
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                        <div>
                                            <strong>Klien:</strong> {reviewCase.client_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Tahap: {reviewCase.current_stage_label} • {reviewCase.documents.length} berkas dimasukkan Admin/Staf
                                        </div>
                                    </div>

                                    <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                                        {reviewCase.documents.length === 0 ? (
                                            <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
                                                Belum ada berkas/dokumen yang dimasukkan Admin pada berkas ini.
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
                                                            <div className="font-medium">{doc.nama}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {doc.kategori}
                                                                {doc.nomor_dokumen ? ` • No. ${doc.nomor_dokumen}` : ''} •{' '}
                                                                {formatDate(doc.tanggal_dokumen)}
                                                                {doc.file_name ? ` • ${doc.file_name}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {doc.file_path && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setInlineDoc(doc)}
                                                                >
                                                                    <Eye className="mr-1 size-3.5" /> Lihat
                                                                </Button>
                                                                <Button asChild size="sm" variant="outline">
                                                                    <a
                                                                        href={documentsRoute.download(doc.id, { query: { download: 1 } }).url}
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

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setReviewCase(null);
                                        setInlineDoc(null);
                                    }}
                                >
                                    Tutup
                                </Button>
                                <Button asChild>
                                    <Link href={cases.show(reviewCase.id)}>Buka Detail Monitoring</Link>
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
                    isRejectAction
                        ? `Tolak ${activeAction?.label ?? ''}`
                        : `ACC ${activeAction?.label ?? ''}`
                }
                description={
                    isRejectAction
                        ? 'Wajib mengisi keterangan / alasan penolakan agar Staf dapat menindaklanjuti.'
                        : 'Tambahkan catatan persetujuan jika diperlukan (opsional).'
                }
                confirmLabel={isRejectAction ? 'Tolak dengan Catatan' : 'ACC Sekarang'}
                confirmVariant={isRejectAction ? 'destructive' : 'default'}
                requireNote={isRejectAction}
                noteLabel={isRejectAction ? 'Keterangan Penolakan' : 'Catatan (Opsional)'}
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
                            Data ini akan dihapus dari daftar persetujuan Notaris maupun Admin. Lanjutkan?
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
