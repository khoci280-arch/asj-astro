/**
 * contexts/catalog/index.ts — Public interface for catalog context
 *
 * Owns: job_database (read), sys_config (read), public data
 * Public interface: getAppData(), getPublicBundle(), getJobByCode()
 *
 * STRFIG PATTERN: This wraps existing actions-public.ts functions.
 * After all surfaces are extracted, the actual logic moves here.
 */

// Re-export from existing module (strangler-fig wrapper)
// In Phase 4 completion, these functions move INTO this file.
export { handleGetAppData, handleGetMonthlyReport } from '../../_lib/actions-public';
