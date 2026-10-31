import { useState } from 'react';
import { formatCurrency, maskAccount } from '../../utils/format.js';
import { usePayGuard } from '../../state/store.jsx';

export function RiskReplay({ result, caseId }) {
  const [explanation, setExplanation] = useState('plain');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challenge, setChallenge] = useState('');
  const { dispatch } = usePayGuard();
  if (!result?.draft || result.draft.status === 'ready_for_review') return null;

  const mismatches = result.comparison.rows.filter((row) => !row.match && !row.informational);
  const amount = formatCurrency(result.invoice.amount, result.invoice.currency);

  return (
    <section className="risk-replay" aria-labelledby="risk-replay-title">
      <div className="risk-replay-heading">
        <div>
          <span className="source-tag">Counterfactual replay · simulation only</span>
          <h2 id="risk-replay-title">What would have happened?</h2>
          <p>Same invoice, two outcomes. The “without gate” column is hypothetical; it never runs a payment.</p>
        </div>
        <div className="explanation-switch" role="group" aria-label="Explanation detail">
          <button className={explanation === 'plain' ? 'active' : ''} onClick={() => setExplanation('plain')}>Plain language</button>
          <button className={explanation === 'technical' ? 'active' : ''} onClick={() => setExplanation('technical')}>Technical evidence</button>
        </div>
      </div>

      <div className="replay-columns">
        <article className="replay-column protected">
          <h3><span aria-hidden="true">✓</span> With PayGuard</h3>
          <dl>
            <div><dt>Decision</dt><dd>Held for independent verification</dd></div>
            <div><dt>Invoice destination</dt><dd>{maskAccount(result.invoice.account)} · held, not approved</dd></div>
            {result.supplier && <div><dt>Saved supplier account</dt><dd>{maskAccount(result.supplier.account)} · differs from invoice</dd></div>}
            <div><dt>Payment</dt><dd>No payment sent</dd></div>
          </dl>
          <p className="replay-explanation">
            {explanation === 'plain'
              ? 'The invoice details do not match the supplier record, so PayGuard pauses the draft until a person verifies the change using a trusted contact.'
              : `Policy gate: create_draft → HOLD. ${mismatches.length ? mismatches.map((row) => `${row.field} mismatch`).join('; ') : 'No saved supplier record exists.'} ${result.prohibitedAttempts?.length ? `Denied tool attempts: ${result.prohibitedAttempts.map((entry) => `${entry.tool} (${entry.decision})`).join('; ')}.` : ''} Verification required before approval.`}
          </p>
        </article>

        <article className="replay-column hypothetical">
          <h3><span aria-hidden="true">!</span> Without the gate · hypothetical</h3>
          <dl>
            <div><dt>Draft destination</dt><dd>{maskAccount(result.invoice.account)} · supplied on invoice</dd></div>
            <div><dt>Invoice amount</dt><dd>{amount}</dd></div>
            <div><dt>What could follow</dt><dd>Reviewer might approve the changed details</dd></div>
          </dl>
          <p className="replay-explanation">
            {explanation === 'plain'
              ? `A draft could have been prepared using the invoice’s destination account ${maskAccount(result.invoice.account)} without comparing it to the saved record.`
              : `Unconstrained draft input: account=${result.invoice.account || 'missing'}; IFSC-like=${result.invoice.ifscLike || 'missing'}; amount=${result.invoice.amount} ${result.invoice.currency}. This is a generated scenario, not a real tool call.`}
          </p>
        </article>
      </div>
      <p className="replay-footnote">This comparison is a hypothetical demonstration from fictional data. It does not prove fraud or represent a real attempted transfer.</p>
      <div className="challenge-row">
        {!challengeOpen ? (
          <button className="btn" onClick={() => setChallengeOpen(true)}>I disagree with this finding</button>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); if (!challenge.trim()) return; dispatch({ type: 'CHALLENGE_FINDING', caseId, reason: challenge.trim() }); setChallenge(''); setChallengeOpen(false); }}>
            <label htmlFor="challenge-reason">Tell us what may be wrong</label>
            <textarea id="challenge-reason" rows={2} value={challenge} onChange={(event) => setChallenge(event.target.value)} placeholder="Explain why this might be a false positive" />
            <button className="btn btn-primary" type="submit" disabled={!challenge.trim()}>Record challenge</button>
            <button className="btn" type="button" onClick={() => setChallengeOpen(false)}>Cancel</button>
          </form>
        )}
      </div>
    </section>
  );
}
