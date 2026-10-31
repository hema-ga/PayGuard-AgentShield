import { evaluateGate, DECISION } from '../policy/gate.js';

// The manifest is signed offline with a demo RSA key. Only the public key and
// signature ship in the app. This is a reproducible demo attestation, not a vendor trust root.
export const SIGNED_TOOL_MANIFEST = {
  manifest: {
    version: '1.0.0',
    issuer: 'PayGuard Demo Signer',
    tools: [
      { id: 'read_invoice', scope: 'Read selected synthetic invoice', risk: 'low' },
      { id: 'lookup_supplier', scope: 'Lookup supplier named on invoice only', risk: 'low' },
      { id: 'create_draft', scope: 'Create draft only when supplier fields match', risk: 'medium' },
      { id: 'send_payment', scope: 'Simulated payment only after explicit reviewer approval', risk: 'high' },
      { id: 'draft_report', scope: 'Create editable report only on user request', risk: 'medium' },
    ],
  },
  publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAj6XtJvpc58/XD+44hGWNt3ra+w9ASC4CofVCASlkqZY62DBThpkn8IdAmHOPlETMCFGHbdWnYHXGuW7MbxQ0sxQROaU7wq6iQyKvB0Ax2Ni8z80Je4kE5u3oTujtGcI3DCUPDLhXGw+lf2dSb8CV2cb+CF+u9aM5+naVsUWd4VvCN8WXDZ0lzvGMqeHdRoma5ljKaALo7cd/RDJQvLc0gwT2JqYq21qoEhKgkmGhVSnB/K/isBUpZFZhzXIR3BBBVu8FMVJed4VvjNEwfPuJghvc/4BeRNJZvirdadAzgCghA33L7U4tGOzTSYzf9J8vTIqC1f+kfUbzVJCDqRPRNwIDAQAB',
  signature: 'EDGyb9uwUQPpHWskAdccAMNZi/s7/VhDbqbsA2JOCnOmSNGBNXpWsQm4T3Hl1FR9e6/ndnmkLW7rd+0v/EVOGI7EmSS8lgvTnyqxmC0N24Kj7ImSJDCp3vZwUGtLnOFLfQ7lOzmJ4BFKXFuJEJvixdHk/0R2LqSNO5bfkJDrXUKmPO7RZlTFeyq1OOE7xAOaMgyMjhm+l2yBuuxfSsWhafctYuOTXX23aaiuKY9w9Cbd8SOxmD7wiN5xq195ogXRqWDtMnM4rniqcTeigKiHd4krY+1nsdHS2m8sXCZQswDxzUDW93ZqjUl1sG4weMbaxcRxRukLhSbiJivKvJZkog==',
};

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function verifyToolManifest() {
  try {
    if (!globalThis.crypto?.subtle) return false;
    const key = await crypto.subtle.importKey(
      'spki', decodeBase64(SIGNED_TOOL_MANIFEST.publicKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const canonicalManifest = new TextEncoder().encode(JSON.stringify(SIGNED_TOOL_MANIFEST.manifest));
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, decodeBase64(SIGNED_TOOL_MANIFEST.signature), canonicalManifest
    );
  } catch {
    return false;
  }
}

export function invokeMcpGateway(action, context = {}, { metadataVerified = false } = {}) {
  if (!metadataVerified) {
    return { decision: DECISION.DENY, reason: 'Signed tool metadata is unverified. The local MCP gateway failed closed.', ran: false, transport: 'MCP demo gateway' };
  }
  const gate = evaluateGate(action, context);
  return { ...gate, ran: gate.decision === DECISION.ALLOW, transport: 'MCP demo gateway' };
}

export const TOOL_AGENT_MAP = {
  'Read invoice': 'Invoice Agent',
  'Look up saved supplier': 'Supplier Lookup Agent',
  'Create payment draft': 'Payment Draft Agent',
  'Change saved supplier record': 'Policy Gate',
  'Look up unrelated supplier records': 'Policy Gate',
  'Send payment (simulated)': 'Human Approval Agent',
  'Draft cybercrime report': 'Report Drafting Agent',
  'Reviewer challenged risk finding': 'Human Reviewer',
};
