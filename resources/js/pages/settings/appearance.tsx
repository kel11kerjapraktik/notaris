import { Head } from '@inertiajs/react';
import { Palette } from 'lucide-react';
import AppearanceTabs from '@/components/appearance-tabs';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Tampilan Aplikasi" />

            <section className="max-w-xl rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs sm:p-6">
                <div className="mb-5 flex items-start gap-3.5 border-b border-amber-500/15 pb-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <Palette className="size-4.5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            Tampilan Aplikasi
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Sesuaikan tema warna antarmuka antara mode terang,
                            gelap, atau mengikuti sistem.
                        </p>
                    </div>
                </div>

                <AppearanceTabs className="flex w-full" />
            </section>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Tampilan Aplikasi',
            href: editAppearance(),
        },
    ],
};
