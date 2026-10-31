import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CASES, getCaseById } from '../data/cases.js';
import { usePayGuard } from '../state/store.jsx';
import { CaseTable, isAwaitingApproval } from '../components/cases/CaseTable.jsx';
import { SlidePanel } from '../components/common/SlidePanel.jsx';
import { StatusPill } from '../components/common/Status.jsx';
import { formatCurrency } from '../utils/format.js';

export default function Dashboard() {
  const { state, dispatch } = usePayGuard();
  const navigate = useNavigate();
  const [previewId, setPreviewId] = useState(null);

  const counts = useMemo(() => {
    const result = { clear: 0, review: 0, blocked: 0, unchecked: 0 };
    CASES.forEach((c) => {
      const cs = state.caseStates[c.id];
      result[cs ? cs.riskStatus : 'unchecked'] += 1;
    });
    return result;
  }, [state.caseStates]);

  const pendingApprovals = useMemo(
    () => CASES.filter((c) => isAwaitingApproval(state.caseStates[c.id]?.draft)).length,
    [state.caseStates]
  );

  const previewCase = previewId ? getCaseById(previewId) : null;
  const previewResult = previewId ? state.caseStates[previewId] : null;

  function runCheck(id) {
    dispatch({ type: 'RUN_CHECK', caseId: id });
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Overview</h1>
          <p>Review invoice checks and payment decisions. All data is fictional.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => navigate('/invoice-checks')}>
            Check an invoice
          </button>
          <button
            className={pendingApprovals > 0 ? 'btn btn-primary' : 'btn'}
            onClick={() => navigate('/payment-approvals')}
          >
            Review pending approvals{pendingApprovals > 0 ? ` (${pendingApprovals})` : ''}
          </button>
        </div>
      </div>

      <section className="judge-demo-card">
        <div className="judge-demo-heading"><div><span className="eyebrow">JUDGE WALKTHROUGH · ABOUT 3 MINUTES</span><h2>See the security boundary work</h2><p>Run a harmless invoice read, try an unregistered bank-change action, then inspect the decision and trace.</p></div><button className="btn btn-primary" onClick={() => navigate('/gateway')}>Open live MCP gateway →</button></div>
        <ol><li><b>Read</b><span>Selected synthetic invoice</span></li><li><b>Attack</b><span>Untrusted injection or unauthorized tool</span></li><li><b>Explain</b><span>Allow / deny / hold with an audit reason</span></li><li><b>Review</b><span>Human approval remains required</span></li></ol>
        <small>All names, invoices, account identifiers, and outcomes are fictional. No bank or external service is connected.</small>
      </section>

      <div className="summary-grid-wrap">
        <table className="data-table summary-grid">
          <thead><tr><th>Clear</th><th>Review</th><th>Blocked</th><th>Awaiting approval</th></tr></thead>
          <tbody><tr>
            <td className="summary-clear">{counts.clear}</td>
            <td className="summary-review">{counts.review}</td>
            <td className="summary-blocked">{counts.blocked}</td>
            <td className="summary-approval">{pendingApprovals}</td>
          </tr></tbody>
        </table>
      </div>

      <h2 className="section-title">Six synthetic cases</h2>
      <p className="muted">Pick any case to run the check. The expected result is never shown in advance.</p>
      <div className="case-table-wrap">
        <CaseTable caseStates={state.caseStates} selectedId={previewId} onSelect={setPreviewId} />
      </div>

      {previewCase && (
        <SlidePanel title={previewCase.title} onClose={() => setPreviewId(null)}>
          <p className="muted">{previewCase.story}</p>
          <div className="kv-row">
            <span className="k">Supplier</span>
            <span>{previewCase.invoice.supplierNameClaimed}</span>
          </div>
          <div className="kv-row">
            <span className="k">Invoice</span>
            <span>{previewCase.invoice.invoiceId}</span>
          </div>
          <div className="kv-row">
            <span className="k">Amount</span>
            <span>{formatCurrency(previewCase.invoice.amount, previewCase.invoice.currency)}</span>
          </div>
          <div className="kv-row">
            <span className="k">Status</span>
            <StatusPill status={previewResult ? previewResult.riskStatus : 'unchecked'} />
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            {!previewResult && (
              <button className="btn btn-primary" onClick={() => runCheck(previewCase.id)}>
                Run check
              </button>
            )}
            <button className="btn" onClick={() => navigate(`/cases/${previewCase.id}`)}>
              Open case
            </button>
          </div>
        </SlidePanel>
      )}
    </>
  );
}
