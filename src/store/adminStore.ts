/**
 * adminStore.ts — Reactive Admin State (Nanostores)
 *
 * Centralized state for admin panel: modals, kandidat list, filters.
 * Replaces local useState in TabPelamar + InputManualModal.
 *
 * Pattern: same as authReactive.ts — atom for simple state,
 * reactive updates trigger auto re-render in all subscribers.
 */
import { atom } from 'nanostores';
import { authStore } from './authReactive';

export interface Kandidat {
  id: string;
  nama: string;
  wa: string;
  idLoker: string;
  tahapan: string;
  status: string;
  catatan: string;
  gender: string;
  usia: string;
  jft: string;
  // Kolom catatan mengikuti legacy: tampilan = catatanExt || catatan_admin.
  catatanExt?: string;
  catatanInt?: string;
  isVIP?: boolean;
  isSiswaASJ?: boolean;
}

// ── Modal State ──────────────────────────────────────────
export const inputModalOpen = atom<boolean>(false);
export const reportModalOpen = atom<boolean>(false);

// ── Kandidat List (reactive) ─────────────────────────────
export const kandidatList = atom<Kandidat[]>([]);
export const allKandidatList = atom<Kandidat[]>([]);
export const kandidatLoading = atom<boolean>(true);

// ── Filter State ─────────────────────────────────────────
export const adminSearch = atom<string>('');
export const adminFilterGender = atom<string>('all');
export const adminFilterAge = atom<string>('all');
export const adminFilterJft = atom<string>('all');
export const adminPage = atom<number>(0);
export const adminSimpleView = atom<boolean>(false);

export const PAGE_SIZE = 20;

// ── Modal Actions ────────────────────────────────────────
export function openInputModal() {
  inputModalOpen.set(true);
}

export function closeInputModal() {
  inputModalOpen.set(false);
}

export function openReportModal() {
  reportModalOpen.set(true);
}

export function closeReportModal() {
  reportModalOpen.set(false);
}

// ── Kandidat Actions ─────────────────────────────────────
export function addKandidat(k: Kandidat) {
  const current = kandidatList.get();
  kandidatList.set([k, ...current]);
  const allCurrent = allKandidatList.get();
  allKandidatList.set([k, ...allCurrent]);
}

export function setKandidatList(list: Kandidat[]) {
  kandidatList.set(list);
}

export function setAllKandidatList(list: Kandidat[]) {
  allKandidatList.set(list);
}

export function setKandidatLoading(loading: boolean) {
  kandidatLoading.set(loading);
}

// ── Filter Actions ───────────────────────────────────────
export function setAdminSearch(val: string) {
  adminSearch.set(val);
  adminPage.set(0); // reset page on search
}

export function setAdminFilterGender(val: string) {
  adminFilterGender.set(val);
  adminPage.set(0);
}

export function setAdminFilterAge(val: string) {
  adminFilterAge.set(val);
  adminPage.set(0);
}

export function setAdminFilterJft(val: string) {
  adminFilterJft.set(val);
  adminPage.set(0);
}

export function nextPage() {
  adminPage.set(adminPage.get() + 1);
}

export function resetPage() {
  adminPage.set(0);
}

export function toggleSimpleView() {
  adminSimpleView.set(!adminSimpleView.get());
}

// ── Fetch from API ───────────────────────────────────────
// P10 fix: Paginated fetch — request only the current page + filters
// instead of loading all candidates client-side. The server handles
// filtering and pagination, reducing payload size and client memory.
export async function fetchKandidatFromAPI() {
  setKandidatLoading(true);
  try {
    const search = adminSearch.get();
    const page = adminPage.get();
    const token = authStore.get().sessionToken || '';
    const res = await fetch('/.netlify/functions/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getCandidatesPage',
        payload: [{ page: page + 1, pageSize: PAGE_SIZE, q: search || '' }],
        sessionToken: token,
      }),
    });
    const data = await res.json();
    if (data.success) {
      const k = data.candidates || [];
      setKandidatList(page === 0 ? k : [...kandidatList.get(), ...k]);
      setAllKandidatList(k);
    } else if (data.sessionInvalid) {
      setKandidatList([]);
    }
  } catch (err) {
    console.error('[adminStore] fetchKandidat failed:', err);
  } finally {
    setKandidatLoading(false);
  }
}

// ── Mail State ──────────────────────────────────────────
export const mailFilterStatus = atom<string>('MENUNGGU');
export const mailSearchText = atom<string>('');
export const mailList = atom<any[]>([]);

export function setMailFilterStatus(val: string) {
  mailFilterStatus.set(val);
}

export function setMailSearchText(val: string) {
  mailSearchText.set(val);
}



export async function fetchMailFromAPI() {
  try {
    const res = await fetch('/.netlify/functions/get-app-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "getAppData", args: ["admin"], sessionToken: authStore.get().sessionToken || "" }),
    });
    const data = await res.json();
    if (data.success) {
      mailList.set(data.formInbox || []);
    }
  } catch (err) {
    console.error('[adminStore] fetchMail failed:', err);
  }
}
