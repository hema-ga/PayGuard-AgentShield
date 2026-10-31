import { useState } from 'react';
import { evaluateGate } from '../../policy/gate.js';
import { formatCurrency, maskAccount } from '../../utils/format.js';

const FIELDS = [
  ['supplierNameClaimed', 'Supplier name'],
  ['account', 'Payment account'],
  ['ifscLike', 'IFSC-like value'],
  ['contact', 'Supplier contact'],
];

export function ScenarioBuilder({ fixture, result }) {
  const [field, setField] = useState('account');
  const [value, setValue] = useState('');
  const [simulation, setSimulation] = useState(null);

  function replay(event) {
    event.preventDefault();
    const invoice = { ...result.invoice, [field]: value.trim() || result.invoice[field] };
    const supplier = result.supplier;
    const outcome = evaluateGate('create_draft', {
      invoiceRead: true,
      supplierLookedUp: true,
      amountValid: invoice.amount === fixture.invoice.amount,
      supplierRecordFound: Boolean(supplier),
      supplierNameMatch: Boolean(supplier && invoice.supplierNameClaimed === supplier.name),
      accountMatch: Boolean(supplier && invoice.account === supplier.account),
      ifscMatch: Boolean(supplier && invoice.ifscLike === supplier.ifscLike),
      contactMatch: Boolean(supplier && invoice.contact === supplier.contact),
    });
    const originalWords = new Set((supplier?.name || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
    const changedWords = new Set(invoice.supplierNameClaimed.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
    const overlap = [...originalWords].filter((word) => changedWords.has(word)).length;
    setSimulation({ invoice, outcome, nearMatch: Boolean(supplier && invoice.supplierNameClaimed !== supplier.name && overlap >= 2) });
  }

  return (
    <details className="card scenario-builder">
      <summary>Scenario builder <span className="muted">Change a fictional field and replay the gate</span></summary>
      <p className="muted">This sandbox changes no saved records, payment drafts, or audit entries.</p>
      <form onSubmit={replay} className="scenario-form">
        <label>Field to change<select value={field} onChange={(event) => { setField(event.target.value); setSimulation(null); }}>
          {FIELDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>New fictional value<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Leave blank to use the invoice value" /></label>
        <button className="btn btn-primary" type="submit">Replay policy gate</button>
      </form>
      {simulation && (
        <div className={`scenario-result ${simulation.outcome.decision === 'Allow' ? 'allow' : 'hold'}`}>
          <strong>{simulation.outcome.decision} · {fixture.invoice.invoiceId}</strong>
          <p>{simulation.outcome.reason}</p>
          <p>Destination in this hypothetical draft: {maskAccount(simulation.invoice.account)} · {formatCurrency(simulation.invoice.amount, simulation.invoice.currency)}</p>
          {simulation.nearMatch && <p className="near-match-inline">Possible supplier name lookalike: this edited name resembles the saved supplier record. Treat the similarity as a clue, not proof.</p>}
        </div>
      )}
    </details>
  );
}
