import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Overview', icon: '⌂' },
  { to: '/invoice-checks', label: 'Invoice checks', icon: '▤' },
  { to: '/payment-approvals', label: 'Payment approvals', icon: '✓' },
  { to: '/reports', label: 'Reports', icon: '↗' },
  { to: '/audit', label: 'Audit log', icon: '≡' },
  { to: '/gateway', label: 'MCP gateway', icon: '⌘' },
];

export function Sidebar({ onResetDemo }) {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="dot" aria-hidden="true" />
        PayGuard
      </div>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
      <div className="sidebar-footer">
        <button className="btn" style={{ width: '100%' }} onClick={onResetDemo}>
          Reset demo
        </button>
      </div>
    </nav>
  );
}
