import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileCheck2,
    Plus,
    Users,
    Wallet,
} from 'lucide-react';
import { StageBadge } from '@/components/notaris/stage-badge';
import { StatCard } from '@/components/notaris/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import { dashboard } from '@/routes';
import approvals from '@/routes/approvals';
import cases from '@/routes/cases';
import clients from '@/routes/clients';
import payments from '@/routes/payments';
import type { Auth, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dasbor', href: dashboard() }];

type DashboardProps = {
    stats: {
        total_clients: number;
        company_clients: number;
        active_cases: number;
        completed_cases: number;
        received_amount: number;
        lunas_count: number;
        receivable_amount: number;
        unpaid_count: number;
    };
    stageDistribution: {
        key: string;
        order: number;
        label: string;
        count: number;
    }[];
    recentCases: {
        id: number;
        nomor: string;
        client_name: string;
        jenis_akta: string;
        current_stage_order: number;
        current_stage_label: string;
        is_completed: boolean;
        biaya: number;
        terbayar: number;
        created_at: string;
    }[];
    pendingSummary: {
        total: number;
        payments: number;
        drafts: number;
        documents?: number;
        awaiting_notaris?: number;
    } | null;
};

export default function Dashboard({
    stats,
    stageDistribution,
    recentCases,
    pendingSummary,
}: DashboardProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const maxStageCount = Math.max(1, ...stageDistribution.map((s) => s.count));
    const totalActiveInPipeline = stageDistribution.reduce(
        (sum, s) => sum + s.count,
        0,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dasbor — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Luxury Executive Hero Header */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs md:p-6 dark:border-amber-500/20 dark:from-card dark:via-card dark:to-amber-950/20">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10"
                    />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-amber-700 uppercase dark:text-amber-300">
                                Ringkasan Kantor •{' '}
                                {formatDate(new Date().toISOString())}
                            </div>
                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                Dasbor Operasional
                            </h1>
                            <p className="max-w-2xl text-sm text-muted-foreground">
                                Pantau data klien, progres 10 tahapan akta, dan
                                arus pembayaran secara real-time.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-amber-500/30 hover:bg-amber-500/10"
                            >
                                <Link href={clients.create()}>
                                    <Plus className="mr-1.5 size-4" />
                                    Tambah Klien
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="sm"
                                className="rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white shadow-sm shadow-amber-900/15 hover:brightness-105 dark:from-amber-400 dark:via-amber-500 dark:to-amber-600 dark:text-stone-950"
                            >
                                <Link href={cases.index()}>
                                    Buka Monitoring Akta
                                    <ArrowUpRight className="ml-1 size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Stat Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Klien"
                        value={stats.total_clients}
                        note={`${stats.company_clients} badan usaha`}
                        icon={<Users className="size-4" />}
                        href={clients.index()}
                    />
                    <StatCard
                        label="Berkas Aktif"
                        value={stats.active_cases}
                        note={`${stats.completed_cases} selesai & lunas`}
                        icon={<Clock className="size-4" />}
                        href={cases.index()}
                    />
                    <StatCard
                        label="Dana Diterima"
                        value={formatRupiah(stats.received_amount)}
                        note={`${stats.lunas_count} termin lunas (ACC)`}
                        valueClassName="text-emerald-600 dark:text-emerald-400 text-xl"
                        icon={<CheckCircle2 className="size-4" />}
                        href={payments.index({ query: { status: 'lunas' } })}
                    />
                    <StatCard
                        label="Piutang / Menunggu"
                        value={formatRupiah(stats.receivable_amount)}
                        note={`${stats.unpaid_count} termin belum lunas`}
                        valueClassName="text-amber-600 dark:text-amber-400 text-xl"
                        icon={<Wallet className="size-4" />}
                        href={payments.index()}
                    />
                </div>

                {/* Notaris Pending Approval Alert */}
                {auth?.user?.is_notaris &&
                    pendingSummary &&
                    pendingSummary.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/12 via-amber-400/6 to-transparent p-4 shadow-xs dark:border-amber-400/30 dark:from-amber-400/12 dark:via-amber-500/6">
                            <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    <AlertCircle className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <span>
                                            {pendingSummary.total} item menunggu
                                            tindakan Notaris
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className="size-2 animate-pulse rounded-full bg-amber-500"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>
                                            {pendingSummary.payments} pembayaran
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {pendingSummary.documents ?? 0}{' '}
                                            verifikasi dokumen
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {pendingSummary.drafts} draf akta
                                        </span>
                                        {(pendingSummary.awaiting_notaris ??
                                            0) > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    {
                                                        pendingSummary.awaiting_notaris
                                                    }{' '}
                                                    pengesahan minuta/akhir
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                asChild
                                size="sm"
                                className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:brightness-105 dark:from-amber-400 dark:to-amber-600 dark:text-stone-950"
                            >
                                <Link href={approvals.index()}>
                                    Tinjau Persetujuan
                                    <ChevronRight className="ml-1 size-4" />
                                </Link>
                            </Button>
                        </div>
                    )}

                {/* Main Analytics & Recent Cases Grid */}
                <div className="grid gap-6 lg:grid-cols-5">
                    {/* Interactive 10-Stage Pipeline Distribution */}
                    <div className="rounded-2xl border border-amber-500/15 bg-card p-5 shadow-xs lg:col-span-2 dark:border-amber-500/15">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Sebaran 10 Tahapan Akta Aktif
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Klik tahap untuk memfilter berkas aktif (
                                    {totalActiveInPipeline} berkas)
                                </p>
                            </div>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                <FileCheck2 className="size-4" />
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {stageDistribution.map((s) => (
                                <Link
                                    key={s.key}
                                    href={cases.index({
                                        query: { stage: s.key },
                                    })}
                                    className="group block rounded-xl px-2.5 py-1.5 transition-colors hover:bg-amber-500/8 dark:hover:bg-amber-400/10"
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                        <span className="truncate font-medium transition-colors group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                            {s.order}. {s.label}
                                        </span>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                                                s.count > 0
                                                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {s.count}
                                        </span>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label={`${s.order}. ${s.label}`}
                                        aria-valuenow={s.count}
                                        aria-valuemin={0}
                                        aria-valuemax={maxStageCount}
                                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80"
                                    >
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 transition-all duration-300 dark:from-amber-400 dark:to-amber-600"
                                            style={{
                                                width: `${s.count > 0 ? Math.max(8, Math.round((s.count / maxStageCount) * 100)) : 0}%`,
                                            }}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Cases Card */}
                    <div className="rounded-2xl border border-amber-500/15 bg-card p-5 shadow-xs lg:col-span-3 dark:border-amber-500/15">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Berkas Akta Terbaru
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Progres tahapan dan status pembayaran
                                    terkini
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-amber-500/25 text-xs hover:bg-amber-500/10"
                            >
                                <Link href={cases.index()}>
                                    Lihat Semua
                                    <ChevronRight className="ml-1 size-3.5" />
                                </Link>
                            </Button>
                        </div>

                        {recentCases.length === 0 ? (
                            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                                Belum ada berkas proses akta. Mulai dari menu
                                Data Klien atau Monitoring Akta.
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card List */}
                                <div className="space-y-3 md:hidden">
                                    {recentCases.map((c) => {
                                        const sisa = Math.max(
                                            0,
                                            Number(c.biaya) -
                                                Number(c.terbayar),
                                        );
                                        return (
                                            <Link
                                                key={c.id}
                                                href={cases.show(c.id)}
                                                className="block space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-colors hover:border-amber-500/35 hover:bg-amber-500/5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="font-semibold">
                                                            {c.nomor}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {c.client_name} •{' '}
                                                            {c.jenis_akta}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        {formatDate(
                                                            c.created_at,
                                                        )}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <StageBadge
                                                        order={
                                                            c.current_stage_order
                                                        }
                                                        label={
                                                            c.current_stage_label
                                                        }
                                                        isCompleted={
                                                            c.is_completed
                                                        }
                                                    />
                                                    <span
                                                        className={`text-xs font-medium ${
                                                            sisa > 0
                                                                ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        {sisa > 0
                                                            ? `Sisa ${formatRupiah(sisa)}`
                                                            : 'Lunas'}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                <th className="pb-2.5">
                                                    No. Berkas
                                                </th>
                                                <th className="pb-2.5">
                                                    Klien
                                                </th>
                                                <th className="pb-2.5">
                                                    Tahapan
                                                </th>
                                                <th className="pb-2.5">
                                                    Keuangan
                                                </th>
                                                <th className="pb-2.5 text-right">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {recentCases.map((c) => {
                                                const biaya = Number(c.biaya);
                                                const terbayar = Number(
                                                    c.terbayar,
                                                );
                                                const sisa = Math.max(
                                                    0,
                                                    biaya - terbayar,
                                                );
                                                const pct =
                                                    biaya > 0
                                                        ? Math.min(
                                                              100,
                                                              Math.round(
                                                                  (terbayar /
                                                                      biaya) *
                                                                      100,
                                                              ),
                                                          )
                                                        : 0;
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        className="transition-colors hover:bg-amber-500/5"
                                                    >
                                                        <td className="py-3 pr-3">
                                                            <Link
                                                                href={cases.show(
                                                                    c.id,
                                                                )}
                                                                className="font-semibold hover:text-primary hover:underline"
                                                            >
                                                                {c.nomor}
                                                            </Link>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatDate(
                                                                    c.created_at,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <div className="font-medium">
                                                                {c.client_name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {c.jenis_akta}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <StageBadge
                                                                order={
                                                                    c.current_stage_order
                                                                }
                                                                label={
                                                                    c.current_stage_label
                                                                }
                                                                isCompleted={
                                                                    c.is_completed
                                                                }
                                                            />
                                                        </td>
                                                        <td className="py-3 pr-3 text-xs">
                                                            <div className="font-medium tabular-nums">
                                                                {formatRupiah(
                                                                    terbayar,
                                                                )}
                                                            </div>
                                                            <div className="my-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        sisa > 0
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-emerald-500'
                                                                    }`}
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <div
                                                                className={
                                                                    sisa > 0
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                                }
                                                            >
                                                                {sisa > 0
                                                                    ? `Sisa ${formatRupiah(sisa)}`
                                                                    : 'Lunas'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="outline"
                                                                className="rounded-lg border-amber-500/25 hover:bg-amber-500/10"
                                                            >
                                                                <Link
                                                                    href={cases.show(
                                                                        c.id,
                                                                    )}
                                                                >
                                                                    Buka
                                                                </Link>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
