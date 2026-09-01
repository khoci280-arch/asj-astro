/**
 * contexts/catalog/index.ts — Public interface for catalog context
 *
 * Owns: job_database (read), sys_config (read), public data
 * Other contexts and surfaces import ONLY from this file.
 */
export { handleGetAppData, handleGetMonthlyReport, handleShareData } from './service';
// Re-export helpers used by other contexts and handlers
export { loadCandidatesUnik, stripRaw, loadSchedules, loadTugas, loadWaTemplates, docTypeOf } from './repository';
