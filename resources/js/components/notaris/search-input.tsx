import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
};

export function SearchInput({
    value,
    onChange,
    placeholder = 'Cari…',
    ariaLabel,
    className,
}: SearchInputProps) {
    return (
        <div className={cn('relative', className)}>
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-amber-700/70 dark:text-amber-300/70"
            />
            <Input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel ?? placeholder}
                className={cn('pl-9', value ? 'pr-8' : '')}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Hapus kata kunci pencarian"
                    className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
