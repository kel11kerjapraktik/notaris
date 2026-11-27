export type OfficeInfo = {
    name: string;
    notaris_name: string;
    sk_number: string;
    address: string;
};

export type DeedStageConfig = {
    key: string;
    order: number;
    label: string;
    description: string;
    skippable: boolean;
    requires_notaris: boolean;
};

export type JenisAktaOption = {
    label: string;
    is_badan_usaha: boolean;
};

export type NotarisConfig = {
    office: OfficeInfo;
    stages: DeedStageConfig[];
    jenisAkta: JenisAktaOption[];
    kategoriDokumen: string[];
    bentukBadan: string[];
    maxFileKb: number;
};

export type ClientCompany = {
    id: number;
    client_id: number;
    nama: string | null;
    bentuk_badan: string | null;
    jabatan: string | null;
    bidang_usaha: string | null;
    kbli: string | null;
    tahun_berdiri: string | null;
    npwp: string | null;
    nib: string | null;
    sk_kemenkumham: string | null;
    alamat: string | null;
    kota: string | null;
    provinsi: string | null;
    kode_pos: string | null;
    telepon: string | null;
    email: string | null;
    modal_dasar: number | null;
    modal_ditempatkan: number | null;
    modal_disetor: number | null;
    jumlah_saham: number | null;
    nominal_saham: number | null;
    direktur: string | null;
    komisaris: string | null;
};

export type Client = {
    id: number;
    kode: string;
    jenis: 'pribadi' | 'perusahaan';
    nama: string;
    nik: string | null;
    npwp: string | null;
    tempat_lahir: string | null;
    tanggal_lahir: string | null;
    jenis_kelamin: string | null;
    agama: string | null;
    kewarganegaraan: string;
    status_perkawinan: string | null;
    pekerjaan: string | null;
    nama_ibu_kandung: string | null;
    telepon: string | null;
    email: string | null;
    alamat: string | null;
    rt_rw: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    kota: string | null;
    provinsi: string | null;
    kode_pos: string | null;
    catatan: string | null;
    company?: ClientCompany | null;
    deed_cases_count?: number;
    documents_count?: number;
    created_at: string;
};

export type CaseStageHistory = {
    id: number;
    deed_case_id: number;
    stage_order: number;
    stage_key: string;
    action: string;
    notes: string | null;
    acted_by: number | null;
    actor?: { id: number; name: string; role: string } | null;
    created_at: string;
};

export type DocumentItem = {
    id: number;
    client_id: number;
    deed_case_id: number | null;
    kategori: string;
    nama: string;
    nomor_dokumen: string | null;
    tanggal_dokumen: string | null;
    keterangan: string | null;
    file_path: string | null;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    is_complete_checked: boolean;
    is_verified: boolean;
    is_rejected: boolean;
    verified_at: string | null;
    catatan_notaris: string | null;
    verifier?: { id: number; name: string } | null;
    client?: Client | null;
    deed_case?: { id: number; nomor: string; jenis_akta: string } | null;
    created_at: string;
};

export type PaymentItem = {
    id: number;
    deed_case_id: number;
    no_inv: string;
    termin_ke: number;
    payment_type: 'dp_50' | 'pelunasan' | 'termin_lain';
    keterangan: string | null;
    jumlah: number;
    jatuh_tempo: string | null;
    tanggal_bayar: string | null;
    metode: string;
    no_referensi: string | null;
    status: 'belum' | 'menunggu' | 'lunas' | 'ditolak';
    bukti_path: string | null;
    bukti_name: string | null;
    bukti_mime: string | null;
    submitter?: { id: number; name: string } | null;
    confirmer?: { id: number; name: string } | null;
    confirmed_at: string | null;
    catatan_notaris: string | null;
    deed_case?: {
        id: number;
        nomor: string;
        jenis_akta: string;
        biaya: number;
        client?: Client | null;
    } | null;
    created_at: string;
};

export type DeedCaseDetail = {
    id: number;
    nomor: string;
    client_id: number;
    jenis_akta: string;
    is_badan_usaha: boolean;
    biaya: number;
    target_selesai: string | null;
    penanggung_jawab: string | null;
    current_stage: string;
    is_completed: boolean;
    completed_at: string | null;
    draft_status: 'none' | 'pending_approval' | 'revision_requested' | 'approved';
    draft_approver?: { id: number; name: string } | null;
    draft_approved_at: string | null;
    doc_approval_status: 'none' | 'pending_approval' | 'rejected' | 'approved';
    doc_approver?: { id: number; name: string } | null;
    doc_approved_at: string | null;
    doc_approval_notes: string | null;
    catatan: string | null;
    nomor_akta: string | null;
    tanggal_akta: string | null;
    tanggal_ttd_minuta: string | null;
    nomor_sk_ahu: string | null;
    tanggal_sk_ahu: string | null;
    tanggal_pemilik_manfaat: string | null;
    status_pemilik_manfaat: string | null;
    nomor_tbnri: string | null;
    tanggal_tbnri: string | null;
    nib_perusahaan: string | null;
    kbli_oss: string | null;
    client: Client;
    histories: CaseStageHistory[];
    documents: DocumentItem[];
    payments: PaymentItem[];
    created_at: string;
};

export type ActivityLogItem = {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_role: string | null;
    action: string;
    subject_type: string | null;
    subject_id: number | null;
    description: string | null;
    created_at: string;
};
