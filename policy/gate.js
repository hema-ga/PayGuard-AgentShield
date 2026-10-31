// The policy enforcement gate. Every simulated tool call passes through here before it runs.
// Decisions are derived only from structured context (what is known, what matched, what the
// user has explicitly done) — never from a case ID, and never from invoice-supplied instructions.
// Invoice text can supply facts (an account number, a note) but can never supply authority.

export const DECISION = {
  ALLOW: 'Allow',
  DENY: 'Deny',
  HOLD: 'Hold',
  APPROVAL_REQUIRED: 'Approval required',
};

function decide(decision, reason) {
  return { decision, reason };
}

/**
 * @param {string} action one of: read_invoice, lookup_supplier, create_draft,
 *   update_supplier_record, lookup_unrelated_suppliers, send_payment, draft_report, edit_passport
 * @param {object} ctx structured facts the gate is allowed to reason over
 */
export function evaluateGate(action, ctx = {}) {
  switch (action) {
    case 'read_invoice': {
      if (ctx.profileAllows === false) return decide(DECISION.DENY, 'The active permission profile does not allow reading invoices.');
      if (!ctx.invoiceSelected) {
        return decide(DECISION.DENY, 'No invoice has been selected for this task.');
      }
      return decide(
        DECISION.ALLOW,
        'Reading the selected invoice is within the current task: check this invoice and prepare a payment draft.'
      );
    }

    case 'lookup_supplier': {
      if (ctx.profileAllows === false) return decide(DECISION.DENY, 'The active permission profile does not allow supplier lookups.');
      if (!ctx.invoiceRead) {
        return decide(DECISION.DENY, 'The invoice must be read before a supplier lookup can run.');
      }
      if (!ctx.supplierIdClaimed) {
        return decide(DECISION.HOLD, 'The invoice did not provide a supplier ID to look up.');
      }
      return decide(
        DECISION.ALLOW,
        'Looking up the supplier named on this invoice is within the current task.'
      );
    }

    case 'create_draft': {
      if (ctx.profileAllows === false) return decide(DECISION.DENY, 'The active permission profile does not allow creating payment drafts.');
      if (!ctx.invoiceRead || !ctx.supplierLookedUp) {
        return decide(
          DECISION.DENY,
          'Draft creation requires the invoice to be read and the saved supplier to be looked up first.'
        );
      }
      if (!ctx.amountValid) {
        return decide(DECISION.DENY, 'The invoice amount could not be validated against the fixture.');
      }
      if (!ctx.supplierRecordFound) {
        return decide(
          DECISION.HOLD,
          'No saved supplier record exists for this invoice. A new supplier must be verified through an independent process before any payment can be approved.'
        );
      }
      if (!ctx.supplierNameMatch || !ctx.accountMatch || !ctx.ifscMatch || !ctx.contactMatch) {
        return decide(
          DECISION.HOLD,
          'The supplier name, account, IFSC-like value, or contact details on this invoice differ from the saved supplier record. This is a reason to pause and verify, not proof of fraud.'
        );
      }
      return decide(
        DECISION.ALLOW,
        'Invoice details match the saved supplier record. A draft can be prepared for human review.'
      );
    }

    case 'update_supplier_record': {
      return decide(
        DECISION.DENY,
        'Invoice content can never authorize a change to the saved supplier record. Only an explicit user edit action can do that.'
      );
    }

    case 'lookup_unrelated_suppliers': {
      return decide(
        DECISION.DENY,
        'This request falls outside the current task scope. Only the supplier named on the selected invoice may be looked up.'
      );
    }

    case 'send_payment': {
      if (ctx.profileAllows === false) return decide(DECISION.DENY, 'The active permission profile does not allow simulated payment actions.');
      if (!ctx.draftExists) {
        return decide(DECISION.DENY, 'No payment draft exists for this case.');
      }
      if (ctx.draftStatus === 'rejected') {
        return decide(DECISION.DENY, 'This draft has already been rejected and cannot be sent.');
      }
      if (ctx.draftStatus === 'sent') {
        return decide(DECISION.DENY, 'This draft has already recorded a simulated payment and cannot be sent again.');
      }
      if (ctx.requiresVerification && !ctx.verified) {
        return decide(
          DECISION.HOLD,
          'Changed or unverifiable payment details remain held until independently verified.'
        );
      }
      if (!ctx.approvalGiven) {
        return decide(
          DECISION.APPROVAL_REQUIRED,
          'Sending a simulated payment always requires an explicit, specific human approval.'
        );
      }
      if (!ctx.approvalMatchesDraft) {
        return decide(
          DECISION.DENY,
          'The approval on file does not match this exact draft. A new review is required.'
        );
      }
      return decide(DECISION.ALLOW, 'Explicit human approval was given for this exact draft.');
    }

    case 'draft_report': {
      if (ctx.profileAllows === false) return decide(DECISION.DENY, 'The active permission profile does not allow report drafting.');
      if (!ctx.explicitUserAction) {
        return decide(DECISION.DENY, 'A report draft can only be generated after an explicit user action.');
      }
      return decide(
        DECISION.ALLOW,
        'Drafting an editable report from existing session data does not change policy, supplier records, or payment state.'
      );
    }

    case 'edit_passport': {
      if (!ctx.explicitUserEdit) {
        return decide(DECISION.DENY, 'The Permission Passport can only be changed through an explicit user edit action.');
      }
      return decide(DECISION.ALLOW, 'The user explicitly chose to edit the Permission Passport.');
    }

    default:
      return decide(DECISION.DENY, 'Unrecognized action; failing closed.');
  }
}
