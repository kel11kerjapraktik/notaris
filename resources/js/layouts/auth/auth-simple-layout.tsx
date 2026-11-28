import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6 md:p-10">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.75_0.12_82_/_0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.78_0.135_82_/_0.10),_transparent_55%)]"
            />
            <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-6 shadow-lg backdrop-blur-sm md:p-8">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2.5 font-medium"
                        >
                            <AppLogoIcon className="size-14 shadow-md shadow-amber-950/20" />
                            <span className="font-serif text-lg font-bold tracking-tight">
                                <span className="text-foreground">Notaris</span>{' '}
                                <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-amber-500">
                                    Suite
                                </span>
                            </span>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-1.5 text-center">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {title}
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
