import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCaseById } from '../data/cases.js';
import { usePayGuard } from '../state/store.jsx';
import { PermissionPassport } from '../components/cases/PermissionPassport.jsx';
import { InvoiceComparison } from '../components/cases/InvoiceComparison.jsx';
import { ToolActivity } from '../components/cases/ToolActivity.jsx';
import { PaymentDraftSection } from '../components/cases/PaymentDraftSection.jsx';
import { StatusPill } from '../components/common/Status.jsx';
import { RiskReplay } from '../components/cases/RiskReplay.jsx';
import { ScenarioBuilder } from '../components/cases/ScenarioBuilder.jsx';
import { GatewayRegistry } from '../components/GatewayRegistry.jsx';

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePayGuard();
  const [activeStep, setActiveStep] = useState(1);
  const [hasReadInvoice, setHasReadInvoice] = useState(false);
  const fixture = getCaseById(caseId);
  const caseResult = state.caseStates[caseId];

  if (!fixture) {
    return <p>Unknown case.</p>;
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{fixture.title}</h1>
          <p className="muted">{fixture.story}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <StatusPill status={caseResult ? caseResult.riskStatus : 'unchecked'} />
        </div>
      </div>

      <div className="case-workflow">
        <section className="workflow-step">
          <button className={`workflow-step-button ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 1 ? 0 : 1)}>
            <span className="workflow-step-number">01</span><span><strong>Read invoice</strong><small>View what the invoice says before checking it.</small></span><span className="workflow-chevron">{activeStep === 1 ? '−' : '+'}</span>
          </button>
          {activeStep === 1 && <div className="workflow-step-content">
            <InvoiceComparison caseResult={caseResult} invoiceFixture={fixture.invoice} showSavedRecord={false} showComparison={false} />
            <button className="btn btn-primary workflow-next" onClick={() => { setHasReadInvoice(true); setActiveStep(2); }}>Continue to supplier check →</button>
          </div>}
        </section>

        <section className="workflow-step">
          <button className={`workflow-step-button ${activeStep === 2 ? 'active' : ''}`} disabled={!hasReadInvoice} onClick={() => {
            if (!caseResult) dispatch({ type: 'RUN_CHECK', caseId });
            setActiveStep(activeStep === 2 ? 0 : 2);
          }}>
            <span className="workflow-step-number">02</span><span><strong>{caseResult ? 'View check results' : 'Check invoice'}</strong><small>Look up the supplier, compare fields, and apply the policy gate.</small></span><span className="workflow-chevron">{activeStep === 2 ? '−' : '+'}</span>
          </button>
          {activeStep === 2 && <div className="workflow-step-content">
            {caseResult && <>
              <div className="workflow-result-banner"><StatusPill status={caseResult.riskStatus} /><span>{caseResult.riskStatus === 'clear' ? 'The checked fields match the saved supplier record.' : 'Review the evidence below before deciding what to do.'}</span></div>
              <button className="btn" onClick={() => dispatch({ type: 'RUN_CHECK', caseId })}>Re-run check</button>
              <InvoiceComparison caseResult={caseResult} invoiceFixture={fixture.invoice} showInvoice={false} />
              <RiskReplay result={caseResult} caseId={caseId} />
              {caseResult.prohibitedAttempts?.length > 0 && <section className="instruction-evidence"><strong>Untrusted invoice instructions were blocked</strong><p>The policy gate denied these attempted actions before they ran:</p><ul>{caseResult.prohibitedAttempts.map((attempt) => <li key={attempt.id}><b>{attempt.tool}</b> — {attempt.reason}</li>)}</ul></section>}
              <button className="btn btn-primary workflow-next" onClick={() => setActiveStep(3)}>Continue to payment draft →</button>
            </>}
          </div>}
        </section>

        <section className="workflow-step">
          <button className={`workflow-step-button ${activeStep === 3 ? 'active' : ''}`} disabled={!caseResult} onClick={() => setActiveStep(activeStep === 3 ? 0 : 3)}>
            <span className="workflow-step-number">03</span><span><strong>Review payment draft</strong><small>Inspect the simulated destination and make a separate human decision.</small></span><span className="workflow-chevron">{activeStep === 3 ? '−' : '+'}</span>
          </button>
          {activeStep === 3 && caseResult && <div className="workflow-step-content">
            <PaymentDraftSection caseId={caseId} draft={caseResult.draft} />
            {(caseResult.riskStatus === 'blocked' || caseResult.riskStatus === 'review') && <div className="report-action-card"><div><strong>Need to report this?</strong><p className="muted">Prepare an editable report draft. It is never submitted automatically.</p></div><button className="btn" onClick={() => navigate(`/reports?case=${caseId}`)}>Open report drafter</button></div>}
            <button className="btn workflow-next" onClick={() => setActiveStep(4)}>Try a safe what-if →</button>
          </div>}
        </section>

        <section className="workflow-step">
          <button className={`workflow-step-button ${activeStep === 4 ? 'active' : ''}`} disabled={!caseResult} onClick={() => setActiveStep(activeStep === 4 ? 0 : 4)}>
            <span className="workflow-step-number">04</span><span><strong>Try a safe what-if</strong><small>Change fictional invoice values and replay the gate without altering this case.</small></span><span className="workflow-chevron">{activeStep === 4 ? '−' : '+'}</span>
          </button>
          {activeStep === 4 && caseResult && <div className="workflow-step-content"><ScenarioBuilder fixture={fixture} result={caseResult} /><button className="btn workflow-next" onClick={() => setActiveStep(5)}>View technical details →</button></div>}
        </section>

        <section className="workflow-step technical-step">
          <button className={`workflow-step-button ${activeStep === 5 ? 'active' : ''}`} onClick={() => setActiveStep(activeStep === 5 ? 0 : 5)}><span className="workflow-step-number">05</span><span><strong>Technical details</strong><small>Tool activity and Permission Passport.</small></span><span className="workflow-chevron">{activeStep === 5 ? '−' : '+'}</span></button>
          {activeStep === 5 && <div className="workflow-step-content"><details className="card disclosure-card"><summary>Tool activity <span className="muted">{caseResult?.toolActivity?.length || 0} recorded actions</span></summary><div className="disclosure-content"><ToolActivity entries={caseResult ? caseResult.toolActivity : []} /></div></details><details className="card disclosure-card"><summary>Permission Passport <span className="muted">Named permission profiles</span></summary><div className="disclosure-content"><PermissionPassport /></div></details><details className="card disclosure-card"><summary>MCP gateway and signed tool registry <span className="muted">Policy enforcement + tool metadata</span></summary><div className="disclosure-content"><GatewayRegistry /></div></details></div>}
        </section>
      </div>
    </div>
  );
}
