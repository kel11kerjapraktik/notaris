import { Badge } from '@/components/ui/badge';

type StageBadgeProps = {
    order: number;
    label: string;
    isCompleted?: boolean;
};

export function StageBadge({ order, label, isCompleted = false }: StageBadgeProps) {
    if (isCompleted) {
        return (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                ✓ Seluruh Tahapan Selesai
            </Badge>
        );
    }

    const colorClass =
        order >= 6
            ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300'
            : order >= 4
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300';

    return (
        <Badge variant="outline" className={colorClass}>
            {order}. {label}
        </Badge>
    );
}
