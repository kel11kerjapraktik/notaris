import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { CurrencyInput } from '@/components/notaris/currency-input';
import { SearchInput } from '@/components/notaris/search-input';
import { StageBadge } from '@/components/notaris/stage-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import AppLayout from '@/layouts/app-layout';
import { exportCsv, formatDate, formatRupiah } from '@/lib/format';
import casesRoute from '@/routes/cases';
import type { Auth, BreadcrumbItem, NotarisConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Monitoring Akta', href: casesRoute.index() },
];

type CaseRow = {
    id: number;
    nomor: string;
    client_id: number;
    client_name: string;
    jenis_akta: string;
    is_badan_usaha: boolean;
    biaya: number;
    terbayar: number;
    target_selesai: string | null;
    penanggung_jawab: string | null;
    current_stage: string;
    current_stage_order: number;
    current_stage_label: string;
    is_completed: boolean;
    draft_status: string;
    created_at: string;
};

export default function CasesIndex({
    cases,
    clients,
    filters,
}: {
    cases: CaseRow[];
    clients: { id: number; kode: string; label: string }[];
    filters: { search: string; stage: string };
}) {
    const { auth, notarisConfig } = usePage<{
        auth: Auth;
        notarisConfig: NotarisConfig;
    }>().props;

    const [search, setSearch] = useState(filters.search ?? '');
    const [stage, setStage] = useState(filters.stage ?? 'semua');
    const [createOpen, setCreateOpen] = useState(false);

    const form = useForm({
        client_id: clients[0]?.id ? String(clients[0].id) : '',
        jenis_akta: notarisConfig.jenisAkta[0]?.label ?? 'Akta Pendirian PT',
        biaya: '',
        target_selesai: '',
        penanggung_jawab: auth.user.name,
        catatan: '',
    });

    const applyFilter = (nextSearch: string, nextStage: string) => {
        const params: Record<string, string> = {};
        if (nextSearch) params.search = nextSearch;
        if (nextStage !== 'semua') params.stage = nextStage;
        router.get(casesRoute.index().url, params, {
            preserveState: true,
            replace: true,
        });
    };

    const debouncedApplyFilter = useDebouncedCallback(applyFilter, 300);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(casesRoute.store().url, {
            onSuccess: () => setCreateOpen(false),
        });
    };

    const handleExport = () => {
        exportCsv(
            'monitoring-akta',
            cases.map((c) => ({
                NoBerkas: c.nomor,
                Klien: c.client_name,
                JenisAkta: c.jenis_akta,
                Tahapan: c.is_completed
                    ? 'Selesai & Lunas'
                    : `${c.current_stage_order}. ${c.current_stage_label}`,
                Biaya: c.biaya,
                Terbayar: c.terbayar,
                Sisa: Math.max(0, c.biaya - c.terbayar),
                Target: c.target_selesai ?? '',
                PJ: c.penanggung_jawab ?? '',
            })),
        );
    };

    const selectCls =
        'flex h-9 w-full rounded-xl border border-input bg-background/85 px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Monitoring Akta — Notaris Suite" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                                Monitoring 10 Tahapan
                            </p>
                            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                Monitoring Proses Akta
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Pantau 10 tahapan akta dari pengisian biodata
                                klien hingga pelunasan biaya.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={cases.length === 0}
                            >
                                <Download className="mr-1.5 size-4" /> Ekspor
                                CSV
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setCreateOpen(true)}
                                disabled={clients.length === 0}
                                title={
                                    clients.length === 0
                                        ? 'Tambahkan data klien terlebih dahulu'
                                        : undefined
                                }
                            >
                                <Plus className="mr-1.5 size-4" /> Berkas Baru
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/15 bg-card/85 p-3 shadow-xs">
                    <SearchInput
                        value={search}
                        onChange={(val) => {
                            setSearch(val);
                            debouncedApplyFilter(val, stage);
                        }}
                        placeholder="Cari nomor / klien / jenis…"
                        ariaLabel="Cari berkas akta berdasarkan nomor, klien, atau jenis"
                        className="flex-1 sm:max-w-xs"
                    />
                    <select
                        className={`${selectCls} sm:max-w-64`}
                        aria-label="Filter tahapan akta"
                        value={stage}
                        onChange={(e) => {
                            setStage(e.target.value);
                            applyFilter(search, e.target.value);
                        }}
                    >
                        <option value="semua">Semua Tahapan Aktif</option>
                        {notarisConfig.stages.map((s) => (
                            <option key={s.key} value={s.key}>
                                {s.order}. {s.label}
                            </option>
                        ))}
                        <option value="selesai">
                            ✓ Seluruh Tahapan Selesai (Arsip)
                        </option>
                    </select>
                    {(search !== '' || stage !== 'semua') && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                setStage('semua');
                                applyFilter('', 'semua');
                            }}
                        >
                            Reset Filter
                        </Button>
                    )}
                    <Badge
                        variant="secondary"
                        className="border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    >
                        {cases.length} berkas
                    </Badge>
                </div>

                {search && (
                    <div className="text-xs text-muted-foreground">
                        Menampilkan hasil pencarian dari{' '}
                        <strong>seluruh berkas</strong> (termasuk berkas yang
                        sudah selesai &amp; diarsipkan).
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs">
                    {cases.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {clients.length === 0
                                ? 'Tambahkan data klien terlebih dahulu sebelum membuat berkas akta.'
                                : 'Belum ada berkas proses akta.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-amber-500/15 bg-amber-500/5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="px-4 py-3">
                                            No. Berkas
                                        </th>
                                        <th className="px-4 py-3">Klien</th>
                                        <th className="px-4 py-3">
                                            Jenis Akta
                                        </th>
                                        <th className="px-4 py-3">Progres</th>
                                        <th className="px-4 py-3 font-medium">
                                            Status Tahapan
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Keuangan
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cases.map((c) => {
                                        const pct = c.is_completed
                                            ? 100
                                            : Math.round(
                                                  (c.current_stage_order /
                                                      notarisConfig.stages
                                                          .length) *
                                                      100,
                                              );
                                        const sisa = Math.max(
                                            0,
                                            Number(c.biaya) -
                                                Number(c.terbayar),
                                        );
                                        return (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">
                                                        {c.nomor}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            c.created_at,
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {c.client_name}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {c.jenis_akta}
                                                </td>
                                                <td className="min-w-28 px-4 py-3">
                                                    <div
                                                        role="progressbar"
                                                        aria-label={`Progres ${c.nomor}`}
                                                        aria-valuenow={pct}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        {pct}%
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
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
                                                    {c.draft_status ===
                                                        'pending_approval' && (
                                                        <div className="mt-1">
                                                            <Badge
                                                                variant="outline"
                                                                className="border-amber-300 text-[10px] text-amber-700"
                                                            >
                                                                Menunggu ACC
                                                                Draf
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <div>
                                                        {formatRupiah(
                                                            c.terbayar,
                                                        )}{' '}
                                                        /{' '}
                                                        {formatRupiah(c.biaya)}
                                                    </div>
                                                    <div
                                                        className={
                                                            sisa > 0
                                                                ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-emerald-600'
                                                        }
                                                    >
                                                        {sisa > 0
                                                            ? `Sisa ${formatRupiah(sisa)}`
                                                            : 'Lunas'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button asChild size="sm">
                                                        <Link
                                                            href={casesRoute.show(
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
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Buat Berkas Proses Akta</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="case-client-id">Klien *</Label>
                            <select
                                id="case-client-id"
                                className={selectCls}
                                value={form.data.client_id}
                                onChange={(e) =>
                                    form.setData('client_id', e.target.value)
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
                            <Label htmlFor="case-jenis-akta">
                                Jenis Akta / Layanan *
                            </Label>
                            <select
                                id="case-jenis-akta"
                                className={selectCls}
                                value={form.data.jenis_akta}
                                onChange={(e) =>
                                    form.setData('jenis_akta', e.target.value)
                                }
                                required
                            >
                                {notarisConfig.jenisAkta.map((j) => (
                                    <option key={j.label} value={j.label}>
                                        {j.label}{' '}
                                        {j.is_badan_usaha
                                            ? '(Badan Usaha)'
                                            : '(Non-Badan Usaha)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="case-biaya">Biaya (Rp) *</Label>
                                <CurrencyInput
                                    id="case-biaya"
                                    minAmount={1}
                                    placeholder="5.000.000"
                                    value={form.data.biaya}
                                    onValueChange={(val) =>
                                        form.setData('biaya', val)
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="case-target-selesai">
                                    Target Selesai
                                </Label>
                                <Input
                                    id="case-target-selesai"
                                    type="date"
                                    value={form.data.target_selesai}
                                    onChange={(e) =>
                                        form.setData(
                                            'target_selesai',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="case-penanggung-jawab">
                                Penanggung Jawab
                            </Label>
                            <Input
                                id="case-penanggung-jawab"
                                value={form.data.penanggung_jawab}
                                onChange={(e) =>
                                    form.setData(
                                        'penanggung_jawab',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="case-catatan">
                                Catatan / Uraian Pekerjaan
                            </Label>
                            <textarea
                                id="case-catatan"
                                className="flex min-h-20 w-full rounded-xl border border-input bg-background/85 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none"
                                value={form.data.catatan}
                                onChange={(e) =>
                                    form.setData('catatan', e.target.value)
                                }
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Menyimpan…' : 'Buat Berkas'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
