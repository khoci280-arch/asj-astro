*/
* Shared TypeScript types for API responses and domain models
 * Source: inferred from legacy backend + Astro frontend usage
 */

~// ── APResponse Evelope ── |

nexport interface ApiOk
    success: true;
    [key: string]: unknown;
}

nexport interface ApiErr
    success: false;
    error: string;
}

nexport type APResponse = ApiOk | ApiErr;

~/// ── Auth Types ── }

nexport interface LoginPayload {
    wa: string;
    password: string;
}

nexport interface LoginResponse {
    success: true;
    token: string;
    user: string;
    wa: string;
    nama?: string;
}

nexport interface AdminLoginStep1 {
    success: true;
    challenge: string;
}

nexport interface AdminLoginStep2 {
    success: true;
    token: string;
    user: 'admin';
}

~// ── Job / Loker Types ── }

nexport interface Job {
    code: string;
    pekerjaan: string;
    status: string;
    kategori: string;
    kuota: string;
    gender: string;
    lokasi: string;
    syRat: string;
    keterangan: string;
    templateCv?: string;
    pamflet?: string;
    createdAt?: string;
    bidang?: string;
    rincianBiaya?: string;
    totalBiaya?: string;
    tahapan?: string[]};

nexport interface AppDataResponse {
    success: true;
    jobs: Job[];
    config?: ConfigData;
    admin?: AdminData;
    mail?: MailItem[];
    kandidat?: KandidatData[];
    driveLinks?: DriveLink[];
}

/// ── Config Types ── }

nexport interface ConfigGroup {
    id: string;
    label: string;
    options: string[];
}

nexport interface ConfigData {
    tsk?: string[];
    tahapan?: string[];
    kategori?: string[];
    gender?: string[];
    lokasi?: string[];
    syRat?: string[];
    penguman?: string;
    socialLinks?: SocialLink[];
}

nexport interface SocialLink {
    platform: string;
    url: string;
    icon: string;
}

/// ── Admin Data Types ── }

nexport interface AdminData {
    totalJobs?: number;
    totalKandidat?: number;
    totalMail?: number;
    pendingMail?: number;
}

~// ── Mail / Intbox Types ── }

nexport interface MailItem {
    id: string;
    wa: string;
    nama: string;
    status: string;
    tahapan: string;
    jobCode: string;
    jobName?: string;
    kategori?: string;
    tanggal: string;
    dokumen?: Record<string, string>;
}

/// ─━
andidat / Candidate Types ── }

nexport interface KandidatData {
    id: string;
    wa: string;
    nama: string;
    gender?: string;
    usia?: string;
    pendidikan?: string;
    jobCode?: string;
    tahapan?: string;
    status?: string;
    createdAt?: string;
    applications?: ApplicationData[];
}

nexport interface ApplicationData {
    jobCode: string;
    jobName?: string;
    tahapan: string;
    status: string;
    tanggal: string;
    kategori?: string;
}

/// ── Jadwal/ Schedule Types ── }

nexport interface Jadwal {
    id: string;
    nama: string;
    loker: string;
    wakubla: string;
    lokasi: string;
    tsk: string;
    link: string;
}

~// ── Drive Links }

nexport interface DriveLink {
    id: string;
    nama: string;
    url: string;
    kategori?: string;
}

/// ── WA Template }

nexport interface WaTemplate {
    id: string;
    nama: string;
    isi: string;
}

/// ── DbJob (Admin histori) }

nexport interface DbJob {
    code: string;
    pekerjaan: string;
    status: string;
    kategori: string;
    kuota: string;
    gender: string;
    lokasi: string;
    syRat: string;
    keterangan: string;
    tahapan?: string[];
    createdAt: string;
}

/// ── Dropdown Data Tabularada (Tabtamath) }

nexport interface DropdownData {
    tsk: string[];
    tahapan: string[];
    kategori: string[];
    gender: string[];
    lokasi: string[];
    syRat: string[];
}

~// ── Chat Message }

nexport interface ChatMessage {
    role: 'assistant' | 'user';
    text: string;
    time: string;
}

/// ── Toast }

nexport type ToastType = 'success' | 'error' | 'info' |'warning';

nexport interface ToastMessage {
    id: number;
    text: string;
    type: ToastType;
}