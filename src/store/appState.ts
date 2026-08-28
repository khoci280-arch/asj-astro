/**
 * appState.ts — Global application state (non-auth)
 * Migrated from legacy/js/init/state.ts
 * 
 * Uses nanostores for reactive state management.
 * Replaces the legacy bridgeState pattern with proper atoms.
 */
import { atom } from 'nanostores';

/** Job listings */
export const allJobs = atom<any[]>([]);
export const allDbJobs = atom<any[]>([]);

/** Candidates */
export const allCandidates = atom<any[]>([]);
export const allCandidatesTotal = atom(0);

/** Schedules & Tasks */
export const allSchedules = atom<any[]>([]);
export const allTugas = atom<any[]>([]);

/** Forms & Templates */
export const allForm = atom<any[]>([]);
export const allWaTemplates = atom<any[]>([]);

/** Candidate history (riwayat) */
export const allRiwayatKandidat = atom<any[]>([]);

/** Assets & Config */
export const assets = atom<Record<string, any>>({});
export const currentTheme = atom('TOKYO');
export const dropdowns = atom<Record<string, any>>({});

/** Pagination limits */
export const limitPub = atom(10);
export const limitAdm = atom(10);
export const limitKan = atom(50);
export const limitJad = atom(10);
export const limitDb = atom(10);

/** Filters */
export const dbSortType = atom('TERBARU');
export const dbFilterBidang = atom('ALL');
export const dbFilterTahapan = atom('ALL');
export const mailFilterStatus = atom('MENUNGGU');
export const mailSearchText = atom('');
export const currentPublicFilter = atom('ALL');

/** Misc state */
export const currentCopyListTxt = atom('');
export const currentWaKandidat = atom<string | null>(null);
export const prevMailCount = atom<number | null>(null);
export const autoRefreshTimer = atom<any>(null);

/** Pemberkasan modal state */
export const activePemberkasanWa = atom('');
export const activePemberkasanNama = atom('');

/** Reset all state (called on logout) */
export function resetAppState() {
  allJobs.set([]);
  allDbJobs.set([]);
  allCandidates.set([]);
  allCandidatesTotal.set(0);
  allSchedules.set([]);
  allTugas.set([]);
  allForm.set([]);
  allWaTemplates.set([]);
  allRiwayatKandidat.set([]);
  assets.set({});
  dropdowns.set({});
  limitPub.set(10);
  limitAdm.set(10);
  limitKan.set(50);
  limitJad.set(10);
  limitDb.set(10);
  dbSortType.set('TERBARU');
  dbFilterBidang.set('ALL');
  dbFilterTahapan.set('ALL');
  mailFilterStatus.set('MENUNGGU');
  mailSearchText.set('');
  currentPublicFilter.set('ALL');
  currentCopyListTxt.set('');
  currentWaKandidat.set(null);
  prevMailCount.set(null);
  activePemberkasanWa.set('');
  activePemberkasanNama.set('');
}
