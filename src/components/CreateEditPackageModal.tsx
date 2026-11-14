import { App, Checkbox, Drawer, Empty, Input, Spin } from 'antd';
import {
  Check,
  CheckSquare,
  Package,
  Pill,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { medicinePackagesApi } from '../api/medicinePackagesApi';
import type { Medicine, MedicinePackage } from '../types/pharmacy';
import { getErrorMessage } from '../utils/errors';
import { CommonFilterBar, type FilterDropdownOption, StatusPill } from './ui/CommonTable';

const { TextArea } = Input;

interface CreateEditPackageModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (pkg: MedicinePackage) => void;
  editingPackage?: MedicinePackage | null;
}

export default function CreateEditPackageModal({
  open,
  onClose,
  onSuccess,
  editingPackage,
}: CreateEditPackageModalProps) {
  const { message } = App.useApp();

  // Package metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Pharmacy medicines catalog
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);

  // Selected medicine IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering & search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dosageFormFilter, setDosageFormFilter] = useState<string>('all');

  // Saving state
  const [submitting, setSubmitting] = useState(false);

  // Modal body scroll ref to ensure top visibility on open
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Wheel forwarding handler to prevent scroll trapping inside the medicines table
  const handleTableWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (e.deltaY < 0 && el.scrollTop <= 0) {
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop += e.deltaY;
      }
    } else if (e.deltaY > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop += e.deltaY;
      }
    }
  };

  // Populate data when modal opens
  useEffect(() => {
    if (!open) return;

    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }

    if (editingPackage) {
      setName(editingPackage.name || '');
      setDescription(editingPackage.description || '');
      setSelectedIds((editingPackage.medicines || []).map((m) => m.id));
    } else {
      setName('');
      setDescription('');
      setSelectedIds([]);
    }

    setSearchTerm('');
    setCategoryFilter('all');
    setDosageFormFilter('all');

    // Fetch existing Pharmacy medicines
    let active = true;
    setLoadingMedicines(true);
    medicinePackagesApi
      .getPharmacyMedicines()
      .then((data) => {
        if (active) {
          setMedicines(data);
        }
      })
      .catch((err) => {
        if (active) {
          message.error(getErrorMessage(err, 'Failed to fetch medicines from Pharmacy'));
        }
      })
      .finally(() => {
        if (active) setLoadingMedicines(false);
      });

    return () => {
      active = false;
    };
  }, [open, editingPackage, message]);

  // Derived unique categories and dosage forms for filters
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.therapeutic_category?.trim()) set.add(m.therapeutic_category.trim());
    });
    return Array.from(set).sort();
  }, [medicines]);

  const dosageForms = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.dosage_form?.trim()) set.add(m.dosage_form.trim());
    });
    return Array.from(set).sort();
  }, [medicines]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return medicines.filter((m) => {
      // Search term matching
      if (term) {
        const matchesName = m.medicine_name.toLowerCase().includes(term);
        const matchesGeneric = m.generic_name?.toLowerCase().includes(term) ?? false;
        const matchesBrand = m.manufacturer?.toLowerCase().includes(term) ?? false;
        const matchesCode = m.medicine_code?.toLowerCase().includes(term) ?? false;
        const matchesCategory = m.therapeutic_category?.toLowerCase().includes(term) ?? false;
        if (!matchesName && !matchesGeneric && !matchesBrand && !matchesCode && !matchesCategory) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if ((m.therapeutic_category || '').trim() !== categoryFilter) {
          return false;
        }
      }

      // Dosage form filter
      if (dosageFormFilter !== 'all') {
        if ((m.dosage_form || '').trim() !== dosageFormFilter) {
          return false;
        }
      }

      return true;
    });
  }, [medicines, searchTerm, categoryFilter, dosageFormFilter]);

  // Toggle selection for a single medicine
  const toggleMedicine = (medId: string) => {
    setSelectedIds((prev) =>
      prev.includes(medId) ? prev.filter((id) => id !== medId) : [...prev, medId]
    );
  };

  // Toggle all currently filtered medicines
  const allFilteredSelected =
    filteredMedicines.length > 0 &&
    filteredMedicines.every((m) => selectedIds.includes(m.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredMedicines.map((m) => m.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredMedicines.map((m) => m.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  // Selected medicines lookup for summary pills
  const selectedMedicinesMap = useMemo(() => {
    const map = new Map<string, Medicine>();
    medicines.forEach((m) => map.set(m.id, m));
    // Also include any medicines from editing package if not present in main list
    if (editingPackage?.medicines) {
      editingPackage.medicines.forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, m);
      });
    }
    return map;
  }, [medicines, editingPackage]);

  // Handle Save / Submit
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      message.error('Please enter a Package Name');
      return;
    }

    if (selectedIds.length === 0) {
      message.error('Please select at least one medicine from the Pharmacy list');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPackage) {
        const updated = await medicinePackagesApi.update(editingPackage.id, {
          name: trimmedName,
          description: description.trim() || null,
          medicineIds: selectedIds,
        });
        message.success(`Package "${updated?.name || trimmedName}" updated successfully!`);
        onSuccess(updated);
        onClose();
      } else {
        const created = await medicinePackagesApi.create({
          name: trimmedName,
          description: description.trim() || null,
          medicineIds: selectedIds,
        });
        message.success(`Medicine Package "${created?.name || trimmedName}" created successfully!`);
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to save Medicine Package'));
    } finally {
      setSubmitting(false);
    }
  };

  const filterDropdowns: FilterDropdownOption[] = useMemo(() => {
    const list: FilterDropdownOption[] = [];
    if (categories.length > 0) {
      list.push({
        id: 'category',
        label: 'Category',
        allLabel: 'All Categories',
        value: categoryFilter === 'all' ? '' : categoryFilter,
        onChange: (val) => setCategoryFilter(val || 'all'),
        options: categories.map((c) => ({ label: c, value: c })),
      });
    }
    if (dosageForms.length > 0) {
      list.push({
        id: 'dosageForm',
        label: 'Dosage Form',
        allLabel: 'All Dosage Forms',
        value: dosageFormFilter === 'all' ? '' : dosageFormFilter,
        onChange: (val) => setDosageFormFilter(val || 'all'),
        options: dosageForms.map((df) => ({ label: df, value: df })),
      });
    }
    return list;
  }, [categories, dosageForms, categoryFilter, dosageFormFilter]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1150px, 95vw)"
      destroyOnHidden
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '20px 24px 36px 24px',
          background: '#f8fafc',
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Package size={18} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-slate-900 leading-snug">
              {editingPackage ? 'Edit Medicine Package' : 'Create Medicine Package'}
            </div>
            <div className="text-xs text-slate-500 font-normal">
              Group multiple pharmacy medicines together into one reusable package
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            <strong className={selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}>
              {selectedIds.length}
            </strong>{' '}
            medicine(s) selected
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spin size="small" /> Saving...
                </>
              ) : (
                <>
                  <Check size={14} /> {editingPackage ? 'Save Changes' : 'Save Package'}
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={modalScrollRef}
        className="package-modal-scroll"
        style={{
          maxHeight: 'calc(88vh - 70px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <style>{`
          .package-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .package-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .package-table-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .package-table-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .package-table-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .package-table-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Section 1: Package Basic Information */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Package Information
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Package Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Post-Surgery Recovery Pack, Fever & Cold Relief"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                size="middle"
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Clinical Purpose{' '}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <TextArea
                placeholder="e.g. Recommended combination for routine viral flu symptoms and body aches"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
                style={{ borderRadius: 8, resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Selected Medicines Review Bar */}
        <div
          className={`rounded-lg border px-4 py-3 shadow-2xs transition-colors ${
            selectedIds.length > 0
              ? 'border-blue-200 bg-blue-50/70'
              : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Pill
                size={15}
                className={selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}
              />
              <span className="text-xs font-bold text-slate-900">
                Selected Medicines ({selectedIds.length})
              </span>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear all selected
              </button>
            )}
          </div>

          {selectedIds.length === 0 ? (
            <div className="text-xs text-slate-500">
              No medicines selected yet. Use the checkboxes in the Pharmacy list below to add medicines to this package.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pt-1">
              {selectedIds.map((id) => {
                const med = selectedMedicinesMap.get(id);
                const title = med ? med.medicine_name : `Medicine #${id.slice(0, 6)}`;
                const strength = med?.strength ? ` (${med.strength} ${med.strength_unit || ''})` : '';
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-200 bg-white text-blue-700 text-xs font-semibold shadow-2xs"
                  >
                    <span>
                      {title}
                      {strength}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleMedicine(id)}
                      aria-label={`Remove ${title}`}
                      className="text-blue-400 hover:text-blue-700 cursor-pointer flex items-center"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Pharmacy Medicine Catalog with Checkboxes */}
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                2. Select Medicines from Pharmacy
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Choose from existing medicines. Duplicate records will not be created.
              </div>
            </div>

            {filteredMedicines.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className={`inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  allFilteredSelected
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{allFilteredSelected ? 'Deselect Filtered' : 'Select All Filtered'}</span>
              </button>
            )}
          </div>

          {/* Common Filter Bar for Search & Filters */}
          <CommonFilterBar
            className="!justify-start"
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by medicine name, generic, brand, or code..."
            dropdowns={filterDropdowns}
            hasActiveFilters={
              Boolean(searchTerm.trim()) || categoryFilter !== 'all' || dosageFormFilter !== 'all'
            }
            onReset={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setDosageFormFilter('all');
            }}
          />

          {/* Medicines Checklist Table */}
          <div
            onWheel={handleTableWheel}
            className="package-table-scroll max-h-[380px] overflow-y-auto overscroll-auto"
          >
            {loadingMedicines ? (
              <div className="py-10 text-center">
                <Spin tip="Loading Pharmacy medicines catalog..." />
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="py-9 text-center">
                <Empty
                  description={
                    medicines.length === 0
                      ? 'No medicines available in the Pharmacy module yet.'
                      : 'No medicines match your search criteria.'
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#f8fafc] border-b border-slate-200/90 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2 w-11 text-center">
                      <Checkbox
                        checked={allFilteredSelected}
                        indeterminate={
                          !allFilteredSelected &&
                          filteredMedicines.some((m) => selectedIds.includes(m.id))
                        }
                        onChange={toggleSelectAllFiltered}
                      />
                    </th>
                    <th className="px-3.5 py-2 whitespace-nowrap">Medicine Name</th>
                    <th className="px-3.5 py-2 whitespace-nowrap">Brand / Manufacturer</th>
                    <th className="px-3.5 py-2 whitespace-nowrap">Category</th>
                    <th className="px-3.5 py-2 whitespace-nowrap">Dosage Form & Strength</th>
                    <th className="px-3.5 py-2 whitespace-nowrap">Price</th>
                    <th className="px-3.5 py-2 whitespace-nowrap text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {filteredMedicines.map((m) => {
                    const isSelected = selectedIds.includes(m.id);
                    const strengthDisplay = [m.strength, m.strength_unit].filter(Boolean).join(' ');
                    const categoryDisplay = [m.therapeutic_category, m.sub_category]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <tr
                        key={m.id}
                        onClick={() => toggleMedicine(m.id)}
                        className={`transition-colors duration-100 cursor-pointer ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70 bg-white'
                        }`}
                      >
                        <td
                          className="px-3.5 py-2 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleMedicine(m.id)}
                          />
                        </td>
                        <td className="px-3.5 py-2 align-middle">
                          <div
                            className={`font-semibold ${
                              isSelected ? 'text-blue-700' : 'text-slate-900'
                            }`}
                          >
                            {m.medicine_name}
                          </div>
                          {m.generic_name && (
                            <div className="text-[11px] text-slate-500">
                              Generic: {m.generic_name}
                            </div>
                          )}
                          {m.medicine_code && (
                            <div className="text-[10.5px] text-slate-400 font-mono">
                              Code: {m.medicine_code}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2 align-middle text-slate-700">
                          {m.manufacturer || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3.5 py-2 align-middle text-slate-600">
                          {categoryDisplay || <span className="text-slate-400">General</span>}
                        </td>
                        <td className="px-3.5 py-2 align-middle">
                          <div className="font-semibold text-slate-800">
                            {m.dosage_form || 'Tablet'}
                          </div>
                          {strengthDisplay && (
                            <div className="text-[11px] text-blue-600 font-medium">
                              {strengthDisplay}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2 align-middle tabular-nums">
                          {m.final_price != null ? (
                            <span className="font-semibold text-slate-900">
                              ₹{Number(m.final_price).toFixed(2)}
                            </span>
                          ) : m.mrp != null ? (
                            <span className="font-semibold text-slate-900">
                              ₹{Number(m.mrp).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 align-middle text-center">
                          <StatusPill
                            active={m.status !== 'Inactive'}
                            label={m.status || 'Active'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      </div>
    </Drawer>
  );
}

export const CreateEditPackageDrawer = CreateEditPackageModal;
