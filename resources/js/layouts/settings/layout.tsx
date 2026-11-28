import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/40 p-5 shadow-xs dark:to-amber-950/15">
                <Heading
                    title="Pengaturan Akun"
                    description="Kelola profil, keamanan kata sandi, dan tampilan tema aplikasi."
                    variant="small"
                />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="w-full max-w-xl lg:w-52">
                    <nav
                        className="flex flex-col space-y-1.5 rounded-2xl border border-amber-500/15 bg-card p-2 shadow-xs"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'w-full justify-start rounded-xl',
                                        active
                                            ? 'bg-gradient-to-r from-amber-500/18 via-amber-400/8 to-transparent font-semibold text-foreground ring-1 ring-amber-500/35'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Link href={item.href}>
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-2 lg:hidden" />

                <div className="flex-1 rounded-2xl border border-amber-500/15 bg-card p-5 shadow-xs md:max-w-2xl md:p-6">
                    <section className="max-w-xl space-y-10">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
