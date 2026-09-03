/**
 * surfaces/mail.ts — Application review surface (admin)
 * Actions: reviewForm, approveForm, rejectForm, deleteForm, tandaiDibacaForm
 */
import * as applications from '../contexts/applications';
export const MAIL_ACTIONS: Record<string, (payload: unknown[], sessionToken?: string) => Promise<unknown>> = {
  reviewForm: (p, s) => applications.handleReviewForm(p, s),
  approveForm: (p, s) => applications.handleApproveForm(p, s),
  rejectForm: (p, s) => applications.handleRejectForm(p, s),
  deleteForm: (p, s) => applications.handleDeleteForm(p, s),
  tandaiDibacaForm: (p, s) => applications.handleTandaiDibacaForm(p, s),
};
