/**
 * Shared TypeScript types for API responses and domain models
 * Source: inferred from legacy backend + Astro frontend usage
 *
 * PERBAIKAN 2026-08-31: file ini sebelumnya rusak (karakter acak di awal
 * `export`, kurung kurawal hilang, header seksi berantakan) sehingga
 * menghasilkan 50 error sintaks. TypeScript melewat seluruh pemeriksaan
 * semantik bila ada error sintaks — jadi SATU file yang rusak ini membuat
 * SELURUH `src/` tidak pernah dicek tipenya meski tsconfig memakai `strict`.
 * Jangan biarkan file ini rusak lagi: kalau `npx tsc --noEmit` mengeluarkan
 * error TS1xxx (sintaks), perbaiki di sini dulu sebelum yang lain.
 */

// ── API Response Envelope ──

export interface ApiOk {
  success: true;
  [key: string]: unknown;
}

export interface ApiErr {
  success: false;
  error: string;
}

export type ApiResponse = ApiOk | ApiErr;

// ── Auth Types ──

export interface LoginPayload {
  wa: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  /** Nama field SESUAI authReactive.ts — bukan `token`. */
  sessionToken: string;
  user: string;
  wa: string;
  nama?: string;
}

export interface AdminLoginStep1 {
  success: true;
  challenge: string;
}

export interface AdminLoginStep2 {
  success: true;
  sessionToken: string;
  user: 'admin';
}

// ── Job / Loker Types ──

export interface Job {
  code: string;
  pekerjaan: string;
  status: string;
  kategori: string;
  kuota: string;
  gender: string;
  lokasi: string;
  syarat: string;
  keterangan: string;
  templateCv?: string;
  pamflet?: string;
  createdAt?: string;
  bidang?: string;
  rincianBiaya?: string;
  totalBiaya?: string;
  tahapan?: string[];
  updated_at?: string;
}

export interface AppDataResponse {
  success: true;
  jobs: Job[];
  config?: ConfigData;
  admin?: AdminData;
  mail?: MailItem[];
  kandidat?: KandidatData[];
  driveLinks?: DriveLink[];
}

// ── Config Types ──

export interface ConfigGroup {
  id: string;
  label: string;
  options: string[];
}

export interface ConfigData {
  tsk?: string[];
  tahapan?: string[];
  kategori?: string[];
  gender?: string[];
  lokasi?: string[];
  syarat?: string[];
  pengumuman?: string;
  socialLinks?: SocialLink[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

// ── Admin Data Types ──

export interface AdminData {
  totalJobs?: number;
  totalKandidat?: number;
  totalMail?: number;
  pendingMail?: number;
}

// ── Mail / Inbox Types ──

export interface MailItem {
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

// ── Kandidat / Candidate Types ──

export interface KandidatData {
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

export interface ApplicationData {
  jobCode: string;
  jobName?: string;
  tahapan: string;
  status: string;
  tanggal: string;
  kategori?: string;
}

// ── Jadwal / Schedule Types ──

export interface Jadwal {
  id: string;
  nama: string;
  loker: string;
  waktu: string;
  lokasi: string;
  tsk: string;
  link: string;
}

// ── Drive Links ──

export interface DriveLink {
  id: string;
  nama: string;
  url: string;
  kategori?: string;
}

// ── WA Template ──

export interface WaTemplate {
  id: string;
  nama: string;
  isi: string;
}

// ── DbJob (Admin histori) ──

export interface DbJob {
  code: string;
  pekerjaan: string;
  status: string;
  kategori: string;
  kuota: string;
  gender: string;
  lokasi: string;
  syarat: string;
  keterangan: string;
  tahapan?: string[];
  createdAt: string;
}

// ── Dropdown Data (TabTambah) ──

export interface DropdownData {
  tsk: string[];
  tahapan: string[];
  kategori: string[];
  gender: string[];
  lokasi: string[];
  syarat: string[];
}

// ── Chat Message ──

export interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  time: string;
}

// ── Toast ──

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}
