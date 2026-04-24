export function FormModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} title="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
