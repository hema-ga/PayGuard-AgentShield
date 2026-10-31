import { useState } from 'react';

const STEPS = [
  {
    icon: '01',
    title: 'Start with the case table',
    text: 'Choose one of six fictional invoices. The table shows the supplier, invoice number, amount, and current check status.',
  },
  {
    icon: '02',
    title: 'Follow the review sequence',
    text: 'The case is a click-through flow: press Read invoice, then Check invoice, then open the payment draft. Later steps stay closed until you choose them.',
  },
  {
    icon: '03',
    title: 'See changed fields clearly',
    text: 'PayGuard highlights mismatched invoice details and warns if a supplier name looks similar to a saved supplier. A name similarity is only a clue, not proof.',
  },
  {
    icon: '04',
    title: 'Compare both outcomes',
    text: 'The replay compares the held outcome with a hypothetical outcome without the gate. It never runs a payment. Switch between plain-language and technical evidence.',
  },
  {
    icon: '05',
    title: 'See the security boundary in action',
    text: 'Try the injected invoice and the unregistered bank-change tool in the standalone MCP console. It treats invoice text as untrusted data, records the deny reason, and fails closed when signed metadata cannot be verified.',
  },
  {
    icon: '06',
    title: 'Challenge or simulate',
    text: 'Use “I disagree” to record a reviewer challenge, or change a fictional invoice field in the scenario builder. It replays the gate without changing the original case.',
  },
  {
    icon: '07',
    title: 'Approval stays with a person',
    text: 'A payment draft cannot be approved by invoice text or chat. A reviewer must inspect the exact draft and choose whether to approve it. No real payment occurs.',
  },
  {
    icon: '08',
    title: 'Ask PayGuard',
    text: 'The local chat helper can find suppliers, explain risk signals, suggest safe next steps, and open reports or audit records. It cannot approve payments or submit reports.',
  },
  {
    icon: '09',
    title: 'Connect to the standalone MCP gateway',
    text: 'The included Python launcher starts the app and a separate MCP Streamable HTTP server on localhost. The gateway verifies the signed tool manifest itself; an invalid signature blocks tool calls.',
  },
  {
    icon: '10',
    title: 'Choose a named permission profile',
    text: 'Read-only analyst, Invoice reviewer, and Incident response analyst profiles limit which gateway tools can run. The active profile is visible in the Permission Passport and used by the policy gate.',
  },
  {
    icon: '11',
    title: 'Prioritize the approval queue',
    text: 'Pending drafts sort by an explainable demo risk score with the signals shown beside each item. It helps a reviewer decide what to inspect first; it never approves or rejects a payment.',
  },
  {
    icon: '12',
    title: 'Follow the agent trail',
    text: 'Audit records identify the simulated agent, decision, reason, and trace ID. Filter by agent to follow an invoice run across the invoice, supplier lookup, and draft steps.',
  },
  {
    icon: '13',
    title: 'Use the judge quick start',
    text: 'On Overview, select the three-minute judge walkthrough. Read the suspicious synthetic invoice, try the unregistered bank-change call, and inspect the gate response. Then review the draft and audit evidence. Everything is fictional and local.',
  },
  {
    icon: '14',
    title: 'Keep the evidence',
    text: 'Tool attempts, gate decisions, approvals, and reviewer challenges appear in the audit log. Report drafts remain editable and are never filed automatically.',
  },
];

export function GuidedTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="tour-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Guided walkthrough"
      onClick={onClose}
    >
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '1.6rem' }} aria-hidden="true">
          {current.icon}
        </div>
        <h3>{current.title}</h3>
        <p>{current.text}</p>
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'active' : ''} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Skip
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button className="btn" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
