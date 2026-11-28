import { usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Auth } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const initials = auth.user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                <div className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase dark:text-amber-400/90">
                            Pengaturan Akun
                        </p>
                        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                            Profil, Keamanan &amp; Tampilan
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola identitas akun, pembaruan kata sandi, dan
                            preferensi tema aplikasi dalam satu halaman.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-card/85 px-4 py-2.5 shadow-xs backdrop-blur-xs">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 font-serif text-sm font-bold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">
                                    {auth.user.name}
                                </span>
                                <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-800 hover:bg-amber-500/10 dark:text-amber-300">
                                    <ShieldCheck className="mr-1 size-3" />
                                    {auth.user.role_label}
                                </Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                                {auth.user.email}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {children}
        </div>
    );
}
