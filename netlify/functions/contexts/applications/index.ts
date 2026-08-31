/**
 * contexts/applications/index.ts — Application/form review context
 * Owns: database_asj_form (review/approve/reject lifecycle)
 * Wraps: actions-mail.ts
 */
export { handleReviewForm, handleApproveForm, handleRejectForm, handleDeleteForm, handleTandaiDibacaForm } from '../../_lib/actions-mail';
