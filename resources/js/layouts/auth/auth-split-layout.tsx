import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    FileCheck2,
    FolderArchive,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const highlights = [
    {
        icon: FileCheck2,
        title: 'Monitoring 10 Tahap Akta',
        desc: 'Pantau alur berkas secara real-time dari biodata hingga selesai.',
    },
    {
        icon: ShieldCheck,
        title: 'Otorisasi Resmi Notaris',
        desc: 'Validasi terpusat untuk dokumen klien, draf akta, minuta & termin.',
    },
    {
        icon: FolderArchive,
        title: 'Pengarsipan Digital Rapi',
        desc: 'Folder klien terstruktur, BAST serah terima & cetak dokumen resmi.',
    },
];

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="relative grid h-dvh w-full overflow-x-hidden overflow-y-auto lg:grid-cols-12">
            {/* Layer Kiri: Showcase Brand Obsidian & Emas */}
            <section className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-amber-500/20 bg-gradient-to-br from-[#120F0A] via-[#0C0A07] to-[#17120A] p-8 text-amber-50 lg:col-span-6 lg:flex xl:p-12">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.20),transparent_60%)]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_75%_at_50%_45%,black_25%,transparent_100%)] bg-[size:52px_52px]"
                />

                <Link
                    href={home()}
                    className="relative z-10 flex w-fit items-center gap-3 transition-opacity hover:opacity-90"
                >
                    <AppLogoIcon className="size-10 shrink-0 shadow-lg shadow-black/40" />
                    <div className="leading-tight">
                        <div className="font-serif text-lg font-bold tracking-tight text-amber-50">
                            Notaris{' '}
                            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                                Suite
                            </span>
                        </div>
                        <div className="text-[11px] font-medium tracking-wider text-amber-400/90 uppercase">
                            Nurul Huda Nelson, S.H., M.Kn.
                        </div>
                    </div>
                </Link>

                <div className="relative z-10 my-auto max-w-lg space-y-6">
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
                            <Sparkles className="size-3 text-amber-400" />
                            Kantor Notaris &amp; PPAT
                        </span>
                        <h2 className="font-serif text-[clamp(1.8rem,2.6vw,2.6rem)] leading-[1.12] font-bold tracking-tight text-amber-50">
                            Presisi Hukum dalam{' '}
                            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                                Setiap Tahap Akta
                            </span>
                        </h2>
                        <p className="text-sm leading-relaxed text-amber-100/75">
                            Platform kerja internal untuk menjaga ketertiban
                            alur pembuatan akta, validasi Notaris, hingga
                            pengarsipan dokumen hukum klien.
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        {highlights.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="flex items-start gap-3.5 rounded-2xl border border-amber-500/15 bg-white/[0.03] px-4 py-3 backdrop-blur-xs"
                                >
                                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15 text-amber-300">
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-amber-50">
                                            {item.title}
                                        </div>
                                        <div className="mt-0.5 text-xs leading-snug text-amber-100/65">
                                            {item.desc}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-amber-100/60">
                    Notaris Suite • Kantor Notaris &amp; PPAT Nurul Huda Nelson,
                    S.H., M.Kn.
                </div>
            </section>

            {/* Layer Kanan: Panel Input Autentikasi */}
            <section className="relative flex h-full min-h-0 flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#FCF9F3] px-5 py-5 sm:px-10 lg:col-span-6 lg:px-12 lg:py-7 dark:bg-[#090806]">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(217,119,6,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(245,158,11,0.14),transparent_70%)]"
                />

                <header className="relative z-10 flex items-center justify-between gap-3">
                    <Link
                        href={home()}
                        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-3.5" />
                        <span>Kembali ke Beranda</span>
                    </Link>

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
                </header>

                <div className="relative z-10 mx-auto my-auto w-full max-w-md py-4">
                    <div className="rounded-2xl border border-amber-500/20 bg-card/90 p-6 shadow-lg backdrop-blur-md sm:p-8">
                        <div className="mb-6 flex flex-col items-center gap-3 text-center">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 lg:hidden"
                            >
                                <AppLogoIcon className="size-12 shadow-md shadow-amber-950/20" />
                                <span className="font-serif text-base font-bold tracking-tight">
                                    <span className="text-foreground">
                                        Notaris
                                    </span>{' '}
                                    <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-amber-500">
                                        Suite
                                    </span>
                                </span>
                            </Link>
                            <div className="space-y-1.5">
                                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                                    {title}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {children}
                    </div>
                </div>

                <div className="relative z-10 text-center text-[11px] text-muted-foreground lg:hidden">
                    Notaris Suite • Nurul Huda Nelson, S.H., M.Kn.
                </div>
            </section>
        </div>
    );
}
