/**
 * contexts/master-data/index.ts — Master data context
 * Owns: master_database_candidate (169 cols, full CRUD)
 * Wraps: actions-master.ts
 */
export { handleGetMasterDataByWa, handleSubmitMasterForm, handleGetDrafCvMaster, handleSimpanUpdateMaster } from '../../_lib/actions-master';
