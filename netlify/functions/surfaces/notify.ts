/**
 * surfaces/notify.ts — Notifications surface (WA + FCM)
 */
import * as notifications from '../contexts/notifications';
export const NOTIFY_ACTIONS: Record<string, Function> = {
  simpanWaTemplate: (p, s) => notifications.handleSimpanWaTemplate(p, s),
  hapusWaTemplate: (p, s) => notifications.handleHapusWaTemplate(p, s),
  kirimSatuPesanFonnte: (p, s) => notifications.handleKirimSatuPesanFonnte(p, s),
  kirimTawaranMassal: (p, s) => notifications.handleKirimTawaranMassal(p, s),
};
