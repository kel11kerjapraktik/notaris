import { Form } from '@inertiajs/react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <section className="rounded-2xl border border-destructive/25 bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-start gap-3.5 border-b border-destructive/15 pb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
                    <ShieldAlert className="size-4.5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        Hapus Akun
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Hapus akun Anda secara permanen dari sistem kantor
                        notaris.
                    </p>
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4">
                <div className="space-y-1 text-destructive">
                    <p className="text-xs font-semibold tracking-wider uppercase">
                        Peringatan Permanen
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Tindakan ini tidak dapat dibatalkan. Pastikan semua
                        berkas dan tanggung jawab kerja Anda sudah dialihkan
                        sebelum menghapus akun.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-destructive/35 bg-background/80 text-destructive hover:border-destructive/55 hover:bg-destructive/10 hover:text-destructive"
                            data-test="delete-user-button"
                        >
                            <Trash2 className="mr-1.5 size-4" />
                            Hapus Akun Permanen
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Konfirmasi Penghapusan Akun
                            </DialogTitle>
                            <DialogDescription>
                                Setelah akun dihapus, seluruh akses dan data
                                sesi akan dihentikan secara permanen. Masukkan
                                kata sandi Anda untuk melanjutkan.
                            </DialogDescription>
                        </DialogHeader>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-5"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="delete_password">
                                            Kata Sandi Akun
                                        </Label>
                                        <PasswordInput
                                            id="delete_password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Masukkan kata sandi"
                                            autoComplete="current-password"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Batal
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            type="submit"
                                            data-test="confirm-delete-user-button"
                                        >
                                            {processing && <Spinner />}
                                            Ya, Hapus Akun
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </section>
    );
}
