import { App } from 'antd';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  type LucideIcon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import type { Resource } from '../../hooks/useResource';
import { timeAgo } from '../../lib/format';
import { getErrorMessage } from '../../utils/errors';
import { ConfirmDialog } from './Modal';
import { Alert, Avatar, cx } from './primitives';

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

interface DataViewProps<T extends { id: string }> {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  noun: string;
  nounPlural: string;
  resource: Resource<T>;
  searchPlaceholder: string;
  searchFields: (item: T) => (string | null | undefined)[];
  facets: Facet<T>[];
  /** Date used by the "Any time" preset and the date range. */
  dateOf?: (item: T) => string | null | undefined;
  dateLabel?: string;
  columns: Column<T>[];
  createLabel: string;
  onCreate: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => Promise<unknown>;
  nameOf: (item: T) => string;
  deleteWarning?: string;
  rowActions?: (item: T) => ReactNode;
  /** Makes the whole row clickable (e.g. to open a details drawer). */
  onRowClick?: (item: T) => void;
  /** Highlights the row whose details are currently open. */
  activeId?: string | null;
}

type TimePreset = 'any' | 'today' | '7' | '30' | '90' | 'year';
const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
];
const PAGE_SIZES = [10, 25, 50, 100];
const SKELETON_ROWS = Array.from({ length: 8 }, (_, i) => i);

function presetStart(preset: TimePreset): number | null {
  const now = new Date();
  switch (preset) {
    case 'any':
      return null;
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    case 'year':
      return new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return now.getTime() - Number(preset) * 86_400_000;
  }
}

function isWide() {
  return typeof window === 'undefined' || window.matchMedia('(min-width: 721px)').matches;
}

