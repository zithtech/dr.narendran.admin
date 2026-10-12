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

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="text-sky-600" size={24} />
            <span>Diagnostic Services & Tests</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage investigation procedures, diagnostic pricing, and active tests provided by your lab.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test by name or description..."
            className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 self-center">
          Showing <span className="font-semibold text-slate-800">{filteredServices.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{services.length}</span> services
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-sky-600" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <FlaskConical size={36} className="mx-auto text-slate-300" />
            <div className="text-sm font-medium text-slate-700">
              {searchTerm ? 'No services matched your search' : 'No tests or services listed yet'}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm
                ? 'Try a different search keyword or clear the filter.'
                : 'Click "Add Service" above to add diagnostic tests offered by your facility.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 text-xs font-semibold"
              >
                <Plus size={14} />
                <span>Add First Service</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Service / Test Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {service.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={service.description || ''}>
                      {service.description || <span className="text-slate-300 italic">No description</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      {service.price !== null && service.price !== undefined
                        ? `₹${Number(service.price).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          service.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {service.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(service)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors"
                          title="Edit Service"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingService(service)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
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
