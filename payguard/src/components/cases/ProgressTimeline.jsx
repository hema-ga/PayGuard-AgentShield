function computeSteps(caseResult) {
  if (!caseResult) {
    return [
      { label: 'Read invoice', state: 'current', desc: 'Not started yet.' },
      { label: 'Check saved supplier', state: 'upcoming', desc: 'Waiting.' },
      { label: 'Review policy decision', state: 'upcoming', desc: 'Waiting.' },
      { label: 'Prepare payment draft', state: 'upcoming', desc: 'Waiting.' },
      { label: 'Human approval', state: 'upcoming', desc: 'Waiting.' },
    ];
  }

  const draft = caseResult.draft;
  let approvalState = 'current';
  let approvalDesc = 'Waiting for your review.';
  if (draft) {
    if (draft.status === 'sent') {
      approvalState = 'done';
      approvalDesc = 'Approved — simulated payment sent.';
    } else if (draft.status === 'rejected') {
      approvalState = 'done';
      approvalDesc = 'Rejected by user — no payment sent.';
    } else if (draft.verification.required && !draft.verification.done) {
      approvalState = 'upcoming';
      approvalDesc = 'Held until independently verified.';
    } else {
      approvalDesc = 'Ready for your review.';
    }
  } else {
    approvalState = 'upcoming';
    approvalDesc = 'No draft to approve yet.';
  }

  return [
    { label: 'Read invoice', state: 'done', desc: 'Allowed — invoice fields retrieved.' },
    { label: 'Check saved supplier', state: 'done', desc: caseResult.supplier ? 'Allowed — saved record found.' : 'Allowed — no saved record found.' },
    { label: 'Review policy decision', state: 'done', desc: `Gate decision recorded for this case.` },
    { label: 'Prepare payment draft', state: draft ? 'done' : 'upcoming', desc: draft ? `Draft ${draft.id} created.` : 'No draft created.' },
    { label: 'Human approval', state: approvalState, desc: approvalDesc },
  ];
}

export function ProgressTimeline({ caseResult }) {
  const steps = computeSteps(caseResult);
  return (
    <ol className="timeline" aria-label="Case progress">
      {steps.map((s) => (
        <li key={s.label} className={`timeline-step ${s.state}`}>
          <div className="tl-bar" aria-hidden="true" />
          <div className="tl-label">{s.label}</div>
          <div className="tl-sub">{s.desc}</div>
        </li>
      ))}
    </ol>
  );
}
