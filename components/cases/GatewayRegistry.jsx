import { SIGNED_TOOL_MANIFEST } from '../../security/toolSecurity.js';
import { usePayGuard } from '../../state/store.jsx';

export function GatewayRegistry() {
  const { state } = usePayGuard();
  const status = state.toolMetadataStatus;
  return (
    <div className="gateway-registry">
      <div className={`signature-status ${status}`}>
        <strong>{status === 'verified' ? 'Signature verified' : status === 'checking' ? 'Verifying signed tool manifest…' : 'Verification failed — tools blocked'}</strong>
        <span>{SIGNED_TOOL_MANIFEST.manifest.issuer} · manifest v{SIGNED_TOOL_MANIFEST.manifest.version}</span>
      </div>
      <p className="muted">The local MCP-style gateway checks this signed tool list before it permits simulated calls. This demo signature proves the bundled manifest has not changed; it is not a production vendor identity.</p>
      <table className="data-table">
        <thead><tr><th>Tool</th><th>Permission scope</th><th>Risk</th></tr></thead>
        <tbody>{SIGNED_TOOL_MANIFEST.manifest.tools.map((tool) => <tr key={tool.id}><td><code>{tool.id}</code></td><td>{tool.scope}</td><td>{tool.risk}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
