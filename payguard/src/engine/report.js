import { maskAccount, formatCurrency } from '../utils/format.js';
import { draftStatusLabel } from './payment.js';

/**
 * Builds editable, plain-language report text from data already present in the
 * current PayGuard session. Never submits anything. Never invents a real recipient,
 * case number, phone number, bank identity, or loss.
 */
export function buildReportDraft({ caseResult, recipientType, recipientName, form }) {
  const { invoice, supplier, comparison, prohibitedAttempts, draft } = caseResult;

  const recipientLabel = recipientType === 'company-security' ? 'Company security team' : 'Cyber cell';
  const paymentResult = draft ? draftStatusLabel(draft) : 'No draft was created';
  const hasRiskSignals =
    !comparison.recordFound ||
    !comparison.accountMatch ||
    !comparison.ifscMatch ||
    !comparison.contactMatch ||
    prohibitedAttempts.length > 0;
  const title = `${hasRiskSignals ? 'Request to review suspected invoice redirection' : 'Invoice review summary'} — ${invoice.supplierNameClaimed} (${invoice.invoiceId})`;

  const summaryLines = [
    `This is an editable draft prepared by PayGuard for review before submission to the ${recipientLabel.toLowerCase()}${
      recipientName ? ` (${recipientName})` : ''
    }.`,
    hasRiskSignals
      ? `PayGuard's automated checks found details that warrant review. This assessment is not proof of fraud — it is a reason to pause and verify.`
      : `PayGuard did not find a mismatch among the fields compared. This result is not confirmation that the invoice is safe.`,
  ];

  const chronology = [
    `Incident date/time: ${form.incidentDateTime || 'Not specified by user'} (from user input).`,
    `How it arrived: ${form.arrivalMethod || 'Not specified by user'} (from user input).`,
    `Claimed supplier: ${invoice.supplierNameClaimed} (from synthetic invoice).`,
    `Invoice number: ${invoice.invoiceId} (from synthetic invoice).`,
    `Invoice amount: ${formatCurrency(invoice.amount, invoice.currency)} (from synthetic invoice).`,
    `Saved payment account ending: ${supplier ? maskAccount(supplier.account) : 'No saved record on file'} (from saved supplier record).`,
    `Account requested on invoice ending: ${maskAccount(invoice.account)} (from synthetic invoice).`,
    `Saved IFSC-like value: ${supplier ? maskAccount(supplier.ifscLike) : 'No saved record on file'} (from saved supplier record).`,
    `IFSC-like value requested on invoice: ${maskAccount(invoice.ifscLike)} (from synthetic invoice).`,
    `Saved supplier contact: ${supplier?.contact || 'No saved record on file'} (from saved supplier record).`,
    `Contact shown on invoice: ${invoice.contact || 'Not provided'} (from synthetic invoice).`,
    `Payment status: ${paymentResult} (from PayGuard demo state). No real payment system was contacted.`,
  ];

  const suspiciousDetails = [];
  if (!comparison.recordFound) {
    suspiciousDetails.push('No saved supplier record exists for the supplier ID claimed on this invoice (from invoice-to-supplier comparison).');
  }
  if (comparison.recordFound && !comparison.accountMatch) {
    suspiciousDetails.push('The destination account on the invoice differs from the saved supplier record (from invoice-to-supplier comparison).');
  }
  if (comparison.recordFound && !comparison.ifscMatch) {
    suspiciousDetails.push('The IFSC-like value on the invoice differs from the saved supplier record (from invoice-to-supplier comparison).');
  }
  if (comparison.recordFound && !comparison.contactMatch) {
    suspiciousDetails.push('The contact address on the invoice differs from the saved supplier record (from invoice-to-supplier comparison).');
  }
  prohibitedAttempts.forEach((a) => {
    suspiciousDetails.push(`PayGuard denied an attempted action embedded in the invoice note: "${a.tool}" (from PayGuard audit log).`);
  });
  if (suspiciousDetails.length === 0) {
    suspiciousDetails.push('No comparison mismatches were recorded for this case.');
  }

  const evidenceList = (form.evidence || []).length
    ? form.evidence
    : ['No evidence items selected yet — add them before submitting.'];

  const actionTaken = [
    `PayGuard's policy gate decision: ${draft ? draftStatusLabel(draft) : 'No draft created'}.`,
    'The user did not authorize any change to saved supplier records.',
    draft && draft.status === 'sent'
      ? 'Note: this case recorded a simulated payment within PayGuard\'s demo. No real money moved; this must not be reported as a completed financial loss.'
      : 'No real or simulated payment has been completed for this invoice.',
  ];

  const text = [
    `Title: ${title}`,
    '',
    'Incident summary:',
    ...summaryLines.map((l) => `- ${l}`),
    '',
    'Chronology / key details:',
    ...chronology.map((l) => `- ${l}`),
    '',
    "Suspicious details (PayGuard's automated assessment, not proof of fraud):",
    ...suspiciousDetails.map((l) => `- ${l}`),
    '',
    'Action taken:',
    ...actionTaken.map((l) => `- ${l}`),
    '',
    'Evidence available:',
    ...evidenceList.map((l) => `- ${l}`),
    '',
    'Requested follow-up:',
    '- Please advise on appropriate next steps for verifying this supplier and securing the account referenced above.',
    '',
    `Description of what happened (user-provided): ${form.description || 'Not yet filled in.'}`,
    '',
    'Notice: This draft was prepared automatically from fictional demo data for a hackathon project. ' +
      'Every detail must be independently verified by the user before submission. This report has not been ' +
      'filed, submitted, emailed, or uploaded anywhere. The user is responsible for submitting it through the ' +
      'appropriate official channel themselves.',
  ].join('\n');

  return {
    title,
    generatedAt: new Date().toISOString(),
    recipientType,
    recipientName: recipientName || null,
    text,
  };
}
