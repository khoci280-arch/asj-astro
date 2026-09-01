/**
 * contexts/ingestion/index.ts — Public interface for ingestion context
 *
 * Owns: parse results, document parsing
 *
 * NOTE: Business logic is temporarily re-exported from actions-ingest.ts
 * and ai/classify.ts. Migration to local service/repository will follow.
 */
export { handleProcessUploadDoc } from '../../_lib/actions-ingest';
