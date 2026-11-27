import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { exportCsv, formatDateTime } from '@/lib/format';
import activityLogs from '@/routes/activity-logs';
import type { ActivityLogItem, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Log Aktivitas', href: activityLogs.index() },
];

export default function ActivityLogsIndex({ logs }: { logs: ActivityLogItem[] }) {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Log Aktivitas — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Log Aktivitas</h1>
                        <p className="text-sm text-muted-foreground">
                            Jejak perubahan data klien, dokumen, tahapan akta, dan keuangan ({logs.length} tercatat).
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
                        <Download className="mr-1.5 size-4" /> Ekspor CSV
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                    {logs.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Belum ada aktivitas tercatat.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Waktu</th>
                                        <th className="px-4 py-3 font-medium">Aktivitas</th>
                                        <th className="px-4 py-3 font-medium">Detail</th>
                                        <th className="px-4 py-3 font-medium">Oleh</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.map((l) => (
                                        <tr key={l.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                                                {formatDateTime(l.created_at)}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium">{l.action}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{l.description || '-'}</td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <span>{l.user_name || '-'}</span>{' '}
                                                <Badge variant="outline" className="ml-1 text-[10px] uppercase">
                                                    {l.user_role || 'staf'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
