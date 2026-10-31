import { useState } from 'react';
import { maskAccount, formatCurrency, formatDate } from '../../utils/format.js';
import { SAVED_SUPPLIERS } from '../../data/cases.js';

function editDistance(left, right) {
  const a = left.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = right.toLowerCase().replace(/[^a-z0-9]/g, '');
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length] / Math.max(a.length, b.length, 1);
}

export function InvoiceComparison({ caseResult, invoiceFixture, showInvoice = true, showSavedRecord = true, showComparison = true }) {
  const [reveal, setReveal] = useState(false);
  const invoice = caseResult ? caseResult.invoice : invoiceFixture;
  const supplier = caseResult ? caseResult.supplier : null;
  const checked = Boolean(caseResult);
  const closestName = !supplier && checked
    ? Object.values(SAVED_SUPPLIERS)
        .map((item) => ({ item, distance: editDistance(invoice.supplierNameClaimed, item.name) }))
        .sort((a, b) => a.distance - b.distance)[0]
    : null;
  const possibleImpersonation = closestName && closestName.distance <= 0.42;

  function fieldAlert(field) {
    return checked && caseResult.comparison.rows.some((row) => row.field === field && !row.match && !row.informational);
  }

  return (
    <div>
      <div className="invoice-sequence">
        {showInvoice && <div className="card">
          <div className="source-tag">From invoice</div>
          <h3>Invoice preview and extracted details</h3>
          <div className="invoice-preview-layout">
            <article className="invoice-preview-paper" aria-label="Synthetic invoice document preview">
              <div className="invoice-preview-heading">
                <strong>INVOICE</strong>
                <span>DEMO COPY</span>
              </div>
              <div className={`invoice-preview-supplier ${fieldAlert('Supplier name') ? 'field-alert' : ''}`}>{invoice.supplierNameClaimed}</div>
              <div className="invoice-preview-rule" />
              <div className="invoice-preview-line"><span>Invoice</span><strong>{invoice.invoiceId}</strong></div>
              <div className="invoice-preview-line"><span>Issued</span><span>{formatDate(invoice.date)}</span></div>
              <div className="invoice-preview-line"><span>Due</span><span>{formatDate(invoice.dueDate)}</span></div>
              <div className="invoice-preview-total"><span>Total due</span><strong>{formatCurrency(invoice.amount, invoice.currency)}</strong></div>
              <p className="invoice-preview-note">{invoice.note}</p>
              <span className="invoice-preview-watermark">SYNTHETIC DATA</span>
            </article>
            <div className="invoice-extracted-fields">
              <div className="source-tag">Extracted fields · from invoice</div>
              <div className={`kv-row ${fieldAlert('Supplier name') ? 'field-alert' : ''}`}><span className="k">Supplier</span><span>{invoice.supplierNameClaimed}</span></div>
              <div className="kv-row"><span className="k">Invoice number</span><span>{invoice.invoiceId}</span></div>
              <div className="kv-row"><span className="k">Date</span><span>{formatDate(invoice.date)}</span></div>
              <div className="kv-row"><span className="k">Due date</span><span>{formatDate(invoice.dueDate)}</span></div>
              <div className="kv-row"><span className="k">Amount</span><span>{formatCurrency(invoice.amount, invoice.currency)}</span></div>
              <div className={`kv-row ${fieldAlert('Payment account') ? 'field-alert' : ''}`}><span className="k">Payment account</span><span>{maskAccount(invoice.account, reveal)}</span></div>
              <div className={`kv-row ${fieldAlert('IFSC-like value') ? 'field-alert' : ''}`}><span className="k">IFSC-like value</span><span>{maskAccount(invoice.ifscLike, reveal)}</span></div>
              <div className={`kv-row ${fieldAlert('Contact') ? 'field-alert' : ''}`}><span className="k">Contact</span><span>{invoice.contact}</span></div>
              <div className="kv-row"><span className="k">Terms</span><span>{invoice.terms}</span></div>
            </div>
          </div>
          <details className="invoice-provenance">
            <summary>How PayGuard treats invoice notes</summary>
            <p>This note is untrusted invoice content. PayGuard displays it but never treats it as an instruction.</p>
          </details>
        </div>}

        {showSavedRecord && <div className="card">
          <div className="source-tag">Saved supplier record</div>
          <h3>Saved supplier record</h3>
          {!checked && <p className="muted">Run the check to look up the saved supplier record.</p>}
          {checked && !supplier && (
            <>
              <p className="muted">No saved supplier record found for supplier ID {invoice.supplierIdClaimed}.</p>
              {possibleImpersonation && (
                <div className="near-match-warning">
                  <strong>Possible name lookalike</strong>
                  <p>This name resembles <b>{closestName.item.name}</b>, a supplier already on file. Similarity is only a clue; verify through a trusted channel.</p>
                </div>
              )}
            </>
          )}
          {checked && supplier && (
            <>
              <div className="kv-row"><span className="k">Supplier name</span><span>{supplier.name}</span></div>
              <div className="kv-row"><span className="k">Contact</span><span>{supplier.contact}</span></div>
              <div className="kv-row"><span className="k">Payment account</span><span>{maskAccount(supplier.account, reveal)}</span></div>
              <div className="kv-row"><span className="k">IFSC-like value</span><span>{maskAccount(supplier.ifscLike, reveal)}</span></div>
              <div className="kv-row"><span className="k">Terms</span><span>{supplier.terms}</span></div>
              <div className="kv-row"><span className="k">Record last reviewed</span><span>{formatDate(supplier.recordReviewDate)}</span></div>
            </>
          )}
        </div>}
      </div>

      {showInvoice && <div style={{ margin: '10px 0' }}>
        <label className="checkbox-row" style={{ marginBottom: 0 }}>
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
          Show full synthetic placeholder values (still fictional demo data)
        </label>
      </div>}

      {checked && showComparison && (
        <>
          <h3 className="section-title">Invoice-versus-supplier comparison</h3>
          <details className="card comparison-disclosure" open={caseResult.riskStatus !== 'clear'}>
            <summary>View the field-by-field comparison <span className="muted">{caseResult.comparison.rows.length} fields</span></summary>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>From invoice</th>
                  <th>Saved supplier record</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {caseResult.comparison.rows.map((row) => (
                  <tr key={row.field} className={!row.match && !row.informational ? 'mismatch' : ''}>
                    <td>{row.field}</td>
                    <td>{row.maskable ? maskAccount(row.invoiceValue, reveal) : row.invoiceValue}</td>
                    <td>{row.maskable ? maskAccount(row.savedValue === '— no saved record —' ? null : row.savedValue, reveal) || row.savedValue : row.savedValue}</td>
                    <td>
                      {row.informational ? (
                        <span className="muted">—</span>
                      ) : row.match ? (
                        <span style={{ color: 'var(--status-clear)', fontWeight: 600 }}>Match</span>
                      ) : (
                        <span style={{ color: 'var(--status-review)', fontWeight: 600 }}>Mismatch — pause and verify</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
