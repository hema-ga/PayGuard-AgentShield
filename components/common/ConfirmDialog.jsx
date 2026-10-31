export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <div className="tour-backdrop" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="tour-card" style={{ maxWidth: 440, textAlign: 'left' }}>
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
