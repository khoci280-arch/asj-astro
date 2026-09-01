/**
 * surfaces/diagnostics.ts — Diagnostics surface
 *
 * Handles: getAppConfig, reportWebVital
 * These are low-priority monitoring endpoints.
 */
import * as diagnostics from '../_lib/actions-diagnostics';
export const DIAGNOSTICS_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getAppConfig: (p, s) => diagnostics.handleGetAppConfig(p, s),
  reportWebVital: (p, s) => diagnostics.handleReportWebVital(p, s),
};
