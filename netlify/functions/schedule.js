'use strict';
/**
 * schedule.js — Schedule surface entry point
 *
 * Handles: simpanJadwalBaru, hapusJadwal, tambahTugasBaru,
 *          setTugasStatus, hapusTugas, checkAndSendAgendaReminders
 */
const { makeSurfaceHandler } = require('./_lib/netlify-wrapper-surface');
exports.handler = makeSurfaceHandler([
  'simpanJadwalBaru', 'hapusJadwal', 'tambahTugasBaru',
  'setTugasStatus', 'hapusTugas', 'checkAndSendAgendaReminders',
]);
