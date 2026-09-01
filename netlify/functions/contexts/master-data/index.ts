/**
 * contexts/master-data/index.ts — Public interface for master-data context
 *
 * Owns: master_database_candidate (169 columns)
 *
 * NOTE: Business logic is temporarily re-exported from actions-master.ts.
 * This file will be migrated to local service.ts/repository.ts in a future pass.
 * The context boundary is established; the internal implementation migrates next.
 */
export {
  handleGetMasterDataByWa,
  handleSubmitMasterForm,
  handleGetDrafCvMaster,
  handleSimpanUpdateMaster,
  buildMasterNested,
  MASTER_COLUMN_MISSING,
  buildAiOverflow,
  mergeAiOverflow,
  findMasterByWa,
} from '../../_lib/actions-master';
