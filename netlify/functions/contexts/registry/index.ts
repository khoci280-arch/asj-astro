/**
 * contexts/registry/index.ts — Public interface for candidate registry
 *
 * Owns: database_candidate (lifecycle), master_database_candidate (read)
 * Public interface: getPage(), getByWa(), updateStage(), nextCandidateId()
 *
 * STRFIG PATTERN: Wraps existing actions-candidate.ts / actions-master.ts
 */
export { handleGetCandidatesPage, handleUpdateCatatanKandidat } from '../../_lib/actions-candidate';
