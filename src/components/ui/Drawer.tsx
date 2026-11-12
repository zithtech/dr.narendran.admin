import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { type ReactNode, useEffect, useId } from 'react';

import { Section } from './Modal';
import { cx } from './primitives';

export interface DrawerStatItem {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Small category / eyebrow tag in the top bar, e.g. "Doctor details" */
  label?: ReactNode | undefined;
  /** Full structured header props */
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  tags?: ReactNode | undefined;
  headerActions?: ReactNode | undefined;
  /** Avatar, name and tags block under the top bar (custom hero). */
  hero?: ReactNode | undefined;
  /** Optional row of key figures under the hero. */
  stats?: DrawerStatItem[] | undefined;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  width?: string | number | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
  loading?: boolean | undefined;
  loadingText?: string | undefined;
  error?: string | null | undefined;
  onRetry?: (() => void) | undefined;
  children?: ReactNode | undefined;
}

/**
 * Standardized Unified Drawer component for the Dr. Admin platform.
 * Features a modern slide-over interface with blue color theme accents,
 * responsive sizing, customizable header, key metrics strip, and actions footer.
 */
export function Drawer({
  open,
  onClose,
  label,
  title,
  subtitle,
  icon,
  tags,
  headerActions,
  hero,
  stats,
  footer,
  className,
  width,
  size,
  loading = false,
  loadingText = 'Loading details...',
  error = null,
  onRetry,
  children,
}: DrawerProps) {
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

  const resolvedWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <>
      {/* Backdrop overlay */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className="ui-drawer-overlay" onClick={onClose} />

      <aside
        className={cx('ui-drawer', size && `is-${size}`, className)}
        style={resolvedWidth ? { width: resolvedWidth, maxWidth: resolvedWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        {/* Top Control Bar */}
        <div className="ui-drawer-top">
          <div className="flex items-center gap-2 min-w-0">
            {label ? (
              <span id={labelId} className="ui-eyebrow">
                {label}
              </span>
            ) : (
              <span id={labelId} className="sr-only">
                Drawer details
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              className="ui-icon-btn"
              onClick={onClose}
              aria-label="Close details"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="ui-drawer-scroll">
          {/* Hero Section: Render custom hero or structured header */}
          {hero ? (
            <div className="ui-drawer-hero">{hero}</div>
          ) : title ? (
            <div className="ui-drawer-hero">
              {icon && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {typeof title === 'string' ? <h2>{title}</h2> : title}
                {subtitle && <div className="ui-drawer-hero-sub">{subtitle}</div>}
                {tags && <div className="ui-drawer-tags">{tags}</div>}
              </div>
            </div>
          ) : null}

          {/* Key Metrics / Figures Strip */}
          {stats && stats.length > 0 && (
            <div className="ui-drawer-stats">
              {stats.map((s) => (
                <div className="ui-drawer-stat" key={s.label}>
                  <div className="ui-drawer-stat-label flex items-center gap-1">
                    {s.icon}
                    <span>{s.label}</span>
                  </div>
                  <div className="ui-drawer-stat-value">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Body Content / Loading / Error State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <RefreshCw size={26} className="animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600">{loadingText}</p>
            </div>
          ) : error ? (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              <AlertCircle size={18} className="mb-1 text-rose-600" />
              <p>{error}</p>
              {onRetry && (
                <button
                  type="button"
                  className="ui-btn ui-btn-xs mt-3 bg-blue-600 text-white hover:bg-blue-700"
                  onClick={onRetry}
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <div className="ui-drawer-content">{children}</div>
          )}
        </div>

        {/* Footer Actions */}
        {footer && <div className="ui-drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

/** Alias for Drawer */
export const CommonDrawer = Drawer;

/** Structured labelled key/value table; empty values render as a muted dash. */
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

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <>
      <dt>{label}</dt>
      <dd>{empty ? <span className="ui-muted">—</span> : value}</dd>
    </>
  );
}

/** Contact Line helper */
export function DrawerContactLine({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label?: string;
  value: ReactNode;
  href?: string | null;
}) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-blue-600 transition-colors">
      <span className="text-blue-600 shrink-0">{icon}</span>
      {label && <span className="text-slate-500 font-medium">{label}:</span>}
      <span className="font-medium truncate">{value}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline">
        {content}
      </a>
    );
  }
  return content;
}

/** Styled section card for drawers */
export function DrawerSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          {title}
        </h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export interface CreateDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  eyebrow?: ReactNode | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
  width?: string | number | undefined;
  onSubmit?: ((e: React.FormEvent) => void) | undefined;
  submitLabel?: ReactNode | undefined;
  cancelLabel?: ReactNode | undefined;
  submitting?: boolean | undefined;
  loading?: boolean | undefined;
  loadingText?: string | undefined;
  error?: string | null | undefined;
  onRetry?: (() => void) | undefined;
  footer?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Standardized Create / Edit Form Drawer with blue color accents,
 * scrollable form area, and pinned action footer.
 */
export function CreateDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  eyebrow = 'Create / Edit',
  size = 'md',
  width,
  onSubmit,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  submitting = false,
  loading = false,
  loadingText,
  error = null,
  onRetry,
  footer,
  children,
  className,
}: CreateDrawerProps) {
  const defaultFooter = footer !== undefined ? footer : (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        className="ui-btn ui-btn-subtle"
        onClick={onClose}
        disabled={submitting}
      >
        {cancelLabel}
      </button>
      <button
        type={onSubmit ? 'submit' : 'button'}
        className="ui-btn ui-btn-primary"
        disabled={submitting}
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderColor: '#1d4ed8',
          color: '#ffffff',
          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
        }}
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );

  const drawerContent = (
    <Drawer
      open={open}
      onClose={onClose}
      label={eyebrow}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      width={width}
      loading={loading}
      loadingText={loadingText}
      error={error}
      onRetry={onRetry}
      footer={defaultFooter}
      className={className}
    >
      {children}
    </Drawer>
  );

  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} style={{ display: 'contents' }} noValidate>
        {drawerContent}
      </form>
    );
  }

  return drawerContent;
}
