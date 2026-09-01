/**
 * surfaces/index.ts — Central surface registry
 *
 * Maps action names to surface registries. This replaces the monolithic
 * ACTION_HANDLERS in action-registry.ts with surface-scoped routing.
 *
 * Migration: After all surfaces are tested, delete action-registry.ts
 * and have handlers.ts import from here instead.
 */

import { AUTH_ACTIONS } from './auth';
import { PUBLIC_ACTIONS } from './public';
import { DOCS_ACTIONS } from './docs';
import { CANDIDATE_ACTIONS } from './candidates';
import { MAIL_ACTIONS } from './mail';
import { MASTER_ACTIONS } from './master';
import { SCHEDULE_ACTIONS } from './schedule';
import { CONFIG_ACTIONS } from './config';
import { REGISTER_ACTIONS } from './register';
import { NOTIFY_ACTIONS } from './notify';
import { AI_ACTIONS } from './ai';
import { INGEST_ACTIONS } from './ingest';
import { handleGetJobStatus } from '../_lib/actions-job-status';

/**
 * Infrastructure actions (not tied to a specific surface).
 * Phase 5: getJobStatus for background job polling.
 */
const INFRA_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  getJobStatus: (p, s) => handleGetJobStatus(p, s),
};

/**
 * All surface registries merged into a single action → handler map.
 * Unmapped actions fall through to the old ACTION_HANDLERS (strangler-fig).
 */
export const SURFACE_HANDLERS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  ...INFRA_ACTIONS,
  ...AUTH_ACTIONS,
  ...PUBLIC_ACTIONS,
  ...DOCS_ACTIONS,
  ...CANDIDATE_ACTIONS,
  ...MAIL_ACTIONS,
  ...MASTER_ACTIONS,
  ...SCHEDULE_ACTIONS,
  ...CONFIG_ACTIONS,
  ...REGISTER_ACTIONS,
  ...NOTIFY_ACTIONS,
  ...AI_ACTIONS,
  ...INGEST_ACTIONS,
};

/** Number of actions routed through surfaces */
export const SURFACE_ACTION_COUNT = Object.keys(SURFACE_HANDLERS).length;
