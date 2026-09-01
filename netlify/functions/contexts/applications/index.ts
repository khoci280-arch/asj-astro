/**
 * contexts/applications/index.ts — Public interface for applications context
 *
 * Owns: database_asj_form (mail inbox lifecycle)
 * Other contexts and surfaces import ONLY from this file.
 */
export {
  handleReviewForm,
  handleApproveForm,
  handleRejectForm,
  handleDeleteForm,
  handleTandaiDibacaForm,
  syncBiodataKeMail,
  syncFormMailDariUpload,
} from './service';
