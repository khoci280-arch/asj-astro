/**
 * contexts/registry/index.ts — Public interface for candidate registry
 *
 * Owns: database_candidate (lifecycle), master_database_candidate (read)
 * Other contexts and surfaces import ONLY from this file.
 */
export { handleGetCandidatesPage, handleUpdateCatatanKandidat, handleUpdateKandidatSuper } from './service';
