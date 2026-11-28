import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    FileText,
    FolderCheck,
    Plus,
    Save,
    Scale,
    StickyNote,
    Trash2,
    UploadCloud,
    UserRound,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { CurrencyInput } from '@/components/notaris/currency-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import type {
    BreadcrumbItem,
    Client,
    DocumentItem,
    NotarisConfig,
} from '@/types';

type AttachmentRow = {
    kategori: string;
    nama: string;
    nomor_dokumen: string;
    file: File | null;
    error?: string | null;
};

type ClientFormData = {
    kode: string;
    jenis: 'pribadi' | 'perusahaan';
    nama: string;
    nik: string;
    npwp: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    agama: string;
    kewarganegaraan: string;
    status_perkawinan: string;
    pekerjaan: string;
    nama_ibu_kandung: string;
    telepon: string;
    email: string;
    alamat: string;
    rt_rw: string;
    kelurahan: string;
    kecamatan: string;
    kota: string;
    provinsi: string;
    kode_pos: string;
    catatan: string;
    jenis_akta: string;
    biaya: string;
    target_selesai: string;
    company: {
        nama: string;
        bentuk_badan: string;
        jabatan: string;
        bidang_usaha: string;
        kbli: string;
        tahun_berdiri: string;
        npwp: string;
        nib: string;
        sk_kemenkumham: string;
        alamat: string;
        kota: string;
        provinsi: string;
        kode_pos: string;
        telepon: string;
        email: string;
        modal_dasar: string;
        modal_ditempatkan: string;
        modal_disetor: string;
        jumlah_saham: string;
        nominal_saham: string;
        direktur: string;
        komisaris: string;
    };
    attachments: AttachmentRow[];
};

type EditableClient = Client & {
    documents?: DocumentItem[];
    deed_cases?: {
        id: number;
        jenis_akta: string;
        biaya: number;
        target_selesai: string | null;
    }[];
};

function makeInitialData(
    client?: EditableClient | null,
    suggestedKode?: string,
): ClientFormData {
    const co = client?.company;
    const latestCase = client?.deed_cases?.[0];
    return {
        kode: client?.kode ?? suggestedKode ?? '',
        jenis: client?.jenis ?? 'pribadi',
        nama: client?.nama ?? '',
        nik: client?.nik ?? '',
        npwp: client?.npwp ?? '',
        tempat_lahir: client?.tempat_lahir ?? '',
        tanggal_lahir: client?.tanggal_lahir ?? '',
        jenis_kelamin: client?.jenis_kelamin ?? 'Laki-laki',
        agama: client?.agama ?? '',
        kewarganegaraan: client?.kewarganegaraan ?? 'WNI',
        status_perkawinan: client?.status_perkawinan ?? 'Belum Kawin',
        pekerjaan: client?.pekerjaan ?? '',
        nama_ibu_kandung: client?.nama_ibu_kandung ?? '',
        telepon: client?.telepon ?? '',
        email: client?.email ?? '',
        alamat: client?.alamat ?? '',
        rt_rw: client?.rt_rw ?? '',
        kelurahan: client?.kelurahan ?? '',
        kecamatan: client?.kecamatan ?? '',
        kota: client?.kota ?? '',
        provinsi: client?.provinsi ?? '',
        kode_pos: client?.kode_pos ?? '',
        catatan: client?.catatan ?? '',
        jenis_akta: latestCase?.jenis_akta ?? 'Akta Pendirian PT',
        biaya: latestCase?.biaya != null ? String(latestCase.biaya) : '',
        target_selesai: latestCase?.target_selesai ?? '',
        company: {
            nama: co?.nama ?? '',
            bentuk_badan: co?.bentuk_badan ?? 'PT (Perseroan Terbatas)',
            jabatan: co?.jabatan ?? 'Direktur',
            bidang_usaha: co?.bidang_usaha ?? '',
            kbli: co?.kbli ?? '',
            tahun_berdiri: co?.tahun_berdiri ?? '',
            npwp: co?.npwp ?? '',
            nib: co?.nib ?? '',
            sk_kemenkumham: co?.sk_kemenkumham ?? '',
            alamat: co?.alamat ?? '',
            kota: co?.kota ?? '',
            provinsi: co?.provinsi ?? '',
            kode_pos: co?.kode_pos ?? '',
            telepon: co?.telepon ?? '',
            email: co?.email ?? '',
            modal_dasar: co?.modal_dasar != null ? String(co.modal_dasar) : '',
            modal_ditempatkan:
                co?.modal_ditempatkan != null
                    ? String(co.modal_ditempatkan)
                    : '',
            modal_disetor:
                co?.modal_disetor != null ? String(co.modal_disetor) : '',
            jumlah_saham:
                co?.jumlah_saham != null ? String(co.jumlah_saham) : '',
            nominal_saham:
                co?.nominal_saham != null ? String(co.nominal_saham) : '',
            direktur: co?.direktur ?? '',
            komisaris: co?.komisaris ?? '',
        },
        attachments: [
            {
                kategori: 'KTP',
                nama: '',
                nomor_dokumen: '',
                file: null,
                error: null,
            },
        ],
    };
}

