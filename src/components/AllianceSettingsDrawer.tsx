import { App } from 'antd';
import {
  AlertCircle,
  FolderTree,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type { AllianceCategory, AllianceSpecialization } from '../types/allianceDoctor';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Drawer } from './ui/Drawer';
import { Badge } from './ui/primitives';

interface AllianceSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  initialTab?: 'CATEGORY' | 'SPECIALIZATION';
}

export default function AllianceSettingsDrawer({
  isOpen,
  onClose,
  onUpdated,
  initialTab = 'CATEGORY',
}: AllianceSettingsDrawerProps) {
  const { message, modal } = App.useApp();
  const [activeTab, setActiveTab] = useState<'CATEGORY' | 'SPECIALIZATION'>(initialTab);

  // Categories state
  const [categories, setCategories] = useState<AllianceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Specializations state
  const [specializations, setSpecializations] = useState<AllianceSpecialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [specializationSearch, setSpecializationSearch] = useState('');

  // Form states (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      void fetchCategories();
      void fetchSpecializations();
      closeForm();
    }
  }, [isOpen, initialTab]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get<{ data: AllianceCategory[] }>('alliances/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSpecializations = async () => {
    setLoadingSpecializations(true);
    try {
      const res = await api.get<{ data: AllianceSpecialization[] }>('alliances/specializations');
      setSpecializations(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch specializations:', err);
    } finally {
      setLoadingSpecializations(false);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setFormError(null);
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: AllianceCategory | AllianceSpecialization) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormStatus(item.status || 'ACTIVE');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Name is required');
      return;
    }
    if (cleanName.length < 2) {
      setFormError('Name must be at least 2 characters');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    const endpoint = activeTab === 'CATEGORY' ? 'alliances/categories' : 'alliances/specializations';
    const singularNoun = activeTab === 'CATEGORY' ? 'Category' : 'Specialization';

    try {
      const payload = {
        name: cleanName,
        description: formDescription.trim() || null,
        status: formStatus,
      };

      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
        void message.success(`${singularNoun} updated successfully`);
      } else {
        await api.post(endpoint, payload);
        void message.success(`${singularNoun} added successfully`);
      }

      closeForm();
      if (activeTab === 'CATEGORY') {
        void fetchCategories();
      } else {
        void fetchSpecializations();
      }
      onUpdated?.();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, `Failed to save ${singularNoun.toLowerCase()}`));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (item: AllianceCategory | AllianceSpecialization) => {
    const endpoint = activeTab === 'CATEGORY' ? 'alliances/categories' : 'alliances/specializations';
    const singularNoun = activeTab === 'CATEGORY' ? 'Category' : 'Specialization';

    modal.confirm({
      title: `Delete ${singularNoun}?`,
      content: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`${endpoint}/${item.id}`);
          void message.success(`${singularNoun} deleted successfully`);
          if (editingId === item.id) {
            closeForm();
          }
          if (activeTab === 'CATEGORY') {
            void fetchCategories();
          } else {
            void fetchSpecializations();
          }
          onUpdated?.();
        } catch (err: any) {
          void message.error(
            err.response?.data?.error || `Failed to delete ${singularNoun.toLowerCase()}`,
          );
        }
      },
    });
  };

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  }, [categories, categorySearch]);

  const filteredSpecializations = useMemo(() => {
    const q = specializationSearch.toLowerCase().trim();
    if (!q) return specializations;
    return specializations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }, [specializations, specializationSearch]);

  const isCategoryTab = activeTab === 'CATEGORY';

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title="Alliances Settings"
      subtitle="Manage doctor categories & specializations for partner alliances"
      icon={<Settings size={18} className="text-blue-600" />}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {isCategoryTab
              ? `${categories.length} total categories`
              : `${specializations.length} total specializations`}
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-neutral text-xs px-4 py-1.5 h-8"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              setActiveTab('CATEGORY');
              closeForm();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isCategoryTab
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FolderTree size={14} className={isCategoryTab ? 'text-blue-600' : 'text-slate-400'} />
            <span>Category</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isCategoryTab ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SPECIALIZATION');
              closeForm();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isCategoryTab
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Stethoscope size={14} className={!isCategoryTab ? 'text-blue-600' : 'text-slate-400'} />
            <span>Specialization</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                !isCategoryTab ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {specializations.length}
            </span>
          </button>
        </div>

        {/* Toolbar: Search, Refresh, Add Button */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder={isCategoryTab ? 'Search categories…' : 'Search specializations…'}
              value={isCategoryTab ? categorySearch : specializationSearch}
              onChange={(e) =>
                isCategoryTab
                  ? setCategorySearch(e.target.value)
                  : setSpecializationSearch(e.target.value)
              }
              className="ui-input text-xs h-8 pl-8 pr-3 w-full rounded-lg"
            />
            {(isCategoryTab ? categorySearch : specializationSearch) && (
              <button
                type="button"
                onClick={() => (isCategoryTab ? setCategorySearch('') : setSpecializationSearch(''))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isCategoryTab) void fetchCategories();
                else void fetchSpecializations();
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Refresh list"
              aria-label="Refresh"
            >
              <RefreshCw
                size={13}
                className={isCategoryTab ? (loadingCategories ? 'animate-spin' : '') : (loadingSpecializations ? 'animate-spin' : '')}
              />
            </button>

            {!isFormOpen && (
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={13} strokeWidth={2.4} />
                <span>Add {isCategoryTab ? 'Category' : 'Specialization'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Add / Edit Form Card */}
        {isFormOpen && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-blue-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {editingId ? `Edit ${isCategoryTab ? 'Category' : 'Specialization'}` : `Add New ${isCategoryTab ? 'Category' : 'Specialization'}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50"
              >
                <X size={14} />
              </button>
            </div>

            {formError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{isCategoryTab ? 'Category Name' : 'Specialization Name'}</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isCategoryTab
                      ? 'e.g. Cardiology, Orthopedics, Pediatrics'
                      : 'e.g. Interventional Cardiology, Spine Surgery'
                  }
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.slice(0, 150))}
                  className="ui-input text-xs h-8.5 rounded-lg w-full bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description or medical scope notes"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value.slice(0, 500))}
                  className="ui-input text-xs rounded-lg w-full bg-white py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      checked={formStatus === 'ACTIVE'}
                      onChange={() => setFormStatus('ACTIVE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      checked={formStatus === 'INACTIVE'}
                      onChange={() => setFormStatus('INACTIVE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/60">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  {formLoading
                    ? 'Saving…'
                    : editingId
                      ? `Update ${isCategoryTab ? 'Category' : 'Specialization'}`
                      : `Save ${isCategoryTab ? 'Category' : 'Specialization'}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Data Table / List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="max-h-[500px] overflow-y-auto">
            {isCategoryTab ? (
              loadingCategories && categories.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading categories…</div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {categorySearch ? 'No categories matching search' : 'No categories configured yet'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Category Name</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 w-20">Status</th>
                      <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {cat.description || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge tone={cat.status === 'ACTIVE' ? 'green' : 'neutral'}>
                            {cat.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(cat)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              loadingSpecializations && specializations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading specializations…</div>
              ) : filteredSpecializations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {specializationSearch ? 'No specializations matching search' : 'No specializations configured yet'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Specialization Name</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 w-20">Status</th>
                      <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSpecializations.map((spec) => (
                      <tr key={spec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{spec.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {spec.description || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge tone={spec.status === 'ACTIVE' ? 'green' : 'neutral'}>
                            {spec.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(spec)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Specialization"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(spec)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Specialization"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

