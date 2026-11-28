import { Moon, Sun } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-amber-500/20 bg-gradient-to-r from-background/95 via-background/90 to-amber-50/35 px-4 shadow-2xs backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6 dark:to-amber-950/15">
            {/* Subtle bottom gold hairline glow */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent"
            />

            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 size-9 shrink-0 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent text-amber-700 shadow-2xs transition-all duration-200 hover:border-amber-500/55 hover:from-amber-500/22 hover:text-amber-800 active:scale-95 dark:border-amber-400/25 dark:from-amber-400/12 dark:text-amber-300 dark:hover:border-amber-400/50 dark:hover:text-amber-200" />
                <span
                    aria-hidden="true"
                    className="h-5 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-amber-400/15 via-amber-500/55 to-amber-400/15"
                />
                <div className="min-w-0 truncate rounded-xl border border-amber-500/20 bg-card/70 px-3 py-1 shadow-2xs dark:border-amber-400/15 dark:bg-stone-900/60">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            {/* Luxury Icon-Only Light / Dark Toggle Switch */}
            <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label={
                    isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
                }
                title={
                    isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'
                }
                onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                className="group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-between rounded-full border border-amber-500/30 bg-card/85 p-1 shadow-xs transition-all duration-200 hover:border-amber-500/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-amber-400/30 dark:bg-stone-900/85"
            >
                {/* Sliding metallic gold thumb */}
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
    );
}
