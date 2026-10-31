import { useNavigate } from 'react-router-dom';
import { usePayGuard } from '../../state/store.jsx';
import { draftStatusLabel } from '../../engine/payment.js';
import { maskAccount, formatCurrency, formatDate } from '../../utils/format.js';

export function PaymentDraftSection({ caseId, draft }) {
  const { dispatch } = usePayGuard();
  const navigate = useNavigate();

  if (!draft) {
    return (
      <div className="card">
        <h3>Payment draft and approval</h3>
        <p className="empty-state">A draft will appear here after the invoice check runs.</p>
      </div>
    );
  }

  const needsVerification = draft.verification.required && !draft.verification.done;
  const canContinue = !needsVerification && draft.status !== 'rejected' && draft.status !== 'sent';

  return (
    <div className="card">
      <h3>Payment draft and approval</h3>
      <div className="kv-row"><span className="k">Draft ID</span><span>{draft.id}</span></div>
      <div className="kv-row"><span className="k">Supplier</span><span>{draft.supplierName}</span></div>
      <div className="kv-row"><span className="k">Invoice number</span><span>{draft.invoiceId}</span></div>
      <div className="kv-row"><span className="k">Amount</span><span>{formatCurrency(draft.amount, draft.currency)}</span></div>
      <div className="kv-row"><span className="k">Due date</span><span>{formatDate(draft.dueDate)}</span></div>
      <div className="kv-row"><span className="k">Destination account</span><span>{maskAccount(draft.destinationAccount)}</span></div>
      <div className="kv-row"><span className="k">IFSC-like destination</span><span>{maskAccount(draft.destinationIfscLike)}</span></div>
      <div className="kv-row"><span className="k">Match with saved record</span><span>{draft.supplierNameMatch && draft.accountMatch && draft.ifscMatch && draft.contactMatch ? 'Matches' : 'Does not match'}</span></div>
      <div className="kv-row">
        <span className="k">Verification</span>
        <span>
          {!draft.verification.required
            ? 'Not required'
            : draft.verification.done
            ? `Verified by ${draft.verification.verifiedBy}`
            : 'Required, not yet done'}
        </span>
      </div>
      <div className="kv-row"><span className="k">Status</span><span><strong>{draftStatusLabel(draft)}</strong></span></div>

      {needsVerification && (
        <div className="warning-panel" style={{ marginTop: 12 }}>
          {draft.explanation}{' '}
          {draft.recordFound
            ? 'Contact the supplier only through a phone number or channel already on file — never through contact details supplied in the changed invoice.'
            : 'Verify this unfamiliar supplier through an independent process before treating it as legitimate — never through contact details supplied only in this invoice.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {draft.status !== 'rejected' && draft.status !== 'sent' && (
          <button className="btn btn-danger" onClick={() => dispatch({ type: 'REJECT_PAYMENT', caseId })}>
            Reject and hold
          </button>
        )}
        {needsVerification && (
          <button className="btn" onClick={() => dispatch({ type: 'MARK_VERIFIED', caseId })}>
            Mark independently verified (simulation)
          </button>
        )}
        {canContinue && (
          <button className="btn btn-primary" onClick={() => navigate(`/cases/${caseId}/review`)}>
            Continue to approval
          </button>
        )}
      </div>
    </div>
  );
}
