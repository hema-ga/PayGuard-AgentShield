// A left-side filter panel: one or more checkbox groups, each filtering independently.
// `groups` = [{ title, options: [{ value, label, count }], selected: Set<string>, onToggle(value) }]
export function FilterPanel({ groups, onClearAll, title = 'Filters' }) {
  const anySelected = groups.some((g) => g.selected.size > 0);

  return (
    <aside className="filter-panel card" aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{title}</h3>
        {anySelected && (
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.78rem' }} onClick={onClearAll}>
            Clear
          </button>
        )}
      </div>
      {groups.map((group) => (
        <div key={group.title} className="filter-group">
          <h4>{group.title}</h4>
          {group.options.map((opt) => (
            <label key={opt.value} className="filter-option">
              <input
                type="checkbox"
                checked={group.selected.has(opt.value)}
                onChange={() => group.onToggle(opt.value)}
              />
              <span>{opt.label}</span>
              {typeof opt.count === 'number' && <span className="filter-count">{opt.count}</span>}
            </label>
          ))}
        </div>
      ))}
    </aside>
  );
}
