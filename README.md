# PayGuard

PayGuard is a local cybersecurity hackathon demo that puts a policy checkpoint between an AI-style invoice assistant and payment actions. It compares six fictional invoices with saved supplier records, blocks unsafe tool requests, requires human approval for simulated payments, records an audit trail, and drafts a report for the user to review.

All supplier names, account identifiers, contact addresses, invoices, and payment outcomes are synthetic. The app does not connect to a bank, email account, accounting system, or cybercrime reporting service. It never moves real money or submits a report.

## Open the local demo and standalone MCP gateway

Extract `PayGuard-Production-Build.zip`, then double-click `Start PayGuard Demo.bat`. It starts a local-only Python server that serves the single-file web app and a standalone MCP Streamable HTTP endpoint at `/mcp`. It uses Python's standard library and needs no Node.js, package install, or internet access. It opens the browser automatically and chooses an available local port between 4173 and 4192. Keep the terminal window open during the demo; press `Ctrl+C` to stop it.

The server binds to loopback, checks browser origins, independently verifies the bundled signed tool manifest, exposes synthetic tools through JSON-RPC, and keeps a short in-memory decision log. For compatible MCP clients, use the `/mcp` URL printed in the terminal. The gateway supports JSON responses for MCP Streamable HTTP; it does not provide an SSE stream.

## Run the development app

The source app is in `payguard`. Development requires Node.js and npm:

```powershell
cd payguard
npm install
npm run dev
```

Use the local URL printed in the terminal. To rebuild the hosted bundle and self-contained local version:

```powershell
npm run build
npm run build:standalone
```

The hosted bundle is written to `payguard/dist`. The standalone build updates `PayGuard-Production-Build`; the Python gateway and launcher are copied from `payguard/public` into that folder.

## Give a judge a link they can open on another computer

GitHub Pages can display static HTML, but this demo also needs its Python MCP helper. The included `render.yaml` describes one web service that hosts both the app and helper at the same HTTPS address.

1. Rebuild `PayGuard-Production-Build` with `npm run build:standalone` from the `payguard` folder.
2. Push the repository, including `render.yaml`, `requirements.txt`, and `PayGuard-Production-Build`, to GitHub.
3. In Render, create a new Blueprint and connect that GitHub repository. Render reads `render.yaml` and deploys the Python web service.
4. Share the generated `onrender.com` URL with the judge. They open the link and use the MCP gateway in the browser; they do not need Python or the ZIP.

The free Render web service can go idle after 15 minutes without traffic and may take about a minute to wake on the next visit, so open the judge link shortly before presenting. See [Render's free service limits](https://render.com/docs/free).

## Demo flow

For a short judge walkthrough, start on Overview and select **Open live MCP gateway**. Connect, read the selected synthetic invoice, try the unauthorized bank-change request, and review the gate decision and audit trace. Then use the app's invoice checks and payment approvals to see the complete workflow.

1. Choose one of the six cases and review the Permission Passport.
2. Run the invoice check. PayGuard reads the invoice, looks up only its claimed supplier, compares account, IFSC-like value, contact, and other details, and records each tool decision.
3. Review the resulting draft. Changed or missing supplier details keep it on hold. A person must review and approve the exact draft before the simulated payment tool can run.
4. Open Reports to create, edit, and download a cyber-cell or company-security report draft. It is never submitted automatically.
5. Inspect the audit log to see allowed, denied, held, and approval-required actions.

6. In Technical details, inspect the local MCP-style policy gateway, signed synthetic tool manifest, and named permission profiles. If manifest verification fails, tool calls fail closed.
7. Use the approval queue's deterministic risk ranking to prioritize human review. The score explains its signals and never makes the approval decision.
8. Filter audit events by simulated agent and follow a shared trace ID across the invoice-check flow.

The gateway speaks the MCP JSON-RPC tool flow locally, but its invoice data, tools, and agents are synthetic demo implementations. It is not a production payment connector, vendor identity service, or cross-machine audit system.

See `payguard/src/data/cases.js` for the six synthetic scenarios and `payguard/src/policy/gate.js` for the shared policy decisions.

