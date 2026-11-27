import { Head, Link, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, FileCheck2, Users, Wallet } from 'lucide-react';
import { StageBadge } from '@/components/notaris/stage-badge';
import { StatCard } from '@/components/notaris/stat-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import { dashboard } from '@/routes';
import approvals from '@/routes/approvals';
import cases from '@/routes/cases';
import type { Auth, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dasbor', href: dashboard() },
];

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
    } | null;
};

export default function Dashboard({ stats, stageDistribution, recentCases, pendingSummary }: DashboardProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const maxStageCount = Math.max(1, ...stageDistribution.map((s) => s.count));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dasbor — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Dasbor Operasional</h1>
                        <p className="text-sm text-muted-foreground">
                            Ringkasan data klien, monitoring 10 tahapan akta, dan keuangan kantor.
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href={cases.index()}>Buka Monitoring Akta</Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Klien"
                        value={stats.total_clients}
                        note={`${stats.company_clients} badan usaha`}
                        icon={<Users className="size-4" />}
                    />
                    <StatCard
                        label="Berkas Aktif"
                        value={stats.active_cases}
                        note={`${stats.completed_cases} selesai & lunas`}
                        icon={<Clock className="size-4" />}
                    />
                    <StatCard
                        label="Dana Diterima"
                        value={formatRupiah(stats.received_amount)}
                        note={`${stats.lunas_count} termin lunas (ACC)`}
                        valueClassName="text-emerald-600 dark:text-emerald-400 text-xl"
                        icon={<CheckCircle2 className="size-4" />}
                    />
                    <StatCard
                        label="Piutang / Menunggu"
                        value={formatRupiah(stats.receivable_amount)}
                        note={`${stats.unpaid_count} termin belum lunas`}
                        valueClassName="text-amber-600 dark:text-amber-400 text-xl"
                        icon={<Wallet className="size-4" />}
                    />
                </div>

                {auth?.user?.is_notaris && pendingSummary && pendingSummary.total > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <div className="text-sm font-semibold">
                                    {pendingSummary.total} item menunggu persetujuan Notaris
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {pendingSummary.payments} konfirmasi pembayaran • {pendingSummary.drafts} persetujuan draf akta • {pendingSummary.documents ?? 0} verifikasi dokumen
                                </div>
                            </div>
                        </div>
                        <Button asChild size="sm" variant="default">
                            <Link href={approvals.index()}>Tinjau Persetujuan</Link>
                        </Button>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 lg:col-span-2 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Sebaran 10 Tahapan Akta Aktif</h2>
                            <FileCheck2 className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-2.5">
                            {stageDistribution.map((s) => (
                                <div key={s.key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="truncate font-medium">
                                            {s.order}. {s.label}
                                        </span>
                                        <span className="ml-2 font-semibold tabular-nums">{s.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{ width: `${Math.round((s.count / maxStageCount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 lg:col-span-3 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Berkas Akta Terbaru</h2>
                            <Button asChild variant="ghost" size="sm">
                                <Link href={cases.index()}>Lihat Semua</Link>
                            </Button>
                        </div>

                        {recentCases.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                Belum ada berkas proses akta. Mulai dari menu Data Klien atau Monitoring Akta.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs text-muted-foreground">
                                            <th className="pb-2 font-medium">No. Berkas</th>
                                            <th className="pb-2 font-medium">Klien</th>
                                            <th className="pb-2 font-medium">Tahapan</th>
                                            <th className="pb-2 font-medium">Keuangan</th>
                                            <th className="pb-2 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {recentCases.map((c) => {
                                            const sisa = Math.max(0, Number(c.biaya) - Number(c.terbayar));
                                            return (
                                                <tr key={c.id} className="hover:bg-muted/40">
                                                    <td className="py-2.5 pr-3">
                                                        <div className="font-semibold">{c.nomor}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDate(c.created_at)}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        <div className="font-medium">{c.client_name}</div>
                                                        <div className="text-xs text-muted-foreground">{c.jenis_akta}</div>
                                                    </td>
                                                    <td className="py-2.5 pr-3">
                                                        <StageBadge
                                                            order={c.current_stage_order}
                                                            label={c.current_stage_label}
                                                            isCompleted={c.is_completed}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-xs">
                                                        <div>{formatRupiah(c.terbayar)}</div>
                                                        <div className={sisa > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}>
                                                            {sisa > 0 ? `Sisa ${formatRupiah(sisa)}` : 'Lunas'}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 text-right">
                                                        <Button asChild size="sm" variant="outline">
                                                            <Link href={cases.show(c.id)}>Buka</Link>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
