import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Terang' },
        { value: 'dark', icon: Moon, label: 'Gelap' },
        { value: 'system', icon: Monitor, label: 'Sistem' },
    ];

    return (
        <div
            className={cn(
                'inline-flex gap-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-1 dark:bg-amber-500/10',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
                        appearance === value
                            ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-amber-950 shadow-xs'
                            : 'text-muted-foreground hover:bg-amber-500/10 hover:text-foreground',
                    )}
                >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="ml-1.5">{label}</span>
                </button>
            ))}
        </div>
    );
}