export default function ClientsForm({
    client,
    suggestedKode,
}: {
    client: EditableClient | null;
    suggestedKode?: string;
}) {
    const { notarisConfig } = usePage<{ notarisConfig: NotarisConfig }>().props;
    const isEdit = Boolean(client);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Data Klien', href: clientsRoute.index() },
        {
            title: isEdit ? `Edit ${client!.kode}` : 'Tambah Klien Baru',
            href: isEdit
                ? clientsRoute.edit(client!.id)
                : clientsRoute.create(),
        },
    ];

    const form = useForm<ClientFormData>(
        makeInitialData(client, suggestedKode),
    );
    const allErrors = form.errors as Record<string, string | undefined>;
    const existingDocsCount = client?.documents?.length ?? 0;
    const requireAttachmentUpload = !isEdit || existingDocsCount === 0;

    const maxBytes = notarisConfig.maxFileKb * 1024;
    const hasAttachmentError = form.data.attachments.some((a) =>
        Boolean(a.error),
    );

    const addAttachmentRow = () => {
        form.setData('attachments', [
            ...form.data.attachments,
            {
                kategori: notarisConfig.kategoriDokumen[0] ?? 'KTP',
                nama: '',
                nomor_dokumen: '',
                file: null,
                error: null,
            },
        ]);
    };

    const removeAttachmentRow = (index: number) => {
        form.setData(
            'attachments',
            form.data.attachments.filter((_, idx) => idx !== index),
        );
    };

    const updateAttachment = (index: number, patch: Partial<AttachmentRow>) => {
        const next = form.data.attachments.map((row, idx) =>
            idx === index ? { ...row, ...patch } : row,
        );
        form.setData('attachments', next);
    };

    const handleAttachmentFile = (index: number, file: File | null) => {
        if (file && file.size > maxBytes) {
            updateAttachment(index, {
                file: null,
                error: `Ukuran file melebihi batas maksimal ${notarisConfig.maxFileKb / 1024} MB.`,
            });
            return;
        }
        const currentRow = form.data.attachments[index];
        updateAttachment(index, {
            file,
            error: null,
            nama:
                currentRow.nama ||
                (file ? file.name.replace(/\.[^/.]+$/, '') : ''),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasAttachmentError) return;

        // Filter out empty attachment rows that have no file attached
        const validAttachments = form.data.attachments
            .filter((a) => a.file !== null)
            .map(({ kategori, nama, nomor_dokumen, file }) => ({
                kategori,
                nama: nama || file!.name,
                nomor_dokumen,
                file,
            }));

        if (requireAttachmentUpload && validAttachments.length === 0) {
            updateAttachment(0, {
                error: 'Minimal 1 berkas kelengkapan wajib diunggah.',
            });
            return;
        }

        if (isEdit && client) {
            form.transform((data) => ({
                ...data,
                _method: 'put',
                attachments: validAttachments,
            }));
            form.post(clientsRoute.update(client.id).url, {
                forceFormData: true,
                preserveScroll: true,
            });
        } else {
            form.transform((data) => ({
                ...data,
                attachments: validAttachments,
            }));
            form.post(clientsRoute.store().url, {
                forceFormData: true,
                preserveScroll: true,
            });
        }
    };

    const selectCls =
        'flex h-10 w-full rounded-xl border border-input bg-background/90 px-3 py-1.5 text-sm text-foreground shadow-2xs transition-colors focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={
                    isEdit ? `Edit Klien ${client!.kode}` : 'Tambah Data Klien'
                }
            />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Luxury Header Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-50/45 p-5 shadow-xs dark:to-amber-950/20">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-500/10"
                    />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="mt-0.5 rounded-xl border-amber-500/25 hover:bg-amber-500/10"
                            >
                                <Link href={clientsRoute.index()}>
                                    <ArrowLeft className="mr-1.5 size-4 text-amber-700 dark:text-amber-300" />
                                    Kembali
                                </Link>
                            </Button>
                            <div className="space-y-0.5">
                                <div className="text-[10.5px] font-bold tracking-[0.16em] text-amber-700 uppercase dark:text-amber-300">
                                    {isEdit
                                        ? 'Pembaruan Data Klien'
                                        : 'Registrasi Klien Baru'}
                                </div>
                                <h1 className="font-serif text-2xl font-bold tracking-tight">
                                    {isEdit
                                        ? `Edit Data Klien — ${client!.kode}`
                                        : 'Tambah Data Klien Baru'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Lengkapi biodata diri, data badan usaha
                                    (jika ada), serta berkas kelengkapan klien.
                                </p>
                            </div>
                        </div>
                        {form.data.kode && (
                            <div className="hidden items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs sm:inline-flex">
                                <span className="text-muted-foreground">
                                    Kode:
                                </span>
                                <span className="font-bold tracking-wide text-amber-800 dark:text-amber-300">
                                    {form.data.kode}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Toggle Badan Usaha */}
                    <div
                        className={`space-y-2 rounded-2xl border p-4 shadow-xs transition-all duration-200 ${
                            form.data.jenis === 'perusahaan'
                                ? 'border-amber-500/45 bg-gradient-to-r from-amber-500/12 via-amber-400/5 to-card dark:border-amber-400/35'
                                : 'border-amber-500/20 bg-card hover:border-amber-500/35'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="toggle-pt"
                                    checked={form.data.jenis === 'perusahaan'}
                                    onCheckedChange={(checked) => {
                                        const nextJenis = checked
                                            ? 'perusahaan'
                                            : 'pribadi';
                                        form.setData({
                                            ...form.data,
                                            jenis: nextJenis,
                                            jenis_akta: checked
                                                ? 'Akta Pendirian PT'
                                                : 'Akta Jual Beli (AJB)',
                                        });
                                    }}
                                />
                                <Label
                                    htmlFor="toggle-pt"
                                    className="cursor-pointer space-y-0.5"
                                >
                                    <div className="text-sm font-semibold text-foreground">
                                        Klien juga mendaftarkan perusahaan /
                                        badan usaha
                                    </div>
                                    <div className="text-xs font-normal text-muted-foreground">
                                        Aktifkan untuk layanan PT, CV, Yayasan,
                                        Koperasi, atau badan usaha lainnya.
                                    </div>
                                </Label>
                            </div>
                            <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 sm:flex dark:text-amber-300">
                                {form.data.jenis === 'perusahaan' ? (
                                    <Building2 className="size-4" />
                                ) : (
                                    <UserRound className="size-4" />
                                )}
                            </span>
                        </div>
                        {isEdit &&
                            client?.company &&
                            form.data.jenis === 'pribadi' && (
                                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                                    Perhatian: menonaktifkan badan usaha akan
                                    menghapus data perusahaan tersimpan saat
                                    perubahan disimpan.
                                </p>
                            )}
                    </div>

                    {/* A. Biodata Diri */}
                    <fieldset className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs">
                        <div className="flex items-center gap-3 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-5 py-3.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-serif text-xs font-bold text-white shadow-xs dark:from-amber-400 dark:to-amber-600 dark:text-stone-950">
                                A
                            </span>
                            <div>
                                <legend className="text-sm font-semibold text-foreground">
                                    Biodata Diri Klien (Sesuai KTP)
                                </legend>
                                <p className="text-xs text-muted-foreground">
                                    Seluruh kolom identitas, kontak, dan
                                    domisili wajib diisi lengkap.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kode">
                                    Kode Klien (Otomatis) *
                                </Label>
                                <Input
                                    id="client-kode"
                                    value={form.data.kode}
                                    readOnly
                                    required
                                    className="bg-muted/50 font-semibold text-primary"
                                />
                                <InputError message={allErrors.kode} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-nama">
                                    Nama Lengkap *
                                </Label>
                                <Input
                                    id="client-nama"
                                    value={form.data.nama}
                                    onChange={(e) =>
                                        form.setData('nama', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.nama} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-nik">NIK *</Label>
                                <Input
                                    id="client-nik"
                                    value={form.data.nik}
                                    onChange={(e) =>
                                        form.setData('nik', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.nik} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-npwp">
                                    NPWP Pribadi *
                                </Label>
                                <Input
                                    id="client-npwp"
                                    value={form.data.npwp}
                                    onChange={(e) =>
                                        form.setData('npwp', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.npwp} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-tempat-lahir">
                                    Tempat Lahir *
                                </Label>
                                <Input
                                    id="client-tempat-lahir"
                                    value={form.data.tempat_lahir}
                                    onChange={(e) =>
                                        form.setData(
                                            'tempat_lahir',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={allErrors.tempat_lahir} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-tanggal-lahir">
                                    Tanggal Lahir *
                                </Label>
                                <Input
                                    id="client-tanggal-lahir"
                                    type="date"
                                    value={form.data.tanggal_lahir}
                                    onChange={(e) =>
                                        form.setData(
                                            'tanggal_lahir',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={allErrors.tanggal_lahir} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-jk">
                                    Jenis Kelamin *
                                </Label>
                                <select
                                    id="client-jk"
                                    className={selectCls}
                                    value={form.data.jenis_kelamin}
                                    onChange={(e) =>
                                        form.setData(
                                            'jenis_kelamin',
                                            e.target.value,
                                        )
                                    }
                                    required
                                >
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                                <InputError message={allErrors.jenis_kelamin} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-agama">Agama *</Label>
                                <select
                                    id="client-agama"
                                    className={selectCls}
                                    value={form.data.agama}
                                    onChange={(e) =>
                                        form.setData('agama', e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Pilih agama</option>
                                    {[
                                        'Islam',
                                        'Kristen',
                                        'Katolik',
                                        'Hindu',
                                        'Buddha',
                                        'Konghucu',
                                        'Lainnya',
                                    ].map((a) => (
                                        <option key={a} value={a}>
                                            {a}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={allErrors.agama} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kewarganegaraan">
                                    Kewarganegaraan *
                                </Label>
                                <select
                                    id="client-kewarganegaraan"
                                    className={selectCls}
                                    value={form.data.kewarganegaraan}
                                    onChange={(e) =>
                                        form.setData(
                                            'kewarganegaraan',
                                            e.target.value,
                                        )
                                    }
                                    required
                                >
                                    <option value="WNI">WNI</option>
                                    <option value="WNA">WNA</option>
                                </select>
                                <InputError
                                    message={allErrors.kewarganegaraan}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-status-kawin">
                                    Status Perkawinan *
                                </Label>
                                <select
                                    id="client-status-kawin"
                                    className={selectCls}
                                    value={form.data.status_perkawinan}
                                    onChange={(e) =>
                                        form.setData(
                                            'status_perkawinan',
                                            e.target.value,
                                        )
                                    }
                                    required
                                >
                                    {[
                                        'Belum Kawin',
                                        'Kawin',
                                        'Cerai Hidup',
                                        'Cerai Mati',
                                    ].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={allErrors.status_perkawinan}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-pekerjaan">
                                    Pekerjaan *
                                </Label>
                                <Input
                                    id="client-pekerjaan"
                                    value={form.data.pekerjaan}
                                    onChange={(e) =>
                                        form.setData(
                                            'pekerjaan',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={allErrors.pekerjaan} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-ibu">
                                    Nama Ibu Kandung *
                                </Label>
                                <Input
                                    id="client-ibu"
                                    value={form.data.nama_ibu_kandung}
                                    onChange={(e) =>
                                        form.setData(
                                            'nama_ibu_kandung',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError
                                    message={allErrors.nama_ibu_kandung}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-telepon">
                                    No. Telepon / WA *
                                </Label>
                                <Input
                                    id="client-telepon"
                                    value={form.data.telepon}
                                    onChange={(e) =>
                                        form.setData('telepon', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.telepon} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-email">Email *</Label>
                                <Input
                                    id="client-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.email} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="client-alamat">
                                    Alamat (Sesuai KTP) *
                                </Label>
                                <Input
                                    id="client-alamat"
                                    value={form.data.alamat}
                                    onChange={(e) =>
                                        form.setData('alamat', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.alamat} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-rtrw">RT / RW *</Label>
                                <Input
                                    id="client-rtrw"
                                    value={form.data.rt_rw}
                                    onChange={(e) =>
                                        form.setData('rt_rw', e.target.value)
                                    }
                                    placeholder="001/002"
                                    required
                                />
                                <InputError message={allErrors.rt_rw} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kelurahan">
                                    Kelurahan / Desa *
                                </Label>
                                <Input
                                    id="client-kelurahan"
                                    value={form.data.kelurahan}
                                    onChange={(e) =>
                                        form.setData(
                                            'kelurahan',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={allErrors.kelurahan} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kecamatan">
                                    Kecamatan *
                                </Label>
                                <Input
                                    id="client-kecamatan"
                                    value={form.data.kecamatan}
                                    onChange={(e) =>
                                        form.setData(
                                            'kecamatan',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={allErrors.kecamatan} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kota">
                                    Kota / Kabupaten *
                                </Label>
                                <Input
                                    id="client-kota"
                                    value={form.data.kota}
                                    onChange={(e) =>
                                        form.setData('kota', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.kota} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-provinsi">
                                    Provinsi *
                                </Label>
                                <Input
                                    id="client-provinsi"
                                    value={form.data.provinsi}
                                    onChange={(e) =>
                                        form.setData('provinsi', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.provinsi} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="client-kodepos">
                                    Kode Pos *
                                </Label>
                                <Input
                                    id="client-kodepos"
                                    value={form.data.kode_pos}
                                    onChange={(e) =>
                                        form.setData('kode_pos', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={allErrors.kode_pos} />
                            </div>
                        </div>
                    </fieldset>

                    {/* B. Biodata Perusahaan */}
                    {form.data.jenis === 'perusahaan' && (
                        <fieldset className="overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-xs">
                            <div className="flex items-center gap-3 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/12 via-amber-400/5 to-transparent px-5 py-3.5">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-serif text-xs font-bold text-white shadow-xs dark:from-amber-400 dark:to-amber-600 dark:text-stone-950">
                                    B
                                </span>
                                <div>
                                    <legend className="text-sm font-semibold text-foreground">
                                        Biodata Perusahaan / Badan Usaha
                                    </legend>
                                    <p className="text-xs text-muted-foreground">
                                        Seluruh identitas &amp; kontak
                                        perusahaan wajib diisi, kecuali rincian
                                        modal &amp; saham bersifat opsional.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-nama">
                                        Nama Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-nama"
                                        value={form.data.company.nama}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                nama: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.nama']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-bentuk">
                                        Bentuk Badan Usaha *
                                    </Label>
                                    <select
                                        id="co-bentuk"
                                        className={selectCls}
                                        value={form.data.company.bentuk_badan}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                bentuk_badan: e.target.value,
                                            })
                                        }
                                        required
                                    >
                                        {notarisConfig.bentukBadan.map((b) => (
                                            <option key={b} value={b}>
                                                {b}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={
                                            allErrors['company.bentuk_badan']
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-jabatan">
                                        Jabatan Klien *
                                    </Label>
                                    <Input
                                        id="co-jabatan"
                                        value={form.data.company.jabatan}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                jabatan: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.jabatan']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-bidang">
                                        Bidang Usaha *
                                    </Label>
                                    <Input
                                        id="co-bidang"
                                        value={form.data.company.bidang_usaha}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                bidang_usaha: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={
                                            allErrors['company.bidang_usaha']
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-kbli">Kode KBLI *</Label>
                                    <Input
                                        id="co-kbli"
                                        value={form.data.company.kbli}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                kbli: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.kbli']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-tahun">
                                        Tahun Berdiri *
                                    </Label>
                                    <Input
                                        id="co-tahun"
                                        value={form.data.company.tahun_berdiri}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                tahun_berdiri: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={
                                            allErrors['company.tahun_berdiri']
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-npwp">
                                        NPWP Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-npwp"
                                        value={form.data.company.npwp}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                npwp: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.npwp']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-nib">NIB / OSS *</Label>
                                    <Input
                                        id="co-nib"
                                        value={form.data.company.nib}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                nib: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.nib']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-sk">
                                        No. SK Kemenkumham *
                                    </Label>
                                    <Input
                                        id="co-sk"
                                        value={form.data.company.sk_kemenkumham}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                sk_kemenkumham: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={
                                            allErrors['company.sk_kemenkumham']
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-direktur">
                                        Nama Direktur *
                                    </Label>
                                    <Input
                                        id="co-direktur"
                                        value={form.data.company.direktur}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                direktur: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.direktur']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-komisaris">
                                        Nama Komisaris *
                                    </Label>
                                    <Input
                                        id="co-komisaris"
                                        value={form.data.company.komisaris}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                komisaris: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.komisaris']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-telepon">
                                        Telepon Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-telepon"
                                        value={form.data.company.telepon}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                telepon: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.telepon']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-email">
                                        Email Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-email"
                                        type="email"
                                        value={form.data.company.email}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                email: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.email']}
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="co-alamat">
                                        Alamat Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-alamat"
                                        value={form.data.company.alamat}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                alamat: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.alamat']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-kota">
                                        Kota / Kabupaten *
                                    </Label>
                                    <Input
                                        id="co-kota"
                                        value={form.data.company.kota}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                kota: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.kota']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-provinsi">
                                        Provinsi *
                                    </Label>
                                    <Input
                                        id="co-provinsi"
                                        value={form.data.company.provinsi}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                provinsi: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.provinsi']}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-kodepos">
                                        Kode Pos Perusahaan *
                                    </Label>
                                    <Input
                                        id="co-kodepos"
                                        value={form.data.company.kode_pos}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                kode_pos: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputError
                                        message={allErrors['company.kode_pos']}
                                    />
                                </div>

                                <div className="border-t border-amber-500/15 pt-3 sm:col-span-2 lg:col-span-3">
                                    <span className="text-[11px] font-bold tracking-[0.14em] text-amber-800/80 uppercase dark:text-amber-300/80">
                                        Struktur Modal &amp; Saham (Opsional)
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="co-modal-dasar">
                                        Modal Dasar (Opsional)
                                    </Label>
                                    <CurrencyInput
                                        id="co-modal-dasar"
                                        value={form.data.company.modal_dasar}
                                        onValueChange={(val) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_dasar: val,
                                            })
                                        }
                                        placeholder="Opsional"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-modal-ditempatkan">
                                        Modal Ditempatkan (Opsional)
                                    </Label>
                                    <CurrencyInput
                                        id="co-modal-ditempatkan"
                                        value={
                                            form.data.company.modal_ditempatkan
                                        }
                                        onValueChange={(val) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_ditempatkan: val,
                                            })
                                        }
                                        placeholder="Opsional"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-modal-disetor">
                                        Modal Disetor (Opsional)
                                    </Label>
                                    <CurrencyInput
                                        id="co-modal-disetor"
                                        value={form.data.company.modal_disetor}
                                        onValueChange={(val) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_disetor: val,
                                            })
                                        }
                                        placeholder="Opsional"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-jumlah-saham">
                                        Jumlah Saham (Opsional)
                                    </Label>
                                    <Input
                                        id="co-jumlah-saham"
                                        type="number"
                                        min="0"
                                        placeholder="Opsional (lembar)"
                                        value={form.data.company.jumlah_saham}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                jumlah_saham: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="co-nominal-saham">
                                        Nominal / Saham (Opsional)
                                    </Label>
                                    <CurrencyInput
                                        id="co-nominal-saham"
                                        value={form.data.company.nominal_saham}
                                        onValueChange={(val) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                nominal_saham: val,
                                            })
                                        }
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* C. Catatan Internal */}
                    <fieldset className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs">
                        <div className="flex items-center gap-3 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-5 py-3.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-serif text-xs font-bold text-white shadow-xs dark:from-amber-400 dark:to-amber-600 dark:text-stone-950">
                                C
                            </span>
                            <div className="flex flex-1 items-center justify-between gap-2">
                                <div>
                                    <legend className="text-sm font-semibold text-foreground">
                                        Catatan Internal *
                                    </legend>
                                    <p className="text-xs text-muted-foreground">
                                        Ringkasan kebutuhan akta atau catatan
                                        khusus pengurusan klien.
                                    </p>
                                </div>
                                <StickyNote className="hidden size-4 text-amber-700/70 sm:block dark:text-amber-300/70" />
                            </div>
                        </div>
                        <div className="space-y-2 p-5">
                            <Label htmlFor="client-catatan" className="sr-only">
                                Catatan Internal
                            </Label>
                            <textarea
                                id="client-catatan"
                                className="flex min-h-24 w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-sm shadow-2xs transition-colors focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none"
                                placeholder="Tuliskan catatan atau uraian pengurusan klien…"
                                value={form.data.catatan}
                                onChange={(e) =>
                                    form.setData('catatan', e.target.value)
                                }
                                required
                            />
                            <InputError message={allErrors.catatan} />
                        </div>
                    </fieldset>

                    {/* Layanan Akta (Otomatis Masuk Monitoring Akta) */}
                    <fieldset className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-card to-amber-50/20 shadow-xs dark:to-amber-950/10">
                        <div className="flex items-center gap-3 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/14 via-amber-400/6 to-transparent px-5 py-3.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xs dark:from-amber-400 dark:to-amber-600 dark:text-stone-950">
                                <Scale className="size-4" />
                            </span>
                            <div>
                                <legend className="text-sm font-semibold text-foreground">
                                    Informasi Layanan Akta (Otomatis Masuk ke
                                    Monitoring Akta)
                                </legend>
                                <p className="text-xs text-muted-foreground">
                                    Saat biodata klien disimpan, berkas akta
                                    otomatis dibuat/diperbarui pada Tahap 1.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 p-5 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="case-jenis-akta">
                                    Jenis Akta / Layanan *
                                </Label>
                                <select
                                    id="case-jenis-akta"
                                    className={selectCls}
                                    value={form.data.jenis_akta}
                                    onChange={(e) =>
                                        form.setData(
                                            'jenis_akta',
                                            e.target.value,
                                        )
                                    }
                                    required
                                >
                                    {notarisConfig.jenisAkta.map((j) => (
                                        <option key={j.label} value={j.label}>
                                            {j.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={allErrors.jenis_akta} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="case-biaya">Biaya (Rp) *</Label>
                                <CurrencyInput
                                    id="case-biaya"
                                    minAmount={1}
                                    placeholder="5.000.000"
                                    value={form.data.biaya}
                                    onValueChange={(val) =>
                                        form.setData('biaya', val)
                                    }
                                    required
                                />
                                <InputError message={allErrors.biaya} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="case-target">
                                    Target Selesai (Opsional)
                                </Label>
                                <Input
                                    id="case-target"
                                    type="date"
                                    value={form.data.target_selesai}
                                    onChange={(e) =>
                                        form.setData(
                                            'target_selesai',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={allErrors.target_selesai}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* D. Kelengkapan Berkas Klien (Paling Bawah) */}
                    <fieldset className="overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 font-serif text-xs font-bold text-white shadow-xs dark:from-amber-400 dark:to-amber-600 dark:text-stone-950">
                                    D
                                </span>
                                <div>
                                    <legend className="text-sm font-semibold text-foreground">
                                        Kelengkapan Berkas Klien (
                                        {requireAttachmentUpload
                                            ? 'Wajib Minimal 1 Berkas'
                                            : 'Opsional Tambah Berkas Baru'}
                                        )
                                    </legend>
                                    <p className="text-xs text-muted-foreground">
                                        Unggah KTP, KK, NPWP, atau Akta
                                        Pendirian dalam format PDF / Gambar
                                        (Maks 2 MB / file).
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-amber-500/30 hover:bg-amber-500/10"
                                onClick={addAttachmentRow}
                            >
                                <Plus className="mr-1.5 size-3.5 text-amber-700 dark:text-amber-300" />
                                Tambah Baris Berkas
                            </Button>
                        </div>

                        <div className="space-y-4 p-5">
                            {isEdit &&
                                client?.documents &&
                                client.documents.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            <FolderCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
                                            Berkas yang Sudah Tersimpan (
                                            {client.documents.length})
                                        </div>
                                        <div className="divide-y rounded-xl border border-amber-500/15 bg-muted/20">
                                            {client.documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="size-4 text-amber-700/70 dark:text-amber-300/70" />
                                                        <span className="font-medium">
                                                            {doc.nama}
                                                        </span>
                                                        <Badge variant="outline">
                                                            {doc.kategori}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(
                                                                doc.tanggal_dokumen,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {doc.file_path && (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-lg border-amber-500/25 hover:bg-amber-500/10"
                                                        >
                                                            <a
                                                                href={
                                                                    documentsRoute.download(
                                                                        doc.id,
                                                                    ).url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Lihat File
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            <div className="space-y-3">
                                {form.data.attachments.map((att, idx) => (
                                    <div
                                        key={idx}
                                        className="grid items-start gap-3 rounded-xl border border-amber-500/20 bg-muted/20 p-3.5 transition-colors hover:border-amber-500/35 sm:grid-cols-12"
                                    >
                                        <div className="space-y-1 sm:col-span-3">
                                            <Label className="text-xs">
                                                Kategori Dokumen *
                                            </Label>
                                            <select
                                                className={selectCls}
                                                aria-label={`Kategori dokumen baris ${idx + 1}`}
                                                value={att.kategori}
                                                onChange={(e) =>
                                                    updateAttachment(idx, {
                                                        kategori:
                                                            e.target.value,
                                                    })
                                                }
                                                required={
                                                    requireAttachmentUpload ||
                                                    att.file !== null
                                                }
                                            >
                                                {notarisConfig.kategoriDokumen.map(
                                                    (k) => (
                                                        <option
                                                            key={k}
                                                            value={k}
                                                        >
                                                            {k}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1 sm:col-span-3">
                                            <Label className="text-xs">
                                                Nama / Judul Berkas *
                                            </Label>
                                            <Input
                                                placeholder="Contoh: KTP Direktur"
                                                value={att.nama}
                                                onChange={(e) =>
                                                    updateAttachment(idx, {
                                                        nama: e.target.value,
                                                    })
                                                }
                                                required={
                                                    requireAttachmentUpload ||
                                                    att.file !== null
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <Label className="text-xs">
                                                No. Dokumen
                                            </Label>
                                            <Input
                                                placeholder="Opsional"
                                                value={att.nomor_dokumen}
                                                onChange={(e) =>
                                                    updateAttachment(idx, {
                                                        nomor_dokumen:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1 sm:col-span-3">
                                            <Label className="text-xs">
                                                File{' '}
                                                {requireAttachmentUpload &&
                                                idx === 0
                                                    ? '* '
                                                    : ''}
                                                (Maks 2 MB)
                                            </Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,image/*"
                                                required={
                                                    requireAttachmentUpload &&
                                                    idx === 0
                                                }
                                                onChange={(e) =>
                                                    handleAttachmentFile(
                                                        idx,
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                            />
                                            {att.file && !att.error && (
                                                <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    <UploadCloud className="size-3" />{' '}
                                                    {att.file.name}
                                                </p>
                                            )}
                                            {(att.error ||
                                                allErrors[
                                                    `attachments.${idx}.file`
                                                ]) && (
                                                <p className="text-[11px] text-destructive">
                                                    {att.error ??
                                                        allErrors[
                                                            `attachments.${idx}.file`
                                                        ]}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-end justify-end pt-5 sm:col-span-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    removeAttachmentRow(idx)
                                                }
                                                disabled={
                                                    form.data.attachments
                                                        .length === 1 &&
                                                    !att.file
                                                }
                                                title="Hapus baris"
                                                aria-label={`Hapus baris berkas ${idx + 1}`}
                                                className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="size-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <InputError message={allErrors.attachments} />
                        </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-amber-500/20 bg-card/90 p-4 shadow-xs backdrop-blur-sm">
                        <Button
                            asChild
                            type="button"
                            variant="outline"
                            className="rounded-xl border-amber-500/25 hover:bg-amber-500/10"
                        >
                            <Link href={clientsRoute.index()}>Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || hasAttachmentError}
                            className="rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white shadow-sm shadow-amber-900/15 hover:brightness-105 dark:from-amber-400 dark:via-amber-500 dark:to-amber-600 dark:text-stone-950"
                        >
                            <Save className="mr-1.5 size-4" />
                            {form.processing
                                ? 'Menyimpan…'
                                : isEdit
                                  ? 'Simpan Perubahan Klien'
                                  : 'Simpan Data Klien'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
