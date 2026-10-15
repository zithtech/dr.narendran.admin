import { App } from 'antd';
import {
  AlertTriangle,
  Edit2,
  FlaskConical,
  IndianRupee,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface LabService {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export default function LabServicesPage() {
  const { message } = App.useApp();
  const [services, setServices] = useState<LabService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState<string>('0');
  const [serviceStatus, setServiceStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
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
    setServiceDesc('');
    setServicePrice('0');
    setServiceStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const openEditModal = (service: LabService) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDesc(service.description || '');
    setServicePrice(service.price !== null && service.price !== undefined ? String(service.price) : '0');
    setServiceStatus(service.status || 'ACTIVE');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      void message.error('Service / Test name is required.');
      return;
    }

    const parsedPrice = parseFloat(servicePrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      void message.error('Please enter a valid non-negative price.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: serviceName.trim(),
        description: serviceDesc.trim() || null,
        price: parsedPrice,
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
        (s.description && s.description.toLowerCase().includes(term)),
    );
  }, [services, searchTerm]);

  const activeCount = useMemo(() => services.filter((s) => s.status === 'ACTIVE').length, [services]);
  const averagePrice = useMemo(() => {
    const priced = services.filter((s) => Number(s.price) > 0);
    if (priced.length === 0) return 0;
    const sum = priced.reduce((acc, s) => acc + Number(s.price), 0);
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
                Configure clinical investigations, standard test rates, and active testing procedures provided by your diagnostic facility.
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
            placeholder="Search test by name or description..."
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Investigation / Service Name</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6 text-right">Standard Rate</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                          <FlaskConical size={14} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{service.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-sm truncate align-middle text-xs" title={service.description || ''}>
                      {service.description || <span className="text-slate-300 italic">No description provided</span>}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-900 align-middle whitespace-nowrap">
                      <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {service.price !== null && service.price !== undefined
                          ? `₹${Number(service.price).toFixed(2)}`
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
                    <td className="py-4 px-6 text-right align-middle whitespace-nowrap">
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
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
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

            <form onSubmit={handleSaveService} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Service / Test Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Clinical purpose, specimen type, fasting requirements, etc."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Price (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={serviceStatus}
                    onChange={(e) => setServiceStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                  >
                    <option value="ACTIVE">Active (Offered)</option>
                    <option value="INACTIVE">Inactive (Temporarily Suspended)</option>
                  </select>
                </div>
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
