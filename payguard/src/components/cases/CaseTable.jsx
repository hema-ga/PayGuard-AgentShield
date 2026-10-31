import { CASES } from '../../data/cases.js';
import { formatCurrency } from '../../utils/format.js';
import { StatusPill } from '../common/Status.jsx';

export function CaseTable({ caseStates, selectedId, onSelect, cases = CASES }) {
  if (cases.length === 0) {
    return <p className="empty-state">No cases match the selected filters.</p>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Supplier</th>
          <th>Invoice</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Scenario</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => {
          const result = caseStates[c.id];
          const status = result ? result.riskStatus : 'unchecked';
          return (
            <tr
              key={c.id}
              className={c.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(c.id)}
              tabIndex={0}
              role="button"
              aria-label={`Open case: ${c.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(c.id);
              }}
            >
              <td>{c.invoice.supplierNameClaimed}</td>
              <td>{c.invoice.invoiceId}</td>
              <td>{formatCurrency(c.invoice.amount, c.invoice.currency)}</td>
              <td>
                <StatusPill status={status} />
              </td>
              <td className="muted">{c.story}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function isAwaitingApproval(draft) {
  if (!draft) return false;
  if (draft.status === 'rejected' || draft.status === 'sent') return false;
  if (draft.verification.required && !draft.verification.done) return false;
  return true;
}
