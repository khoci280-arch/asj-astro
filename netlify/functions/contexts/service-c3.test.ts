// ==========================================
// TESTS: C3 sweep (2026-09-04) — remaining unguarded admin surfaces
//
// Audit of every exported handle* across contexts found two live actions
// reachable without a session that touch sensitive data:
//   - configuration.getRincianPresets: admin configuration presets served by
//     the config surface (previously anonymous-read).
//   - schedule.checkAndSendAgendaReminders: reads schedule WA lists + FCM
//     tokens and sends push notifications (previously callable by anyone;
//     no legitimate non-admin caller — the TabJadwal "kirim reminder" flow is
//     admin-side, and the Netlify cron runs sweep-queue, not this surface).
// Both are now admin-gated at the top of the handler. Every rejection below
// happens BEFORE any DB/network call, so the suite runs without env.
//
// Other unguarded handle* are intentionally public and need no session:
// catalog.shareData (share-view feature — NOT wired in the current pipeline;
// DOCS_ACTIONS has no mapping and the GET endpoint returns NOT_IMPLEMENTED —
// re-audit with a per-job share token when the share view is wired),
// diagnostics.reportWebVital (telemetry, no DB), registration
// submitDaftarSiswa / generateFormBridge / getLinkSiswaBaru and documents
// submitApply (public self-service writes/links).
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import { handleGetRincianPresets } from './configuration/service';
import { handleCheckAndSendAgendaReminders } from './scheduling/service';

const kandidatA = signToken({ role: 'kandidat', wa: '6281111111111' });

const asRecord = (p: Promise<unknown>): Promise<Record<string, any>> => p as Promise<Record<string, any>>;

describe('configuration — rincian presets require an admin session (C3)', () => {
  it('anonymous callers are rejected before any DB read', async () => {
    const res = await asRecord(handleGetRincianPresets());
    expect(res.sessionInvalid).toBe(true);
    expect(res.success).toBe(false);
  });

  it('a kandidat session is rejected', async () => {
    const res = await asRecord(handleGetRincianPresets(kandidatA));
    expect(res.sessionInvalid).toBe(true);
  });
  // (Admin acceptance would read sys_config via the repository — covered by
  // the pattern used across this suite: rejection paths are DB-free.)
});

describe('scheduling — agenda reminders require an admin session (C3)', () => {
  it('anonymous callers are rejected before any schedule/FCM access', async () => {
    const res = await asRecord(handleCheckAndSendAgendaReminders());
    expect(res.sessionInvalid).toBe(true);
    expect(res.sent).toBeUndefined();
  });

  it('a kandidat session is rejected', async () => {
    const res = await asRecord(handleCheckAndSendAgendaReminders(kandidatA));
    expect(res.sessionInvalid).toBe(true);
  });
});
