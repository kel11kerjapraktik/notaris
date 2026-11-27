import { Link, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FolderArchive,
    History,
    LayoutGrid,
    ShieldCheck,
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
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
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
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const isNotaris = auth?.user?.is_notaris ?? false;

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
                { title: 'Pengarsipan', href: archives.index(), icon: FolderArchive },
            ],
        },
        {
            label: 'Keuangan & Kontrol',
            items: [
                { title: 'Keuangan / Termin', href: payments.index(), icon: Wallet },
                ...(isNotaris
                    ? [
                          {
                              title: 'Persetujuan Notaris',
                              href: approvals.index(),
                              icon: CheckCircle2,
                              badge: pendingApprovalsCount,
                          },
                      ]
                    : []),
                { title: 'Log Aktivitas', href: activityLogs.index(), icon: History },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="pb-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent/70">
                            <Link href={dashboard()} prefetch onClick={handleNavClick}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="mx-3 opacity-60" />

            <SidebarContent className="gap-1 py-2">
                {groups.map((group, groupIdx) => (
                    <SidebarGroup key={group.label} className="px-2 py-1">
                        <SidebarGroupLabel className="px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/75 uppercase">
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarMenu className="gap-1">
                            {group.items.map((item) => {
                                const active = isCurrentUrl(item.href);
                                const badgeCount = 'badge' in item ? Number(item.badge ?? 0) : 0;

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={{ children: item.title }}
                                            className="relative h-10 rounded-lg px-2.5 transition-all duration-150 md:h-9 data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary dark:data-[active=true]:bg-primary/20"
                                        >
                                            <Link href={item.href} prefetch onClick={handleNavClick}>
                                                {active && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden"
                                                    />
                                                )}
                                                <div className="relative flex shrink-0 items-center justify-center">
                                                    <item.icon className="size-4" />
                                                    {badgeCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-amber-500 ring-2 ring-sidebar group-data-[collapsible=icon]:block" />
                                                    )}
                                                </div>
                                                <span className="flex-1 truncate">{item.title}</span>
                                                {badgeCount > 0 && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-auto h-5 min-w-5 justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 group-data-[collapsible=icon]:hidden dark:text-amber-300"
                                                    >
                                                        {badgeCount}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                        {groupIdx < groups.length - 1 && (
                            <SidebarSeparator className="mx-1 mt-2 opacity-40 group-data-[collapsible=icon]:hidden" />
                        )}
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="gap-2 pt-2">
                <div className="px-2 group-data-[collapsible=icon]:hidden">
                    <div
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                            isNotaris
                                ? 'border-amber-300/60 bg-amber-50/70 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
                                : 'border-sidebar-border bg-muted/40 text-muted-foreground'
                        }`}
                    >
                        <ShieldCheck className="size-3.5 shrink-0" />
                        <span className="truncate font-medium">{auth?.user?.role_label}</span>
                    </div>
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
