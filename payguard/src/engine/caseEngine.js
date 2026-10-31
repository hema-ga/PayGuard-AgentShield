import { DECISION } from '../policy/gate.js';
import { getCaseById, getSavedSupplier, getToolPermissionProfile } from '../data/cases.js';
import { detectInvoiceFlags } from './detectInvoiceFlags.js';
import { nextDraftId, nextAuditId } from '../utils/format.js';
import { invokeMcpGateway } from '../security/toolSecurity.js';
import { TOOL_AGENT_MAP } from '../security/toolSecurity.js';

let activeTraceId = null;

function makeEntry({ tool, input, decision, reason, ran, outcome }) {
  return {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    tool,
    input,
    decision,
    reason,
    ran,
    outcome,
    actor: TOOL_AGENT_MAP[tool] || 'Policy Gate',
    traceId: activeTraceId,
  };
}

function compareInvoiceToSupplier(invoice, saved) {
  const recordFound = Boolean(saved);
  const rows = [
    {
      field: 'Supplier name',
      invoiceValue: invoice.supplierNameClaimed,
      savedValue: recordFound ? saved.name : '— no saved record —',
      match: recordFound ? invoice.supplierNameClaimed === saved.name : false,
      supplierNameMatch: recordFound ? invoice.supplierNameClaimed === saved.name : false,
    },
    {
      field: 'Payment account',
      invoiceValue: invoice.account,
      savedValue: recordFound ? saved.account : '— no saved record —',
      match: recordFound ? invoice.account === saved.account : false,
      maskable: true,
    },
    {
      field: 'IFSC-like value',
      invoiceValue: invoice.ifscLike,
      savedValue: recordFound ? saved.ifscLike : '— no saved record —',
      match: recordFound ? invoice.ifscLike === saved.ifscLike : false,
      maskable: true,
    },
    {
      field: 'Contact',
      invoiceValue: invoice.contact,
      savedValue: recordFound ? saved.contact : '— no saved record —',
      match: recordFound ? invoice.contact === saved.contact : false,
    },
    {
      field: 'Payment terms',
      invoiceValue: invoice.terms,
      savedValue: recordFound ? saved.terms : '— no saved record —',
      match: recordFound ? true : false,
      informational: true,
    },
  ];

  const accountMatch = recordFound && invoice.account === saved.account;
  const supplierNameMatch = recordFound && invoice.supplierNameClaimed === saved.name;
  const ifscMatch = recordFound && invoice.ifscLike === saved.ifscLike;
  const contactMatch = recordFound && invoice.contact === saved.contact;

  return { rows, recordFound, supplierNameMatch, accountMatch, ifscMatch, contactMatch };
}

function computeRiskStatus({ prohibitedAttempts, comparison }) {
  if (prohibitedAttempts.length > 0) return 'blocked';
  if (!comparison.recordFound || !comparison.supplierNameMatch || !comparison.accountMatch || !comparison.ifscMatch || !comparison.contactMatch) return 'review';
  return 'clear';
}

/**
 * Runs the full "check invoice and prepare a payment draft" flow for a case fixture
 * through the shared tools and policy gate. Produces the case's derived state.
 */
