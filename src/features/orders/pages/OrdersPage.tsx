import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { OrderDetailsDrawer } from '../components/OrderDetailsDrawer';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { UpdateOrderStatusModal } from '../components/UpdateOrderStatusModal';
import { ordersApi } from '../services/ordersApi';
import type {
  DashboardSummaryMetrics,
  OrderListItem,
  PaginationMeta,
} from '../types/orders';
import { getErrorMessage } from '../../../utils/errors';

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const OrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // URL state
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';

  // State
  const [metrics, setMetrics] = useState<DashboardSummaryMetrics | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalAmount' | 'orderNumber'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drawer & Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusModalOrder, setStatusModalOrder] = useState<OrderListItem | null>(null);

  // Fetch Dashboard Summary Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const data = await ordersApi.getSummaryMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      console.error('Failed to fetch order summary metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch Orders Listing
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine date filters from preset if applicable
      let fromDate = startDate;
      let toDate = endDate;

      if (dateRangePreset === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0]!;
        fromDate = todayStr;
        toDate = todayStr;
      } else if (dateRangePreset === 'LAST_7_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        fromDate = d.toISOString().split('T')[0]!;
        toDate = new Date().toISOString().split('T')[0]!;
      } else if (dateRangePreset === 'LAST_30_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        fromDate = d.toISOString().split('T')[0]!;
        toDate = new Date().toISOString().split('T')[0]!;
      }

      const res = await ordersApi.getOrders({
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        paymentStatus: selectedPaymentStatus !== 'ALL' ? selectedPaymentStatus : undefined,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      setOrders(res.orders);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch pharmacy orders.'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    selectedStatus,
    selectedPaymentStatus,
    dateRangePreset,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const reloadAll = () => {
    void fetchMetrics();
    void fetchOrders();
  };

  const handleOpenDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDrawerOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
    setSelectedPaymentStatus('ALL');
    setDateRangePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    selectedStatus !== 'ALL' ||
    selectedPaymentStatus !== 'ALL' ||
    dateRangePreset !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate);

  // Status Tab counts from metrics
  const statusCounts = metrics?.statusCounts || {
    placed: 0,
    processing: 0,
    packed: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };

  return (
    <div className="ui-page">
      {/* Top Header - Fixed & Pinned */}
      <header className="ui-header shrink-0">
        <div className="ui-header-title">
          <div className="ui-header-icon">
            <ShoppingBag size={16} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1>Order Management</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Patient Pharmacy Orders
              </span>
            </div>
            <span className="ui-header-sub">
              Manage patient prescription orders, fulfillment statuses, payment confirmations, and delivery dispatches.
            </span>
          </div>
        </div>

        <div className="ui-header-actions">
          <button
            type="button"
            className="ui-btn"
            onClick={reloadAll}
            disabled={loading || metricsLoading}
            title="Refresh orders and dashboard KPIs"
          >
            <RefreshCw size={14} className={loading || metricsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Container - Non-scrolling with inner table scroll */}
      <div className="min-h-0 flex-1 flex flex-col gap-4 px-6 pb-4 overflow-hidden">
        {/* 1. Order Dashboard: 6 Summary KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 shrink-0">
          {/* Total Orders */}
          <div
            onClick={() => {
              setSelectedStatus('ALL');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'ALL'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 dark:bg-indigo-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Orders</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <ShoppingBag size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              {metrics?.totalOrders ?? '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
              Revenue: {metrics ? formatCurrency(metrics.totalRevenue) : '—'}
            </div>
          </div>

          {/* New / Placed */}
          <div
            onClick={() => {
              setSelectedStatus('placed');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'placed'
                ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">New (Placed)</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Clock size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-blue-600 dark:text-blue-400">
              {statusCounts.placed}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Awaiting processing</div>
          </div>

          {/* Processing */}
          <div
            onClick={() => {
              setSelectedStatus('processing');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'processing'
                ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 dark:bg-amber-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Processing</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Package size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-amber-600 dark:text-amber-400">
              {statusCounts.processing + (statusCounts.packed || 0)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Pharmacy preparing</div>
          </div>

          {/* Dispatched */}
          <div
            onClick={() => {
              setSelectedStatus('out_for_delivery');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'out_for_delivery' || selectedStatus === 'dispatched'
                ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20 dark:bg-purple-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Dispatched</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <Truck size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-purple-600 dark:text-purple-400">
              {statusCounts.out_for_delivery}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Out for delivery</div>
          </div>

          {/* Delivered */}
          <div
            onClick={() => {
              setSelectedStatus('delivered');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'delivered'
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Delivered</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {statusCounts.delivered}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Completed orders</div>
          </div>

          {/* Cancelled */}
          <div
            onClick={() => {
              setSelectedStatus('cancelled');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`ui-card cursor-pointer p-3.5 transition-all ${
              selectedStatus === 'cancelled'
                ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20 dark:bg-rose-950/20'
                : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Cancelled</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <XCircle size={15} />
              </div>
            </div>
            <div className="mt-1.5 text-xl font-bold text-rose-600 dark:text-rose-400">
              {statusCounts.cancelled}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Cancelled / returned</div>
          </div>
        </div>

        {/* 2. Main Table Card with Integrated Search & Filter Controls */}
        <div className="ui-card flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/50 p-3 shrink-0 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
              {/* Left: Quick status filter tabs */}
              <div className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80">
                {[
                  { id: 'ALL', label: 'All Orders' },
                  { id: 'placed', label: `Placed (${statusCounts.placed})` },
                  { id: 'processing', label: `Processing (${statusCounts.processing + (statusCounts.packed || 0)})` },
                  { id: 'out_for_delivery', label: `Dispatched (${statusCounts.out_for_delivery})` },
                  { id: 'delivered', label: `Delivered (${statusCounts.delivered})` },
                  { id: 'cancelled', label: `Cancelled (${statusCounts.cancelled})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(tab.id);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedStatus === tab.id
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Right: Search, Payment Status, Date Range */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search box */}
                <div className="ui-search" style={{ width: 230 }}>
                  <Search size={14} />
                  <input
                    type="search"
                    className="ui-input"
                    placeholder="Search order #, patient..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                  />
                </div>

                {/* Payment Status Dropdown */}
                <select
                  className="ui-select"
                  style={{ width: 135 }}
                  value={selectedPaymentStatus}
                  onChange={(e) => {
                    setSelectedPaymentStatus(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  aria-label="Filter by payment status"
                >
                  <option value="ALL">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                {/* Date Preset Dropdown */}
                <select
                  className="ui-select"
                  style={{ width: 130 }}
                  value={dateRangePreset}
                  onChange={(e) => {
                    setDateRangePreset(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setStartDate('');
                      setEndDate('');
                    }
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  aria-label="Filter by date"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>

                {/* Custom Date Pickers if CUSTOM */}
                {dateRangePreset === 'CUSTOM' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      className="ui-input h-8 text-xs px-2"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      aria-label="Start date"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="date"
                      className="ui-input h-8 text-xs px-2"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      aria-label="End date"
                    />
                  </div>
                )}

                {/* Sort Order Toggle */}
                <button
                  type="button"
                  className="ui-btn ui-btn-subtle px-2 text-xs"
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <ArrowUpDown size={13} />
                  <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                </button>

                {/* Reset button if active filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-subtle px-2 text-xs text-rose-600 hover:text-rose-700"
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

          {/* Error Banner */}
          {error && (
            <div className="border-b border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-xs bg-rose-600 text-white"
                onClick={reloadAll}
              >
                Retry
              </button>
            </div>
          )}

          {/* Orders Data Table - Scrollable Table Data Body */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300 shadow-xs">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Payment Status</th>
                  <th className="px-4 py-3 text-center">Order Status</th>
                  <th className="px-4 py-3">Delivery Method</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/60 dark:bg-slate-950">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400">
                      <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-600" />
                      Loading orders from database...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        No pharmacy orders found
                      </p>
                      <p className="mt-1 text-xs">
                        {hasActiveFilters
                          ? 'Try clearing or modifying your search and filter criteria.'
                          : 'Patient orders placed in the mobile app will appear here.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="ui-btn ui-btn-xs mt-3 mx-auto"
                          onClick={resetFilters}
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-900/40 cursor-pointer"
                      onClick={() => handleOpenDetails(o.id)}
                    >
                      {/* Order Number */}
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                            {o.order_number}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 block">
                          ID: {o.id.slice(0, 8)}…
                        </span>
                      </td>

                      {/* Patient Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {o.patient?.name || 'Walk-in Patient'}
                        </div>
                        {o.patient?.phone && (
                          <div className="text-[11px] text-slate-400">{o.patient.phone}</div>
                        )}
                      </td>

                      {/* Order Date */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>
                          {new Date(o.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(o.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Number of Items */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {o.item_count} {o.item_count === 1 ? 'item' : 'items'}
                        </span>
                        {o.medicines_preview && (
                          <span className="block text-[11px] text-slate-400 max-w-[150px] truncate mx-auto mt-0.5" title={o.medicines_preview}>
                            {o.medicines_preview}
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {formatCurrency(o.total_amount)}
                        </div>
                        {Boolean(o.delivery_charge) && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            incl. ₹{o.delivery_charge} delivery
                          </span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <PaymentStatusBadge status={o.payment_status} />
                      </td>

                      {/* Order Status */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <OrderStatusBadge status={o.status} />
                      </td>

                      {/* Delivery Method */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Truck size={13} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-xs">Home Delivery</span>
                        </div>
                        {o.delivery_address && (
                          <span className="block text-[11px] text-slate-400 max-w-[160px] truncate mt-0.5" title={o.delivery_address}>
                            {o.delivery_address}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="ui-btn ui-btn-xs inline-flex items-center gap-1"
                            onClick={() => handleOpenDetails(o.id)}
                            title="View Full Order Details"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                          {o.status !== 'delivered' && o.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="ui-btn ui-btn-primary ui-btn-xs"
                              onClick={() => setStatusModalOrder(o)}
                              title="Update Status"
                            >
                              Status
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 3. Pagination Footer - Fixed & Pinned at the Bottom */}
          <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-2.5 shrink-0 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Showing{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {orders.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong className="text-slate-800 dark:text-slate-200">{pagination.total}</strong> orders
              </span>

              {/* Page size selector */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <span>Per page:</span>
                <select
                  className="ui-select text-xs h-7 py-0 px-2"
                  value={pagination.limit}
                  onChange={(e) => {
                    const nextLimit = Number(e.target.value);
                    setPagination((p) => ({ ...p, limit: nextLimit, page: 1 }));
                  }}
                  aria-label="Items per page"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-2">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn-subtle h-7 px-2.5 text-xs"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-subtle h-7 px-2.5 text-xs"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        orderId={selectedOrderId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrderId(null);
        }}
        onOrderUpdated={reloadAll}
      />

      {/* Status Update Modal */}
      {statusModalOrder && (
        <UpdateOrderStatusModal
          isOpen={Boolean(statusModalOrder)}
          onClose={() => setStatusModalOrder(null)}
          orderId={statusModalOrder.id}
          orderNumber={statusModalOrder.order_number}
          currentStatus={statusModalOrder.status}
          onSuccess={() => {
            setStatusModalOrder(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
};
export default OrdersPage;
