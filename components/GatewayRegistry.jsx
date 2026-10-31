import { useState } from 'react';
import { SIGNED_TOOL_MANIFEST } from '../security/toolSecurity.js';
import { getCaseById } from '../data/cases.js';

const CASE_OPTIONS = [
  ['NORMAL-001', 'Safe invoice · Aster'], ['NORMAL-002', 'Safe invoice · Nandi'],
  ['NORMAL-003', 'Safe invoice · Kaveri'], ['SUSPICIOUS-001', 'Bank change + prompt injection'],
  ['SUSPICIOUS-002', 'Unknown supplier'], ['SUSPICIOUS-003', 'Unrelated data request'],
];

async function rpc(method, params, id = 1) {
  const response = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: no PayGuard gateway response at this address.`);
  return response.json();
}

async function notifyInitialized() {
  const response = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
  if (!response.ok && response.status !== 202) throw new Error('Gateway initialization notification failed.');
}

export function GatewayRegistry() {
  const [status, setStatus] = useState('disconnected');
  const [selectedCase, setSelectedCase] = useState('SUSPICIOUS-001');
  const [profile, setProfile] = useState('invoice-reviewer');
  const [tools, setTools] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deployment, setDeployment] = useState('unknown');
  const endpointUrl = typeof window === 'undefined' ? '/mcp' : `${window.location.origin}/mcp`;
  const isOldPreview = /HTTP (404|405|501)/.test(error);
  const isLocalAddress = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  async function connect() {
    setBusy(true); setError(''); setStatus('connecting');
    try {
      const initialize = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'PayGuard Judge Console', version: '1.0.0' } }, 1);
      if (!initialize.result?.serverInfo) throw new Error('MCP initialization response was incomplete.');
      await notifyInitialized();
      const list = await rpc('tools/list', undefined, 2);
      setTools(list.result?.tools || []);
      const health = await fetch('/_gateway/status', { cache: 'no-store' }).then((res) => res.json());
      if (!health.manifestVerified) throw new Error('Server signature check failed. The gateway is intentionally denying tools.');
      setDeployment(health.localOnly ? 'local' : 'hosted');
      setStatus('connected');
      setEvents((current) => [{ decision: 'Connected', tool: 'MCP initialize + tools/list', reason: `${initialize.result.serverInfo.name} · protocol ${initialize.result.protocolVersion} · ${health.tools} tools discovered` }, ...current]);
    } catch (err) {
      setStatus('disconnected'); setError(err.message || 'Could not connect to the local MCP gateway.');
    } finally { setBusy(false); }
  }

  async function callTool(name, args) {
    setBusy(true); setError('');
    try {
      if (status !== 'connected') await connect();
      const result = await rpc('tools/call', { name, arguments: args }, Date.now());
      const structured = result.result?.structuredContent;
      const text = result.result?.content?.find((item) => item.type === 'text')?.text || result.error?.message || 'No response content.';
      const event = { decision: structured?.decision || (result.result?.isError ? 'Denied' : 'Result'), tool: name, reason: structured?.reason || text, ran: structured?.ran, traceId: structured?.traceId };
      setEvents((current) => [event, ...current].slice(0, 8));
      const auditResponse = await fetch('/_gateway/audit', { cache: 'no-store' });
      const audit = await auditResponse.json();
      if (audit.entries?.length) setEvents((current) => {
        const newest = audit.entries[audit.entries.length - 1];
        return current.map((item) => item.tool === name && item.traceId === event.traceId ? { ...item, time: newest.time } : item);
      });
      return structured;
    } catch (err) {
      setError(err.message || 'The gateway call failed.');
      return null;
    } finally { setBusy(false); }
  }

  async function tryUnauthorized() {
    setBusy(true); setError('');
    try {
      if (status !== 'connected') await connect();
      const result = await rpc('tools/call', { name: 'change_saved_supplier_bank_details', arguments: { case_id: selectedCase, profile } }, Date.now());
      const data = result.result?.structuredContent;
      setEvents((current) => [{ decision: data?.decision || 'Deny', tool: 'change_saved_supplier_bank_details', reason: data?.reason || result.result?.content?.[0]?.text || 'Unregistered tool denied.', ran: false, traceId: data?.traceId }, ...current].slice(0, 8));
    } catch (err) { setError(err.message || 'The request was blocked.'); }
    finally { setBusy(false); }
  }

  async function requestPayment() {
    const result = await callTool('request_simulated_payment', { case_id: selectedCase, profile, human_approved: false });
    const fixture = getCaseById(selectedCase);
    const exactRequest = `${fixture?.invoice.invoiceId} · ${fixture?.invoice.supplierNameClaimed} · ₹${fixture?.invoice.amount.toLocaleString('en-IN')} · fictional demo only. No money will move. Confirm this exact simulated approval?`;
    if (result?.decision === 'Approval required' && window.confirm(exactRequest)) {
      await callTool('request_simulated_payment', { case_id: selectedCase, profile, human_approved: true });
    }
  }

  return <section className="gateway-registry">
    <div className="gateway-status"><div><strong>PayGuard demo helper</strong><p className="muted">“Connect” links this page to the Python helper at the address shown below. If you opened PayGuard from a shared web link, it connects to the hosted helper. If you started it on your laptop, it connects to the helper on that laptop. It never connects to a real bank or supplier.</p></div><span className={`metadata-pill ${status === 'connected' ? 'verified' : status === 'connecting' ? 'checking' : 'failed'}`}>{status === 'connected' ? `Connected · ${deployment === 'local' ? 'this computer' : 'hosted helper'}` : status === 'connecting' ? 'Connecting…' : 'Not connected'}</span></div>
    <div className="gateway-toolbar"><button className="btn btn-primary" onClick={connect} disabled={busy}>{busy ? 'Connecting…' : status === 'connected' ? 'Reconnect helper' : 'Connect to PayGuard helper'}</button><span className="gateway-address"><b>Helper address:</b> <code>{endpointUrl}</code></span></div>
    {error && <div className="gateway-error" role="alert"><strong>{isLocalAddress ? (isOldPreview ? 'This is an old local preview' : 'The local helper is not responding') : 'The hosted helper is not responding'}</strong>{isLocalAddress ? (isOldPreview ? <><p>This old preview can show the page, but it cannot run the Python helper. Close this tab and any old PayGuard server window.</p><p>Open the folder you unzipped, double-click <code>Start PayGuard Demo.bat</code>, then use the browser page that opens.</p></> : <><p>Open the folder you unzipped and double-click <code>Start PayGuard Demo.bat</code>.</p><p>Keep the black terminal window open, then reload this page.</p></>) : <><p>Reload the shared PayGuard link and try again. If it still fails, the hosted demo service may be asleep or unavailable.</p><p>For organizers: deploy the app and gateway together as one Python web service.</p></>}<details><summary>Technical detail</summary><code>{error}</code></details></div>}
    <div className="gateway-manifest-meta">Issuer: <b>{SIGNED_TOOL_MANIFEST.manifest.issuer}</b> · Version: <b>{SIGNED_TOOL_MANIFEST.manifest.version}</b> · Localhost only</div>
    <table className="data-table gateway-tools"><thead><tr><th>Registered MCP tool</th><th>Declared scope</th><th>Risk</th></tr></thead><tbody>{SIGNED_TOOL_MANIFEST.manifest.tools.map((tool) => <tr key={tool.id}><td><code>{tool.id}</code></td><td>{tool.scope}</td><td>{tool.risk}</td></tr>)}</tbody></table>
    <small className="muted">The server verifies this synthetic signed manifest independently and fails closed if verification fails. Its bundled public key is a demo trust root, not a production vendor identity.</small>
    <div className="gateway-demo-box">
      <div><h3>What does this section do?</h3><p className="muted">It sends pretend requests to the helper and shows its answer. Try reading a fake invoice, asking for a forbidden bank change, or making a draft. The helper explains whether it allowed, held, or denied each request. Nothing is sent outside this computer.</p></div>
      <div className="gateway-controls"><label>Choose a fake case<select value={selectedCase} onChange={(event) => setSelectedCase(event.target.value)}>{CASE_OPTIONS.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>Choose what the helper is allowed to do<select value={profile} onChange={(event) => setProfile(event.target.value)}><option value="read-only">Read-only analyst</option><option value="invoice-reviewer">Invoice reviewer</option><option value="incident-response">Incident response analyst</option></select></label></div>
      <div className="gateway-actions"><button className="btn" disabled={busy} onClick={() => callTool('read_invoice', { case_id: selectedCase })}>Read this fake invoice</button><button className="btn" disabled={busy} onClick={() => tryUnauthorized()}>Try a blocked bank change</button><button className="btn" disabled={busy} onClick={() => callTool('create_payment_draft', { case_id: selectedCase, profile })}>Try to make a draft</button><button className="btn" disabled={busy} onClick={requestPayment}>Request simulated payment</button></div>
    </div>
    {tools.length > 0 && <details className="gateway-tool-list"><summary>Live MCP tools/list response · {tools.length} tools</summary><ul>{tools.map((tool) => <li key={tool.name}><code>{tool.name}</code> — {tool.description}</li>)}</ul></details>}
    <div className="gateway-live-log"><h3>Live gateway decisions</h3>{events.length === 0 ? <p className="muted">Connect, then try one of the calls above. Decisions will appear here with their reason.</p> : events.map((event, index) => <div className="gateway-event" key={`${event.tool}-${index}`}><div><strong>{event.tool}</strong><span className={`risk-score ${event.decision === 'Allow' || event.decision === 'Connected' ? 'risk-low' : event.decision === 'Hold' || event.decision === 'Approval required' ? 'risk-review' : 'risk-high'}`}>{event.decision}</span></div><p>{event.reason}</p>{event.traceId && <small className="muted">Trace: <code>{event.traceId}</code></small>}</div>)}</div>
    <small className="muted">Synthetic local demo only. The gateway can never contact a bank, email system, or supplier service.</small>
  </section>;
}
