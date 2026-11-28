import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (!auth.user) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group h-12 rounded-xl border border-amber-500/20 bg-gradient-to-r from-card/90 to-amber-50/40 px-2.5 text-sidebar-foreground shadow-xs transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:shadow-none hover:border-amber-500/40 hover:bg-amber-500/10 data-[state=open]:border-amber-500/45 data-[state=open]:bg-amber-500/15 dark:border-amber-500/15 dark:from-stone-900/80 dark:to-amber-950/20 dark:hover:border-amber-400/35 dark:hover:bg-amber-500/10"
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo user={auth.user} showEmail={true} />
                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground transition-colors group-hover:text-amber-700 group-data-[collapsible=icon]:hidden dark:group-hover:text-amber-300" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
