import { App } from 'antd';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ListFilter,
  type LucideIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import type { Resource } from '../../hooks/useResource';
import { timeAgo } from '../../lib/format';
import { getErrorMessage } from '../../utils/errors';
import { usePermission } from '../../context/PermissionContext';
import { CommonPagination, exportToCSV, PrimaryAvatarCell } from './CommonTable';
import { ConfirmDialog } from './Modal';
import { Alert, cx } from './primitives';
import { SearchableSelect } from './SearchableSelect';

/** A dimension the list can be sliced by: shown in the left panel and the filter bar. */
export interface Facet<T> {
  id: string;
  /** Group heading in the panel, e.g. "Hospitals". */
  label: string;
  /** Placeholder option in the filter bar, e.g. "All hospitals". */
  allLabel: string;
  value: (item: T) => string | null | undefined;
  optionLabel?: (value: string) => string;
  /** Fixed option order (e.g. Active before Inactive). Defaults to count, descending. */
  order?: readonly string[];
  /** 'value-desc' sorts by raw value, newest first - for YYYY-MM month buckets. */
  sortBy?: 'count' | 'value-desc';
  /** Set false to keep a facet out of the left panel (filter bar only). */
  inPanel?: boolean;
}

export interface Column<T> {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  sort?: (item: T) => string | number;
  width?: number | string;
}

export interface DataViewTab {
  id: string;
  label: string;
  count?: number;
}

export interface DataViewProps<T extends { id: string }> {
  overline?: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  noun: string;
  nounPlural: string;
  resource: Resource<T>;
  searchPlaceholder: string;
  searchFields: (item: T) => (string | null | undefined)[];
  facets: Facet<T>[];
  /** Optional quick filter tabs (e.g. All, Placed, Processing, Delivered) */
  tabs?: DataViewTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabFilter?: (item: T, activeTab: string) => boolean;
  /** Date used by the "Any time" preset and the date range. */
  dateOf?: (item: T) => string | null | undefined;
  dateLabel?: string;
  columns: Column<T>[];
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => Promise<unknown>;
  nameOf?: (item: T) => string;
  deleteWarning?: string;
  rowActions?: (item: T) => ReactNode;
  /** Keep default edit and delete actions visible even when rowActions is provided. */
  keepDefaultActions?: boolean;
  /** Makes the whole row clickable (e.g. to open a details drawer). */
  onRowClick?: (item: T) => void;
  /** Highlights the row whose details are currently open. */
  activeId?: string | null;
  /** Optional extra action buttons (e.g. Import Excel, Export Template) */
  extraActions?: ReactNode;
  /** RBAC module slug */
  moduleSlug?: string;
  fallbackSlugs?: string[];
  /** Explicit RBAC permission overrides */
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  /** Optional custom export action or label */
  onExport?: () => void;
  exportLabel?: string;
  /** Optional minimum table width (e.g. 720) to prevent column crunching on small screens */
  minTableWidth?: number | string | undefined;
  /** Optional custom mobile card renderer for row items */
  renderMobileCard?: (
    item: T,
    helpers: {
      isSel: boolean;
      toggleRow: () => void;
      onEdit?: (() => void) | undefined;
      onDelete?: (() => void) | undefined;
      isUpdateAllowed: boolean;
      isDeleteAllowed: boolean;
      showCheckCol: boolean;
    },
  ) => ReactNode;
}

type TimePreset = 'any' | 'today' | '7' | '30' | '90' | 'year' | 'custom';
const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range…' },
];
const SKELETON_ROWS = Array.from({ length: 7 }, (_, i) => i);

function presetStart(preset: TimePreset): number | null {
  const now = new Date();
  switch (preset) {
    case 'any':
    case 'custom':
      return null;
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    case 'year':
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return now.getTime() - Number(preset) * 86_400_000;
  }
}

