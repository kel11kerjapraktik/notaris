import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CurrencyInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
> & {
    value: string | number;
    onValueChange: (rawDigits: string) => void;
    minAmount?: number;
};

function formatIndonesianDigits(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(digits));
}

export function CurrencyInput({
    value,
    onValueChange,
    minAmount,
    className,
    required,
    placeholder = '0',
    ...props
}: CurrencyInputProps) {
    const rawStr = String(value ?? '').replace(/\D/g, '');
    const displayValue = formatIndonesianDigits(rawStr);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDigits = e.target.value
            .replace(/\D/g, '')
            .replace(/^0+(?=\d)/, '');
        if (
            minAmount !== undefined &&
            nextDigits !== '' &&
            Number(nextDigits) < minAmount
        ) {
            e.target.setCustomValidity(
                `Nominal minimal Rp ${new Intl.NumberFormat('id-ID').format(minAmount)}.`,
            );
        } else {
            e.target.setCustomValidity('');
        }
        onValueChange(nextDigits);
    };

    const handleInvalid = (e: React.FormEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        if (required && !rawStr) {
            input.setCustomValidity('Nominal biaya wajib diisi.');
        } else if (
            minAmount !== undefined &&
            rawStr !== '' &&
            Number(rawStr) < minAmount
        ) {
            input.setCustomValidity(
                `Nominal minimal Rp ${new Intl.NumberFormat('id-ID').format(minAmount)}.`,
            );
        }
    };

    return (
        <div className="relative flex items-center">
            <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 text-xs font-semibold tracking-wide text-primary"
            >
                Rp
            </span>
            <Input
                {...props}
                type="text"
                inputMode="numeric"
                required={required}
                value={displayValue}
                placeholder={placeholder}
                onChange={handleChange}
                onInvalid={handleInvalid}
                className={cn('pl-9 font-medium tabular-nums', className)}
            />
        </div>
    );
}
