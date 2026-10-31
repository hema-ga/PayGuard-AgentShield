import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayGuard } from '../state/store.jsx';
import { CASES } from '../data/cases.js';
import { CaseTable } from '../components/cases/CaseTable.jsx';
import { FilterPanel } from '../components/common/FilterPanel.jsx';

const STATUS_OPTIONS = [
  { value: 'unchecked', label: 'Not yet checked' },
  { value: 'clear', label: 'Clear' },
  { value: 'review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
];

const TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'suspicious', label: 'Suspicious' },
];

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function InvoiceChecksPage() {
  const { state } = usePayGuard();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState(new Set());
  const [typeFilter, setTypeFilter] = useState(new Set());

  const statusCounts = useMemo(() => {
    const counts = { unchecked: 0, clear: 0, review: 0, blocked: 0 };
    CASES.forEach((c) => {
      const cs = state.caseStates[c.id];
      counts[cs ? cs.riskStatus : 'unchecked'] += 1;
    });
    return counts;
  }, [state.caseStates]);

  const typeCounts = useMemo(() => {
    const counts = { normal: 0, suspicious: 0 };
    CASES.forEach((c) => {
      counts[c.type] += 1;
    });
    return counts;
  }, []);

  const filteredCases = useMemo(() => {
    return CASES.filter((c) => {
      const status = state.caseStates[c.id] ? state.caseStates[c.id].riskStatus : 'unchecked';
      if (statusFilter.size > 0 && !statusFilter.has(status)) return false;
      if (typeFilter.size > 0 && !typeFilter.has(c.type)) return false;
      return true;
    });
  }, [state.caseStates, statusFilter, typeFilter]);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Invoice checks</h1>
          <p>Select any of the six fictional cases to open it and run the check.</p>
        </div>
      </div>

      <div className="filtered-layout">
        <FilterPanel
          groups={[
            {
              title: 'Status',
              options: STATUS_OPTIONS.map((o) => ({ ...o, count: statusCounts[o.value] })),
              selected: statusFilter,
              onToggle: (v) => setStatusFilter((s) => toggle(s, v)),
            },
            {
              title: 'Scenario type',
              options: TYPE_OPTIONS.map((o) => ({ ...o, count: typeCounts[o.value] })),
              selected: typeFilter,
              onToggle: (v) => setTypeFilter((s) => toggle(s, v)),
            },
          ]}
          onClearAll={() => {
            setStatusFilter(new Set());
            setTypeFilter(new Set());
          }}
        />
        <div className="card">
          <CaseTable
            caseStates={state.caseStates}
            selectedId={null}
            onSelect={(id) => navigate(`/cases/${id}`)}
            cases={filteredCases}
          />
        </div>
      </div>
    </div>
  );
}
