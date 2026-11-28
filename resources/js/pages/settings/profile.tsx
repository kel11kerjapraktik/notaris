import { Form, Head, usePage } from '@inertiajs/react';
import { KeyRound, Palette, Save, User } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import AppearanceTabs from '@/components/appearance-tabs';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    passwordRules?: string;
};

export default function Profile() {
    const { auth, passwordRules } = usePage<PageProps>().props;
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Pengaturan Akun" />

            <div className="grid items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Profil & Kata Sandi */}
                <div className="space-y-6 lg:col-span-7">
                    <section className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs sm:p-6">
                        <div className="mb-5 flex items-start gap-3.5 border-b border-amber-500/15 pb-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                <User className="size-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Informasi Profil
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Perbarui nama tampilan serta alamat email
                                    aktif untuk login dan catatan aktivitas.
                                </p>
                            </div>
                        </div>

                        <Form
                            {...ProfileController.update.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="name">
                                                Nama Lengkap
                                            </Label>
                                            <Input
                                                id="name"
                                                defaultValue={auth.user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder="Nama lengkap"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="email">
                                                Alamat Email
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                defaultValue={auth.user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                                placeholder="nama@notarisnhn.id"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end border-t border-amber-500/10 pt-4">
                                        <Button
                                            disabled={processing}
                                            data-test="update-profile-button"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Save className="mr-1.5 size-4" />
                                            )}
                                            Simpan Profil
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>

                    <section className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs sm:p-6">
                        <div className="mb-5 flex items-start gap-3.5 border-b border-amber-500/15 pb-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                <KeyRound className="size-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Keamanan &amp; Kata Sandi
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Gunakan kata sandi yang panjang dan unik
                                    untuk melindungi akses dashboard kantor.
                                </p>
                            </div>
                        </div>

                        <Form
                            {...SecurityController.update.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            resetOnError={[
                                'password',
                                'password_confirmation',
                                'current_password',
                            ]}
                            resetOnSuccess
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="space-y-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="current_password">
                                            Kata Sandi Saat Ini
                                        </Label>
                                        <PasswordInput
                                            id="current_password"
                                            ref={currentPasswordInput}
                                            name="current_password"
                                            autoComplete="current-password"
                                            placeholder="Masukkan kata sandi saat ini"
                                        />
                                        <InputError
                                            message={errors.current_password}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="password">
                                                Kata Sandi Baru
                                            </Label>
                                            <PasswordInput
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                autoComplete="new-password"
                                                placeholder="Kata sandi baru"
                                                passwordrules={passwordRules}
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="password_confirmation">
                                                Konfirmasi Kata Sandi
                                            </Label>
                                            <PasswordInput
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                autoComplete="new-password"
                                                placeholder="Ulangi kata sandi baru"
                                                passwordrules={passwordRules}
                                            />
                                            <InputError
                                                message={
                                                    errors.password_confirmation
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end border-t border-amber-500/10 pt-4">
                                        <Button
                                            disabled={processing}
                                            data-test="update-password-button"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <KeyRound className="mr-1.5 size-4" />
                                            )}
                                            Perbarui Kata Sandi
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>
                </div>

                {/* Kolom Kanan: Preferensi Tema & Hapus Akun */}
                <div className="space-y-6 lg:col-span-5">
                    <section className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-xs sm:p-6">
                        <div className="mb-5 flex items-start gap-3.5 border-b border-amber-500/15 pb-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                <Palette className="size-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Tampilan Aplikasi
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Sesuaikan tema warna antarmuka antara mode
                                    terang, gelap, atau mengikuti sistem.
                                </p>
                            </div>
                        </div>

                        <AppearanceTabs className="flex w-full" />
                    </section>

                    <DeleteUser />
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan Akun',
            href: edit(),
        },
    ],
};
