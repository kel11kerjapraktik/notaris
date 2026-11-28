import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <div className="relative shrink-0">
                <Avatar className="h-8 w-8 overflow-hidden rounded-xl shadow-xs ring-1 ring-amber-500/45 transition-transform duration-200 group-hover:scale-105 dark:ring-amber-400/40">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="relative rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-800 font-serif text-xs font-bold tracking-wider text-white dark:from-amber-300 dark:via-amber-500 dark:to-amber-700 dark:text-stone-950">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0.5 rounded-[9px] border border-white/25 dark:border-stone-950/20"
                        />
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-sidebar"
                />
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                    {user.name}
                </span>
                {showEmail && (
                    <span className="truncate text-[11px] text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