export function DataView<T extends { id: string }>(props: DataViewProps<T>) {
  const {
    overline,
    title,
    subtitle,
    icon: Icon,
    noun,
    nounPlural,
    resource,
    searchPlaceholder,
    searchFields,
    facets,
    tabs,
    activeTab,
    onTabChange,
    tabFilter,
    dateOf,
    dateLabel = 'Added',
    columns,
    createLabel,
    onCreate,
    onEdit,
    onDelete,
    nameOf,
    deleteWarning,
    rowActions,
    keepDefaultActions,
    onRowClick,
    activeId,
    extraActions,
    moduleSlug,
    fallbackSlugs,
    canCreate: propCanCreate,
    canUpdate: propCanUpdate,
    canDelete: propCanDelete,
    onExport,
    exportLabel = 'Export',
    minTableWidth,
    renderMobileCard,
  } = props;
  const { items, loading, error, syncedAt, refresh } = resource;
  const { message } = App.useApp();

  const { canCreate: permCanCreate, canUpdate: permCanUpdate, canDelete: permCanDelete } = usePermission();

  const isCreateAllowed =
    propCanCreate !== undefined
      ? propCanCreate
      : moduleSlug
        ? permCanCreate(moduleSlug, fallbackSlugs)
        : true;

  const isUpdateAllowed =
    propCanUpdate !== undefined
      ? propCanUpdate
      : moduleSlug
        ? permCanUpdate(moduleSlug, fallbackSlugs)
        : true;

  const isDeleteAllowed =
    propCanDelete !== undefined
      ? propCanDelete
      : moduleSlug
        ? permCanDelete(moduleSlug, fallbackSlugs)
        : true;

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<TimePreset>('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<T[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keeps "Last synced 2 minutes ago" honest without a refetch.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  /* ── Filtering ─────────────────────────────────────────── */

  const facetOptions = useMemo(
    () =>
      facets.map((facet) => {
        const counts = new Map<string, number>();
        for (const item of items) {
          const v = facet.value(item);
          if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        let options = [...counts.entries()].map(([value, count]) => ({
          value,
          count,
          label: facet.optionLabel ? facet.optionLabel(value) : value,
        }));
        if (facet.order) {
          const order = facet.order;
          options.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
        } else if (facet.sortBy === 'value-desc') {
          options.sort((a, b) => b.value.localeCompare(a.value));
        } else {
          options = options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        }
        const total = options.reduce((sum, o) => sum + o.count, 0);
        return { facet, options, total };
      }),
    [facets, items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = presetStart(preset);
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

    const rows = items.filter((item) => {
      if (tabFilter && activeTab && activeTab !== 'ALL' && activeTab !== 'all') {
        if (!tabFilter(item, activeTab)) return false;
      }
      if (q && !searchFields(item).some((f) => f?.toLowerCase().includes(q))) return false;
      for (const facet of facets) {
        const want = filters[facet.id];
        if (want && facet.value(item) !== want) return false;
      }
      if (dateOf && (start !== null || fromTime !== null || toTime !== null)) {
        const raw = dateOf(item);
        const t = raw ? new Date(raw).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (start !== null && t < start) return false;
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
      }
      return true;
    });

    const col = sort && columns.find((c) => c.id === sort.id);
    if (col?.sort && sort) {
      const key = col.sort;
      const dir = sort.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    return rows;
  }, [items, search, filters, facets, preset, from, to, dateOf, searchFields, sort, columns, tabFilter, activeTab]);

  const activeRules =
    Object.values(filters).filter(Boolean).length +
    (preset !== 'any' ? 1 : 0) +
    (from || to ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (activeTab && activeTab !== 'ALL' && activeTab !== 'all' ? 1 : 0);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = filtered.slice(startIdx, startIdx + perPage);

  const clearAll = () => {
    setFilters({});
    setPreset('any');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
    if (onTabChange && activeTab) {
      onTabChange('ALL');
    }
  };

  const toggleSort = (id: string) => {
    setSort((prev) => {
      if (prev?.id !== id) return { id, dir: 'asc' };
      if (prev.dir === 'asc') return { id, dir: 'desc' };
      return null;
    });
  };

  /* ── Selection & delete ────────────────────────────────── */

  const selectedItems = items.filter((i) => selected.has(i.id));
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const pageSomeSelected = pageRows.some((r) => selected.has(r.id));

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (pageAllSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runDelete = async (targets: T[]) => {
    if (!onDelete) return;
    const results = await Promise.allSettled(targets.map((t) => onDelete(t)));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const done = targets.length - failed.length;

    if (done > 0) {
      void message.success(
        done === 1 ? `${capitalize(noun)} deleted` : `${done} ${nounPlural} deleted`,
      );
    }
    if (failed[0]) {
      void message.error(getErrorMessage(failed[0].reason, `Failed to delete ${noun}.`));
    }
    setSelected(new Set());
    setPendingDelete(null);
    await refresh();
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    // Default CSV export of current filtered rows
    const colsToExport = columns.map((c) => ({
      header: c.header,
      key: (item: T) => {
        const val = (item as Record<string, unknown>)[c.id];
        return val !== undefined && val !== null ? String(val) : '';
      },
    }));
    exportToCSV(nounPlural, filtered, colsToExport);
    void message.success(`Exported ${filtered.length} ${nounPlural} to CSV`);
  };

  /* ── Render ────────────────────────────────────────────── */

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : 'Syncing…';
  const hasData = items.length > 0;
  const showCheckCol = isDeleteAllowed && Boolean(onDelete);
  const showActionsCol =
    Boolean(rowActions) ||
    (Boolean(onEdit) && isUpdateAllowed) ||
    (Boolean(onDelete) && isDeleteAllowed);
  const colSpan = columns.length + (showCheckCol ? 1 : 0) + (showActionsCol ? 1 : 0);

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          {overline && (
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">
              {overline}
            </span>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">{subtitle}</p>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {syncedLabel && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block mr-1">
              {syncedLabel}
            </span>
          )}

          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 sm:w-7.5 sm:h-7.5 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            onClick={() => {
              void refresh();
            }}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {extraActions}

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={handleExport}
          >
            <FileSpreadsheet size={13} className="text-slate-500" />
            <span>{exportLabel}</span>
          </button>

          {onCreate && isCreateAllowed && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              onClick={onCreate}
            >
              <Plus size={13} strokeWidth={2.4} />
              <span>{createLabel || 'Create'}</span>
            </button>
          )}
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

     
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* ── Optional Quick Filter Tabs Row ── */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-3.5 py-1.5 border-b border-slate-100 bg-slate-50/60 flex-nowrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onTabChange?.(tab.id);
                    setPage(1);
                  }}
                  className={cx(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                    isActive
                      ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cx(
                        'px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors',
                        isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Filter Bar Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-3.5 py-2.5 border-b border-slate-100 bg-white">
          {/* Top row on mobile / Left on desktop: Search Input + Mobile Filter Accordion Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[190px] max-w-full sm:max-w-xs shrink-0">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                aria-label={`Search ${nounPlural}`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
                ⌘K
              </span>
            </div>

            {/* Mobile Filter Accordion Toggle Button (sm:hidden) */}
            {(facetOptions.length > 0 || dateOf) && (
              <button
                type="button"
                onClick={() => setIsFilterAccordionOpen((prev) => !prev)}
                className={cx(
                  'sm:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs',
                  isFilterAccordionOpen
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : (Object.values(filters).filter(Boolean).length + (preset !== 'any' ? 1 : 0) + (from || to ? 1 : 0)) > 0
                      ? 'border-blue-200 bg-blue-50/70 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                aria-expanded={isFilterAccordionOpen}
                aria-label="Toggle filters"
                data-testid="filter-accordion-toggle"
              >
                <ListFilter
                  size={13}
                  className={
                    (Object.values(filters).filter(Boolean).length + (preset !== 'any' ? 1 : 0) + (from || to ? 1 : 0)) > 0
                      ? 'text-blue-600'
                      : 'text-slate-500'
                  }
                />
                <span>Filters</span>
                {(Object.values(filters).filter(Boolean).length + (preset !== 'any' ? 1 : 0) + (from || to ? 1 : 0)) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white leading-none">
                    {Object.values(filters).filter(Boolean).length + (preset !== 'any' ? 1 : 0) + (from || to ? 1 : 0)}
                  </span>
                )}
                {isFilterAccordionOpen ? (
                  <ChevronUp size={13} className="text-slate-500" />
                ) : (
                  <ChevronDown size={13} className="text-slate-500" />
                )}
              </button>
            )}

            {/* Mobile View Switcher (Cards / Table) if renderMobileCard is provided */}
            {renderMobileCard && (
              <div
                className="sm:hidden inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shrink-0 shadow-2xs"
                role="group"
                aria-label="View presentation"
                data-testid="data-view-mobile-switcher"
              >
                <button
                  type="button"
                  onClick={() => setMobileViewMode('card')}
                  className={cx(
                    'px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    mobileViewMode === 'card'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                  aria-pressed={mobileViewMode === 'card'}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={cx(
                    'px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    mobileViewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                  aria-pressed={mobileViewMode === 'table'}
                >
                  Table
                </button>
              </div>
            )}
          </div>

          {/* Filter Facets Container:
              On desktop (sm+): Always flex inline
              On mobile (<sm): Accordion dropdown (hidden sm:flex when collapsed, flex flex-col sm:flex-row when expanded)
          */}
          <div
            className={cx(
              'items-center gap-2 flex-wrap w-full sm:w-auto transition-all duration-200',
              isFilterAccordionOpen
                ? 'flex flex-col sm:flex-row items-stretch sm:items-center pt-2 sm:pt-0 border-t border-slate-100 sm:border-0'
                : 'hidden sm:flex',
            )}
            data-testid="data-view-filter-content"
          >
            {/* Facets */}
            {facetOptions.map(({ facet, options }) => (
              <div key={facet.id} className="shrink-0 w-full sm:w-auto sm:flex-initial min-w-[125px] sm:min-w-0">
                <SearchableSelect
                  size="sm"
                  variant="default"
                  aria-label={facet.label}
                  value={filters[facet.id] ?? ''}
                  onChange={(val) => {
                    setFilters((prev) => ({ ...prev, [facet.id]: val }));
                    setPage(1);
                  }}
                  placeholder={facet.allLabel}
                  searchPlaceholder={`Filter ${facet.label.toLowerCase()}...`}
                  options={[
                    { value: '', label: facet.allLabel },
                    ...options.map((o) => ({
                      value: o.value,
                      label: `${o.label} (${o.count})`,
                    })),
                  ]}
                />
              </div>
            ))}

            {/* Date Range if configured */}
            {dateOf && (
              <>
                <div className="shrink-0 w-full sm:w-auto sm:flex-initial min-w-[125px] sm:min-w-0">
                  <SearchableSelect
                    size="sm"
                    variant="default"
                    aria-label="Time range"
                    value={preset}
                    onChange={(val) => {
                      setPreset(val as TimePreset);
                      setPage(1);
                    }}
                    placeholder="Time range"
                    searchable={false}
                    options={TIME_PRESETS.map((p) => ({
                      value: p.value,
                      label: p.value === 'any' ? p.label : `${dateLabel} · ${p.label.toLowerCase()}`,
                    }))}
                  />
                </div>

                <div className="ui-daterange flex items-center justify-between sm:justify-start gap-1 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs shrink-0 max-w-full overflow-x-auto">
                  <span className="text-slate-400 font-medium text-[11px] select-none">{dateLabel}</span>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    aria-label={`${dateLabel} from`}
                    className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
                  />
                  <ArrowRight size={11} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    aria-label={`${dateLabel} to`}
                    className="bg-transparent text-xs text-slate-700 outline-none w-20 cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* Reset Button (Matching Image Reset X) */}
            <button
              type="button"
              onClick={clearAll}
              disabled={activeRules === 0}
              className={cx(
                'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs cursor-pointer shrink-0 w-full sm:w-auto',
                activeRules > 0
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60',
              )}
              title="Reset all filters"
            >
              <span>Reset</span>
              <X size={12} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* ── Mobile Cards Section ── */}
        {renderMobileCard && (
          <div
            className={cx(
              'sm:hidden p-2.5 sm:p-3 space-y-2.5 bg-slate-50/50 min-h-[220px]',
              mobileViewMode === 'table' && 'hidden',
            )}
            data-testid="data-view-mobile-cards"
          >
            {loading && !hasData ? (
              SKELETON_ROWS.slice(0, 4).map((i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                  <div className="h-3 bg-slate-50 rounded w-48" />
                  <div className="h-3 bg-slate-50 rounded w-40" />
                </div>
              ))
            ) : pageRows.length === 0 ? (
              <div className="py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                    {hasData ? <SearchX size={22} /> : <Icon size={22} />}
                  </div>
                  <strong className="text-xs font-semibold text-slate-700">
                    {hasData ? `No matching ${nounPlural}` : `No ${nounPlural} yet`}
                  </strong>
                  <span className="text-[11px] text-slate-500 max-w-sm">
                    {hasData
                      ? 'Try a different search term or remove filters.'
                      : isCreateAllowed
                        ? `Create your first ${noun} to get started.`
                        : `No ${nounPlural} available.`}
                  </span>
                  <div className="mt-1.5">
                    {hasData ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        onClick={clearAll}
                      >
                        Clear filters
                      </button>
                    ) : onCreate && isCreateAllowed ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
                        onClick={onCreate}
                      >
                        <Plus size={13} /> {createLabel || 'Create'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              pageRows.map((item) =>
                renderMobileCard(item, {
                  isSel: selected.has(item.id),
                  toggleRow: () => toggleRow(item.id),
                  onEdit: onEdit ? () => onEdit(item) : undefined,
                  onDelete: onDelete ? () => setPendingDelete([item]) : undefined,
                  isUpdateAllowed,
                  isDeleteAllowed,
                  showCheckCol,
                }),
              )
            )}
          </div>
        )}

        {/* ── Table Section ── */}
        <div
          className={cx(
            'overflow-auto min-h-[300px] max-h-[calc(100vh-270px)] no-scrollbar',
            renderMobileCard && mobileViewMode === 'card' && 'hidden sm:block',
          )}
          data-testid="data-view-table-container"
        >
          <table
            className="w-full text-left border-collapse"
            style={minTableWidth !== undefined ? { minWidth: minTableWidth } : undefined}
          >
            <thead className="sticky top-0 z-20 bg-[#f8fafc]">
              <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                {showCheckCol && (
                  <th className="w-9 px-3.5 py-2 select-none sticky top-0 z-20 bg-[#f8fafc]">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={pageAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !pageAllSelected && pageSomeSelected;
                      }}
                      onChange={togglePage}
                      aria-label="Select all on this page"
                      disabled={pageRows.length === 0}
                    />
                  </th>
                )}
                {columns.map((c) => {
                  const sorted = sort?.id === c.id ? sort.dir : null;
                  return (
                    <th
                      key={c.id}
                      style={c.width !== undefined ? { width: c.width } : undefined}
                      className="px-3.5 py-2 whitespace-nowrap sticky top-0 z-20 bg-[#f8fafc]"
                    >
                      {c.sort ? (
                        <button
                          type="button"
                          className={cx(
                            'inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors font-semibold cursor-pointer',
                            sorted && 'text-blue-600',
                          )}
                          onClick={() => toggleSort(c.id)}
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
                {showActionsCol && (
                  <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold sticky top-0 right-0 z-30 bg-[#f8fafc] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-xs text-slate-600">
              {loading && !hasData ? (
                SKELETON_ROWS.map((i) => (
                  <tr key={i} className="animate-pulse">
                    {showCheckCol && (
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
                          <div
                            className="h-3 bg-slate-100 rounded"
                            style={{ width: `${50 + ((i * 7 + ci * 13) % 40)}%` }}
                          />
                        )}
                      </td>
                    ))}
                    {showActionsCol && (
                      <td className="px-3.5 py-2 text-right sticky right-0 z-10 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        <div className="w-4 h-4 bg-slate-100 rounded ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                        {hasData ? <SearchX size={22} /> : <Icon size={22} />}
                      </div>
                      <strong className="text-xs font-semibold text-slate-700">
                        {hasData ? `No matching ${nounPlural}` : `No ${nounPlural} yet`}
                      </strong>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        {hasData
                          ? 'Try a different search term or remove filters.'
                          : isCreateAllowed
                            ? `Create your first ${noun} to get started.`
                            : `No ${nounPlural} available.`}
                      </span>
                      <div className="mt-1.5">
                        {hasData ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            onClick={clearAll}
                          >
                            Clear filters
                          </button>
                        ) : onCreate && isCreateAllowed ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
                            onClick={onCreate}
                          >
                            <Plus size={13} /> {createLabel || 'Create'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((item) => {
                  const isSel = selected.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={cx(
                        'group transition-colors duration-100 hover:bg-slate-50/70',
                        isSel && 'bg-blue-50/40',
                        (onRowClick || (onEdit && isUpdateAllowed)) && 'cursor-pointer',
                        activeId === item.id && 'bg-blue-50/60',
                      )}
                      onClick={(e) => {
                        // Let buttons, links, inputs, and selects handle their own clicks
                        if ((e.target as HTMLElement).closest('button, input, a, label, select'))
                          return;
                        if (onRowClick) {
                          onRowClick(item);
                        } else if (onEdit && isUpdateAllowed) {
                          onEdit(item);
                        }
                      }}
                    >
                      {/* Checkbox */}
                      {showCheckCol && (
                        <td className="w-9 px-3.5 py-2">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isSel}
                            onChange={() => toggleRow(item.id)}
                            aria-label={`Select ${nameOf ? nameOf(item) : noun}`}
                          />
                        </td>
                      )}

                      {/* Data Columns */}
                      {columns.map((c) => (
                        <td key={c.id} className="px-3.5 py-2 align-middle whitespace-nowrap text-xs">
                          {c.cell(item)}
                        </td>
                      ))}

                      {/* Action Buttons */}
                      {showActionsCol && (
                        <td
                          className={cx(
                            'px-3.5 py-2 text-right whitespace-nowrap align-middle sticky right-0 z-10 transition-colors duration-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]',
                            isSel
                              ? 'bg-blue-50/90 group-hover:bg-blue-100/70'
                              : activeId === item.id
                              ? 'bg-blue-50/90 group-hover:bg-blue-100/70'
                              : 'bg-white group-hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {rowActions?.(item)}
                            {(!rowActions || keepDefaultActions) && onEdit && isUpdateAllowed && (
                              <button
                                type="button"
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(item);
                                }}
                                aria-label={`Edit ${nameOf ? nameOf(item) : noun}`}
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {(!rowActions || keepDefaultActions) && onDelete && isDeleteAllowed && (
                              <button
                                type="button"
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDelete([item]);
                                }}
                                aria-label={`Delete ${nameOf ? nameOf(item) : noun}`}
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk Action Bar */}
        {selectedItems.length > 0 && showCheckCol && (
          <div
            className="flex items-center justify-between px-4 py-2 bg-blue-50/80 border-t border-blue-100 text-xs text-blue-900"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                {selectedItems.length}
              </span>
              <span>
                <strong>{selectedItems.length}</strong>{' '}
                {selectedItems.length === 1 ? noun : nounPlural} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </button>
              {onDelete && isDeleteAllowed && (
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  onClick={() => setPendingDelete(selectedItems)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer / Pagination (Matching SupportCenterPage & CommonTable) ── */}
        <CommonPagination
          total={filtered.length}
          startIdx={filtered.length === 0 ? 0 : startIdx + 1}
          endIdx={startIdx + pageRows.length}
          nounPlural={nounPlural}
          page={current}
          pageCount={pageCount}
          perPage={perPage}
          onPageChange={(p) => setPage(p)}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>

      {onDelete && (
        <ConfirmDialog
          open={pendingDelete !== null}
          title={
            pendingDelete && pendingDelete.length > 1
              ? `Delete ${pendingDelete.length} ${nounPlural}?`
              : `Delete ${noun}?`
          }
          message={
            <>
              {pendingDelete?.length === 1 && pendingDelete[0] ? (
                <>
                  <strong>{nameOf ? nameOf(pendingDelete[0]) : noun}</strong> will be permanently removed.
                </>
              ) : (
                <>The selected {nounPlural} will be permanently removed.</>
              )}{' '}
              {deleteWarning ?? 'This cannot be undone.'}
            </>
          }
          onClose={() => setPendingDelete(null)}
          onConfirm={() => (pendingDelete ? runDelete(pendingDelete) : undefined)}
        />
      )}
    </div>
  );
}

/** Avatar + name + secondary line; the name opens the edit dialog. */
export function PrimaryCell({
  name,
  sub,
  avatarSrc,
  onOpen,
}: {
  name: string;
  sub?: ReactNode;
  avatarSrc?: string | null | undefined;
  onOpen?: (() => void) | undefined;
}) {
  return (
    <PrimaryAvatarCell
      name={name}
      {...(sub !== undefined ? { sub } : {})}
      {...(avatarSrc !== undefined ? { avatarSrc } : {})}
      {...(onOpen !== undefined ? { onOpen } : {})}
    />
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
