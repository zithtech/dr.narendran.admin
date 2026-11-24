import { LayoutGrid, List } from 'lucide-react';

import { cx } from './primitives';

export interface ViewModeSwitcherProps {
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  className?: string;
  cardsLabel?: string;
  tableLabel?: string;
}

export function ViewModeSwitcher({
  viewMode,
  onViewModeChange,
  className,
  cardsLabel = 'Cards',
  tableLabel = 'Table',
}: ViewModeSwitcherProps) {
  return (
    <div
      className={cx(
        'inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shrink-0 shadow-2xs',
        className,
      )}
      role="group"
      aria-label="View presentation"
      data-testid="view-mode-switcher"
    >
      <button
        type="button"
        onClick={() => onViewModeChange('cards')}
        className={cx(
          'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5',
          viewMode === 'cards'
            ? 'bg-white text-blue-700 shadow-2xs font-semibold'
            : 'text-slate-600 hover:text-slate-900',
        )}
        aria-pressed={viewMode === 'cards'}
        title="Switch to Card View"
      >
        <LayoutGrid size={13} />
        <span>{cardsLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={cx(
          'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5',
          viewMode === 'table'
            ? 'bg-white text-blue-700 shadow-2xs font-semibold'
            : 'text-slate-600 hover:text-slate-900',
        )}
        aria-pressed={viewMode === 'table'}
        title="Switch to Table View"
      >
        <List size={13} />
        <span>{tableLabel}</span>
      </button>
    </div>
  );
}

export default ViewModeSwitcher;
