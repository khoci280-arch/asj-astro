/**
 * surfaces/ingest.ts — Document ingestion surface
 */
import * as ingestion from '../contexts/ingestion';
export const INGEST_ACTIONS: Record<string, Function> = {
  parseDokumenBiodata: (p, s) => ingestion.handleParseDokumenBiodata(p, s),
};
