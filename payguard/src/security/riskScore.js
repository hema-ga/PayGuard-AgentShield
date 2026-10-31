/** Deterministic demo-only queue ranking. This is a triage aid, never an approval decision. */
export function scoreDraftRisk(result) {
  const draft = result?.draft;
  const comparison = result?.comparison || {};
  let score = 8;
  const reasons = [];
  if (!draft?.recordFound || comparison.recordFound === false) { score += 35; reasons.push('Supplier is not on the saved record'); }
  if (comparison.supplierNameMatch === false) { score += 18; reasons.push('Supplier name differs'); }
  if (comparison.accountMatch === false) { score += 30; reasons.push('Payment account differs'); }
  if (comparison.ifscMatch === false) { score += 22; reasons.push('Bank routing value differs'); }
  if (comparison.contactMatch === false) { score += 12; reasons.push('Supplier contact differs'); }
  if ((result?.prohibitedAttempts || []).length) { score += 12; reasons.push('Invoice attempted an out-of-scope action'); }
  if ((draft?.amount || 0) >= 250000) { score += 8; reasons.push('Large simulated amount'); }
  score = Math.min(100, score);
  const tier = score >= 65 ? 'High' : score >= 30 ? 'Review' : 'Low';
  return { score, tier, reasons: reasons.length ? reasons : ['No mismatch signals in this demo check'] };
}
