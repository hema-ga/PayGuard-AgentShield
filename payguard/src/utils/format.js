export function maskAccount(value, reveal = false) {
  if (!value) return '— none —';
  if (reveal) return value;
  const tail = value.slice(-4);
  return `•••• ${tail}`;
}

export function formatCurrency(amount, currency = 'INR') {
  if (typeof amount !== 'number') return '—';
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return symbol + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTimestamp(isoTimestamp) {
  if (!isoTimestamp) return '—';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

let draftCounter = 0;
export function nextDraftId() {
  draftCounter += 1;
  return `DRAFT-${String(draftCounter).padStart(4, '0')}`;
}
export function seedDraftCounter(n) {
  if (n > draftCounter) draftCounter = n;
}

let auditCounter = 0;
export function nextAuditId() {
  auditCounter += 1;
  return `AUD-${String(auditCounter).padStart(5, '0')}`;
}
export function seedAuditCounter(n) {
  if (n > auditCounter) auditCounter = n;
}
