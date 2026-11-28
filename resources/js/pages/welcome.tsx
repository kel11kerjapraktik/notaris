import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    FileCheck2,
    FolderArchive,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage<{ auth: { user: { name: string } | null } }>()
        .props;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const features = [
        {
            step: '01',
            icon: FileCheck2,
            title: '10 Tahap Akta',
            desc: 'Pantau progres berkas akta secara real-time dari awal hingga selesai.',
        },
        {
            step: '02',
            icon: ShieldCheck,
            title: 'Otorisasi Notaris',
            desc: 'Validasi resmi dokumen klien, draf akta, minuta, serta termin biaya.',
        },
        {
            step: '03',
            icon: FolderArchive,
            title: 'Pengarsipan Rapi',
            desc: 'Arsip folder klien terstruktur, BAST serah terima, dan cetak laporan.',
        },
    ];

    return (
        <>
            <Head title="Notaris Suite — Nurul Huda Nelson, S.H., M.Kn." />
            <div className="relative flex h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[#FCF9F3] text-foreground dark:bg-[#090806]">
                {/* Satu Background Utuh: Cahaya Mahkota Emas + Grid Arsitektural Halus */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,rgba(217,119,6,0.14),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,rgba(245,158,11,0.18),transparent_70%)]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(180,130,40,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(180,130,40,0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_45%,black_30%,transparent_100%)] bg-[size:56px_56px] dark:bg-[linear-gradient(to_right,rgba(245,158,11,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.055)_1px,transparent_1px)]"
                />

                <header className="relative z-20 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-3 px-4 py-3.5 sm:px-8 lg:py-4">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <AppLogoIcon className="size-8 shrink-0 shadow-md shadow-amber-950/20 sm:size-9" />
                        <div className="min-w-0 leading-tight">
                            <div className="truncate font-serif text-base font-bold tracking-tight sm:text-lg">
                                <span className="text-foreground">Notaris</span>{' '}
                                <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-amber-500">
                                    Suite
                                </span>
                            </div>
                            <div className="truncate text-[10px] font-medium tracking-wider text-amber-700 uppercase sm:text-[11px] dark:text-amber-400/90">
                                Nurul Huda Nelson, S.H., M.Kn.
                            </div>
                        </div>
                    </div>

                    <nav className="flex shrink-0 items-center gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isDark}
                            onClick={() =>
                                updateAppearance(isDark ? 'light' : 'dark')
                            }
                            aria-label={
                                isDark
                                    ? 'Aktifkan mode terang'
                                    : 'Aktifkan mode gelap'
                            }
                            className="group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-between rounded-full border border-amber-500/30 bg-card/85 p-1 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-amber-500/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-amber-400/30 dark:bg-stone-900/85"
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute top-1 left-1 size-6 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-700 shadow-sm transition-transform duration-200 dark:from-amber-300 dark:via-amber-500 dark:to-amber-600 ${
                                    isDark ? 'translate-x-6' : 'translate-x-0'
                                }`}
                            />
                            <span
                                className={`relative z-10 flex size-6 items-center justify-center transition-colors duration-200 ${
                                    !isDark
                                        ? 'text-white'
                                        : 'text-muted-foreground group-hover:text-amber-300'
                                }`}
                            >
                                <Sun className="size-3.5" />
                            </span>
                            <span
                                className={`relative z-10 flex size-6 items-center justify-center transition-colors duration-200 ${
                                    isDark
                                        ? 'text-stone-950'
                                        : 'text-muted-foreground group-hover:text-amber-700'
                                }`}
                            >
                                <Moon className="size-3.5" />
                            </span>
                        </button>
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 px-4 py-2 text-xs font-semibold text-amber-950 shadow-sm shadow-amber-500/20 transition-all hover:from-amber-500 hover:to-yellow-500 sm:px-5 sm:py-2 sm:text-sm"
                            >
                                <span>Dashboard</span>
                                <ArrowRight className="size-3.5 sm:size-4" />
                            </Link>
                        ) : (
                            <Link
                                href={login()}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 px-4 py-2 text-xs font-semibold text-amber-950 shadow-sm shadow-amber-500/20 transition-all hover:from-amber-500 hover:to-yellow-500 sm:px-5 sm:py-2 sm:text-sm"
                            >
                                <span>Masuk</span>
                                <ArrowRight className="size-3.5 sm:size-4" />
                            </Link>
                        )}
                    </nav>
                </header>

                <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-between px-4 py-3 text-center sm:px-8 sm:py-5 lg:py-[clamp(0.75rem,2.5vh,2rem)]">
                    <div className="my-auto flex w-full flex-col items-center gap-[clamp(1.1rem,3.2vh,2.35rem)]">
                        <div className="flex max-w-3xl flex-col items-center gap-[clamp(0.5rem,1.4vh,1rem)]">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-amber-800 uppercase backdrop-blur-xs sm:text-[11px] dark:text-amber-300">
                                <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                                Kantor Notaris &amp; PPAT
                            </span>

                            <h1 className="font-serif text-[clamp(1.65rem,3.6vw,3.35rem)] leading-[1.1] font-bold tracking-tight text-foreground">
                                Kendali Terpadu Proses Akta,{' '}
                                <span className="bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-amber-500">
                                    Persetujuan &amp; Arsip Digital
                                </span>
                            </h1>

                            <p className="max-w-2xl text-[clamp(0.82rem,1.1vw,0.98rem)] leading-relaxed text-muted-foreground">
                                Platform operasional kantor notaris untuk
                                memantau 10 tahapan akta, verifikasi kelengkapan
                                berkas, pencatatan termin pembayaran, hingga
                                pengarsipan resmi.
                            </p>
                        </div>

                        <div className="grid w-full max-w-4xl grid-cols-1 gap-2.5 text-left sm:grid-cols-3 sm:gap-3.5">
                            {features.map((f) => {
                                const Icon = f.icon;
                                return (
                                    <div
                                        key={f.step}
                                        className="group relative flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-card/75 p-3 shadow-xs backdrop-blur-md transition-all hover:border-amber-500/45 hover:bg-card sm:block sm:p-[clamp(0.75rem,1.6vh,1.15rem)]"
                                    >
                                        <div className="flex shrink-0 items-center justify-between sm:mb-2.5">
                                            <div className="flex size-8 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 transition-colors group-hover:bg-amber-500/15 dark:text-amber-300">
                                                <Icon className="size-4" />
                                            </div>
                                            <span className="hidden font-mono text-[11px] font-semibold text-amber-700/65 sm:inline dark:text-amber-400/65">
                                                {f.step}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-foreground sm:text-sm">
                                                {f.title}
                                            </div>
                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">
                                                {f.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <footer className="shrink-0 pt-2 text-[11px] text-muted-foreground sm:text-xs">
                        Notaris Suite • Kantor Notaris &amp; PPAT Nurul Huda
                        Nelson, S.H., M.Kn.
                    </footer>
                </main>
            </div>
        </>
    );
}
