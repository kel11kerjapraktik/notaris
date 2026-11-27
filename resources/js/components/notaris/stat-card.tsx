import type { ReactNode } from 'react';

type StatCardProps = {
    label: string;
    value: ReactNode;
    note?: string;
    valueClassName?: string;
    icon?: ReactNode;
};

export function StatCard({ label, value, note, valueClassName = '', icon }: StatCardProps) {
    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-xs dark:border-sidebar-border">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </span>
                {icon && <span className="text-muted-foreground">{icon}</span>}
            </div>
            <div className={`mt-2 text-2xl font-bold tracking-tight ${valueClassName}`}>{value}</div>
            {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
        </div>
    );
}
