// Deterministic, text-based detection of requests embedded in untrusted invoice notes.
// This never changes what the assistant is allowed to do — it only flags that the invoice
// TRIED to ask for something, so the gate can log the attempt as denied and the UI can
// show the pressure language without obeying it. Applied uniformly to every case's note.

const PATTERNS = {
  updateSupplierRecord: /replace the saved account|update (our|their) details|change the saved account/i,
  lookupUnrelatedSuppliers: /search the supplier records|other vendor account details|unrelated vendor/i,
  suppressWarning: /do not show this (warning|message)|hide this warning|hide this message/i,
  overrideInstructions: /ignore previous (rules|instructions)/i,
  urgencyPressure: /pay (today|immediately|now)|urgent|penalty|avoid a penalty/i,
};

export function detectInvoiceFlags(note) {
  const text = note || '';
  return {
    updateSupplierRecord: PATTERNS.updateSupplierRecord.test(text),
    lookupUnrelatedSuppliers: PATTERNS.lookupUnrelatedSuppliers.test(text),
    suppressWarning: PATTERNS.suppressWarning.test(text),
    overrideInstructions: PATTERNS.overrideInstructions.test(text),
    urgencyPressure: PATTERNS.urgencyPressure.test(text),
  };
}
