import { App } from 'antd';
import {
  AlertCircle,
  AlertTriangle,
  Edit2,
  FlaskConical,
  IndianRupee,
  Plus,
  Search,
  Tag,
  TestTube2,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  COMMON_SAMPLE_TYPES,
  COMMON_SERVICE_CATEGORIES,
  validateLabServiceName,
  validateServiceCode,
  validateServicePrice,
} from '../../components/LabServiceModal';
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

  // Modal State for Add / Edit
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

  // Modal State for Delete confirmation
  const [deletingService, setDeletingService] = useState<LabService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get('lab-portal/services');
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load services.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServices();
  }, []);

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
    setServiceCode(service.service_code || '');
    setServiceCategory(service.category || service.service_category || '');
    setSampleType(service.sample_type || '');
    setServiceDesc(service.description || '');
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
    if (touched['name']) {
      setTouched((prev) => ({ ...prev, name: true }));
    }
  };

  const handleServiceCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    const sanitized = raw.replace(/[^A-Z0-9\-_/]/g, '');
    setServiceCode(sanitized);
    if (touched['service_code']) {
      setTouched((prev) => ({ ...prev, service_code: true }));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^\d*(\.\d{0,2})?$/.test(raw)) {
      setServicePrice(raw);
    }
    if (touched['price']) {
      setTouched((prev) => ({ ...prev, price: true }));
    }
  };

  const nameError = touched['name'] ? validateLabServiceName(serviceName) : undefined;
  const serviceCodeError = touched['service_code'] ? validateServiceCode(serviceCode) : undefined;
  const priceError = touched['price'] ? validateServicePrice(servicePrice) : undefined;

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

    setDeleting(true);
    try {
      await api.delete(`lab-portal/services/${deletingService.id}`);
      void message.success(`"${deletingService.name}" removed from laboratory.`);
      setDeletingService(null);
      void fetchServices();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to delete service.'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const term = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.service_code && s.service_code.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term)) ||
        (s.service_category && s.service_category.toLowerCase().includes(term)) ||
        (s.sample_type && s.sample_type.toLowerCase().includes(term)) ||
        (s.description && s.description.toLowerCase().includes(term)),
    );
  }, [services, searchTerm]);

  const activeCount = useMemo(() => services.filter((s) => s.status === 'ACTIVE').length, [services]);
  const averagePrice = useMemo(() => {
    const priced = services.filter((s) => Number(s.price ?? s.service_price ?? 0) > 0);
    if (priced.length === 0) return 0;
    const sum = priced.reduce((acc, s) => acc + Number(s.price ?? s.service_price ?? 0), 0);
    return Math.round(sum / priced.length);
  }, [services]);

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto box-border">
      {/* ── 1. Clean Light Header ── */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <FlaskConical size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Diagnostic Services & Test Catalog
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Clinical Directory
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Configure clinical investigations, standard test rates, specimen requirements, and active testing procedures provided by your diagnostic facility.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer self-start sm:self-auto active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add New Investigation</span>
          </button>
        </div>
      </div>

      {/* ── 3 Summary Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Investigations
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {services.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tests listed in lab catalog</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <FlaskConical size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active For Referrals
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-0.5">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Available for doctor orders</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg Investigation Rate
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              ₹{averagePrice}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Standard clinical fee benchmark</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <IndianRupee size={16} />
          </div>
        </div>
      </div>

      {/* ── Filter and Search Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test by name, code, category, sample..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 self-center font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          Showing <strong className="text-slate-900 font-bold">{filteredServices.length}</strong> of{' '}
          <strong className="text-slate-900 font-bold">{services.length}</strong> investigations
        </div>
      </div>

      {/* ── Services Table ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-600 border-t-transparent" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2 border border-sky-100">
              <FlaskConical size={28} />
            </div>
            <div className="text-base font-bold text-slate-800">
              {searchTerm ? 'No investigations matched your search' : 'No tests or services listed yet'}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm
                ? 'Try searching with a different test keyword or clear your filter.'
                : 'Click "Add New Investigation" above to add diagnostic tests offered by your facility.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add First Investigation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-270px)] no-scrollbar">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6 sticky top-0 z-20 bg-slate-50">Diagnostic Service / Test Name</th>
                  <th className="py-3.5 px-6 sticky top-0 z-20 bg-slate-50">Service Code</th>
                  <th className="py-3.5 px-6 sticky top-0 z-20 bg-slate-50">Service Category</th>
                  <th className="py-3.5 px-6 sticky top-0 z-20 bg-slate-50">Sample Type</th>
                  <th className="py-3.5 px-6 text-right sticky top-0 z-20 bg-slate-50">Service Price</th>
                  <th className="py-3.5 px-6 text-center sticky top-0 z-20 bg-slate-50">Catalog Status</th>
                  <th className="py-3.5 px-6 sticky top-0 z-20 bg-slate-50">Description</th>
                  <th className="py-3.5 px-6 text-right sticky top-0 right-0 z-30 bg-slate-50 border-b border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                          <FlaskConical size={14} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{service.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {service.service_code ? (
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {service.service_code}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {service.category || service.service_category ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                          {service.category || service.service_category}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {service.sample_type ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <TestTube2 size={12} className="shrink-0 text-sky-500" />
                          {service.sample_type}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-900 align-middle whitespace-nowrap">
                      <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {service.price !== null && service.price !== undefined
                          ? `₹${Number(service.price).toFixed(2)}`
                          : service.service_price !== null && service.service_price !== undefined
                            ? `₹${Number(service.service_price).toFixed(2)}`
                            : 'Standard'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          service.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            service.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {service.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-sm truncate align-middle text-xs" title={service.description || ''}>
                      {service.description || <span className="text-slate-300 italic">No description provided</span>}
                    </td>
                    <td className="py-4 px-6 text-right align-middle whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(service)}
                          className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingService(service)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 size={15} />
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

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <FlaskConical size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingService ? 'Edit Diagnostic Service' : 'Add New Service / Test'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveService} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Field 1: Diagnostic Service / Test Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Diagnostic Service / Test Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={serviceName}
                  onChange={handleServiceNameChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className={`w-full px-3.5 py-2 rounded-lg border text-sm focus:outline-none transition-all ${
                    nameError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500'
                  }`}
                />
                {nameError && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-rose-600" />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>

              {/* Field 2 & 3: Service Code & Service Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Code
                  </label>
                  <div className="relative">
                    <Tag size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={serviceCode}
                      onChange={handleServiceCodeChange}
                      onBlur={() => setTouched((prev) => ({ ...prev, service_code: true }))}
                      placeholder="e.g. CBC-001"
                      className={`w-full px-3.5 py-2 rounded-lg border text-sm uppercase font-mono focus:outline-none transition-all ${
                        serviceCodeError
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500'
                      }`}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="client-service-cat-select"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer"
                    >
                      Service Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomCategoryMode((prev) => !prev)}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
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
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  ) : (
                    <SearchableSelect
                      id="client-service-cat-select"
                      aria-label="Service Category"
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

              {/* Field 5 & 6: Sample Type & Service Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="client-sample-type-select"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer"
                    >
                      Sample Type
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomSampleMode((prev) => !prev)}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
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
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  ) : (
                    <SearchableSelect
                      id="client-sample-type-select"
                      aria-label="Sample Type"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Price (₹)
                  </label>
                  <div className="relative flex items-center">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={servicePrice}
                      onChange={handlePriceChange}
                      onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                      placeholder="0.00"
                      style={{ paddingLeft: '36px' }}
                      className={`w-full pr-3.5 py-2 rounded-lg border text-sm focus:outline-none transition-all ${
                        priceError
                          ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500'
                      }`}
                    />
                  </div>
                  {priceError && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                      <AlertCircle size={13} className="shrink-0 text-rose-600" />
                      <span>{priceError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 4: Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value.slice(0, 2000))}
                  placeholder="Clinical indications, methodology, preparation instructions..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Field 7: Service Catalog Status (SearchableSelect) */}
              <div>
                <label
                  htmlFor="client-service-status-select"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 cursor-pointer"
                >
                  Service Catalog Status <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="client-service-status-select"
                  aria-label="Service Catalog Status"
                  value={serviceStatus}
                  onChange={(val) => setServiceStatus(val as 'ACTIVE' | 'INACTIVE')}
                  options={STATUS_OPTIONS}
                  placeholder="Select status..."
                  searchable={false}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>{editingService ? 'Update Service' : 'Create Service'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-100">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Diagnostic Service</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-800">"{deletingService.name}"</span> from your laboratory catalog? This action will disassociate the test from your facility.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteService}
                disabled={deleting}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete Service</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
