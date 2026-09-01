/**
 * surfaces/notify.ts — Notifications surface (WA + FCM)
 *
 * Phase 5: Bulk notifications enqueued as background jobs.
 * Single messages run synchronously if fast; bulk always background.
 */
import { enqueue } from '../_lib/kernel/job-queue';
import { log } from '../_lib/kernel/log';

export const NOTIFY_ACTIONS: Record<string, Function> = {
  simpanWaTemplate: async (p: unknown[], s?: string) => {
    const notifications = await import('../contexts/notifications');
    return notifications.handleSimpanWaTemplate(p, s);
  },
  hapusWaTemplate: async (p: unknown[], s?: string) => {
    const notifications = await import('../contexts/notifications');
    return notifications.handleHapusWaTemplate(p, s);
  },
  kirimSatuPesanFonnte: async (p: unknown[], s?: string) => {
    const notifications = await import('../contexts/notifications');
    return notifications.handleKirimSatuPesanFonnte(p, s);
  },
  kirimTawaranMassal: async (p: unknown[], s?: string) => {
    // Bulk WA sending is slow — enqueue as background job
    const jobId = await enqueue('wa.broadcast', { payload: p, sessionToken: s });
    log.info('notify.background-enqueued', { jobId });
    return { success: true, status: 'accepted', jobId, message: 'Pengiriman massal sedang diproses. Gunakan getJobStatus untuk mengecek.' };
  },
};
