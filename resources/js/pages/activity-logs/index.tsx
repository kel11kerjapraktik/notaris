import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    Clock,
    Download,
    History,
    LoaderCircle,
    RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/notaris/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import AppLayout from '@/layouts/app-layout';
import { exportCsv, formatDateTime } from '@/lib/format';
import activityLogs from '@/routes/activity-logs';
import type { ActivityLogItem, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Log Aktivitas', href: activityLogs.index() },
];

type Props = {
    logs: ActivityLogItem[];
    limit?: number;
    step?: number;
    maxLimit?: number;
    hasMore?: boolean;
    filters?: {
        search?: string;
        role?: string;
    };
};

export default function ActivityLogsIndex({
    logs,
    limit = 15,
    step = 15,
    maxLimit = 150,
    hasMore = false,
    filters = {},
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? 'semua');
    const [loadingMore, setLoadingMore] = useState(false);

    const visitLogs = (
        nextSearch: string,
        nextRole: string,
        nextLimit: number,
        isLoadMore = false,
    ) => {
        const query: Record<string, string | number> = {};
        if (nextSearch.trim() !== '') query.search = nextSearch.trim();
        if (nextRole !== 'semua') query.role = nextRole;
        if (nextLimit !== step) query.limit = nextLimit;

        if (isLoadMore) setLoadingMore(true);

        router.get(activityLogs.index().url, query, {
            preserveState: true,
            preserveScroll: true,
            replace: !isLoadMore,
            onFinish: () => {
                if (isLoadMore) setLoadingMore(false);
            },
        });
    };

    const debouncedSearch = useDebouncedCallback((val: string) => {
        visitLogs(val, role, step);
    }, 300);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        debouncedSearch(val);
    };

    const handleRoleChange = (nextRole: string) => {
        setRole(nextRole);
        visitLogs(search, nextRole, step);
    };

    const handleShowMore = () => {
        const nextLimit = Math.min(limit + step, maxLimit);
        visitLogs(search, role, nextLimit, true);
    };

    const handleCollapse = () => {
        visitLogs(search, role, step, true);
    };

    const handleExport = () => {
        exportCsv(
            'log-aktivitas',
            logs.map((l) => ({
                Waktu: l.created_at,
                Aktivitas: l.action,
                Detail: l.description ?? '',
                Oleh: l.user_name ?? '',
                Peran: l.user_role ?? '',
            })),
        );
    };

    const roleOptions = [
        { key: 'semua', label: 'Semua Peran' },
        { key: 'notaris', label: 'Notaris' },
        { key: 'staf', label: 'Admin / Staf' },
    ];

    const canLoadMore = hasMore && limit < maxLimit;
    const nextBatchSize = Math.min(step, maxLimit - limit);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Log Aktivitas — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-sm dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/12 text-amber-700 shadow-xs sm:flex dark:bg-amber-500/15 dark:text-amber-300">
                                <History className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                    Jejak Audit Sistem
                                </p>
                                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                    Log Aktivitas
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Rekam jejak perubahan data klien, dokumen,
                                    tahapan akta, dan keuangan secara
                                    kronologis.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={logs.length === 0}
                        >
                            <Download className="mr-1.5 size-4" /> Ekspor CSV
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-card/90 p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {roleOptions.map((opt) => (
                            <Button
                                key={opt.key}
                                type="button"
                                size="sm"
                                variant={role === opt.key ? 'default' : 'ghost'}
                                onClick={() => handleRoleChange(opt.key)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SearchInput
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Cari aktivitas, detail, atau pelaku…"
                            ariaLabel="Cari log aktivitas"
                            className="flex-1 sm:w-64 lg:flex-none"
                        />
                        <Badge
                            variant="secondary"
                            className="border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-800 dark:text-amber-300"
                        >
                            {logs.length} tampil
                        </Badge>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                            <span className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <History className="size-5" />
                            </span>
                            <span>
                                {search || role !== 'semua'
                                    ? 'Tidak ditemukan aktivitas sesuai filter.'
                                    : 'Belum ada aktivitas tercatat.'}
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Tampilan mobile */}
                            <div className="divide-y divide-border/70 md:hidden">
                                {logs.map((l) => {
                                    const isNotarisActor =
                                        l.user_role === 'notaris';
                                    return (
                                        <div
                                            key={l.id}
                                            className="space-y-2 p-4 transition-colors hover:bg-amber-500/5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                                    <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                                                    <span>{l.action}</span>
                                                </div>
                                                <Badge
                                                    variant={
                                                        isNotarisActor
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                    className={
                                                        isNotarisActor
                                                            ? 'shrink-0 border border-amber-500/30 bg-amber-500/12 text-[10px] font-semibold text-amber-800 uppercase dark:text-amber-300'
                                                            : 'shrink-0 text-[10px] uppercase'
                                                    }
                                                >
                                                    {l.user_role || 'staf'}
                                                </Badge>
                                            </div>
                                            {l.description && (
                                                <p className="pl-4 text-xs leading-relaxed text-muted-foreground">
                                                    {l.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pl-4 text-[11px] text-muted-foreground">
                                                <span>
                                                    Oleh:{' '}
                                                    <strong className="font-medium text-foreground/85">
                                                        {l.user_name || '-'}
                                                    </strong>
                                                </span>
                                                <span className="inline-flex items-center gap-1 tabular-nums">
                                                    <Clock className="size-3" />
                                                    {formatDateTime(
                                                        l.created_at,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tampilan desktop */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-amber-500/15 bg-amber-500/5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            <th className="px-4 py-3 whitespace-nowrap">
                                                Waktu
                                            </th>
                                            <th className="px-4 py-3 whitespace-nowrap">
                                                Aktivitas
                                            </th>
                                            <th className="px-4 py-3">
                                                Detail
                                            </th>
                                            <th className="px-4 py-3 whitespace-nowrap">
                                                Oleh
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/70">
                                        {logs.map((l) => {
                                            const isNotarisActor =
                                                l.user_role === 'notaris';
                                            return (
                                                <tr
                                                    key={l.id}
                                                    className="transition-colors hover:bg-amber-500/5"
                                                >
                                                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock className="size-3.5 text-amber-600/75 dark:text-amber-400/75" />
                                                            {formatDateTime(
                                                                l.created_at,
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold whitespace-nowrap text-foreground">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            {l.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 leading-relaxed text-muted-foreground">
                                                        {l.description || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="font-medium text-foreground/90">
                                                            {l.user_name || '-'}
                                                        </span>
                                                        <Badge
                                                            variant={
                                                                isNotarisActor
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                            }
                                                            className={
                                                                isNotarisActor
                                                                    ? 'ml-2 border border-amber-500/30 bg-amber-500/12 text-[10px] font-semibold text-amber-800 uppercase dark:text-amber-300'
                                                                    : 'ml-2 text-[10px] uppercase'
                                                            }
                                                        >
                                                            {l.user_role ||
                                                                'staf'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer kontrol paginasi bertahap */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-500/15 bg-amber-500/[0.03] px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    Menampilkan{' '}
                                    <strong className="font-semibold text-foreground">
                                        {logs.length}
                                    </strong>{' '}
                                    log aktivitas terbaru
                                    {hasMore && limit >= maxLimit
                                        ? ` (batas maksimum ${maxLimit} log per tampilan)`
                                        : ''}
                                    .
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {limit > step && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={loadingMore}
                                            onClick={handleCollapse}
                                        >
                                            <RotateCcw className="mr-1.5 size-3.5" />
                                            Ringkas ({step})
                                        </Button>
                                    )}
                                    {canLoadMore && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={loadingMore}
                                            onClick={handleShowMore}
                                        >
                                            {loadingMore ? (
                                                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                                            ) : (
                                                <ChevronDown className="mr-1.5 size-3.5" />
                                            )}
                                            Tampilkan {nextBatchSize} Lagi
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
