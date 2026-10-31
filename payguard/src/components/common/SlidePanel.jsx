import { useEffect, useRef } from 'react';

export function SlidePanel({ title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="slide-panel-backdrop" onClick={onClose} />
      <div
        className="slide-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        tabIndex={-1}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
