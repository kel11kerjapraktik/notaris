import type { InertiaLinkProps } from '@inertiajs/react';
import { Link, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronRight,
    Clock,
    FolderArchive,
    History,
    LayoutGrid,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';
import activityLogs from '@/routes/activity-logs';
import approvals from '@/routes/approvals';
import archives from '@/routes/archives';
import cases from '@/routes/cases';
import clients from '@/routes/clients';
import payments from '@/routes/payments';
import type { Auth } from '@/types';

export function AppSidebar() {
    const { auth, pendingApprovalsCount = 0 } = usePage<{
        auth: Auth;
        pendingApprovalsCount?: number;
    }>().props;
    const { currentUrl, isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const isNotaris = auth?.user?.is_notaris ?? false;

    const isMenuActive = (href: NonNullable<InertiaLinkProps['href']>) => {
        const basePath = toUrl(href).replace(/\/$/, '');
        return (
            isCurrentUrl(href) ||
            (basePath !== '' && currentUrl.startsWith(`${basePath}/`))
        );
    };

    const handleNavClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const groups = [
        {
            label: 'Utama',
            items: [
                { title: 'Dasbor', href: dashboard(), icon: LayoutGrid },
                { title: 'Data Klien', href: clients.index(), icon: Users },
                { title: 'Monitoring Akta', href: cases.index(), icon: Clock },
            ],
        },
        {
            label: 'Dokumen & Arsip',
            items: [
                ...(!isNotaris
                    ? [
                          {
                              title: 'Persetujuan',
                              href: approvals.index(),
                              icon: CheckCircle2,
                              badge: pendingApprovalsCount,
                          },
                      ]
                    : []),
                {
                    title: 'Pengarsipan',
                    href: archives.index(),
                    icon: FolderArchive,
                },
            ],
        },
        {
            label: 'Keuangan & Kontrol',
            items: [
                {
                    title: 'Keuangan / Termin',
                    href: payments.index(),
                    icon: Wallet,
                },
                ...(isNotaris
                    ? [
                          {
                              title: 'Persetujuan',
                              href: approvals.index(),
                              icon: CheckCircle2,
                              badge: pendingApprovalsCount,
                          },
                      ]
                    : []),
                {
                    title: 'Log Aktivitas',
                    href: activityLogs.index(),
                    icon: History,
                },
            ],
        },
    ];

    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            className="[&_[data-sidebar=sidebar]]:relative [&_[data-sidebar=sidebar]]:overflow-hidden [&_[data-sidebar=sidebar]]:rounded-2xl [&_[data-sidebar=sidebar]]:border [&_[data-sidebar=sidebar]]:border-amber-500/20 [&_[data-sidebar=sidebar]]:bg-gradient-to-b [&_[data-sidebar=sidebar]]:from-[#FDFBF6] [&_[data-sidebar=sidebar]]:via-[#FAF5EA] [&_[data-sidebar=sidebar]]:to-[#F4ECE0] [&_[data-sidebar=sidebar]]:shadow-lg [&_[data-sidebar=sidebar]]:shadow-amber-950/5 dark:[&_[data-sidebar=sidebar]]:border-amber-500/20 dark:[&_[data-sidebar=sidebar]]:from-[#191510] dark:[&_[data-sidebar=sidebar]]:via-[#14110D] dark:[&_[data-sidebar=sidebar]]:to-[#0F0C09] dark:[&_[data-sidebar=sidebar]]:shadow-black/40"
        >
            {/* Ambient champagne-gold sheen at top of rail */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 left-1/2 h-28 w-48 -translate-x-1/2 rounded-full bg-amber-400/20 blur-2xl dark:bg-amber-500/12"
            />

            <SidebarHeader className="relative px-2.5 pt-3 pb-2 group-data-[collapsible=icon]:px-1.5">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            tooltip={{ children: 'Notaris Suite — Dasbor' }}
                            className="h-12 overflow-visible rounded-none px-2 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:p-0! hover:bg-amber-500/10"
                        >
                            <Link href={dashboard()} onClick={handleNavClick}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="mx-3 bg-amber-500/20" />

            <SidebarContent className="sidebar-luxury-scroll gap-1.5 px-1.5 py-2.5 group-data-[collapsible=icon]:px-0">
                {groups.map((group) => (
                    <SidebarGroup
                        key={group.label}
                        className="px-1.5 py-1 group-data-[collapsible=icon]:px-1.5"
                    >
                        <SidebarGroupLabel className="mb-1 flex items-center gap-2 px-2 text-[10px] font-bold tracking-[0.14em] text-amber-900/60 uppercase dark:text-amber-200/55">
                            <span className="shrink-0">{group.label}</span>
                            <span
                                aria-hidden="true"
                                className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent"
                            />
                        </SidebarGroupLabel>

                        <SidebarMenu className="gap-1">
                            {group.items.map((item) => {
                                const active = isMenuActive(item.href);
                                const badgeCount =
                                    'badge' in item
                                        ? Number(item.badge ?? 0)
                                        : 0;

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={{
                                                children:
                                                    badgeCount > 0
                                                        ? `${item.title} (${badgeCount})`
                                                        : item.title,
                                            }}
                                            className={`group/nav relative h-10 rounded-xl px-2 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0! ${
                                                active
                                                    ? 'bg-gradient-to-r from-amber-500/18 via-amber-400/10 to-transparent font-semibold text-foreground shadow-xs ring-1 ring-amber-500/35 hover:from-amber-500/22 dark:from-amber-400/18 dark:via-amber-500/8 dark:ring-amber-400/30'
                                                    : 'text-sidebar-foreground/85 hover:bg-amber-500/10 hover:text-foreground dark:hover:bg-amber-400/10'
                                            }`}
                                        >
                                            <Link
                                                href={item.href}
                                                onClick={handleNavClick}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                            >
                                                {active && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 group-data-[collapsible=icon]:hidden"
                                                    />
                                                )}

                                                <div
                                                    className={`relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                                                        active
                                                            ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm dark:from-amber-400 dark:to-amber-600 dark:text-stone-950'
                                                            : 'bg-amber-500/8 text-muted-foreground group-hover/nav:bg-amber-500/15 group-hover/nav:text-amber-700 dark:bg-stone-800/70 dark:group-hover/nav:text-amber-300'
                                                    }`}
                                                >
                                                    <item.icon className="size-3.5" />
                                                    {badgeCount > 0 && (
                                                        <span className="absolute -top-0.5 -right-0.5 hidden size-2.5 rounded-full bg-amber-500 ring-2 ring-sidebar group-data-[collapsible=icon]:block" />
                                                    )}
                                                </div>

                                                <span className="flex-1 truncate text-[13px] transition-transform duration-150 group-hover/nav:translate-x-0.5 group-data-[collapsible=icon]:hidden">
                                                    {item.title}
                                                </span>

                                                {badgeCount > 0 ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-auto flex h-5 min-w-5 items-center justify-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/15 px-1.5 text-[11px] font-bold text-amber-800 group-data-[collapsible=icon]:hidden dark:border-amber-400/35 dark:bg-amber-400/20 dark:text-amber-200"
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-1.5 animate-pulse rounded-full bg-amber-500 dark:bg-amber-300"
                                                        />
                                                        {badgeCount}
                                                    </Badge>
                                                ) : (
                                                    <ChevronRight
                                                        className={`ml-auto size-3.5 shrink-0 transition-all duration-150 group-data-[collapsible=icon]:hidden ${
                                                            active
                                                                ? 'text-amber-700 opacity-90 dark:text-amber-300'
                                                                : 'text-muted-foreground opacity-0 group-hover/nav:translate-x-0.5 group-hover/nav:opacity-65'
                                                        }`}
                                                    />
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarSeparator className="mx-3 bg-amber-500/20" />

            <SidebarFooter className="px-2.5 pt-2 pb-2.5 group-data-[collapsible=icon]:px-1.5">
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
