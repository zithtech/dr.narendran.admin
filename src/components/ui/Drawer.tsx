import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId } from 'react';

import { Section } from './Modal';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Small label in the top bar, e.g. "Doctor details". */
  label: string;
  /** Avatar, name and tags block under the top bar. */
  hero: ReactNode;
  /** Optional row of key figures under the hero. */
  stats?: { label: string; value: ReactNode }[];
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Right-hand slide-over for read-only details. Esc closes it unless a modal
 * is open on top (the modal handles Esc itself).
 */
export function Drawer({ open, onClose, label, hero, stats, footer, children }: DrawerProps) {
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.ui-overlay')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop click is a mouse shortcut only; keyboard users close with Esc. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className="ui-drawer-overlay" onClick={onClose} />
      <aside className="ui-drawer" role="dialog" aria-modal="true" aria-labelledby={labelId}>
        <div className="ui-drawer-top">
          <span id={labelId} className="ui-eyebrow">
            {label}
          </span>
          <button
            type="button"
            className="ui-icon-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ui-drawer-scroll">
          <div className="ui-drawer-hero">{hero}</div>
          {stats && stats.length > 0 && (
            <div className="ui-drawer-stats">
              {stats.map((s) => (
                <div className="ui-drawer-stat" key={s.label}>
                  <div className="ui-drawer-stat-label">{s.label}</div>
                  <div className="ui-drawer-stat-value">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="ui-drawer-content">{children}</div>
        </div>

        {footer && <div className="ui-drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

/** Labelled key/value table; empty values render as a muted dash. */
export function DetailList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <Section title={title}>
      <dl className="ui-dl" style={{ marginTop: 0 }}>
        {items.map((item) => (
          <DetailRow key={item.label} label={item.label} value={item.value} />
        ))}
      </dl>
    </Section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <>
      <dt>{label}</dt>
      <dd>{empty ? <span className="ui-muted">—</span> : value}</dd>
    </>
  );
}
