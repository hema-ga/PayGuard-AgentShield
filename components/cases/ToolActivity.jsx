import { DecisionBadge, RanPill } from '../common/Status.jsx';
import { formatTimestamp } from '../../utils/format.js';

export function ToolActivity({ entries }) {
  if (!entries || entries.length === 0) {
    return <p className="empty-state">No tool activity yet. Run the check to see what the assistant attempted.</p>;
  }
  return (
    <div>
      {entries.map((entry) => (
        <details key={entry.id} className="audit-entry">
          <summary>
            <strong>{entry.tool}</strong>
            <DecisionBadge decision={entry.decision} />
            <RanPill ran={entry.ran} />
            <span className="ts">{formatTimestamp(entry.timestamp)}</span>
          </summary>
          <div className="detail">
            <div><strong>Input / target:</strong> {entry.input}</div>
            <div><strong>Reason:</strong> {entry.reason}</div>
            <div><strong>Outcome:</strong> {entry.outcome}</div>
          </div>
        </details>
      ))}
    </div>
  );
}