export function DataView<T extends { id: string }>(props: DataViewProps<T>) {
  const {
    title,
    subtitle,
    icon: Icon,
    noun,
    nounPlural,
    resource,
    searchPlaceholder,
    searchFields,
    facets,
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
    onRowClick,
    activeId,
  } = props;
  const { items, loading, error, syncedAt, refresh } = resource;
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<TimePreset>('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [panelOpen, setPanelOpen] = useState(isWide);
  const [pendingDelete, setPendingDelete] = useState<T[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
  }, [items, search, filters, facets, preset, from, to, dateOf, searchFields, sort, columns]);

  const activeRules =
    Object.values(filters).filter(Boolean).length +
    (preset !== 'any' ? 1 : 0) +
    (from || to ? 1 : 0);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = filtered.slice(startIdx, startIdx + perPage);

  const setFacet = (id: string, value: string) => {
    setFilters((prev) => ({ ...prev, [id]: prev[id] === value ? '' : value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({});
    setPreset('any');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
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

  /* ── Render ────────────────────────────────────────────── */

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : 'Syncing…';
  const hasData = items.length > 0;
  const colSpan = columns.length + 2;

  return (
    <div className="ui-page">
      <header className="ui-header">
        <div className="ui-header-title">
          <button
            type="button"
            className="ui-header-icon"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label={panelOpen ? 'Hide filters' : 'Show filters'}
            title={panelOpen ? 'Hide filters' : 'Show filters'}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
          <h1>{title}</h1>
          <span className="ui-header-sub">{subtitle}</span>
        </div>

        <div className="ui-header-actions">
          <span className="ui-synced">{syncedLabel}</span>
          <button
            type="button"
            className="ui-icon-btn is-bordered"
            onClick={() => {
              void refresh();
            }}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} />
          </button>
          <div className="ui-search">
            <Search size={15} />
            <input
              className="ui-input"
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label={`Search ${nounPlural}`}
            />
          </div>
          <button
            type="button"
            className={cx('ui-btn', activeRules > 0 && 'ui-btn-soft')}
            onClick={() => setPanelOpen((o) => !o)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeRules > 0 && <span className="ui-btn-count">{activeRules}</span>}
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={onCreate}>
            <Plus size={16} strokeWidth={2.4} />
            {createLabel}
          </button>
        </div>
      </header>

      <div className={cx('ui-workspace', !panelOpen && 'is-panel-hidden')}>
        {/* ── Filter panel ── */}
        <aside className="ui-card ui-panel" aria-label="Filters">
          <div className="ui-panel-head">
            <span className="ui-eyebrow">Filters</span>
            <button
              type="button"
              className="ui-icon-btn"
              onClick={clearAll}
              aria-label="Reset filters"
              title="Reset filters"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="ui-panel-body">
            <button
              type="button"
              className={cx('ui-panel-all', activeRules === 0 && 'is-active')}
              onClick={clearAll}
            >
              <span>All {nounPlural}</span>
              <span className="ui-count">{items.length}</span>
            </button>

            {facetOptions
              .filter(({ facet }) => facet.inPanel !== false)
              .map(({ facet, options, total }) => {
                const isCollapsed = collapsed.has(facet.id);
                return (
                  <div className="ui-group" key={facet.id}>
                    <button
                      type="button"
                      className={cx('ui-group-head', isCollapsed && 'is-collapsed')}
                      aria-expanded={!isCollapsed}
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(facet.id)) next.delete(facet.id);
                          else next.add(facet.id);
                          return next;
                        })
                      }
                    >
                      <ChevronDown size={15} />
                      <span className="ui-group-name">{facet.label}</span>
                      <span className="ui-count">{total}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="ui-group-items">
                        {options.length === 0 && (
                          <div className="ui-group-empty">Nothing here yet</div>
                        )}
                        {options.map((o) => {
                          const active = filters[facet.id] === o.value;
                          return (
                            <button
                              type="button"
                              key={o.value}
                              className={cx('ui-group-item', active && 'is-active')}
                              aria-pressed={active}
                              onClick={() => setFacet(facet.id, o.value)}
                            >
                              <span className="ui-group-item-label">{o.label}</span>
                              <span className="ui-count">{o.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="ui-panel-foot">
            <span>
              {activeRules} rule{activeRules === 1 ? '' : 's'} applied
            </span>
            <button
              type="button"
              className="ui-btn ui-btn-sm"
              onClick={clearAll}
              disabled={activeRules === 0}
            >
              Clear
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <section className="ui-content">
          {error && <Alert>{error}</Alert>}

          <div className="ui-card ui-filterbar">
            {facetOptions.map(({ facet, options }) => (
              <select
                key={facet.id}
                className={cx('ui-select', filters[facet.id] && 'is-set')}
                value={filters[facet.id] ?? ''}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, [facet.id]: e.target.value }));
                  setPage(1);
                }}
                aria-label={facet.label}
              >
                <option value="">{facet.allLabel}</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ))}
            {dateOf && (
              <>
                <select
                  className={cx('ui-select', preset !== 'any' && 'is-set')}
                  value={preset}
                  onChange={(e) => {
                    setPreset(e.target.value as TimePreset);
                    setPage(1);
                  }}
                  aria-label="Time range"
                >
                  {TIME_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value === 'any' ? p.label : `${dateLabel} · ${p.label.toLowerCase()}`}
                    </option>
                  ))}
                </select>
                <div className="ui-daterange">
                  <span>{dateLabel}</span>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    aria-label={`${dateLabel} from`}
                  />
                  <ArrowRight size={13} />
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    aria-label={`${dateLabel} to`}
                  />
                </div>
              </>
            )}
          </div>

          <div className="ui-card ui-table-card">
            <div className="ui-table-scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="ui-col-check">
                      <input
                        type="checkbox"
                        className="ui-checkbox"
                        checked={pageAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !pageAllSelected && pageSomeSelected;
                        }}
                        onChange={togglePage}
                        aria-label="Select all on this page"
                        disabled={pageRows.length === 0}
                      />
                    </th>
                    {columns.map((c) => {
                      const sorted = sort?.id === c.id ? sort.dir : null;
                      return (
                        <th
                          key={c.id}
                          style={c.width !== undefined ? { width: c.width } : undefined}
                        >
                          {c.sort ? (
                            <button
                              type="button"
                              className={cx('ui-th-sort', sorted && 'is-sorted')}
                              onClick={() => toggleSort(c.id)}
                            >
                              {c.header}
                              {sorted === 'asc' && <ArrowUp size={12} />}
                              {sorted === 'desc' && <ArrowDown size={12} />}
                            </button>
                          ) : (
                            c.header
                          )}
                        </th>
                      );
                    })}
                    <th className="ui-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !hasData ? (
                    SKELETON_ROWS.map((i) => (
                      <tr key={i}>
                        <td className="ui-col-check">
                          <span className="ui-skeleton" style={{ width: 14, height: 14 }} />
                        </td>
                        {columns.map((c, ci) => (
                          <td key={c.id}>
                            {ci === 0 ? (
                              <div className="ui-primary-cell">
                                <span
                                  className="ui-skeleton"
                                  style={{ width: 36, height: 36, borderRadius: '50%' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <span
                                    className="ui-skeleton"
                                    style={{ width: '60%', marginBottom: 7 }}
                                  />
                                  <span
                                    className="ui-skeleton"
                                    style={{ width: '40%', height: 8 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span
                                className="ui-skeleton"
                                style={{ width: `${50 + ((i * 7 + ci * 13) % 40)}%` }}
                              />
                            )}
                          </td>
                        ))}
                        <td />
                      </tr>
                    ))
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} style={{ height: 'auto' }}>
                        <div className="ui-table-empty">
                          <div className="ui-table-empty-icon">
                            {hasData ? <SearchX size={20} /> : <Icon size={20} />}
                          </div>
                          <strong>
                            {hasData ? 'No matching ' + nounPlural : `No ${nounPlural} yet`}
                          </strong>
                          <span>
                            {hasData
                              ? 'Try a different search or remove a filter.'
                              : `Create your first ${noun} to get started.`}
                          </span>
                          <div style={{ marginTop: 8 }}>
                            {hasData ? (
                              <button type="button" className="ui-btn" onClick={clearAll}>
                                Clear filters
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ui-btn ui-btn-primary"
                                onClick={onCreate}
                              >
                                <Plus size={16} /> {createLabel}
                              </button>
                            )}
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
                            isSel && 'is-selected',
                            onRowClick && 'is-clickable',
                            activeId === item.id && 'is-open',
                          )}
                          onClick={
                            onRowClick
                              ? (e) => {
                                  // Checkboxes, buttons and links inside the row keep their own behaviour.
                                  if ((e.target as HTMLElement).closest('button, input, a, label'))
                                    return;
                                  onRowClick(item);
                                }
                              : undefined
                          }
                        >
                          <td className="ui-col-check">
                            <input
                              type="checkbox"
                              className="ui-checkbox"
                              checked={isSel}
                              onChange={() => toggleRow(item.id)}
                              aria-label={`Select ${nameOf(item)}`}
                            />
                          </td>
                          {columns.map((c) => (
                            <td key={c.id}>{c.cell(item)}</td>
                          ))}
                          <td className="ui-col-actions">
                            <div className="ui-row-actions">
                              {rowActions?.(item)}
                              <button
                                type="button"
                                className="ui-icon-btn"
                                onClick={() => onEdit(item)}
                                aria-label={`Edit ${nameOf(item)}`}
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="ui-icon-btn is-danger"
                                onClick={() => setPendingDelete([item])}
                                aria-label={`Delete ${nameOf(item)}`}
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {selectedItems.length > 0 && (
              <div className="ui-bulkbar" role="toolbar" aria-label="Bulk actions">
                <span>
                  <strong>{selectedItems.length}</strong> selected
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-sm is-danger"
                  onClick={() => setPendingDelete(selectedItems)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="ui-footer">
        <span>
          {filtered.length === 0 ? (
            'No results'
          ) : (
            <>
              Showing{' '}
              <strong>
                {startIdx + 1}–{startIdx + pageRows.length}
              </strong>{' '}
              of <strong>{filtered.length}</strong>
              {filtered.length !== items.length && <> (filtered from {items.length})</>}
            </>
          )}
        </span>
        <div className="ui-pager">
          <span>Per page</span>
          <select
            className="ui-select"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ui-btn ui-btn-sm"
            onClick={() => setPage(1)}
            disabled={current === 1}
          >
            « First
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-sm"
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
          >
            ‹ Prev
          </button>
          <span className="ui-pager-page">
            Page {current} of {pageCount}
          </span>
          <button
            type="button"
            className="ui-btn ui-btn-sm"
            onClick={() => setPage(current + 1)}
            disabled={current === pageCount}
          >
            Next ›
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-sm"
            onClick={() => setPage(pageCount)}
            disabled={current === pageCount}
          >
            Last »
          </button>
        </div>
      </footer>

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
                <strong>{nameOf(pendingDelete[0])}</strong> will be permanently removed.
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
  onOpen: () => void;
}) {
  return (
    <div className="ui-primary-cell">
      <Avatar name={name} src={avatarSrc} />
      <div style={{ minWidth: 0 }}>
        <button type="button" className="ui-link ui-cell-title" onClick={onOpen}>
          {name}
        </button>
        {sub && <div className="ui-cell-sub">{sub}</div>}
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
