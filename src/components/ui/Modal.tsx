import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { cx } from './primitives';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 'drawer' slides in from the right at full height instead of centering. */
  variant?: 'dialog' | 'drawer';
  children: ReactNode;
}

/**
 * Centered dialog. Esc and a click on the backdrop close it; the body scrolls
 * while header and footer stay put. Children render the body/footer so a form
 * can wrap both and keep the submit button inside it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'dialog',
  children,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Backdrop click is a mouse shortcut only; keyboard users close with Esc (above).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx('ui-overlay', variant === 'drawer' && 'is-drawer')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx('ui-modal', `is-${size}`, variant === 'drawer' && 'is-drawer')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ui-modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  required = false,
  hint,
  full = false,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={cx('ui-field', full && 'is-full')}>
      <span className="ui-field-label">
        {label}
        {required && <em>*</em>}
      </span>
      {children}
      {hint && <span className="ui-field-hint">{hint}</span>}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ui-section">
      <div className="ui-section-title">{title}</div>
      {children}
    </section>
  );
}

export function StatusSegment({
  value,
  onChange,
}: {
  value: 'ACTIVE' | 'INACTIVE';
  onChange: (value: 'ACTIVE' | 'INACTIVE') => void;
}) {
  return (
    <div className="ui-segment" role="radiogroup" aria-label="Status">
      {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          className={value === s ? 'is-on' : ''}
          onClick={() => onChange(s)}
        >
          {s === 'ACTIVE' ? 'Active' : 'Inactive'}
        </button>
      ))}
    </div>
  );
}

export function SwitchRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    // The label's text lives in <strong>; the checkbox also carries it as aria-label.

    <label className="ui-switch-row">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <input
        type="checkbox"
        className="ui-switch"
        aria-label={title}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Replaces `window.confirm` for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: ConfirmProps) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title} size="sm">
      <div className="ui-modal-body" style={{ color: 'var(--ui-text-2)', fontSize: 13.5 }}>
        {message}
      </div>
      <div className="ui-modal-foot">
        <button type="button" className="ui-btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-danger"
          onClick={() => {
            void run();
          }}
          disabled={busy}
        >
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
