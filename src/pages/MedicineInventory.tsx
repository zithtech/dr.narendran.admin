import { App } from 'antd';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Layers,
  PackageMinus,
  PackagePlus,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import MedicineInventoryDrawer from '../components/MedicineInventoryDrawer';
import MedicineStrengthModal from '../components/MedicineStrengthModal';
import PharmacyImportModal from '../components/PharmacyImportModal';
import StockAdjustModal from '../components/StockAdjustModal';
import StockHistoryModal from '../components/StockHistoryModal';
import StockInModal from '../components/StockInModal';
import StockOutModal from '../components/StockOutModal';
import { usePermission } from '../context/PermissionContext';
import { CommonPagination } from '../components/ui/CommonTable';
import { Alert, cx, StatusDot } from '../components/ui/primitives';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { timeAgo } from '../lib/format';
import type { InventorySummary, MedicineStrength } from '../types/inventory';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { downloadSampleTemplate } from '../utils/excelTemplate';
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

const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);

export default function MedicineInventory() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canCreate, canUpdate } = usePermission();

  const isInvCreatable = canCreate('INVENTORY');
  const isInvUpdatable = canUpdate('INVENTORY');
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(urlSearch);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearch(q);
    }
  }, [searchParams]);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search (matching Patients page)
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

  // Update relative sync label periodically
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [selectedDosage, setSelectedDosage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [stockTab, setStockTab] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
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
  const [viewingVariant, setViewingVariant] = useState<MedicineStrength | null>(null);

  // Keep viewing variant synced with updated balances or configuration
  const activeViewingVariant = viewingVariant
    ? (variants.find((v) => v.id === viewingVariant.id) ?? viewingVariant)
    : null;

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
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit,
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
      setSyncedAt(Date.now());
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load medicine inventory.');
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedStatus, search, selectedDosage, stockTab, message]);

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
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.2 text-[10px] font-semibold text-red-700 border border-red-200/60 leading-tight">
          Out of Stock
        </span>
      );
    }
    if (variant.available_quantity <= variant.reorder_level) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 border border-amber-200/60 leading-tight">
          Low (≤{variant.reorder_level})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 leading-tight">
        In Stock
      </span>
    );
  };

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + variants.length, totalVariants);

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header Matching Patients Page ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Medicine Inventory
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              Single Pharmacy
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Manage strength variants, packaging, physical stock balances, dispensing, and movement
            history.
          </p>
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
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            onClick={reloadAll}
            disabled={loading || summaryLoading}
            title="Refresh inventory and summary"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading || summaryLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={() => navigate('/reduce-medicine')}
            title="Reduce Medicine & Dispense Tablets"
          >
            <PackageMinus size={13} className="text-red-600" />
            <span>Reduce Medicine</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={downloadSampleTemplate}
            title="Download multi-variant Excel template"
          >
            <Download size={13} className="text-slate-500" />
            <span>Template</span>
          </button>

          {isInvCreatable && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              onClick={() => setIsImportModalOpen(true)}
              title="Bulk import medicines and strength variants from Excel"
            >
              <FileSpreadsheet size={13} className="text-slate-500" />
              <span>Import Excel</span>
            </button>
          )}

          {isInvCreatable && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              onClick={() => {
                setSelectedVariant(null);
                setIsVariantModalOpen(true);
              }}
            >
              <Plus size={13} strokeWidth={2.4} />
              <span>Add Strength Variant</span>
            </button>
          )}
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {/* ── Summary KPI / Stats Cards (Compact & Matching Ratings & Reviews) ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 lg:grid-cols-5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setStockTab('ALL');
            setPage(1);
          }}
          className={cx(
            'text-left w-full cursor-pointer rounded-lg border py-2 px-2.5 sm:px-3 transition-all bg-white shadow-2xs min-w-0',
            stockTab === 'ALL'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200/90 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Formulations
            </span>
            <div className="w-5.5 h-5.5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers size={12} />
            </div>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg font-bold text-slate-900 tracking-tight shrink-0">
              {summary.total_active_variants}
            </span>
            <span className="text-[10.5px] text-slate-400 truncate">Active strength variants</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStockTab('IN_STOCK');
            setPage(1);
          }}
          className={cx(
            'text-left w-full cursor-pointer rounded-lg border py-2 px-2.5 sm:px-3 transition-all bg-white shadow-2xs min-w-0',
            stockTab === 'IN_STOCK'
              ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
              : 'border-slate-200/90 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              In Stock
            </span>
            <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={12} />
            </div>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg font-bold text-emerald-600 tracking-tight shrink-0">
              {summary.in_stock_count}
            </span>
            <span className="text-[10.5px] text-slate-400 truncate">Above reorder level</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStockTab('LOW_STOCK');
            setPage(1);
          }}
          className={cx(
            'text-left w-full cursor-pointer rounded-lg border py-2 px-2.5 sm:px-3 transition-all bg-white shadow-2xs min-w-0',
            stockTab === 'LOW_STOCK'
              ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20'
              : 'border-slate-200/90 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Low Stock Alert
            </span>
            <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={12} />
            </div>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg font-bold text-amber-600 tracking-tight shrink-0">
              {summary.low_stock_count}
            </span>
            <span className="text-[10.5px] text-slate-400 truncate">Requires replenishment</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStockTab('OUT_OF_STOCK');
            setPage(1);
          }}
          className={cx(
            'text-left w-full cursor-pointer rounded-lg border py-2 px-2.5 sm:px-3 transition-all bg-white shadow-2xs min-w-0',
            stockTab === 'OUT_OF_STOCK'
              ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20'
              : 'border-slate-200/90 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Out of Stock
            </span>
            <div className="w-5.5 h-5.5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <PackageX size={12} />
            </div>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg font-bold text-rose-600 tracking-tight shrink-0">
              {summary.out_of_stock_count}
            </span>
            <span className="text-[10.5px] text-slate-400 truncate">0 units available</span>
          </div>
        </button>

        <div className="rounded-lg border border-slate-200/90 bg-white py-2 px-2.5 sm:px-3 shadow-2xs col-span-2 sm:col-span-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Valuation
            </span>
            <div className="w-5.5 h-5.5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Boxes size={12} />
            </div>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-lg font-bold text-slate-900 tracking-tight shrink-0">
              {formatCurrency(summary.total_valuation)}
            </span>
            <span className="text-[10.5px] text-slate-400 truncate" title="Current stock valuation">
              Current stock valuation
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Unified Container: Filters Toolbar + Table + Pagination (Matching SupportCenterPage & Patients Page Design) ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* ── Combined Filter Toolbar: Tabs on Left, Search & Dropdowns on Right ── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white">
          {/* Left: Quick stock filter tabs */}
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100/90 p-1 overflow-x-auto scrollbar-none">
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
                className={cx(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                  stockTab === tab.id
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Search + Dosage Form + Status + Reset in a neat row */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            {/* Search Input with ⌘K */}
            <div className="relative flex items-center flex-1 sm:flex-initial min-w-[160px] sm:min-w-[220px]">
              <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search medicine, code..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                aria-label="Search medicines"
              />
              <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
                ⌘K
              </span>
            </div>

            {/* Dosage Form Select Dropdown */}
            <div className="shrink-0">
              <SearchableSelect
                size="sm"
                variant="default"
                aria-label="Dosage Form"
                value={selectedDosage}
                onChange={(val) => {
                  setSelectedDosage(val);
                  setPage(1);
                }}
                placeholder="All Dosage Forms"
                searchable={true}
                searchPlaceholder="Filter dosage form..."
                options={[
                  { value: '', label: 'All Dosage Forms' },
                  ...DOSAGE_FORMS.map((f) => ({ value: f, label: f })),
                ]}
              />
            </div>

            {/* Status Select Dropdown */}
            <div className="shrink-0">
              <SearchableSelect
                size="sm"
                variant="default"
                aria-label="Status"
                value={selectedStatus}
                onChange={(val) => {
                  setSelectedStatus((val as any) || 'ALL');
                  setPage(1);
                }}
                placeholder="All Status"
                searchable={false}
                options={[
                  { value: 'ACTIVE', label: 'Active only' },
                  { value: 'INACTIVE', label: 'Inactive only' },
                  { value: 'ALL', label: 'All status' },
                ]}
              />
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <span>Reset</span>
                <X size={12} className="text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 whitespace-nowrap">Medicine & Strength</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 whitespace-nowrap">Dosage & Packaging</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 text-right whitespace-nowrap">Available Stock</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 text-center whitespace-nowrap">Discount Type</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 text-right whitespace-nowrap">Discount Value</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 text-right whitespace-nowrap">Pricing (MRP / Final)</th>
                <th className="sticky top-0 z-10 bg-[#f8fafc] px-3 py-1.5 text-center whitespace-nowrap">Status</th>
                <th className="sticky top-0 right-0 z-20 bg-[#f8fafc] px-3 py-1.5 text-right whitespace-nowrap font-semibold shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {loading && variants.length === 0 ? (
                SKELETON_ROWS.map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-1.5">
                      <div className="h-3 bg-slate-100 rounded w-32 mb-1" />
                      <div className="h-2 bg-slate-50 rounded w-20" />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="h-3 bg-slate-100 rounded w-16 mb-1" />
                      <div className="h-2 bg-slate-50 rounded w-20" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="h-3 bg-slate-100 rounded w-12 mx-auto" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="h-3 bg-slate-100 rounded w-12 ml-auto" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="h-3 bg-slate-100 rounded w-14 ml-auto" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="h-3 bg-slate-100 rounded w-10 mx-auto" />
                    </td>
                    <td className="px-2.5 py-1.5 text-right sticky right-0 z-10 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <div className="h-4 bg-slate-100 rounded w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                        <SearchX size={22} />
                      </div>
                      <strong className="text-xs font-semibold text-slate-700">
                        No strength variants found
                      </strong>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? 'Try clearing filters or search keywords.'
                          : 'Add your first medicine strength variant to get started.'}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="mt-1.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={resetFilters}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                variants.map((v) => {
                  const hasStripPack = v.tablets_per_strip && v.tablets_per_strip > 0;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setViewingVariant(v)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group border-b border-slate-100/80 last:border-b-0"
                    >
                      {/* Medicine & Strength */}
                      <td className="px-3 py-1.5 max-w-[280px]">
                        <div className="flex items-center gap-1.5 leading-snug">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingVariant(v);
                            }}
                            className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-left cursor-pointer truncate text-[12px]"
                            title={v.medicine_name}
                          >
                            {v.medicine_name}
                          </button>
                          <span className="shrink-0 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 leading-tight">
                            {v.strength} {v.strength_unit}
                          </span>
                        </div>
                        {(v.generic_name || v.manufacturer) && (
                          <div className="flex items-center gap-1 text-[10.5px] text-slate-400 leading-tight truncate mt-0.5">
                            {v.generic_name && (
                              <span className="truncate" title={v.generic_name}>
                                {v.generic_name}
                              </span>
                            )}
                            {v.generic_name && v.manufacturer && <span>•</span>}
                            {v.manufacturer && (
                              <span className="truncate text-slate-400" title={v.manufacturer}>
                                ({v.manufacturer})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dosage & Packaging */}
                      <td className="px-3 py-1.5 whitespace-nowrap leading-tight">
                        <div className="font-medium text-slate-800 text-[11.5px]">
                          {v.dosage_form}
                          {hasStripPack && (
                            <span className="ml-1 text-[10.5px] font-normal text-slate-500">
                              ({v.tablets_per_strip}/pk)
                            </span>
                          )}
                        </div>
                        {v.variant_code && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            SKU: {v.variant_code}
                          </div>
                        )}
                      </td>

                      {/* Available Stock & Breakdown */}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap leading-tight">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-slate-900 text-[11.5px]">
                            {v.available_quantity} <span className="font-normal text-[10px] text-slate-500">units</span>
                          </span>
                          {getStockStatusBadge(v)}
                        </div>
                        {hasStripPack && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {v.strip_count} full strips{v.loose_tablets ? ` + ${v.loose_tablets} loose` : ''}
                          </div>
                        )}
                      </td>

                      {/* Discount Type */}
                      <td className="px-3 py-1.5 text-center whitespace-nowrap leading-tight">
                        {v.discount_type ? (
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                            {isPercentageDiscount(v.discount_type) ? 'Percentage' : 'Flat'}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap font-medium text-emerald-600 text-[11.5px] leading-tight">
                        {v.discount_value !== null &&
                        v.discount_value !== undefined &&
                        Number(v.discount_value) > 0 ? (
                          isPercentageDiscount(v.discount_type) ? (
                            `${v.discount_value}%`
                          ) : (
                            formatCurrency(v.discount_value)
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap leading-tight">
                        <div className="font-semibold text-emerald-600 text-[11.5px]">
                          {v.final_price !== null ? formatCurrency(v.final_price) : '—'}
                        </div>
                        {v.mrp !== null && v.mrp !== v.final_price && (
                          <div className="text-[10px] text-slate-400 line-through mt-0.5">
                            MRP {formatCurrency(v.mrp)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-1.5 text-center whitespace-nowrap leading-tight">
                        <StatusDot
                          active={v.status === 'ACTIVE'}
                          label={v.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </td>

                      {/* Inventory Actions */}
                      <td className="px-2.5 py-1.5 text-right whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50/90 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Formulation Details Drawer */}
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingVariant(v);
                            }}
                            title="View Formulation Details"
                            aria-label={`View ${v.medicine_name} details`}
                          >
                            <Eye size={13} />
                          </button>

                          {isInvUpdatable && (
                            <>
                              {/* Stock In */}
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 h-5.5 px-1.5 rounded border border-emerald-200 bg-emerald-50 text-[10.5px] font-semibold text-emerald-700 hover:bg-emerald-100/70 transition-colors shadow-2xs cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVariant(v);
                                  setIsStockInModalOpen(true);
                                }}
                                title="Receive Stock"
                              >
                                <PackagePlus size={11} />
                                <span>Stock In</span>
                              </button>

                              {/* Stock Out */}
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 h-5.5 px-1.5 rounded border border-slate-200 bg-white text-[10.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVariant(v);
                                  setIsStockOutModalOpen(true);
                                }}
                                title="Issue / Dispense Stock"
                              >
                                <PackageMinus size={11} />
                                <span>Stock Out</span>
                              </button>

                              {/* Adjust Count */}
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 h-5.5 px-1.5 rounded border border-slate-200 bg-white text-[10.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVariant(v);
                                  setIsAdjustModalOpen(true);
                                }}
                                title="Reconcile Physical Count"
                              >
                                <Scale size={11} />
                                <span>Adjust</span>
                              </button>
                            </>
                          )}

                          {/* History */}
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVariant(v);
                              setIsHistoryModalOpen(true);
                            }}
                            title="Stock Movement Ledger"
                            aria-label="Stock History"
                          >
                            <History size={13} />
                          </button>

                          {/* Edit Variant */}
                          {isInvUpdatable && (
                            <button
                              type="button"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVariant(v);
                                setIsVariantModalOpen(true);
                              }}
                              title="Edit Strength Configuration"
                              aria-label="Edit Variant"
                            >
                              <Pencil size={13} />
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

        {/* ── Footer / Pagination (Matching SupportCenterPage & CommonTable) ── */}
        <CommonPagination
          total={totalVariants}
          startIdx={totalVariants === 0 ? 0 : startIdx + 1}
          endIdx={endIdx}
          nounPlural="formulations"
          page={page}
          pageCount={totalPages}
          perPage={limit}
          onPageChange={(p) => setPage(p)}
          onPerPageChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </div>

      {/* Medicine Inventory Details View Drawer */}
      <MedicineInventoryDrawer
        variant={activeViewingVariant}
        onClose={() => setViewingVariant(null)}
        onStockIn={(v) => {
          setSelectedVariant(v);
          setIsStockInModalOpen(true);
        }}
        onStockOut={(v) => {
          setSelectedVariant(v);
          setIsStockOutModalOpen(true);
        }}
        onAdjust={(v) => {
          setSelectedVariant(v);
          setIsAdjustModalOpen(true);
        }}
        onHistory={(v) => {
          setSelectedVariant(v);
          setIsHistoryModalOpen(true);
        }}
        onEdit={(v) => {
          setSelectedVariant(v);
          setIsVariantModalOpen(true);
        }}
      />

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
