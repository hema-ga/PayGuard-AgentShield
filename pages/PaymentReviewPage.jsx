import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCaseById } from '../data/cases.js';
import { usePayGuard } from '../state/store.jsx';
import { maskAccount, formatCurrency, formatTimestamp } from '../utils/format.js';
import { draftStatusLabel, createApprovalSnapshot } from '../engine/payment.js';

export default function PaymentReviewPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePayGuard();
  const fixture = getCaseById(caseId);
  const caseResult = state.caseStates[caseId];
  const draft = caseResult?.draft;
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!fixture || !caseResult || !draft) {
    return (
      <div>
        <p className="empty-state">There is nothing to review yet. Check the invoice first.</p>
        <button className="btn" onClick={() => navigate(`/cases/${caseId}`)}>
          Back to case
        </button>
      </div>
    );
  }

  if (draft.status === 'sent') {
    return (
      <div className="fullscreen-state">
        <div className="receipt-card">
          <div className="big-tick" aria-hidden="true">✓</div>
          <h2>Simulated payment sent</h2>
          <p className="muted">This is a simulated payment for the hackathon demo. No real money moved.</p>
          <div className="receipt-row"><span>Draft ID</span><span>{draft.id}</span></div>
          <div className="receipt-row"><span>Invoice number</span><span>{draft.invoiceId}</span></div>
          <div className="receipt-row"><span>Supplier</span><span>{draft.supplierName}</span></div>
          <div className="receipt-row"><span>Amount</span><span>{formatCurrency(draft.amount, draft.currency)}</span></div>
          <div className="receipt-row"><span>Destination account</span><span>{maskAccount(draft.destinationAccount)}</span></div>
          <div className="receipt-row"><span>Approved by</span><span>{draft.approvedBy}</span></div>
          <div className="receipt-row"><span>Approval time</span><span>{formatTimestamp(draft.approvedAt)}</span></div>
          <div className="receipt-row"><span>Audit reference</span><span>{caseResult.toolActivity[caseResult.toolActivity.length - 1]?.id}</span></div>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate(`/cases/${caseId}`)}>
            Return to case
          </button>
        </div>
      </div>
    );
  }

  const needsVerification = draft.verification.required && !draft.verification.done;
  const mismatch = !draft.accountMatch || !draft.ifscMatch || !draft.contactMatch;

  if (draft.status === 'rejected') {
    return (
      <div>
        <div className="warning-panel">This draft was rejected and cannot be sent. No payment occurred.</div>
        <button className="btn" onClick={() => navigate(`/cases/${caseId}`)}>
          Back to case
        </button>
      </div>
    );
  }

  function handleApprove() {
    dispatch({ type: 'APPROVE_PAYMENT', caseId, reviewedSnapshot: createApprovalSnapshot(draft) });
  }

  function handleReject() {
    dispatch({ type: 'REJECT_PAYMENT', caseId, reason: rejectReason || null });
    navigate(`/cases/${caseId}`);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Review simulated payment</h1>
      <p className="muted">
        <strong>Simulated payment only. No real money will move.</strong>
      </p>

      {mismatch && (
        <div className="warning-panel danger">
          Payment destination or contact details differ from the saved supplier record. Verify independently
          before approving.
        </div>
      )}
      {!draft.recordFound && (
        <div className="warning-panel danger">No saved supplier record exists for this supplier.</div>
      )}

      <div className="card">
        <div className="kv-row"><span className="k">Supplier</span><span>{draft.supplierName}</span></div>
        <div className="kv-row"><span className="k">Invoice number</span><span>{draft.invoiceId}</span></div>
        <div className="kv-row"><span className="k">Amount</span><span>{formatCurrency(draft.amount, draft.currency)}</span></div>
        <div className="kv-row"><span className="k">Destination account ending</span><span>{maskAccount(draft.destinationAccount)}</span></div>
        <div className="kv-row"><span className="k">IFSC-like destination</span><span>{maskAccount(draft.destinationIfscLike)}</span></div>
        <div className="kv-row"><span className="k">Saved-record comparison</span><span>{draft.accountMatch && draft.ifscMatch && draft.contactMatch ? 'Matches saved record' : 'Differs from saved record'}</span></div>
        <div className="kv-row">
          <span className="k">Verification status</span>
          <span>
            {!draft.verification.required
              ? 'Not required'
              : draft.verification.done
              ? `Verified by ${draft.verification.verifiedBy}`
              : 'Not yet verified'}
          </span>
        </div>
        <div className="kv-row"><span className="k">Current status</span><span>{draftStatusLabel(draft)}</span></div>
        <div className="kv-row"><span className="k">Will a real transfer occur?</span><span><strong>No — simulated only</strong></span></div>
      </div>

      {needsVerification && (
        <div className="warning-panel" style={{ marginTop: 14 }}>
          This draft remains held. Go back to the case and use "Mark independently verified (simulation)" before
          it can be approved here.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-danger" onClick={() => setShowRejectForm((v) => !v)}>
          Reject and hold
        </button>
        <button className="btn btn-primary" onClick={handleApprove} disabled={needsVerification}>
          Approve simulated payment
        </button>
      </div>

      {showRejectForm && (
        <div className="card" style={{ marginTop: 14 }}>
          <label htmlFor="reject-reason">Reason (optional)</label>
          <textarea
            id="reject-reason"
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button className="btn btn-danger" onClick={handleReject}>
            Confirm rejection
          </button>
        </div>
      )}
    </div>
  );
}
