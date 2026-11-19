import { App } from 'antd';
import {
  AlertCircle,
  Edit2,
  Eye,
  FlaskConical,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Tag,
  TestTube2,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  COMMON_SAMPLE_TYPES,
  COMMON_SERVICE_CATEGORIES,
  validateLabServiceName,
  validateServiceCode,
  validateServicePrice,
} from '../../components/LabServiceModal';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Badge, cx } from '../../components/ui/primitives';
import SearchableSelect, { type SearchableSelectOption } from '../../components/ui/SearchableSelect';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface LabService {
  id: string;
  name: string;
  service_code?: string | null;
  category?: string | null;
  service_category?: string | null;
  sample_type?: string | null;
  description?: string | null;
  price?: number | string | null;
  service_price?: number | string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

const STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: 'ACTIVE', label: 'Active', sublabel: 'Available for doctor prescriptions & orders', badge: 'Live', badgeTone: 'green' },
  { value: 'INACTIVE', label: 'Inactive', sublabel: 'Temporarily suspended or hidden', badge: 'Disabled', badgeTone: 'neutral' },
];

export default function LabServicesPage() {
  const { message } = App.useApp();
  const [services, setServices] = useState<LabService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal / Drawer State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState<string>('0');
  const [serviceStatus, setServiceStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [customSampleMode, setCustomSampleMode] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // View Service State
  const [viewingService, setViewingService] = useState<LabService | null>(null);

  // Delete Confirmation State
  const [deletingService, setDeletingService] = useState<LabService | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<LabService[]>('lab-portal/services');
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load services.'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchServices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  const openAddModal = () => {
    setEditingService(null);
    setServiceName('');
    setServiceCode('');
    setServiceCategory('');
    setSampleType('');
    setServiceDesc('');
    setServicePrice('0');
    setServiceStatus('ACTIVE');
    setCustomCategoryMode(false);
    setCustomSampleMode(false);
    setTouched({});
    setIsModalOpen(true);
  };

  const openEditModal = (service: LabService) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceCode(service.service_code ?? '');
    setServiceCategory(service.category ?? service.service_category ?? '');
    setSampleType(service.sample_type ?? '');
    setServiceDesc(service.description ?? '');
    const priceVal =
      service.price !== null && service.price !== undefined
        ? String(service.price)
        : service.service_price !== null && service.service_price !== undefined
          ? String(service.service_price)
          : '0';
    setServicePrice(priceVal);
    setServiceStatus(service.status || 'ACTIVE');
    setCustomCategoryMode(false);
    setCustomSampleMode(false);
    setTouched({});
    setIsModalOpen(true);
  };

  const categoryOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts = [...COMMON_SERVICE_CATEGORIES];
    if (serviceCategory && !opts.some((o) => o.value.toLowerCase() === serviceCategory.toLowerCase())) {
      opts.unshift({
        value: serviceCategory,
        label: serviceCategory,
        sublabel: 'Custom category',
        badge: 'Custom',
      });
    }
    return opts;
  }, [serviceCategory]);

  const sampleTypeOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts = [...COMMON_SAMPLE_TYPES];
    if (sampleType && !opts.some((o) => o.value.toLowerCase() === sampleType.toLowerCase())) {
      opts.unshift({
        value: sampleType,
        label: sampleType,
        sublabel: 'Custom specimen',
        badge: 'Custom',
      });
    }
    return opts;
  }, [sampleType]);

  const handleServiceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9\s.,/+\-&()'%]/g, '');
    setServiceName(sanitized);
    if (touched.name) {
      setTouched((prev) => ({ ...prev, name: true }));
    }
  };

  const handleServiceCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    const sanitized = raw.replace(/[^A-Z0-9\-_/]/g, '');
    setServiceCode(sanitized);
    if (touched.service_code) {
      setTouched((prev) => ({ ...prev, service_code: true }));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setServicePrice(raw);
    }
    if (touched.price) {
      setTouched((prev) => ({ ...prev, price: true }));
    }
  };

  const nameError = touched.name ? validateLabServiceName(serviceName) : undefined;
  const serviceCodeError = touched.service_code ? validateServiceCode(serviceCode) : undefined;
  const priceError = touched.price ? validateServicePrice(servicePrice) : undefined;

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateLabServiceName(serviceName);
    const codeErr = validateServiceCode(serviceCode);
    const prErr = validateServicePrice(servicePrice);

    if (nameErr || codeErr || prErr) {
      setTouched({ name: true, service_code: true, price: true });
      if (nameErr) void message.error(nameErr);
      else if (codeErr) void message.error(codeErr);
      else if (prErr) void message.error(prErr);
      return;
    }

    const parsedPrice = servicePrice === '' ? 0 : parseFloat(servicePrice);

    setSaving(true);
    try {
      const payload = {
        name: serviceName.trim(),
        service_code: serviceCode.trim().toUpperCase() || null,
        category: serviceCategory.trim() || null,
        service_category: serviceCategory.trim() || null,
        sample_type: sampleType.trim() || null,
        description: serviceDesc.trim() || null,
        price: isNaN(parsedPrice) ? 0 : parsedPrice,
        service_price: isNaN(parsedPrice) ? 0 : parsedPrice,
        status: serviceStatus,
      };

      if (editingService) {
        await api.put(`lab-portal/services/${editingService.id}`, payload);
        void message.success('Service updated successfully!');
      } else {
        await api.post('lab-portal/services', payload);
        void message.success('Service created successfully!');
      }

      setIsModalOpen(false);
      void fetchServices();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to save service.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;

    try {
      await api.delete(`lab-portal/services/${deletingService.id}`);
      void message.success(`"${deletingService.name}" removed from laboratory.`);
      setDeletingService(null);
      void fetchServices();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to delete service.'));
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.service_code?.toLowerCase().includes(term) ?? false) ||
        (s.category?.toLowerCase().includes(term) ?? false) ||
        (s.service_category?.toLowerCase().includes(term) ?? false) ||
        (s.sample_type?.toLowerCase().includes(term) ?? false) ||
        (s.description?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [services, statusFilter, searchTerm]);

  const activeCount = useMemo(() => services.filter((s) => s.status === 'ACTIVE').length, [services]);
  const inactiveCount = services.length - activeCount;

  const averagePrice = useMemo(() => {
    const priced = services.filter((s) => Number(s.price ?? s.service_price ?? 0) > 0);
    if (priced.length === 0) return 0;
    const sum = priced.reduce((acc, s) => acc + Number(s.price ?? s.service_price ?? 0), 0);
    return Math.round(sum / priced.length);
  }, [services]);

  const formatPrice = (service: LabService) => {
    const raw = service.price ?? service.service_price;
    const num = Number(raw);
    if (raw === null || raw === undefined || isNaN(num) || num <= 0) {
      return '₹0.00';
    }
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="ui-page space-y-3">
      {/* ── Executive Page Header Matching HMS Admin Design ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Diagnostic Services & Test Catalog
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Clinical Directory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Configure clinical investigations, standard test rates, specimen requirements, and active testing procedures provided by your diagnostic facility.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              void fetchServices();
            }}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh records"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.4} />
            <span>Add New Investigation</span>
          </button>
        </div>
      </header>

      {/* ── Compact Statistics Cards Matching Admin Design ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Investigations */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Investigations
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {services.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tests listed in lab catalog</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FlaskConical size={15} />
          </div>
        </div>

        {/* Active For Referrals */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active For Referrals
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight mt-0.5">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Available for doctor orders</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Average Rate */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg Investigation Rate
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              ₹{averagePrice}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Standard clinical fee benchmark</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <IndianRupee size={15} />
          </div>
        </div>
      </div>

      {/* ── Main Unified Container: Filter Bar + Table ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Filter Bar Section */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            {/* Status Filter Tabs */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cx(
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                All ({services.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={cx(
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={cx(
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search test by name, code, category, sample..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right Summary & Reset */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
              Showing <strong className="text-slate-900 font-bold">{filteredServices.length}</strong> of{' '}
              <strong className="text-slate-900 font-bold">{services.length}</strong> investigations
            </span>

            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                title="Reset filters"
              >
                <X size={11} className="text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500">Loading diagnostic services...</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1">
              <FlaskConical size={18} />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No investigations matched your filter criteria'
                : 'No diagnostic tests or services listed yet'}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try searching with a different test keyword or clear your filters.'
                : 'Click "Add New Investigation" above to add diagnostic tests offered by your facility.'}
            </p>
            {!searchTerm && statusFilter === 'ALL' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.4} />
                  <span>Add First Investigation</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2 whitespace-nowrap">Diagnostic Service / Test Name</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-32">Service Code</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-44">Service Category</th>
                  <th className="px-3.5 py-2 whitespace-nowrap w-40">Sample Type</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap w-28">Price</th>
                  <th className="px-3.5 py-2 text-center whitespace-nowrap w-28">Status</th>
                  <th className="px-3.5 py-2 w-64">Description</th>
                  <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold w-24 sticky right-0 z-20 bg-[#f8fafc] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Diagnostic Service / Test Name */}
                    <td className="px-3.5 py-2.5 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                          <FlaskConical size={12} />
                        </div>
                        <span className="font-semibold text-slate-900 text-xs">{service.name}</span>
                      </div>
                    </td>

                    {/* Service Code */}
                    <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                      {service.service_code ? (
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {service.service_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Service Category */}
                    <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                      {service.category ?? service.service_category ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                          {service.category ?? service.service_category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Sample Type */}
                    <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                      {service.sample_type ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <TestTube2 size={12} className="shrink-0 text-sky-600" />
                          <span>{service.sample_type}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Service Price */}
                    <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900 align-middle whitespace-nowrap">
                      <span>{formatPrice(service)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5 text-center align-middle whitespace-nowrap">
                      <Badge tone={service.status === 'ACTIVE' ? 'green' : 'neutral'}>
                        <span
                          className={cx(
                            'w-1.5 h-1.5 rounded-full mr-1 inline-block',
                            service.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400',
                          )}
                        />
                        <span>{service.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
                      </Badge>
                    </td>

                    {/* Description */}
                    <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate align-middle text-xs" title={service.description ?? ''}>
                      {service.description ?? <span className="text-slate-300 italic">None</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-right align-middle whitespace-nowrap sticky right-0 z-10 bg-white hover:bg-slate-50/70 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setViewingService(service)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Service Details"
                          aria-label="View Service Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(service)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Service"
                          aria-label="Edit Service"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingService(service)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Service"
                          aria-label="Delete Service"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Diagnostic Service Drawer Matching Admin Modal Design ── */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          if (!saving) setIsModalOpen(false);
        }}
        variant="drawer"
        size="md"
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FlaskConical size={16} />
            </div>
            <span>{editingService ? 'Edit Diagnostic Service' : 'Add New Service / Test'}</span>
          </div>
        }
        description="Configure clinical service details, specimen requirements, pricing, and catalog status."
      >
        <form
          noValidate
          onSubmit={(e) => {
            void handleSaveService(e);
          }}
          className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs"
        >
          {/* Field 1: Diagnostic Service / Test Name */}
          <div>
            <label htmlFor="serviceNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Diagnostic Service / Test Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="serviceNameInput"
              type="text"
              value={serviceName}
              onChange={handleServiceNameChange}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              placeholder="e.g. Complete Blood Count (CBC)"
              className={cx(
                'w-full h-8 px-2.5 rounded-lg border text-xs focus:outline-none transition-all shadow-2xs',
                nameError
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              )}
            />
            {nameError && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <AlertCircle size={13} className="shrink-0 text-rose-600" />
                <span>{nameError}</span>
              </div>
            )}
          </div>

          {/* Field 2 & 3: Service Code & Service Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="serviceCodeInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Service Code
              </label>
              <div className="relative">
                <Tag size={13} className="absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
                <input
                  id="serviceCodeInput"
                  type="text"
                  value={serviceCode}
                  onChange={handleServiceCodeChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, service_code: true }))}
                  placeholder="e.g. CBC-001"
                  className={cx(
                    'w-full h-8 pl-2.5 pr-8 rounded-lg border text-xs uppercase font-mono focus:outline-none transition-all shadow-2xs',
                    serviceCodeError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                  )}
                />
              </div>
              {serviceCodeError && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertCircle size={13} className="shrink-0 text-rose-600" />
                  <span>{serviceCodeError}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="client-service-cat-select"
                  className="block text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Service Category
                </label>
                <button
                  type="button"
                  onClick={() => setCustomCategoryMode((prev) => !prev)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {customCategoryMode ? 'Select from list' : '+ Custom Category'}
                </button>
              </div>
              {customCategoryMode ? (
                <input
                  id="client-service-cat-select"
                  aria-label="Service Category"
                  type="text"
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  placeholder="Type custom category..."
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
              ) : (
                <SearchableSelect
                  id="client-service-cat-select"
                  aria-label="Service Category"
                  size="sm"
                  variant="default"
                  value={serviceCategory}
                  onChange={(val) => setServiceCategory(val)}
                  options={categoryOptions}
                  placeholder="Select category..."
                  searchPlaceholder="Search category..."
                  clearable
                  onClear={() => setServiceCategory('')}
                />
              )}
            </div>
          </div>

          {/* Field 4: Sample Type */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="client-sample-type-select"
                className="block text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Sample Type
              </label>
              <button
                type="button"
                onClick={() => setCustomSampleMode((prev) => !prev)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {customSampleMode ? 'Select from list' : '+ Custom Specimen'}
              </button>
            </div>
            {customSampleMode ? (
              <input
                id="client-sample-type-select"
                aria-label="Sample Type"
                type="text"
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                placeholder="Type custom specimen..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            ) : (
              <SearchableSelect
                id="client-sample-type-select"
                aria-label="Sample Type"
                size="sm"
                variant="default"
                value={sampleType}
                onChange={(val) => setSampleType(val)}
                options={sampleTypeOptions}
                placeholder="Select sample type..."
                searchPlaceholder="Search specimen..."
                clearable
                onClear={() => setSampleType('')}
              />
            )}
          </div>

          {/* Field 5: Service Price */}
          <div>
            <label htmlFor="servicePriceInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Service Price (₹)
            </label>
            <div className="relative flex items-center">
              <IndianRupee size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none z-10" />
              <input
                id="servicePriceInput"
                type="text"
                inputMode="decimal"
                value={servicePrice}
                onChange={handlePriceChange}
                onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                placeholder="0.00"
                style={{ paddingLeft: '28px' }}
                className={cx(
                  'w-full h-8 pr-2.5 rounded-lg border text-xs focus:outline-none transition-all shadow-2xs',
                  priceError
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                )}
              />
            </div>
            {priceError && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <AlertCircle size={13} className="shrink-0 text-rose-600" />
                <span>{priceError}</span>
              </div>
            )}
          </div>

          {/* Field 6: Description */}
          <div>
            <label htmlFor="serviceDescriptionInput" className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="serviceDescriptionInput"
              rows={2}
              value={serviceDesc}
              onChange={(e) => setServiceDesc(e.target.value.slice(0, 2000))}
              placeholder="Clinical indications, methodology, preparation instructions..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
            />
          </div>

          {/* Field 7: Service Catalog Status */}
          <div>
            <label
              htmlFor="client-service-status-select"
              className="block text-xs font-semibold text-slate-700 mb-1 cursor-pointer"
            >
              Service Catalog Status <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="client-service-status-select"
              aria-label="Service Catalog Status"
              size="sm"
              variant="default"
              value={serviceStatus}
              onChange={(val) => setServiceStatus(val as 'ACTIVE' | 'INACTIVE')}
              options={STATUS_OPTIONS}
              placeholder="Select status..."
              searchable={false}
            />
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{editingService ? 'Update Service' : 'Create Service'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Service Details Drawer ── */}
      <Modal
        variant="drawer"
        size="xl"
        open={Boolean(viewingService)}
        onClose={() => setViewingService(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FlaskConical size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {viewingService?.name ?? 'Service Details'}
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                Diagnostic service catalog specification
              </div>
            </div>
          </div>
        }
      >
        {viewingService && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Header Status & Price Banner */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Standard Rate</span>
                <span className="text-lg font-bold text-slate-900 flex items-center">
                  <IndianRupee size={15} className="mr-0.5 text-slate-500" />
                  {Number(viewingService.price ?? viewingService.service_price ?? 0).toFixed(2)}
                </span>
              </div>
              <Badge tone={viewingService.status === 'ACTIVE' ? 'green' : 'neutral'}>
                <span
                  className={cx(
                    'w-1.5 h-1.5 rounded-full mr-1 inline-block',
                    viewingService.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400',
                  )}
                />
                <span>{viewingService.status === 'ACTIVE' ? 'Active in Catalog' : 'Inactive'}</span>
              </Badge>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Service Code</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {viewingService.service_code ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Category</span>
                <span className="font-medium text-slate-800">
                  {viewingService.category ?? viewingService.service_category ?? 'General'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Sample Specimen</span>
                <span className="font-medium text-slate-800">
                  {viewingService.sample_type ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Catalog ID</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {viewingService.id}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-lg border border-slate-100 bg-white">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Description & Clinical Notes</span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewingService.description ?? <span className="text-slate-400 italic">No description provided for this diagnostic service.</span>}
              </p>
            </div>

            {/* Created Timestamp */}
            {viewingService.created_at && (
              <div className="text-[11px] text-slate-400 px-1">
                Added to facility catalog on {new Date(viewingService.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingService(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = viewingService;
                  setViewingService(null);
                  openEditModal(s);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Edit2 size={12} />
                <span>Edit Service</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Dialog Matching Admin Design ── */}
      <ConfirmDialog
        open={Boolean(deletingService)}
        title="Delete Diagnostic Service"
        message={
          <span>
            Are you sure you want to remove <strong className="text-slate-800 font-semibold">"{deletingService?.name}"</strong> from your laboratory catalog? This action will disassociate the test from your facility.
          </span>
        }
        confirmLabel="Delete Service"
        onConfirm={handleDeleteService}
        onClose={() => setDeletingService(null)}
      />
    </div>
  );
}
