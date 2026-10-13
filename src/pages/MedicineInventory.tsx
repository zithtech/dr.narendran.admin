import { App } from 'antd';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Layers,
  PackageMinus,
  PackagePlus,
  PackageX,
  Plus,
  RefreshCw,
  Scale,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import MedicineStrengthModal from '../components/MedicineStrengthModal';
import StockAdjustModal from '../components/StockAdjustModal';
import StockHistoryModal from '../components/StockHistoryModal';
import StockInModal from '../components/StockInModal';
import StockOutModal from '../components/StockOutModal';
import PharmacyImportModal from '../components/PharmacyImportModal';
import { downloadSampleTemplate } from '../utils/excelTemplate';
import { Badge } from '../components/ui/primitives';
import type { InventorySummary, MedicineStrength } from '../types/inventory';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { isPercentageDiscount } from '../utils/pricing';

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Ointment',
  'Cream',
  'Gel',
  'Drops',
  'Inhaler',
  'Spray',
  'Powder',
];

export default function MedicineInventory() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';

  // Data state
  const [variants, setVariants] = useState<MedicineStrength[]>([]);
  const [medicinesList, setMedicinesList] = useState<Medicine[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_active_variants: 0,
    in_stock_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_valuation: 0,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearch(q);
    }
  }, [searchParams]);
  const [selectedDosage, setSelectedDosage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [stockTab, setStockTab] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVariants, setTotalVariants] = useState(0);

  // Modals state
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState<MedicineStrength | null>(null);

  // Load summary KPIs
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: InventorySummary }>('inventory/summary');
      if (res.data.data) {
        setSummary(res.data.data);
      }
    } catch {
      // Non-fatal if summary fails
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load master medicines for variant dropdown picker
  const loadMedicines = useCallback(async () => {
    try {
      const res = await api.get<{ medicines?: Medicine[]; data?: Medicine[] } | Medicine[]>(
        'medicines',
        {
          params: { limit: 500, status: 'Active' },
        },
      );
      const data = res.data;
      if (Array.isArray(data)) {
        setMedicinesList(data);
      } else if (Array.isArray(data?.medicines)) {
        setMedicinesList(data.medicines);
      } else if (Array.isArray(data?.data)) {
        setMedicinesList(data.data);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Load strength variants table
  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: 15,
        status: selectedStatus,
      };

      if (search.trim()) params['search'] = search.trim();
      if (selectedDosage) params['dosage_form'] = selectedDosage;
      if (stockTab !== 'ALL') params['stock_status'] = stockTab;

      const res = await api.get<{
        success: boolean;
        items: MedicineStrength[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('medicine-strengths', { params });

      setVariants(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalVariants(res.data.total || 0);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to load medicine inventory.'));
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, search, selectedDosage, stockTab, message]);

  useEffect(() => {
    loadSummary();
    loadMedicines();
  }, [loadSummary, loadMedicines]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const reloadAll = () => {
    loadSummary();
    loadVariants();
  };

  const hasActiveFilters =
    search !== '' || selectedDosage !== '' || selectedStatus !== 'ACTIVE' || stockTab !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setSelectedDosage('');
    setSelectedStatus('ACTIVE');
    setStockTab('ALL');
    setPage(1);
  };

  const getStockStatusBadge = (variant: MedicineStrength) => {
    if (variant.available_quantity === 0) {
      return <Badge tone="red">Out of Stock</Badge>;
    }
    if (variant.available_quantity <= variant.reorder_level) {
      return <Badge tone="amber">Low Stock (≤{variant.reorder_level})</Badge>;
    }
    return <Badge tone="green">In Stock</Badge>;
  };

  return (
    <div className="ui-page">
      {/* Top Header matching Admin App layout */}
      <header className="ui-header">
        <div className="ui-header-title">
          <div className="ui-header-icon">
            <Boxes size={16} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1>Medicine Inventory</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Single Pharmacy
              </span>
            </div>
            <span className="ui-header-sub">
              Manage strength variants, packaging, physical stock balances, dispensing, and movement
              history.
            </span>
          </div>
        </div>

        <div className="ui-header-actions">
          <button
            type="button"
            className="ui-btn"
            onClick={reloadAll}
            disabled={loading || summaryLoading}
            title="Refresh inventory and summary KPIs"
          >
            <RefreshCw size={14} className={loading || summaryLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className="ui-btn"
            onClick={downloadSampleTemplate}
            title="Download multi-variant Excel template"
          >
            <Download size={14} />
            Template
          </button>

          <button
            type="button"
            className="ui-btn"
            onClick={() => setIsImportModalOpen(true)}
            title="Bulk import medicines and strength variants from Excel"
          >
            <FileSpreadsheet size={14} />
            Import Excel
          </button>

          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => {
              setSelectedVariant(null);
              setIsVariantModalOpen(true);
            }}
          >
            <Plus size={15} strokeWidth={2.4} />
            Add Strength Variant
          </button>
        </div>
      </header>

      {/* Main Scrollable Body with consistent horizontal padding */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="ui-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Formulations
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Layers size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.total_active_variants}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Active strength variants</div>
          </div>

          <div
            onClick={() => {
              setStockTab('IN_STOCK');
              setPage(1);
            }}
            className={`ui-card cursor-pointer p-4 transition-all ${stockTab === 'IN_STOCK'
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20'
                : 'hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                In Stock
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.in_stock_count}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Above reorder level</div>
          </div>

          <div
            onClick={() => {
              setStockTab('LOW_STOCK');
              setPage(1);
            }}
            className={`ui-card cursor-pointer p-4 transition-all ${stockTab === 'LOW_STOCK'
                ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 dark:bg-amber-950/20'
                : 'hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Low Stock Alert
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.low_stock_count}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Requires replenishment</div>
          </div>

          <div
            onClick={() => {
              setStockTab('OUT_OF_STOCK');
              setPage(1);
            }}
            className={`ui-card cursor-pointer p-4 transition-all ${stockTab === 'OUT_OF_STOCK'
                ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20 dark:bg-rose-950/20'
                : 'hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Out of Stock
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <PackageX size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
              {summary.out_of_stock_count}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">0 units available</div>
          </div>

          <div className="ui-card col-span-2 p-4 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Valuation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Boxes size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.total_valuation)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Current stock valuation</div>
          </div>
        </div>

        {/* Main Table Card with Integrated Search & Filter Controls */}
        <div className="ui-card overflow-hidden">
          {/* Filter Toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
              {/* Left: Quick stock filter tabs */}
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80">
                {[
                  { id: 'ALL', label: 'All Formulations' },
                  { id: 'LOW_STOCK', label: 'Low Stock' },
                  { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
                  { id: 'IN_STOCK', label: 'In Stock' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStockTab(tab.id as any);
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${stockTab === tab.id
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Right: Search, Dosage filter, Status filter in a single neat row */}
              <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                {/* Search box with standard UI styles */}
                <div className="ui-search" style={{ width: 260 }}>
                  <Search size={14} />
                  <input
                    type="search"
                    className="ui-input"
                    placeholder="Search medicine, code..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                {/* Dosage Form Select */}
                <select
                  className="ui-select"
                  style={{ width: 155 }}
                  value={selectedDosage}
                  onChange={(e) => {
                    setSelectedDosage(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Dosage Forms</option>
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                {/* Status Select */}
                <select
                  className="ui-select"
                  style={{ width: 125 }}
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                  <option value="ALL">All Status</option>
                </select>

                {/* Reset button if any filter applied */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-subtle px-2.5 text-xs"
                    onClick={resetFilters}
                    title="Reset all filters"
                  >
                    <X size={13} />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Variants Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Medicine & Strength</th>
                  <th className="px-4 py-3">Dosage & Packaging</th>
                  <th className="px-4 py-3 text-right">Available Stock</th>
                  {/* <th className="px-4 py-3 text-right">Purchase Price</th> */}
                  <th className="px-4 py-3 text-center">Discount Type</th>
                  <th className="px-4 py-3 text-right">Discount Value</th>
                  <th className="px-4 py-3 text-right">Pricing (MRP / Final)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Inventory Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/60 dark:bg-slate-950">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-indigo-600" />
                      Loading inventory records...
                    </td>
                  </tr>
                ) : variants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <Boxes size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No strength variants found
                      </p>
                      <p className="mt-1 text-xs">
                        {search || selectedDosage || stockTab !== 'ALL'
                          ? 'Try clearing filters or search keywords.'
                          : 'Add your first medicine strength variant to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  variants.map((v) => {
                    const hasStripPack = v.tablets_per_strip && v.tablets_per_strip > 0;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        {/* Medicine & Strength */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {v.medicine_name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {v.strength} {v.strength_unit}
                            </span>
                            {v.generic_name && (
                              <span
                                className="max-w-[160px] truncate text-[11px]"
                                title={v.generic_name}
                              >
                                • {v.generic_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dosage & Packaging */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {v.dosage_form}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {hasStripPack
                              ? `Pack of ${v.tablets_per_strip} units`
                              : 'Single unit item'}
                            {v.variant_code && ` • SKU: ${v.variant_code}`}
                          </div>
                        </td>

                        {/* Available Stock & Breakdown */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {v.available_quantity} units
                            </span>
                            {getStockStatusBadge(v)}
                          </div>
                          {hasStripPack && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {v.strip_count} full strips{' '}
                              {v.loose_tablets ? `+ ${v.loose_tablets} loose` : ''}
                            </div>
                          )}
                        </td>

                        {/* Purchase Price */}
                        {/* <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {v.purchase_price !== null && v.purchase_price !== undefined ? (
                            formatCurrency(v.purchase_price)
                          ) : (
                            <span className="ui-muted">—</span>
                          )}
                        </td> */}

                        {/* Discount Type */}
                        <td className="px-4 py-3 text-center">
                          {v.discount_type ? (
                            <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 uppercase dark:bg-slate-800 dark:text-slate-300">
                              {isPercentageDiscount(v.discount_type) ? 'Percentage' : 'Flat'}
                            </span>
                          ) : (
                            <span className="ui-muted">—</span>
                          )}
                        </td>

                        {/* Discount Value */}
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {v.discount_value !== null &&
                            v.discount_value !== undefined &&
                            Number(v.discount_value) > 0 ? (
                            isPercentageDiscount(v.discount_type) ? (
                              `${v.discount_value}%`
                            ) : (
                              formatCurrency(v.discount_value)
                            )
                          ) : (
                            <span className="ui-muted">—</span>
                          )}
                        </td>

                        {/* Pricing */}
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {v.final_price !== null ? formatCurrency(v.final_price) : '—'}
                          </div>
                          {v.mrp !== null && v.mrp !== v.final_price && (
                            <div className="text-[11px] text-slate-400 line-through">
                              MRP {formatCurrency(v.mrp)}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <Badge tone={v.status === 'ACTIVE' ? 'green' : 'neutral'}>
                            {v.status}
                          </Badge>
                        </td>

                        {/* Inventory Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Stock In */}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                              onClick={() => {
                                setSelectedVariant(v);
                                setIsStockInModalOpen(true);
                              }}
                              title="Receive Stock"
                            >
                              <PackagePlus size={13} />
                              <span>Stock In</span>
                            </button>

                            {/* Stock Out */}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              onClick={() => {
                                setSelectedVariant(v);
                                setIsStockOutModalOpen(true);
                              }}
                              title="Issue / Dispense Stock"
                            >
                              <PackageMinus size={13} />
                              <span>Stock Out</span>
                            </button>

                            {/* Adjust Count */}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              onClick={() => {
                                setSelectedVariant(v);
                                setIsAdjustModalOpen(true);
                              }}
                              title="Reconcile Physical Count"
                            >
                              <Scale size={13} />
                              <span>Adjust</span>
                            </button>

                            {/* History */}
                            <button
                              type="button"
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              onClick={() => {
                                setSelectedVariant(v);
                                setIsHistoryModalOpen(true);
                              }}
                              title="Stock Movement Ledger"
                            >
                              <History size={16} />
                            </button>

                            {/* Edit Variant */}
                            <button
                              type="button"
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              onClick={() => {
                                setSelectedVariant(v);
                                setIsVariantModalOpen(true);
                              }}
                              title="Edit Strength Configuration"
                            >
                              <SlidersHorizontal size={16} />
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-3 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Showing {variants.length} of {totalVariants} formulations (Page {page} of{' '}
                {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ui-btn ui-btn-subtle h-8 px-2.5 text-xs"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-subtle h-8 px-2.5 text-xs"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MedicineStrengthModal
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
        medicinesList={medicinesList}
        onSave={() => {
          message.success(
            selectedVariant
              ? 'Strength variant updated successfully.'
              : 'New strength variant added to catalog.',
          );
          reloadAll();
        }}
      />

      <StockInModal
        isOpen={isStockInModalOpen}
        onClose={() => {
          setIsStockInModalOpen(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
        onSuccess={() => {
          message.success('Stock-in transaction completed and audit ledger updated.');
          reloadAll();
        }}
      />

      <StockOutModal
        isOpen={isStockOutModalOpen}
        onClose={() => {
          setIsStockOutModalOpen(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
        onSuccess={() => {
          message.success('Stock-out operation completed and logged.');
          reloadAll();
        }}
      />

      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
        onSuccess={() => {
          message.success('Physical audit adjustment confirmed and ledger updated.');
          reloadAll();
        }}
      />

      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
      />

      <PharmacyImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          reloadAll();
        }}
      />
    </div>
  );
}
