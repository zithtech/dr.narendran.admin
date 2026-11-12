import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  type LucideIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { cx } from './primitives';
import { SearchableSelect } from './SearchableSelect';

/* ─────────────────────────────────────────────────────────────
 * Common Page Header (Matching Image Header)
 * ───────────────────────────────────────────────────────────── */

export interface CommonPageHeaderProps {
  overline?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  syncedLabel?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  exportLabel?: string;
  onCreate?: () => void;
  createLabel?: string;
  extraActions?: ReactNode;
}

export function CommonPageHeader({
  overline,
  title,
  subtitle,
  icon: Icon,
  syncedLabel,
  loading,
  onRefresh,
  onExport,
  exportLabel = 'Export',
  onCreate,
  createLabel = 'Add',
  extraActions,
}: CommonPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1 mb-0">
      {/* Left: Overline, Title, Subtitle */}
      <div className="flex flex-col min-w-0">
        {overline && (
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">
            {overline}
          </span>
        )}
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="p-1 rounded-md bg-blue-50 text-blue-600 inline-flex items-center justify-center">
              <Icon size={16} strokeWidth={2.2} />
            </span>
          )}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 font-normal max-w-2xl leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {syncedLabel && (
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block mr-1">
            {syncedLabel}
          </span>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            title="Refresh"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        )}

        {extraActions}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>{exportLabel}</span>
          </button>
        )}

        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.4} />
            <span>{createLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Common Filter Bar (Matching Image Filter Bar)
 * ───────────────────────────────────────────────────────────── */

export interface FilterTabOption {
  id: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

export interface FilterDropdownOption {
  id: string;
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; count?: number }[];
}

export interface DateFilterProps {
  dateLabel?: string;
  preset?: string;
  onPresetChange?: (preset: string) => void;
  from?: string;
  onFromChange?: (from: string) => void;
  to?: string;
  onToChange?: (to: string) => void;
  presets?: { value: string; label: string }[];
}

export interface CommonFilterBarProps {
  tabs?: FilterTabOption[];
  dropdowns?: FilterDropdownOption[];
  dateFilter?: DateFilterProps;
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function CommonFilterBar({
  tabs = [],
  dropdowns = [],
  dateFilter,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onReset,
  hasActiveFilters = false,
  className = '',
}: CommonFilterBarProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white border-b border-slate-100',
        className,
      )}
    >
      {/* Optional Filter Tabs (if provided) */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={cx(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                tab.active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cx(
                    'px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors',
                    tab.active ? 'bg-blue-600/10 text-blue-700' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search Input */}
      {onSearchChange !== undefined && (
        <div className="relative flex items-center min-w-[200px] max-w-[260px] flex-1 sm:flex-initial">
          <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
          />
        </div>
      )}

      {/* Dropdowns, Date Range & Reset Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {dropdowns.map((d) => (
          <div key={d.id} className="shrink-0">
            <SearchableSelect
              size="sm"
              variant="default"
              value={d.value}
              onChange={d.onChange}
              placeholder={d.allLabel}
              searchPlaceholder={`Filter ${d.label.toLowerCase()}...`}
              aria-label={d.label}
              options={[
                { value: '', label: d.allLabel },
                ...d.options.map((o) => ({
                  value: o.value,
                  label: o.count !== undefined ? `${o.label} (${o.count})` : o.label,
                })),
              ]}
            />
          </div>
        ))}

        {/* Date Filter */}
        {dateFilter && (
          <>
            {dateFilter.presets && dateFilter.onPresetChange && (
              <div className="shrink-0">
                <SearchableSelect
                  size="sm"
                  variant="default"
                  aria-label="Time range"
                  value={dateFilter.preset ?? 'any'}
                  onChange={dateFilter.onPresetChange}
                  placeholder="Time range"
                  searchable={false}
                  options={dateFilter.presets}
                />
              </div>
            )}
            {dateFilter.onFromChange && dateFilter.onToChange && (
              <div className="ui-daterange flex items-center gap-1 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs shrink-0">
                <span className="text-slate-400 font-medium text-[11px] select-none">
                  {dateFilter.dateLabel ?? 'Date'}
                </span>
                <input
                  type="date"
                  value={dateFilter.from ?? ''}
                  max={dateFilter.to || undefined}
                  onChange={(e) => dateFilter.onFromChange?.(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="date"
                  value={dateFilter.to ?? ''}
                  min={dateFilter.from || undefined}
                  onChange={(e) => dateFilter.onToChange?.(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
                />
              </div>
            )}
          </>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={cx(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs cursor-pointer',
              hasActiveFilters
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60',
            )}
            title="Reset all filters"
          >
            <span>Reset</span>
            <X size={12} className="text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Status Pill with Dot (Matching Image Status Column)
 * ───────────────────────────────────────────────────────────── */

export type StatusTone = 'green' | 'blue' | 'gray' | 'red' | 'amber';

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  active?: boolean;
  className?: string;
}

export function StatusPill({ label, tone, active, className }: StatusPillProps) {
  // Infer tone if not explicitly passed
  let resolvedTone: StatusTone = tone ?? 'gray';
  if (!tone) {
    if (active === true || /active|completed|operational|verified|paid/i.test(label)) {
      resolvedTone = 'green';
    } else if (/follow-up|follow up|pending|in progress|ongoing/i.test(label)) {
      resolvedTone = 'blue';
    } else if (/discharged|inactive|suspended|cancelled|closed/i.test(label)) {
      resolvedTone = 'gray';
    } else if (/urgent|critical|danger|error|failed/i.test(label)) {
      resolvedTone = 'red';
    }
  }

  const toneConfig: Record<StatusTone, { pill: string; dot: string }> = {
    green: {
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
      dot: 'bg-emerald-500',
    },
    blue: {
      pill: 'bg-sky-50 text-sky-700 border-sky-100/50',
      dot: 'bg-sky-500',
    },
    gray: {
      pill: 'bg-slate-100 text-slate-600 border-slate-200/50',
      dot: 'bg-slate-400',
    },
    red: {
      pill: 'bg-rose-50 text-rose-700 border-rose-100/50',
      dot: 'bg-rose-500',
    },
    amber: {
      pill: 'bg-amber-50 text-amber-700 border-amber-100/50',
      dot: 'bg-amber-500',
    },
  };

  const current = toneConfig[resolvedTone];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors select-none',
        current.pill,
        className,
      )}
    >
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />
      <span>{label}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Initials Avatar & Primary Entity Cell
 * ───────────────────────────────────────────────────────────── */

export function PrimaryAvatarCell({
  name,
  sub,
  avatarSrc,
  onOpen,
}: {
  name: string;
  sub?: ReactNode;
  avatarSrc?: string | null | undefined;
  onOpen?: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarSrc]);

  const cleanSrc =
    typeof avatarSrc === 'string' &&
    avatarSrc.trim().length > 0 &&
    avatarSrc.trim() !== 'null' &&
    avatarSrc.trim() !== 'undefined'
      ? avatarSrc.trim()
      : null;

  const showImage = cleanSrc && !hasError;
  const firstLetter = (name || '').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="flex items-center gap-2.5 min-w-[160px] text-left">
      {showImage ? (
        <img
          src={cleanSrc}
          alt=""
          onError={() => setHasError(true)}
          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100"
        />
      ) : (
        <span
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-semibold text-[11px] border border-slate-200/70 select-none uppercase"
          style={{
            background: '#f1f5f9',
            color: '#334155',
          }}
          aria-hidden="true"
        >
          {firstLetter}
        </span>
      )}
      <div className="flex flex-col min-w-0">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-left font-semibold text-xs text-slate-900 hover:text-blue-600 transition-colors truncate cursor-pointer leading-tight"
          >
            {name}
          </button>
        ) : (
          <span className="font-semibold text-xs text-slate-900 truncate leading-tight">{name}</span>
        )}
        {sub && <span className="text-[11px] text-slate-500 truncate mt-0.5 leading-none">{sub}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Common Table (Matching Image Table Styling)
 * ───────────────────────────────────────────────────────────── */

export interface CommonTableColumn<T> {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  sort?: (item: T) => string | number;
  width?: number | string;
}

export interface CommonTableProps<T extends { id: string }> {
  columns: CommonTableColumn<T>[];
  data: T[];
  loading?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  rowActions?: (item: T) => ReactNode;
  emptyState?: ReactNode;
  sort?: { id: string; dir: 'asc' | 'desc' } | null;
  onSortChange?: (id: string) => void;
}

export function CommonTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  selected = new Set(),
  onToggleSelect,
  onToggleAll,
  onRowClick,
  onEdit,
  onDelete,
  rowActions,
  emptyState,
  sort,
  onSortChange,
}: CommonTableProps<T>) {
  const allSelected = data.length > 0 && data.every((d) => selected.has(d.id));
  const someSelected = data.some((d) => selected.has(d.id));

  return (
    <div className="overflow-x-auto min-h-[300px] bg-white border border-slate-200/90 rounded-lg shadow-2xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
            {onToggleSelect && (
              <th className="w-9 px-3.5 py-2 select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={onToggleAll}
                  disabled={data.length === 0}
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((c) => {
              const sorted = sort?.id === c.id ? sort.dir : null;
              return (
                <th
                  key={c.id}
                  style={c.width !== undefined ? { width: c.width } : undefined}
                  className="px-3.5 py-2 whitespace-nowrap"
                >
                  {c.sort && onSortChange ? (
                    <button
                      type="button"
                      className={cx(
                        'inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors font-semibold cursor-pointer',
                        sorted && 'text-blue-600',
                      )}
                      onClick={() => onSortChange(c.id)}
                    >
                      <span>{c.header}</span>
                      {sorted === 'asc' && <ArrowUp size={11} />}
                      {sorted === 'desc' && <ArrowDown size={11} />}
                    </button>
                  ) : (
                    <span>{c.header}</span>
                  )}
                </th>
              );
            })}
            <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-xs text-slate-600">
          {loading && data.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {onToggleSelect && (
                  <td className="px-3.5 py-2">
                    <div className="w-3.5 h-3.5 bg-slate-100 rounded" />
                  </td>
                )}
                {columns.map((c, ci) => (
                  <td key={c.id} className="px-3.5 py-2">
                    {ci === 0 ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3 bg-slate-100 rounded w-28" />
                          <div className="h-2 bg-slate-50 rounded w-16" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    )}
                  </td>
                ))}
                <td className="px-3.5 py-2 text-right">
                  <div className="w-4 h-4 bg-slate-100 rounded ml-auto" />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onToggleSelect ? 2 : 1)} className="py-12 text-center">
                {emptyState ?? (
                  <div className="text-slate-400 text-xs font-medium">No records found.</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={cx(
                    'group transition-colors duration-100 hover:bg-slate-50/70',
                    isSel && 'bg-blue-50/40',
                    (onRowClick || onEdit) && 'cursor-pointer',
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input, a, label, select'))
                      return;
                    if (onRowClick) onRowClick(item);
                    else if (onEdit) onEdit(item);
                  }}
                >
                  {onToggleSelect && (
                    <td className="w-9 px-3.5 py-2">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={isSel}
                        onChange={() => onToggleSelect(item.id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.id} className="px-3.5 py-2 align-middle whitespace-nowrap">
                      {c.cell(item)}
                    </td>
                  ))}
                  <td className="px-3.5 py-2 text-right whitespace-nowrap align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {rowActions?.(item)}
                      {!rowActions && onEdit && (
                        <button
                          type="button"
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                          }}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {!rowActions && onDelete && (
                        <button
                          type="button"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item);
                          }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Common Pagination Footer (Matching Image Footer)
 * ───────────────────────────────────────────────────────────── */

export interface CommonPaginationProps {
  total: number;
  startIdx: number;
  endIdx: number;
  nounPlural: string;
  page: number;
  pageCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

export function CommonPagination({
  total,
  startIdx,
  endIdx,
  nounPlural,
  page,
  pageCount,
  perPage,
  onPageChange,
  onPerPageChange,
}: CommonPaginationProps) {
  // Generate page numbers to display
  const pages: (number | string)[] = [];
  if (pageCount <= 5) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(pageCount - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < pageCount - 2) pages.push('...');
    pages.push(pageCount);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-3.5 bg-white border-t border-slate-100 text-xs text-slate-500 w-full">
      {/* Left: Showing count */}
      <div className="text-center sm:text-left w-full sm:w-auto">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {startIdx}–{endIdx}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{total}</span> {nounPlural}
          </>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
        {onPerPageChange && (
          <div className="flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0">
            <span className="text-slate-500">Per page</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cx(
                  'w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-2xs',
                  page === p
                    ? 'border border-slate-200 bg-slate-50 text-slate-900 font-bold'
                    : 'border border-transparent bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-200',
                )}
              >
                {p}
              </button>
            ) : (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                ...
              </span>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Clean CSV Export Helper
 * ───────────────────────────────────────────────────────────── */

export function exportToCSV<T>(
  filename: string,
  rows: T[],
  columns: { header: string; key: keyof T | ((item: T) => unknown) }[],
) {
  if (!rows || rows.length === 0) return;

  const headerRow = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const val =
          typeof col.key === 'function'
            ? col.key(row)
            : (row as Record<string, unknown>)[col.key as string];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
