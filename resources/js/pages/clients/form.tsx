import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, FileText, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import clientsRoute from '@/routes/clients';
import documentsRoute from '@/routes/documents';
import type { BreadcrumbItem, Client, DocumentItem, NotarisConfig } from '@/types';

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
            modal_ditempatkan: co?.modal_ditempatkan != null ? String(co.modal_ditempatkan) : '',
            modal_disetor: co?.modal_disetor != null ? String(co.modal_disetor) : '',
            jumlah_saham: co?.jumlah_saham != null ? String(co.jumlah_saham) : '',
            nominal_saham: co?.nominal_saham != null ? String(co.nominal_saham) : '',
            direktur: co?.direktur ?? '',
            komisaris: co?.komisaris ?? '',
        },
        attachments: [
            { kategori: 'KTP', nama: '', nomor_dokumen: '', file: null, error: null },
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
            href: isEdit ? clientsRoute.edit(client!.id) : clientsRoute.create(),
        },
    ];

    const form = useForm<ClientFormData>(makeInitialData(client, suggestedKode));
    const [submitting, setSubmitting] = useState(false);

    const maxBytes = notarisConfig.maxFileKb * 1024;
    const hasAttachmentError = form.data.attachments.some((a) => Boolean(a.error));

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
            nama: currentRow.nama || (file ? file.name.replace(/\.[^/.]+$/, '') : ''),
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

        const payload = {
            ...form.data,
            attachments: validAttachments,
        };

        if (isEdit && client) {
            setSubmitting(true);
            router.post(
                clientsRoute.update(client.id).url,
                { _method: 'put', ...payload },
                {
                    forceFormData: true,
                    onFinish: () => setSubmitting(false),
                },
            );
        } else {
            setSubmitting(true);
            router.post(clientsRoute.store().url, payload, {
                forceFormData: true,
                onFinish: () => setSubmitting(false),
            });
        }
    };

    const selectCls =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? `Edit Klien ${client!.kode}` : 'Tambah Data Klien'} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="sm">
                            <Link href={clientsRoute.index()}>
                                <ArrowLeft className="mr-1.5 size-4" /> Kembali
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                {isEdit ? `Edit Data Klien — ${client!.kode}` : 'Tambah Data Klien Baru'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Lengkapi biodata diri, data badan usaha (jika ada), serta berkas kelengkapan klien.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Toggle Badan Usaha */}
                    <div className="flex items-center space-x-2.5 rounded-xl border bg-card p-4 shadow-xs">
                        <Checkbox
                            id="toggle-pt"
                            checked={form.data.jenis === 'perusahaan'}
                            onCheckedChange={(checked) => {
                                const nextJenis = checked ? 'perusahaan' : 'pribadi';
                                form.setData({
                                    ...form.data,
                                    jenis: nextJenis,
                                    jenis_akta: checked ? 'Akta Pendirian PT' : 'Akta Jual Beli (AJB)',
                                });
                            }}
                        />
                        <Label htmlFor="toggle-pt" className="cursor-pointer font-medium">
                            Klien juga mendaftarkan perusahaan / badan usaha
                        </Label>
                    </div>

                    {/* A. Biodata Diri */}
                    <fieldset className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
                        <legend className="px-2 text-sm font-semibold">A. Biodata Diri (Sesuai KTP)</legend>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label>Kode Klien</Label>
                                <Input
                                    value={form.data.kode}
                                    onChange={(e) => form.setData('kode', e.target.value)}
                                    placeholder="Kosongkan untuk kode otomatis"
                                />
                                {form.errors.kode && <p className="text-xs text-destructive">{form.errors.kode}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Nama Lengkap *</Label>
                                <Input
                                    value={form.data.nama}
                                    onChange={(e) => form.setData('nama', e.target.value)}
                                    required
                                />
                                {form.errors.nama && <p className="text-xs text-destructive">{form.errors.nama}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>NIK</Label>
                                <Input value={form.data.nik} onChange={(e) => form.setData('nik', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>NPWP Pribadi</Label>
                                <Input value={form.data.npwp} onChange={(e) => form.setData('npwp', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tempat Lahir</Label>
                                <Input
                                    value={form.data.tempat_lahir}
                                    onChange={(e) => form.setData('tempat_lahir', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tanggal Lahir</Label>
                                <Input
                                    type="date"
                                    value={form.data.tanggal_lahir}
                                    onChange={(e) => form.setData('tanggal_lahir', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Jenis Kelamin</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.jenis_kelamin}
                                    onChange={(e) => form.setData('jenis_kelamin', e.target.value)}
                                >
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Agama</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.agama}
                                    onChange={(e) => form.setData('agama', e.target.value)}
                                >
                                    <option value="">-</option>
                                    {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'].map(
                                        (a) => (
                                            <option key={a} value={a}>
                                                {a}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kewarganegaraan</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.kewarganegaraan}
                                    onChange={(e) => form.setData('kewarganegaraan', e.target.value)}
                                >
                                    <option value="WNI">WNI</option>
                                    <option value="WNA">WNA</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status Perkawinan</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.status_perkawinan}
                                    onChange={(e) => form.setData('status_perkawinan', e.target.value)}
                                >
                                    {['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Pekerjaan</Label>
                                <Input
                                    value={form.data.pekerjaan}
                                    onChange={(e) => form.setData('pekerjaan', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Nama Ibu Kandung</Label>
                                <Input
                                    value={form.data.nama_ibu_kandung}
                                    onChange={(e) => form.setData('nama_ibu_kandung', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>No. Telepon / WA</Label>
                                <Input
                                    value={form.data.telepon}
                                    onChange={(e) => form.setData('telepon', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>Alamat (Sesuai KTP)</Label>
                                <Input
                                    value={form.data.alamat}
                                    onChange={(e) => form.setData('alamat', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>RT / RW</Label>
                                <Input value={form.data.rt_rw} onChange={(e) => form.setData('rt_rw', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kelurahan / Desa</Label>
                                <Input
                                    value={form.data.kelurahan}
                                    onChange={(e) => form.setData('kelurahan', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kecamatan</Label>
                                <Input
                                    value={form.data.kecamatan}
                                    onChange={(e) => form.setData('kecamatan', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kota / Kabupaten</Label>
                                <Input value={form.data.kota} onChange={(e) => form.setData('kota', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Provinsi</Label>
                                <Input
                                    value={form.data.provinsi}
                                    onChange={(e) => form.setData('provinsi', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kode Pos</Label>
                                <Input
                                    value={form.data.kode_pos}
                                    onChange={(e) => form.setData('kode_pos', e.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* B. Biodata Perusahaan */}
                    {form.data.jenis === 'perusahaan' && (
                        <fieldset className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
                            <legend className="px-2 text-sm font-semibold">
                                B. Biodata Perusahaan / Badan Usaha
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label>Nama Perusahaan</Label>
                                    <Input
                                        value={form.data.company.nama}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, nama: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Bentuk Badan Usaha</Label>
                                    <select
                                        className={selectCls}
                                        value={form.data.company.bentuk_badan}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                bentuk_badan: e.target.value,
                                            })
                                        }
                                    >
                                        {notarisConfig.bentukBadan.map((b) => (
                                            <option key={b} value={b}>
                                                {b}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Jabatan Klien</Label>
                                    <Input
                                        value={form.data.company.jabatan}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, jabatan: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Bidang Usaha</Label>
                                    <Input
                                        value={form.data.company.bidang_usaha}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                bidang_usaha: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Kode KBLI</Label>
                                    <Input
                                        value={form.data.company.kbli}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, kbli: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tahun Berdiri</Label>
                                    <Input
                                        value={form.data.company.tahun_berdiri}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                tahun_berdiri: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>NPWP Perusahaan</Label>
                                    <Input
                                        value={form.data.company.npwp}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, npwp: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>NIB / OSS</Label>
                                    <Input
                                        value={form.data.company.nib}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, nib: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>No. SK Kemenkumham</Label>
                                    <Input
                                        value={form.data.company.sk_kemenkumham}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                sk_kemenkumham: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Modal Dasar (Rp)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.data.company.modal_dasar}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_dasar: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Modal Ditempatkan (Rp)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.data.company.modal_ditempatkan}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_ditempatkan: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Modal Disetor (Rp)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.data.company.modal_disetor}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                modal_disetor: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Jumlah Saham (lembar)</Label>
                                    <Input
                                        type="number"
                                        min="0"
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
                                    <Label>Nominal / Saham (Rp)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.data.company.nominal_saham}
                                        onChange={(e) =>
                                            form.setData('company', {
                                                ...form.data.company,
                                                nominal_saham: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Nama Direktur</Label>
                                    <Input
                                        value={form.data.company.direktur}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, direktur: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Nama Komisaris</Label>
                                    <Input
                                        value={form.data.company.komisaris}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, komisaris: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label>Alamat Perusahaan</Label>
                                    <Input
                                        value={form.data.company.alamat}
                                        onChange={(e) =>
                                            form.setData('company', { ...form.data.company, alamat: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* C. Catatan Internal */}
                    <fieldset className="space-y-3 rounded-xl border bg-card p-5 shadow-xs">
                        <legend className="px-2 text-sm font-semibold">C. Catatan Internal</legend>
                        <textarea
                            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            placeholder="Catatan tambahan mengenai klien atau pengurusan…"
                            value={form.data.catatan}
                            onChange={(e) => form.setData('catatan', e.target.value)}
                        />
                    </fieldset>

                    {/* Layanan Akta (Otomatis Masuk Monitoring Akta) */}
                    <fieldset className="space-y-3 rounded-xl border bg-card p-5 shadow-xs">
                        <legend className="px-2 text-sm font-semibold">
                            Informasi Layanan Akta (Otomatis Masuk ke Monitoring Akta)
                        </legend>
                        <p className="text-xs text-muted-foreground">
                            Saat biodata klien disimpan, berkas akta otomatis dibuat/diperbarui di Monitoring Akta pada Tahap 1 (Pengisian Biodata Klien).
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label>Jenis Akta / Layanan</Label>
                                <select
                                    className={selectCls}
                                    value={form.data.jenis_akta}
                                    onChange={(e) => form.setData('jenis_akta', e.target.value)}
                                >
                                    {notarisConfig.jenisAkta.map((j) => (
                                        <option key={j.label} value={j.label}>
                                            {j.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Estimasi Biaya (Rp)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Opsional (bisa diisi nanti)"
                                    value={form.data.biaya}
                                    onChange={(e) => form.setData('biaya', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Target Selesai</Label>
                                <Input
                                    type="date"
                                    value={form.data.target_selesai}
                                    onChange={(e) => form.setData('target_selesai', e.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* D. Kelengkapan Berkas Klien (Paling Bawah) */}
                    <fieldset className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
                        <legend className="px-2 text-sm font-semibold">
                            D. Kelengkapan Berkas Klien (Opsional, Maks 2 MB / File)
                        </legend>

                        {isEdit && client?.documents && client.documents.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase">
                                    Berkas yang Sudah Tersimpan ({client.documents.length})
                                </div>
                                <div className="divide-y rounded-lg border bg-muted/20">
                                    {client.documents.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="size-4 text-muted-foreground" />
                                                <span className="font-medium">{doc.nama}</span>
                                                <Badge variant="outline">{doc.kategori}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(doc.tanggal_dokumen)}
                                                </span>
                                            </div>
                                            {doc.file_path && (
                                                <Button asChild size="sm" variant="outline">
                                                    <a
                                                        href={documentsRoute.download(doc.id).url}
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

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                                Unggah dokumen kelengkapan klien seperti KTP, KK, NPWP, Akta Pendirian, dll (PDF / Gambar).
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={addAttachmentRow}>
                                <Plus className="mr-1.5 size-3.5" /> Tambah Baris Berkas
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {form.data.attachments.map((att, idx) => (
                                <div
                                    key={idx}
                                    className="grid items-start gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-12"
                                >
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Kategori Dokumen</Label>
                                        <select
                                            className={selectCls}
                                            value={att.kategori}
                                            onChange={(e) => updateAttachment(idx, { kategori: e.target.value })}
                                        >
                                            {notarisConfig.kategoriDokumen.map((k) => (
                                                <option key={k} value={k}>
                                                    {k}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Nama / Judul Berkas</Label>
                                        <Input
                                            placeholder="Contoh: KTP Direktur"
                                            value={att.nama}
                                            onChange={(e) => updateAttachment(idx, { nama: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs">No. Dokumen</Label>
                                        <Input
                                            placeholder="Opsional"
                                            value={att.nomor_dokumen}
                                            onChange={(e) => updateAttachment(idx, { nomor_dokumen: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">File (Maks 2 MB)</Label>
                                        <Input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) =>
                                                handleAttachmentFile(idx, e.target.files?.[0] ?? null)
                                            }
                                        />
                                        {att.file && !att.error && (
                                            <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                                                <UploadCloud className="size-3" /> {att.file.name}
                                            </p>
                                        )}
                                        {att.error && <p className="text-[11px] text-destructive">{att.error}</p>}
                                    </div>
                                    <div className="flex items-end justify-end pt-5 sm:col-span-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeAttachmentRow(idx)}
                                            disabled={form.data.attachments.length === 1 && !att.file}
                                            title="Hapus baris"
                                        >
                                            <Trash2 className="size-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                        <Button asChild type="button" variant="outline">
                            <Link href={clientsRoute.index()}>Batal</Link>
                        </Button>
                        <Button type="submit" disabled={submitting || hasAttachmentError}>
                            <Save className="mr-1.5 size-4" />
                            {submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan Klien' : 'Simpan Data Klien'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
