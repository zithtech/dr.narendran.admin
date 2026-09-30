import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { initials, toneFor } from '../../lib/format';

/**
 * Joins class names, dropping falsy ones. Use this instead of `${cond ? ' x' : ''}`
 * templates: prettier-plugin-tailwindcss trims the leading space inside those.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Avatar({
  name,
  src,
  size = 36,
}: {
  name: string;
  src?: string | null | undefined;
  size?: number;
}) {
  if (src) {
    return (
      <img
        className="ui-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }
  const tone = toneFor(name);
  return (
    <span
      className="ui-avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}

export type BadgeTone = 'neutral' | 'green' | 'blue' | 'red' | 'amber' | 'violet';

export function Badge({
  children,
  tone = 'neutral',
  mono = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  mono?: boolean;
}) {
  const cls = ['ui-badge', tone !== 'neutral' && `is-${tone}`, mono && 'is-mono']
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{children}</span>;
}

export function StatusDot({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={cx('ui-status', active && 'is-active')}>
      {label ?? (active ? 'Active' : 'Inactive')}
    </span>
  );
}

/** Two-line "what happened / when" cell, matching the pipeline's Action column. */
export function ActivityCell({ label, when }: { label: string; when: string }) {
  return (
    <div>
      <div style={{ color: 'var(--ui-text)', fontWeight: 500 }}>{label}</div>
      <div className="ui-cell-sub">{when}</div>
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="ui-alert" role="alert">
      <AlertCircle size={16} />
      <span>{children}</span>
    </div>
  );
}
