# Candidate Profile Modal — Design Spec

**Date**: 2026-09-02
**Status**: Approved
**Scope**: Full legacy port of `bukaDigitalCV` modal

## Problem

The "Database Pelamar" (TabPelamar) has 5 action buttons per candidate. The clock button is supposed to open a candidate profile modal showing digital student card, CV progress, application history, documents, schedules, and admin notes. In v2, this button only shows a toast — the modal was never migrated from legacy.

## Legacy Reference

Legacy `bukaDigitalCV(idKandidat)` in `legacy/js/admin_modal/cv.ts`:
- Finds candidate in `ALL_CANDIDATES` by `idKandidat`
- Opens a modal with: photo, name, ID, QR code, VIP badge
- CV progress bars (mini + master)
- Application history with tahapan pipeline
- Document list (CV, JFT, SSW, extra docs)
- Schedule list
- Admin notes (catatan)
- Action buttons: Edit CV, Preview CV, WhatsApp

## Design

### Component: `CandidateProfileModal.tsx`

**Location**: `src/components/admin/CandidateProfileModal.tsx`

**Props**:
```typescript
interface Props {
  wa: string;
  nama: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Data fetching**:
- On open, calls `getAppData` with `args: ['kandidat', wa]` via `/.netlify/functions/get-app-data`
- Uses the existing Vite proxy to production backend
- Returns: `{ success, candidates: [{ ...fullProfile }], kandidatRiwayat, mySchedules }`

**Layout** (top to bottom):

1. **Header**: Photo (pasPhoto), name, ID, VIP badge, close button
2. **Digital Student Card**: QR code (api.qrserver.com), CV progress bars (mini + master)
3. **Tab bar**: Riwayat | Dokumen | Jadwal | Catatan
4. **Tab content**: Renders active tab
5. **Footer**: WhatsApp button, close

### Tab: Riwayat

- Lists all applications from `kandidatRiwayat`
- Each entry shows: job code, category, tahapan, status, date
- Tahapan pipeline progress bar (PENDAFTARAN → CHECK KAIWA → ... → FLIGHT)
- Sorted by date descending

### Tab: Dokumen

- Lists documents from the candidate profile
- Shows: pas photo, CV, JFT, SSW, extra docs
- Each doc has a preview/download button → opens `DocumentPreviewModal`
- Progress indicator: how many docs uploaded vs required

### Tab: Jadwal

- Lists schedules from `mySchedules`
- Each entry: agenda name, status, time, location, link
- Empty state: "Belum ada jadwal"

### Tab: Catatan

- Shows admin notes (catatan internal + external)
- Read-only in this version (edit comes later)

### Event Flow

```
TabPelamar clock button
  → dispatchEvent('openCandidateProfile', { wa, nama })
  → AdminPanel listens
  → sets { profileTarget: { wa, nama }, showProfile: true }
  → renders <CandidateProfileModal wa={...} nama={...} isOpen={...} onClose={...} />
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/admin/CandidateProfileModal.tsx` | **New** — full modal component |
| `src/components/admin/AdminPanel.tsx` | Add `openCandidateProfile` listener + modal state |
| `src/components/admin/TabPelamar.tsx` | Clock button dispatches event |

### Reused Components

| Component | Used for |
|-----------|----------|
| `Icon` | Icons throughout |
| `DocumentPreviewModal` | Previewing documents |
| `useOverlay` | Modal backdrop/close behavior |

### Error Handling

- If `getAppData` fails → show error message in modal, retry button
- If candidate not found → show "Kandidat tidak ditemukan" with close button
- If session invalid → show "Sesi expired" with link to re-login

### Testing

- Unit: Mock API response, verify all tabs render correct data
- Integration: Click clock button in TabPelamar → modal opens with data
- Edge cases: empty riwayat, no documents, no schedules, VIP badge
