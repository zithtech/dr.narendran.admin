import { App, Checkbox, Drawer, Empty, Input, Select, Spin, Tag } from 'antd';
import {
  Check,
  CheckSquare,
  Package,
  Pill,
  Search,
  Square,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { medicinePackagesApi } from '../api/medicinePackagesApi';
import type { Medicine, MedicinePackage } from '../types/pharmacy';
import { getErrorMessage } from '../utils/errors';

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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1150px, 95vw)"
      destroyOnClose
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <Package size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {editingPackage ? 'Edit Medicine Package' : 'Create Medicine Package'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Group multiple pharmacy medicines together into one reusable package
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>
            <strong style={{ color: selectedIds.length > 0 ? '#7c3aed' : '#94a3b8' }}>
              {selectedIds.length}
            </strong>{' '}
            medicine(s) selected
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="ui-btn"
              onClick={onClose}
              disabled={submitting}
              style={{ fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={handleSave}
              disabled={submitting}
              style={{
                fontSize: 13,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
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
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            1. Package Information
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Package Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <Input
                placeholder="e.g. Post-Surgery Recovery Pack, Fever & Cold Relief"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                size="middle"
                style={{ borderRadius: 6 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Description / Clinical Purpose <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
              </label>
              <TextArea
                placeholder="e.g. Recommended combination for routine viral flu symptoms and body aches"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
                style={{ borderRadius: 6, resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Selected Medicines Review Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: selectedIds.length > 0 ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
            background: selectedIds.length > 0 ? '#f5f3ff' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={15} style={{ color: selectedIds.length > 0 ? '#7c3aed' : '#94a3b8' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Selected Medicines ({selectedIds.length})
              </span>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear all selected
              </button>
            )}
          </div>

          {selectedIds.length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              No medicines selected yet. Use the checkboxes in the Pharmacy list below to add medicines to this package.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto', paddingTop: 4 }}>
              {selectedIds.map((id) => {
                const med = selectedMedicinesMap.get(id);
                const title = med ? med.medicine_name : `Medicine #${id.slice(0, 6)}`;
                const strength = med?.strength ? ` (${med.strength} ${med.strength_unit || ''})` : '';
                return (
                  <Tag
                    key={id}
                    closable
                    onClose={() => toggleMedicine(id)}
                    color="purple"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{title}{strength}</span>
                  </Tag>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Pharmacy Medicine Catalog with Checkboxes */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          {/* Search & Filter Header */}
          <div
            style={{
              padding: '12px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  2. Select Medicines from Pharmacy
                </span>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Choose from existing medicines. Duplicate records will not be created.
                </div>
              </div>

              {filteredMedicines.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="ui-btn ui-btn-sm"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderColor: allFilteredSelected ? '#ddd6fe' : '#e2e8f0',
                    background: allFilteredSelected ? '#f5f3ff' : '#ffffff',
                    color: allFilteredSelected ? '#7c3aed' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{allFilteredSelected ? 'Deselect Filtered' : 'Select All Filtered'}</span>
                </button>
              )}
            </div>

            {/* Filter controls bar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Input
                  prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
                  placeholder="Search by medicine name, generic, brand, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  size="middle"
                  style={{ borderRadius: 6 }}
                />
              </div>

              {categories.length > 0 && (
                <div style={{ width: 170 }}>
                  <Select
                    value={categoryFilter}
                    onChange={(val) => setCategoryFilter(val)}
                    style={{ width: '100%' }}
                    placeholder="All Categories"
                    options={[
                      { label: 'All Categories', value: 'all' },
                      ...categories.map((c) => ({ label: c, value: c })),
                    ]}
                  />
                </div>
              )}

              {dosageForms.length > 0 && (
                <div style={{ width: 150 }}>
                  <Select
                    value={dosageFormFilter}
                    onChange={(val) => setDosageFormFilter(val)}
                    style={{ width: '100%' }}
                    placeholder="All Dosage Forms"
                    options={[
                      { label: 'All Dosage Forms', value: 'all' },
                      ...dosageForms.map((df) => ({ label: df, value: df })),
                    ]}
                  />
                </div>
              )}

              {(searchTerm || categoryFilter !== 'all' || dosageFormFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setDosageFormFilter('all');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Medicines Checklist Table */}
          <div
            onWheel={handleTableWheel}
            className="package-table-scroll"
            style={{ maxHeight: 380, overflowY: 'auto', overscrollBehavior: 'auto' }}
          >
            {loadingMedicines ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Spin tip="Loading Pharmacy medicines catalog..." />
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center' }}>
                <Empty
                  description={
                    medicines.length === 0
                      ? 'No medicines available in the Pharmacy module yet.'
                      : 'No medicines match your search criteria.'
                  }
                />
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', width: 44, textAlign: 'center' }}>
                      <Checkbox
                        checked={allFilteredSelected}
                        indeterminate={!allFilteredSelected && filteredMedicines.some((m) => selectedIds.includes(m.id))}
                        onChange={toggleSelectAllFiltered}
                      />
                    </th>
                    <th style={{ padding: '8px 12px' }}>Medicine Name</th>
                    <th style={{ padding: '8px 12px' }}>Brand / Manufacturer</th>
                    <th style={{ padding: '8px 12px' }}>Category</th>
                    <th style={{ padding: '8px 12px' }}>Dosage Form & Strength</th>
                    <th style={{ padding: '8px 12px' }}>Price</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((m) => {
                    const isSelected = selectedIds.includes(m.id);
                    const strengthDisplay = [m.strength, m.strength_unit].filter(Boolean).join(' ');
                    const categoryDisplay = [m.therapeutic_category, m.sub_category].filter(Boolean).join(' · ');

                    return (
                      <tr
                        key={m.id}
                        onClick={() => toggleMedicine(m.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td
                          style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'middle' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleMedicine(m.id)}
                          />
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 650, color: isSelected ? '#6d28d9' : '#0f172a' }}>
                            {m.medicine_name}
                          </div>
                          {m.generic_name && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              Generic: {m.generic_name}
                            </div>
                          )}
                          {m.medicine_code && (
                            <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>
                              Code: {m.medicine_code}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', color: '#334155' }}>
                          {m.manufacturer || <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', color: '#475569' }}>
                          {categoryDisplay || <span style={{ color: '#cbd5e1' }}>General</span>}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {m.dosage_form || 'Tablet'}
                          </div>
                          {strengthDisplay && (
                            <div style={{ fontSize: 11, color: '#6d28d9' }}>
                              {strengthDisplay}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          {m.final_price != null ? (
                            <span style={{ fontWeight: 650, color: '#0f172a' }}>₹{Number(m.final_price).toFixed(2)}</span>
                          ) : m.mrp != null ? (
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{Number(m.mrp).toFixed(2)}</span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <Tag
                            color={m.status === 'Active' ? 'cyan' : 'default'}
                            style={{ fontSize: 11, margin: 0 }}
                          >
                            {m.status || 'Active'}
                          </Tag>
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
