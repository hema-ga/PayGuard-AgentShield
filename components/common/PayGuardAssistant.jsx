import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CASES, getCaseById } from '../../data/cases.js';
import { usePayGuard } from '../../state/store.jsx';

function makeReply(question, context) {
  const q = question.toLowerCase();
  const { fixture, result, passport } = context;

  const matchingSupplierTokens = [...new Set(CASES.flatMap((item) => item.invoice.supplierNameClaimed.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4)))].filter((token) => q.includes(token));
  const requestedSupplierSearch = /supplier|vendor|find|search|look up|show me/.test(q);
  if (requestedSupplierSearch || matchingSupplierTokens.length) {
    const matches = CASES.filter((item) => {
      const name = item.invoice.supplierNameClaimed.toLowerCase();
      const title = item.title.toLowerCase();
      return q.includes(name) || q.includes(title) || matchingSupplierTokens.some((token) => name.includes(token));
    });
    if (!matches.length) return { text: 'I could not find that supplier in this demo. Try Aster Office Supplies, Nandi Packaging, Kaveri Cloud Tools, or Rapid Office Clearance.' };
    const records = matches.map((item) => `${item.invoice.supplierNameClaimed} · ${item.invoice.invoiceId} · ${(context.caseStates[item.id]?.riskStatus || 'not checked').toUpperCase()}`);
    return {
      text: `Found ${matches.length} matching demo invoice${matches.length === 1 ? '' : 's'}:\n${records.join('\n')}\nChoose a row to open its case. These are fictional records.`,
      actions: matches.map((item) => ({ label: `Open ${item.invoice.invoiceId}`, path: `/cases/${item.id}` })),
    };
  }

  if (/approve|pay|payment|transfer|send money/.test(q)) {
    return {
      text: 'I can explain the decision, but I cannot approve or send a payment from chat. Open the payment review and check the exact supplier, amount, and destination. The demo never moves real money.',
      action: result?.draft ? { label: 'Open payment review', path: `/cases/${fixture.id}/review` } : { label: 'Open invoice checks', path: '/invoice-checks' },
    };
  }

  if (/report|cyber|complaint|draft/.test(q)) {
    return {
      text: 'I can take you to the report drafter. It uses this case’s synthetic evidence to prepare an editable draft. You must review it yourself; PayGuard does not send or submit it.',
      action: { label: 'Open report drafter', path: fixture ? `/reports?case=${fixture.id}` : '/reports' },
    };
  }

  if (/audit|log|history/.test(q)) {
    return { text: 'The audit log lists tool attempts and policy decisions, including actions that were denied or held. Expand an entry to see its reason and outcome.', action: { label: 'Open audit log', path: '/audit' } };
  }

  if (/permission|passport|tool|agent|allowed/.test(q)) {
    return { text: `The Permission Passport defines what the assistant may do. Allowed: ${passport.allowed.join('; ')}. High-impact actions need your approval; actions outside the passport are denied. Invoice text cannot change these permissions.` };
  }

  if (/next|what should|what do|safe|verify/.test(q)) {
    if (result?.draft?.verification?.required && !result.draft.verification.done) {
      return { text: 'Pause the draft. Independently contact the supplier using a phone number or channel already saved in your records. Do not use the new contact details shown on the changed invoice. Record the result, then decide whether to reject or continue to human review.' };
    }
    if (result?.draft) {
      return { text: 'The draft is ready for a human review. Check the saved supplier, invoice number, amount, and masked destination before using the approval screen. Approval is always a separate action.' , action: { label: 'Review this draft', path: `/cases/${fixture.id}/review` } };
    }
    return { text: 'Choose a fictional invoice case, run its check, and review the evidence before taking any action. The demo does not contact suppliers or banks.', action: { label: 'Choose an invoice', path: '/invoice-checks' } };
  }

  if (/why|risk|flag|hold|block|mismatch|suspicious/.test(q)) {
    if (!fixture) return { text: 'Open a case first and I can explain its specific signals. In general, PayGuard compares the invoice with the saved supplier record and applies the Permission Passport.' , action: { label: 'Choose a case', path: '/invoice-checks' } };
    if (!result) return { text: `“${fixture.title}” has not been checked yet. Run the check to compare its details against the saved supplier record and see the policy decision.` };
    const mismatches = result.comparison?.rows?.filter((row) => !row.match && !row.informational) || [];
    const evidence = mismatches.map((row) => `${row.field}: invoice says “${row.invoiceValue}”; saved record says “${row.savedValue}”`).join('. ');
    const injected = result.prohibitedAttempts?.map((attempt) => `${attempt.tool} was ${attempt.decision.toLowerCase()}`).join('; ');
    const parts = [];
    if (evidence) parts.push(evidence);
    if (injected) parts.push(`Policy gate: ${injected}`);
    if (!parts.length) parts.push('The checked invoice matches the saved supplier details on the fields compared. A clear result is not a guarantee that an invoice is legitimate.');
    return { text: `${result.riskStatus.toUpperCase()} — ${parts.join('. ')}. Evidence source: invoice-to-supplier comparison and PayGuard policy log.` };
  }

  return { text: 'I can explain a risk decision, suggest safe next steps, describe the Permission Passport, or open the report drafter and audit log. Try one of the questions below.' };
}

export function PayGuardAssistant() {
  const { state } = usePayGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi, I’m the PayGuard helper. Ask me why a draft is held, what a check found, or what to do next. I only use this local demo data.' },
  ]);

  const routeCaseId = location.pathname.match(/^\/cases\/([^/]+)/)?.[1];
  const caseId = routeCaseId || state.currentCaseId;
  const fixture = caseId ? getCaseById(caseId) : null;
  const result = caseId ? state.caseStates[caseId] : null;
  const context = useMemo(() => ({ fixture, result, passport: state.passport, caseStates: state.caseStates }), [fixture, result, state.passport, state.caseStates]);

  function ask(value = input) {
    const question = value.trim();
    if (!question) return;
    const reply = makeReply(question, context);
    setMessages((all) => [...all, { role: 'user', text: question }, { role: 'assistant', ...reply }]);
    setInput('');
  }

  const starters = fixture
    ? ['Why is this held?', 'What should I do next?', 'Draft a report']
    : ['Find a supplier', 'Explain the Permission Passport', 'Open the audit log'];

  return (
    <>
      <button className="assistant-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="payguard-assistant">
        <span aria-hidden="true">?</span> Ask PayGuard
      </button>
      {open && (
        <section className="assistant-panel" id="payguard-assistant" aria-label="PayGuard assistant">
          <header className="assistant-header">
            <div><strong>PayGuard helper</strong><small>Local demo assistant</small></div>
            <button className="icon-btn" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="assistant-context">{fixture ? `Current case · ${fixture.title}` : 'No case selected · general help'}</div>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
                <div>{message.text}</div>
                {message.action && <button className="assistant-action" onClick={() => navigate(message.action.path)}>{message.action.label} →</button>}
                {message.actions?.map((action) => <button className="assistant-action" key={action.path} onClick={() => navigate(action.path)}>{action.label} →</button>)}
              </article>
            ))}
          </div>
          <div className="assistant-starters">
            {starters.map((starter) => <button key={starter} onClick={() => ask(starter)}>{starter}</button>)}
          </div>
          <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <input aria-label="Ask PayGuard" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this case…" />
            <button className="btn btn-primary" type="submit" disabled={!input.trim()}>Ask</button>
          </form>
          <footer className="assistant-disclaimer">No data leaves this browser. Chat cannot approve payments or submit reports.</footer>
        </section>
      )}
    </>
  );
}
