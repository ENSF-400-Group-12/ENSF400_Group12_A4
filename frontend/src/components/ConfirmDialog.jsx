/**
 * Mobile-friendly confirmation (avoids flaky window.confirm on some iOS / in-app browsers).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      aria-hidden={false}
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="button-secondary confirm-dialog-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              danger
                ? "button-danger-solid confirm-dialog-btn"
                : "button-primary confirm-dialog-btn"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
