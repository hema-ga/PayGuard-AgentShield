import { useMemo, useState } from 'react';
import { usePayGuard } from '../state/store.jsx';
import { DecisionBadge, RanPill } from '../components/common/Status.jsx';
import { formatTimestamp } from '../utils/format.js';
import { FilterPanel } from '../components/common/FilterPanel.jsx';

const DECISIONS = ['Allow', 'Deny', 'Hold', 'Approval required'];

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function AuditLogPage() {
  const { state } = usePayGuard();
  const [toolFilter, setToolFilter] = useState(new Set());
  const [decisionFilter, setDecisionFilter] = useState(new Set());
  const [agentFilter, setAgentFilter] = useState(new Set());

  const toolCounts = useMemo(() => {
    const counts = {};
    state.auditLog.forEach((e) => {
      counts[e.tool] = (counts[e.tool] || 0) + 1;
    });
    return counts;
  }, [state.auditLog]);

  const decisionCounts = useMemo(() => {
    const counts = {};
    state.auditLog.forEach((e) => {
      counts[e.decision] = (counts[e.decision] || 0) + 1;
    });
    return counts;
  }, [state.auditLog]);

  const agentCounts = useMemo(() => {
    const counts = {};
    state.auditLog.forEach((e) => {
      const actor = e.actor || 'Policy Gate';
      counts[actor] = (counts[actor] || 0) + 1;
    });
    return counts;
  }, [state.auditLog]);

  const tools = useMemo(() => Object.keys(toolCounts).sort(), [toolCounts]);

  const filtered = state.auditLog.filter((e) => {
    if (toolFilter.size > 0 && !toolFilter.has(e.tool)) return false;
    if (decisionFilter.size > 0 && !decisionFilter.has(e.decision)) return false;
    if (agentFilter.size > 0 && !agentFilter.has(e.actor || 'Policy Gate')) return false;
    return true;
  });

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Audit log</h1>
          <p>Chronological and append-only for this session. Every attempted action is recorded, whether it ran or not.</p>
        </div>
      </div>

      <div className="filtered-layout">
        <FilterPanel
          groups={[
            {
              title: 'Decision',
              options: DECISIONS.map((d) => ({ value: d, label: d, count: decisionCounts[d] || 0 })),
              selected: decisionFilter,
              onToggle: (v) => setDecisionFilter((s) => toggle(s, v)),
            },
            {
              title: 'Tool',
              options: tools.map((t) => ({ value: t, label: t, count: toolCounts[t] })),
              selected: toolFilter,
              onToggle: (v) => setToolFilter((s) => toggle(s, v)),
            },
            {
              title: 'Agent / actor',
              options: Object.keys(agentCounts).sort().map((actor) => ({ value: actor, label: actor, count: agentCounts[actor] })),
              selected: agentFilter,
              onToggle: (v) => setAgentFilter((s) => toggle(s, v)),
            },
          ]}
          onClearAll={() => {
            setToolFilter(new Set());
            setDecisionFilter(new Set());
            setAgentFilter(new Set());
          }}
        />

        <div>
          {filtered.length === 0 ? (
            <p className="empty-state">No audit entries match these filters yet.</p>
          ) : (
            filtered
              .slice()
              .reverse()
              .map((entry) => (
                <details key={entry.id} className="audit-entry">
                  <summary>
                    <span className="ts">{formatTimestamp(entry.timestamp)}</span>
                    <strong>{entry.tool}</strong>
                    <span className="muted">· {entry.caseTitle}</span>
                    <DecisionBadge decision={entry.decision} />
                    <RanPill ran={entry.ran} />
                  </summary>
                  <div className="detail">
                    <div><strong>Agent / actor:</strong> {entry.actor || 'Policy Gate'}</div>
                    {entry.traceId && <div><strong>Cross-agent trace:</strong> <code>{entry.traceId}</code></div>}
                    <div><strong>Input / target:</strong> {entry.input}</div>
                    <div><strong>Reason:</strong> {entry.reason}</div>
                    <div><strong>Outcome:</strong> {entry.outcome}</div>
                  </div>
                </details>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
