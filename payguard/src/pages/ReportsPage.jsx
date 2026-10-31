import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CASES, getCaseById, REPORT_RECIPIENT_TYPES, EVIDENCE_OPTIONS } from '../data/cases.js';
import { usePayGuard } from '../state/store.jsx';
import jsPDF from 'jspdf';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { maskAccount, formatCurrency } from '../utils/format.js';
import { draftStatusLabel } from '../engine/payment.js';

const ARRIVAL_METHODS = ['Email', 'Messaging app', 'Other'];

// Published Claude artifacts run inside an iframe and block any download a page starts
// itself. Detect that so the PDF button can say so instead of silently doing nothing.
function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const { state, dispatch } = usePayGuard();
  const preselected = params.get('case');

  const [caseId, setCaseId] = useState(preselected || '');
  const [recipientType, setRecipientType] = useState('cyber-cell');
  const [recipientName, setRecipientName] = useState('');
  const [form, setForm] = useState({
    incidentDateTime: '',
    arrivalMethod: 'Email',
    description: '',
    evidence: [],
  });
  const [copyStatus, setCopyStatus] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const [reportDirty, setReportDirty] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const embedded = isEmbeddedPreview();

  useEffect(() => {
    if (caseId && !state.caseStates[caseId]) {
      dispatch({ type: 'RUN_CHECK', caseId });
    }
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCase(id) {
    setCaseId(id);
    setParams(id ? { case: id } : {});
    setForm({ incidentDateTime: '', arrivalMethod: 'Email', description: '', evidence: [] });
    setReportDirty(false);
  }

  function toggleEvidence(value) {
    setForm((f) => ({
      ...f,
      evidence: f.evidence.includes(value) ? f.evidence.filter((v) => v !== value) : [...f.evidence, value],
    }));
  }

  const caseResult = caseId ? state.caseStates[caseId] : null;
  const reportDraft = caseId ? state.reportDrafts[caseId] : null;
  const fixture = caseId ? getCaseById(caseId) : null;

  function handleGenerate() {
    if (!caseId) return;
    dispatch({
      type: 'GENERATE_REPORT',
      caseId,
      explicitUserAction: true,
      recipientType,
      recipientName,
      form,
    });
  }

  async function handleCopy() {
    if (!reportDraft) return;
    try {
      await navigator.clipboard.writeText(reportDraft.text);
      setCopyStatus('Copied to clipboard.');
      dispatch({ type: 'REPORT_COPIED', caseId });
    } catch {
      setCopyStatus('Could not copy automatically — select and copy the text manually.');
    }
    setTimeout(() => setCopyStatus(''), 3000);
  }

  function handleDownloadPdf() {
    if (!reportDraft) return;
    if (embedded) {
      setPdfStatus('PDF download isn’t available in this hosted preview — use Copy draft, or run the app locally to download.');
      setTimeout(() => setPdfStatus(''), 5000);
      return;
    }
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    const writeParagraphs = (text, size = 10, lineHeight = 14) => {
      doc.setFontSize(size);
      doc.setTextColor(24, 35, 52);
      text.split('\n').forEach((paragraph) => {
        const lines = doc.splitTextToSize(paragraph.replaceAll('₹', 'INR '), maxWidth);
        lines.forEach((line) => {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
            doc.setFontSize(9);
            doc.setTextColor(160, 60, 25);
            doc.text('DRAFT — review before submission', margin, 26);
            y += 16;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });
        y += lineHeight * 0.45;
      });
    };

    doc.setFontSize(10);
    doc.setTextColor(160, 60, 25);
    doc.text('DRAFT — review before submission. Not an official or submitted report.', margin, y);
    y += 24;
    writeParagraphs(reportDraft.text, 10, 14);

    doc.addPage();
    y = margin;
    doc.setFontSize(10);
    doc.setTextColor(160, 60, 25);
    doc.text('DRAFT — review before submission', margin, y);
    y += 24;
    doc.setFontSize(16);
    doc.setTextColor(24, 35, 52);
    doc.text('PayGuard evidence summary', margin, y);
    y += 24;
    const statusLabels = { clear: 'Clear', review: 'Review', blocked: 'Blocked' };
    const comparisonLines = caseResult?.comparison?.rows?.map((row) => {
      const invoiceValue = row.maskable ? maskAccount(row.invoiceValue) : row.invoiceValue;
      const savedValue = row.maskable
        ? row.savedValue === '— no saved record —' ? row.savedValue : maskAccount(row.savedValue)
        : row.savedValue;
      return `- ${row.field}: invoice ${invoiceValue}; saved record ${savedValue}; ${row.match ? 'match' : row.informational ? 'informational' : 'mismatch'}.`;
    }) || ['- No comparison result is available for this case.'];
    const evidenceLines = [
      `Case: ${fixture?.title || caseId}`,
      `Risk status: ${statusLabels[caseResult?.riskStatus] || 'Not checked'}`,
      `Invoice: ${fixture?.invoice.invoiceId || 'Not available'}`,
      `Amount: ${fixture ? formatCurrency(fixture.invoice.amount, fixture.invoice.currency) : 'Not available'}`,
      `Payment state: ${caseResult?.draft ? draftStatusLabel(caseResult.draft) : 'No draft created'}`,
      '',
      'Invoice-to-supplier comparison:',
      ...comparisonLines,
      '',
      'Policy actions:',
      ...(caseResult?.prohibitedAttempts?.length
        ? caseResult.prohibitedAttempts.map((entry) => `- ${entry.tool}: ${entry.decision}. ${entry.reason}`)
        : ['- No prohibited tool action was recorded.']),
      '',
      'This summary reflects synthetic demo data and PayGuard rules. It is not proof of fraud and is not an official report.',
    ];
    writeParagraphs(evidenceLines.join('\n'), 10, 15);
    doc.save(`payguard-report-draft-${caseId}.pdf`);
    dispatch({ type: 'REPORT_DOWNLOADED', caseId });
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Reports</h1>
          <p>PayGuard can prepare an editable draft. It does not submit the report.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Step 1 — Choose case and recipient</h3>
        <label htmlFor="case-select">Case</label>
        <select id="case-select" value={caseId} onChange={(e) => selectCase(e.target.value)}>
          <option value="">Select a case…</option>
          {CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <label htmlFor="recipient-type">Report type</label>
        <select id="recipient-type" value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
          {REPORT_RECIPIENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label htmlFor="recipient-name">Specific department or recipient name (optional)</label>
        <input
          id="recipient-name"
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="If known"
        />
      </div>

      {caseId && fixture && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Step 2 — Incident details</h3>
          <p className="field-source">Prefilled from synthetic invoice and PayGuard's findings where known.</p>

          <label htmlFor="incident-dt">Incident date and approximate time (if known)</label>
          <input
            id="incident-dt"
            type="text"
            value={form.incidentDateTime}
            onChange={(e) => setForm({ ...form, incidentDateTime: e.target.value })}
            placeholder="e.g. 30 October 2026, morning"
          />

          <label htmlFor="arrival">How the invoice or request arrived</label>
          <select id="arrival" value={form.arrivalMethod} onChange={(e) => setForm({ ...form, arrivalMethod: e.target.value })}>
            {ARRIVAL_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="kv-row"><span className="k">Claimed supplier</span><span>{fixture.invoice.supplierNameClaimed}</span></div>
          <div className="kv-row"><span className="k">Invoice number / amount</span><span>{fixture.invoice.invoiceId} · ₹{fixture.invoice.amount.toLocaleString('en-IN')}</span></div>

          <label htmlFor="description" style={{ marginTop: 12 }}>Description of what happened</label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe in your own words"
          />

          <label>Evidence checklist</label>
          {EVIDENCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="checkbox-row">
              <input
                type="checkbox"
                checked={form.evidence.includes(opt.value)}
                onChange={() => toggleEvidence(opt.value)}
              />
              {opt.label}
            </label>
          ))}

          <button className="btn btn-primary" onClick={handleGenerate} style={{ marginTop: 10 }}>
            Generate report draft
          </button>
        </div>
      )}

      {reportDraft && (
        <div className="card">
          <h3>Report draft</h3>
          <p className="muted">
            Editable. PayGuard's risk assessment is not proof of fraud. You must verify every detail and submit
            through the appropriate official channel yourself.
          </p>
          <textarea
            rows={18}
            value={reportDraft.text}
            onChange={(e) => {
              setReportDirty(true);
              dispatch({ type: 'UPDATE_REPORT_TEXT', caseId, text: e.target.value });
            }}
            onBlur={() => {
              if (reportDirty) {
                dispatch({ type: 'REPORT_EDITED', caseId });
                setReportDirty(false);
              }
            }}
            style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.82rem' }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleCopy}>
              Copy draft
            </button>
            <button
              className="btn"
              onClick={handleDownloadPdf}
              style={embedded ? { opacity: 0.6 } : undefined}
              title={embedded ? 'Not available in this hosted preview — run locally to download' : undefined}
              aria-disabled={embedded}
            >
              Download PDF (draft){embedded ? ' — unavailable here' : ''}
            </button>
            <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
              Clear draft
            </button>
          </div>
          {copyStatus && <p className="muted">{copyStatus}</p>}
          {pdfStatus && <p className="muted">{pdfStatus}</p>}
        </div>
      )}
      {confirmClear && (
        <ConfirmDialog
          title="Clear this report draft?"
          message="This removes the editable report from this session. The report text will not be added to the audit log."
          confirmLabel="Clear draft"
          onConfirm={() => {
            dispatch({ type: 'CLEAR_REPORT', caseId });
            setConfirmClear(false);
            setReportDirty(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
