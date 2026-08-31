/**
 * surfaces/public.ts — Public data surface (read-only, high-traffic)
 *
 * Handles: getAppData, getMonthlyReport
 * Cacheable: Yes — CDN cache + stale-while-revalidate
 *
 * This surface imports ONLY from contexts/catalog (boundary rule).
 */
import * as catalog from '../contexts/catalog';

export const PUBLIC_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getAppData: (payload, sessionToken) => catalog.handleGetAppData(payload, sessionToken),
  getMonthlyReport: (payload, sessionToken) => catalog.handleGetMonthlyReport(payload, sessionToken),
};
