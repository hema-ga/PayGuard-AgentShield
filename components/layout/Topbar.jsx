import { usePayGuard } from '../../state/store.jsx';

export function Topbar({ onReplayTour }) {
  const { state, dispatch } = usePayGuard();
  const isDark = state.theme === 'dark';

  function toggleTheme() {
    dispatch({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' });
  }

  return (
    <header className="topbar">
      <span className="demo-badge">Demo only · fictional data · no real payments</span>
      <div className="topbar-actions">
        <button className="btn btn-ghost" onClick={onReplayTour}>
          Help / replay tour
        </button>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