export function runCheckInvoice(caseFixture, passport, metadataVerified = false) {
  const { invoice } = caseFixture;
  activeTraceId = `TRACE-${caseFixture.id}-${Date.now()}`;
  const entries = [];
  const profile = getToolPermissionProfile(passport?.profileId);
  const labels = {
    read_invoice: 'Read the selected invoice',
    lookup_supplier: 'Look up the supplier named on that invoice',
    create_draft: 'Create a payment draft when details match',
    draft_report: 'Draft a report only when the user asks',
  };
  const hasPermission = (tool) => passport?.profileId === 'custom'
    ? (tool === 'send_payment'
      ? passport.requiresApproval.includes('Send payment (simulated)')
      : passport.allowed.includes(labels[tool]))
    : profile.toolPermissions.includes(tool);

  // Tool 1: Read invoice
  const readGate = invokeMcpGateway('read_invoice', { invoiceSelected: true, profileAllows: hasPermission('read_invoice') }, { metadataVerified });
  entries.push(
    makeEntry({
      tool: 'Read invoice',
      input: invoice.invoiceId,
      decision: readGate.decision,
      reason: readGate.reason,
      ran: readGate.decision === DECISION.ALLOW,
      outcome: readGate.decision === DECISION.ALLOW ? `Retrieved fields for ${invoice.invoiceId}.` : 'No data returned.',
    })
  );
  const invoiceRead = readGate.decision === DECISION.ALLOW;

  // Tool 2: Look up saved supplier
  const lookupGate = invokeMcpGateway('lookup_supplier', {
    invoiceRead,
    supplierIdClaimed: invoice.supplierIdClaimed,
    profileAllows: hasPermission('lookup_supplier'),
  }, { metadataVerified });
  const saved = invoiceRead ? getSavedSupplier(invoice.supplierIdClaimed) : null;
  entries.push(
    makeEntry({
      tool: 'Look up saved supplier',
      input: invoice.supplierIdClaimed,
      decision: lookupGate.decision,
      reason: lookupGate.reason,
      ran: lookupGate.decision === DECISION.ALLOW,
      outcome:
        lookupGate.decision === DECISION.ALLOW
          ? saved
            ? `Found saved record for ${saved.supplierId}.`
            : 'No saved supplier record found.'
          : 'No lookup performed.',
    })
  );
  const supplierLookedUp = lookupGate.decision === DECISION.ALLOW;

  const comparison = compareInvoiceToSupplier(invoice, saved);
  const flags = detectInvoiceFlags(invoice.note);

  // Detect and deny any prohibited actions the invoice's note attempts to request.
  const prohibitedAttempts = [];
  if (flags.updateSupplierRecord) {
    const g = invokeMcpGateway('update_supplier_record', {}, { metadataVerified });
    const entry = makeEntry({
      tool: 'Change saved supplier record',
      input: `Requested by invoice note for ${invoice.supplierIdClaimed}`,
      decision: g.decision,
      reason: g.reason,
      ran: false,
      outcome: 'Denied before execution. Saved supplier record unchanged.',
    });
    entries.push(entry);
    prohibitedAttempts.push(entry);
  }
  if (flags.lookupUnrelatedSuppliers) {
    const g = invokeMcpGateway('lookup_unrelated_suppliers', {}, { metadataVerified });
    const entry = makeEntry({
      tool: 'Look up unrelated supplier records',
      input: 'Requested by invoice note: "all other vendor account details"',
      decision: g.decision,
      reason: g.reason,
      ran: false,
      outcome: 'Denied before execution. No other supplier records were accessed.',
    });
    entries.push(entry);
    prohibitedAttempts.push(entry);
  }

  // Tool 3: Create payment draft
  const trustedFixture = getCaseById(caseFixture.id);
  const amountValid =
    typeof invoice.amount === 'number' &&
    Number.isFinite(invoice.amount) &&
    invoice.amount > 0 &&
    Boolean(trustedFixture) &&
    invoice.amount === trustedFixture.invoice.amount &&
    invoice.invoiceId === trustedFixture.invoice.invoiceId;
  const draftGate = invokeMcpGateway('create_draft', {
    invoiceRead,
    supplierLookedUp,
    amountValid,
    supplierRecordFound: comparison.recordFound,
    supplierNameMatch: comparison.supplierNameMatch,
    profileAllows: hasPermission('create_draft'),
    accountMatch: comparison.accountMatch,
    ifscMatch: comparison.ifscMatch,
    contactMatch: comparison.contactMatch,
  }, { metadataVerified });

  let draft = null;
  const draftRan = draftGate.decision === DECISION.ALLOW || draftGate.decision === DECISION.HOLD;
  if (draftRan) {
    let status = 'ready_for_review';
    if (!comparison.recordFound) status = 'held_unknown_supplier';
    else if (!comparison.supplierNameMatch || !comparison.accountMatch || !comparison.ifscMatch || !comparison.contactMatch) status = 'held_mismatch';

    draft = {
      id: nextDraftId(),
      caseId: caseFixture.id,
      createdAt: new Date().toISOString(),
      invoiceId: invoice.invoiceId,
      supplierId: invoice.supplierIdClaimed,
      supplierName: invoice.supplierNameClaimed,
      amount: invoice.amount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      destinationAccount: invoice.account,
      destinationIfscLike: invoice.ifscLike,
      accountMatch: comparison.accountMatch,
      supplierNameMatch: comparison.supplierNameMatch,
      ifscMatch: comparison.ifscMatch,
      contactMatch: comparison.contactMatch,
      recordFound: comparison.recordFound,
      status,
      traceId: activeTraceId,
      verification: {
        required: status !== 'ready_for_review',
        done: status === 'ready_for_review',
        verifiedBy: null,
        verifiedAt: null,
      },
      rejection: null,
      explanation: draftGate.reason,
    };
  }

  entries.push(
    makeEntry({
      tool: 'Create payment draft',
      input: `${invoice.invoiceId} · ${invoice.amount.toLocaleString('en-IN')} ${invoice.currency}`,
      decision: draftGate.decision,
      reason: draftGate.reason,
      ran: draftRan,
      outcome: draft ? `Draft ${draft.id} created (${draft.status}).` : 'No draft created.',
    })
  );

  const riskStatus = computeRiskStatus({ prohibitedAttempts, comparison });

  return {
    caseId: caseFixture.id,
    invoice,
    supplier: saved,
    comparison,
    flags,
    toolActivity: entries,
    prohibitedAttempts,
    draft,
    riskStatus,
    checkedAt: new Date().toISOString(),
  };
}
