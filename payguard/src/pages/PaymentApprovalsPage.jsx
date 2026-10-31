import { useNavigate } from 'react-router-dom';
import { CASES } from '../data/cases.js';
import { usePayGuard } from '../state/store.jsx';
import { draftStatusLabel } from '../engine/payment.js';
import { formatCurrency } from '../utils/format.js';
import { isAwaitingApproval } from '../components/cases/CaseTable.jsx';
import { scoreDraftRisk } from '../security/riskScore.js';

export default function PaymentApprovalsPage() {
  const { state } = usePayGuard();
  const navigate = useNavigate();

  const withDrafts = CASES.map((c) => ({ fixture: c, result: state.caseStates[c.id] })).filter(
    (x) => x.result && x.result.draft && x.result.draft.status !== 'rejected' && x.result.draft.status !== 'sent'
  ).map((item) => ({ ...item, risk: scoreDraftRisk(item.result) }))
    .sort((a, b) => b.risk.score - a.risk.score);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Payment approvals</h1>
          <p>Drafts waiting on a human decision. Nothing here can be approved from invoice text alone.</p>
          <p className="muted">Risk-ranked queue · highest signal score first. The score prioritizes review; it never approves or rejects a payment.</p>
        </div>
      </div>

      {withDrafts.length === 0 ? (
        <section className="card approval-empty-state" aria-labelledby="approval-empty-title">
          <h2 id="approval-empty-title">Your approval queue is empty</h2>
          <p>No invoice has created a payment draft in this browser session yet.</p>
          <ol>
            <li>Open <strong>Invoice checks</strong> and choose a fictional invoice.</li>
            <li>Read it, then select <strong>Check invoice</strong>.</li>
            <li>Continue to the payment draft. Matching invoices become ready for review; mismatches stay held until independently verified.</li>
          </ol>
          <p className="muted">For the normal demo flow, use the <strong>Invoice reviewer</strong> permission profile. The queue updates in this browser tab after the check runs.</p>
          <button className="btn btn-primary" onClick={() => navigate('/invoice-checks')}>
            Start an invoice check
          </button>
        </section>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Draft</th>
              <th>Amount</th>
              <th>Risk priority</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {withDrafts.map(({ fixture, result }) => {
              const ready = isAwaitingApproval(result.draft);
              return (
                <tr key={fixture.id}>
                  <td>{fixture.invoice.supplierNameClaimed}</td>
                  <td>{result.draft.id}</td>
                  <td>{formatCurrency(result.draft.amount, result.draft.currency)}</td>
                  <td><span className={`risk-score risk-${result.risk.tier.toLowerCase()}`}>{result.risk.tier} · {result.risk.score}/100</span><small className="risk-reasons">{result.risk.reasons.slice(0, 2).join(' · ')}</small></td>
                  <td>{draftStatusLabel(result.draft)}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(ready ? `/cases/${fixture.id}/review` : `/cases/${fixture.id}`)}
                    >
                      {ready ? 'Review' : 'Open case'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

