import { Link, type InertiaLinkProps } from '@inertiajs/react';
import type { ReactNode } from 'react';

type StatCardProps = {
    label: string;
    value: ReactNode;
    note?: string;
    valueClassName?: string;
    icon?: ReactNode;
    href?: InertiaLinkProps['href'];
};

export function StatCard({
    label,
    value,
    note,
    valueClassName = '',
    icon,
    href,
}: StatCardProps) {
    const content = (
        <>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-60 transition-opacity group-hover:opacity-100"
            />
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {label}
                </span>
                {icon && (
                    <span className="flex size-8 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 transition-all duration-200 group-hover:scale-105 group-hover:bg-amber-500/18 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                        {icon}
                    </span>
                )}
            </div>
            <div
                className={`mt-2.5 text-2xl font-bold tracking-tight tabular-nums ${valueClassName}`}
            >
                {value}
            </div>
            {note && (
                <div className="mt-1 text-xs text-muted-foreground">{note}</div>
            )}
        </>
    );

    const cardClassName =
        'group relative block overflow-hidden rounded-2xl border border-amber-500/15 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/35 hover:shadow-md hover:shadow-amber-950/5 dark:border-amber-500/15 dark:hover:border-amber-400/35 dark:hover:shadow-black/30';

    if (href) {
        return (
            <Link href={href} className={cardClassName}>
                {content}
            </Link>
        );
    }

    return <div className={cardClassName}>{content}</div>;
}
