'use client';

/**
 * ConfirmDialog — modal confirmation dialog.
 *
 * A reusable confirmation modal used throughout the app
 * for destructive or irreversible actions.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-swift/30 flex items-center justify-center z-50 p-4">
      <div className="bg-crane rounded-[var(--border-radius-lg)] border border-heron p-6 w-full max-w-sm shadow-lg">
        <h3 className="text-lg font-semibold text-swift mb-2">{title}</h3>
        <p className="text-sm text-grouse mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-[var(--border-radius-base)] text-sm font-medium ${
              destructive
                ? 'bg-cardinal text-crane hover:bg-cardinal/90'
                : 'bg-peacock text-crane hover:bg-peacock/90'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
