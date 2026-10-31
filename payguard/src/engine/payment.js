import { DECISION } from '../policy/gate.js';
import { invokeMcpGateway } from '../security/toolSecurity.js';
import { nextAuditId } from '../utils/format.js';

function makeEntry({ tool, input, decision, reason, ran, outcome, actor = 'Human Reviewer', traceId = null }) {
  return {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    tool,
    input,
    decision,
    reason,
    ran,
    outcome,
    actor,
    traceId,
  };
}

/** Marks a held draft's supplier details as independently verified (simulation only). */
export function markVerified(draft) {
  if (!draft || draft.status === 'ready_for_review' || draft.status === 'rejected' || draft.status === 'sent') {
    return { draft, entry: null };
  }
  const updated = {
    ...draft,
    verification: {
      ...draft.verification,
      done: true,
      verifiedBy: 'Current user',
      verifiedAt: new Date().toISOString(),
    },
  };
  const entry = makeEntry({
    tool: 'Mark independently verified (simulation)',
    input: draft.id,
    decision: DECISION.ALLOW,
    reason: 'Current user marked the changed supplier details as independently verified. This is a simulated demo step, not a real verification.',
    ran: true,
    outcome: `Draft ${draft.id} may now proceed to approval review.`,
    traceId: draft.traceId,
  });
  return { draft: updated, entry };
}

export function createApprovalSnapshot(draft) {
  if (!draft) return null;
  return {
    id: draft.id,
    caseId: draft.caseId,
    invoiceId: draft.invoiceId,
    supplierId: draft.supplierId,
    amount: draft.amount,
    currency: draft.currency,
    destinationAccount: draft.destinationAccount,
    destinationIfscLike: draft.destinationIfscLike,
    status: draft.status,
    verificationRequired: draft.verification.required,
    verificationDone: draft.verification.done,
  };
}

/** Explicit approval is bound to the exact values shown on the review screen. */
export function approvePayment(draft, reviewedSnapshot, { metadataVerified = false, profileAllows = false } = {}) {
  if (!draft) return { draft, entry: null, success: false };

  const currentSnapshot = createApprovalSnapshot(draft);
  const approvalMatchesDraft = Boolean(
    reviewedSnapshot &&
      currentSnapshot &&
      Object.keys(currentSnapshot).every((key) => reviewedSnapshot[key] === currentSnapshot[key])
  );
  const gateResult = invokeMcpGateway('send_payment', {
    draftExists: true,
    draftStatus: draft.status,
    requiresVerification: draft.verification.required,
    verified: draft.verification.done,
    approvalGiven: true,
    approvalMatchesDraft,
    profileAllows,
  }, { metadataVerified });

  const success = gateResult.decision === DECISION.ALLOW;
  const updated = success
    ? { ...draft, status: 'sent', approvedBy: 'Current user', approvedAt: new Date().toISOString() }
    : draft;

  const entry = makeEntry({
    tool: 'Send payment (simulated)',
    input: draft.id,
    decision: gateResult.decision,
    reason: gateResult.reason,
    ran: success,
    outcome: success
      ? `Draft ${draft.id} marked Simulated payment sent. No real transfer occurred.`
      : `Payment blocked: ${gateResult.reason}`,
    actor: 'Human Approval Agent',
    traceId: draft.traceId,
  });

  return { draft: updated, entry, success };
}

/** Rejects the draft currently on screen. Payment is permanently denied for this draft. */
export function rejectPayment(draft, reason) {
  if (!draft) return { draft, entry: null };
  const updated = { ...draft, status: 'rejected', rejection: { reason: reason || null, at: new Date().toISOString() } };
  const entry = makeEntry({
    tool: 'Send payment (simulated)',
    input: draft.id,
    decision: DECISION.DENY,
    reason: reason ? `Rejected by user: ${reason}` : 'Rejected by user.',
    ran: false,
    outcome: `Draft ${draft.id} marked Rejected. No payment was sent.`,
    actor: 'Human Reviewer',
    traceId: draft.traceId,
  });
  return { draft: updated, entry };
}

export function draftStatusLabel(draft) {
  if (!draft) return '—';
  switch (draft.status) {
    case 'ready_for_review':
      return 'Ready for human review';
    case 'held_mismatch':
      return draft.verification.done ? 'Verified — ready for review' : 'Held — verify supplier details';
    case 'held_unknown_supplier':
      return draft.verification.done ? 'Verified — ready for review' : 'Held — new supplier requires verification';
    case 'rejected':
      return 'Rejected';
    case 'sent':
      return 'Simulated payment sent';
    default:
      return draft.status;
  }
}
