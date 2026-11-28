import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex w-full items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <AppLogoIcon className="size-10 shrink-0 shadow-md shadow-amber-950/20 dark:shadow-black/40" />
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate font-serif text-xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                <span className="text-foreground">Notaris</span>
                <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-amber-500">
                    Suite
                </span>
            </div>
        </div>
    );
}
