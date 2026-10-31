import { GatewayRegistry } from '../components/GatewayRegistry.jsx';

export default function GatewayPage() {
  const isLocalDemo = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return <div>
    <div className="page-title">
      <div><h1>MCP gateway demo</h1><p>This page sends demo requests to PayGuard’s Python helper at the address shown below. The helper only uses fictional data; it cannot reach a real bank or supplier.</p></div>
      <span className="demo-badge">Synthetic data · no external actions</span>
    </div>
      {isLocalDemo ? <section className="gateway-run-card" aria-labelledby="judge-quick-start">
        <div className="gateway-run-heading"><div><b id="judge-quick-start">Start the demo</b><p>Do this once before using the gateway.</p></div><span className="gateway-run-time">ABOUT 1 MIN</span></div>
        <ol className="gateway-run-steps">
          <li><span>1</span><div><b>Unzip the download</b><small>Right-click the ZIP and choose <i>Extract All</i>.</small></div></li>
          <li><span>2</span><div><b>Open the new folder</b><small>Find the files that were unpacked.</small></div></li>
          <li><span>3</span><div><b>Start PayGuard</b><small>Double-click <code>Start PayGuard Demo.bat</code>.</small></div></li>
          <li><span>4</span><div><b>Choose MCP gateway</b><small>The app opens; click this in the left menu.</small></div></li>
        </ol>
        <p className="gateway-run-note">Keep the black terminal window open while using PayGuard. Python is needed; no extra packages or internet are needed.</p>
      </section> : <section className="gateway-run-card hosted-judge-note" aria-labelledby="judge-quick-start">
        <div className="gateway-run-heading"><div><b id="judge-quick-start">For the judge</b><p>The organizer has hosted PayGuard online. You do not need to download or install anything.</p></div><span className="gateway-run-time">OPEN IN BROWSER</span></div>
        <p className="gateway-run-note">Choose a sample case, click <b>Connect to PayGuard helper</b>, then try the fake invoice and blocked bank-change request below. The hosted app and helper share this web address.</p>
      </section>}
    <GatewayRegistry />
  </div>;
}
