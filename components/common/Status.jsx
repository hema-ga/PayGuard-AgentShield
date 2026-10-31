const STATUS_META = {
  clear: { label: 'Clear', className: 'clear' },
  review: { label: 'Review', className: 'review' },
  blocked: { label: 'Blocked', className: 'blocked' },
  unchecked: { label: 'Not yet checked', className: 'unchecked' },
};

export function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.unchecked;
  return (
    <span className={`status-pill ${meta.className}`} tabIndex={0} aria-label={`Status: ${meta.label}`}>
      <span className="status-dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const DECISION_META = {
  Allow: 'allow',
  Deny: 'deny',
  Hold: 'hold',
  'Approval required': 'approval-required',
};

export function DecisionBadge({ decision }) {
  const cls = DECISION_META[decision] || 'hold';
  return <span className={`decision-badge ${cls}`}>{decision}</span>;
}

export function RanPill({ ran }) {
  return <span className={`ran-pill ${ran ? 'ran-yes' : 'ran-no'}`}>{ran ? 'Ran' : 'Did not run'}</span>;
}
