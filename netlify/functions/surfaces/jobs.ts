/**
 * surfaces/jobs.ts — Job management surface (admin)
 *
 * Handles all job_database CRUD actions.
 * Auth: Admin only.
 */
import * as jobActions from '../_lib/actions-job';
export const JOB_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  simpanJobBaru: (p, s) => jobActions.handleSimpanJobBaru(p, s),
  editLokerFull: (p, s) => jobActions.handleEditLokerFull(p, s),
  ubahStatusJob: (p, s) => jobActions.handleUbahStatusJob(p, s),
  hapusJobData: (p, s) => jobActions.handleHapusJobData(p, s),
  updateTahapanDbJob: (p, s) => jobActions.handleUpdateTahapanDbJob(p, s),
  updateDokumenShare: (p, s) => jobActions.handleUpdateDokumenShare(p, s),
  tandaiGagalJob: (p, s) => jobActions.handleTandaiGagalJob(p, s),
};
