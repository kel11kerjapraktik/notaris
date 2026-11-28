import { Badge } from '@/components/ui/badge';

export function PaymentBadge({
    status,
}: {
    status: 'belum' | 'menunggu' | 'lunas' | 'ditolak';
}) {
    if (status === 'lunas') {
        return (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                Lunas (ACC)
            </Badge>
        );
    }
    if (status === 'menunggu') {
        return (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                Menunggu ACC Notaris
            </Badge>
        );
    }
    if (status === 'ditolak') {
        return <Badge variant="destructive">Ditolak Notaris</Badge>;
    }
    return <Badge variant="secondary">Belum Dibayar</Badge>;
}
