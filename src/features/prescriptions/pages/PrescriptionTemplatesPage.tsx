import { Drawer, message, Popconfirm, Tooltip } from 'antd';
import {
  Building2,
  CheckCircle2,
  Code2,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  History,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import api from '../../../utils/api';
import { PrescriptionTemplateBuilderModal } from '../components/builder/PrescriptionTemplateBuilderModal';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import { TemplateCreationSelectionModal } from '../components/TemplateCreationSelectionModal';
import { prescriptionTemplatesApi } from '../services/prescriptionTemplatesApi';
import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE,
} from '../templates/templateData';
import type { PrescriptionTemplate, TemplateLayoutConfig } from '../types/template';

interface HospitalOption {
  id: string;
  name: string;
  code?: string;
}

export const PrescriptionTemplatesPage: React.FC = () => {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const isTemplateCreatable = canCreate('PRESCRIPTIONS');
  const isTemplateUpdatable = canUpdate('PRESCRIPTIONS');
  const isTemplateDeletable = canDelete('PRESCRIPTIONS');

  // State
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('all');
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [creationSelectionOpen, setCreationSelectionOpen] = useState(false);
  const [builderCreationMode, setBuilderCreationMode] = useState<'default' | 'blank'>('default');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PrescriptionTemplate | null>(null);
  const [showVariablesGuide, setShowVariablesGuide] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleSelectCreationMode = (mode: 'default' | 'blank') => {
    setCreationSelectionOpen(false);
    setBuilderCreationMode(mode);
    setEditingTemplate(null);
    setBuilderOpen(true);
  };

  // Fetch Hospitals List
  const fetchHospitals = async () => {
    try {
      const res = await api.get('hospitals');
      const hospList: HospitalOption[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      setHospitals(hospList);
      if (hospList.length > 0 && hospList[0]?.id && selectedHospitalId === 'all') {
        setSelectedHospitalId(hospList[0].id);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    }
  };

  // Fetch Templates for Selected Hospital
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const targetHospital = selectedHospitalId === 'all' ? null : selectedHospitalId;
      const data = await prescriptionTemplatesApi.getAllTemplates({
        hospitalId: targetHospital,
      });
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
      message.error('Failed to load prescription templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHospitals();
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [selectedHospitalId]);

  // Selected Hospital Name
  const selectedHospitalName = useMemo(() => {
    if (selectedHospitalId === 'all') return 'All Hospitals';
    return hospitals.find((h) => h.id === selectedHospitalId)?.name || 'Active Hospital';
  }, [hospitals, selectedHospitalId]);

  // Separate Active Template and Others
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.status === 'ACTIVE') || STANDARD_PRESCRIPTION_TEMPLATE;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || t.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, statusFilter]);

  // Save / Update in Builder
  const handleSaveFromBuilder = async (payload: {
    id?: string;
    name: string;
    description: string;
    html_content: string;
    layout_config?: TemplateLayoutConfig;
    status: 'ACTIVE' | 'DRAFT';
    hospital_id?: string | null;
  }) => {
    try {
      setSavingTemplate(true);
      if (payload.id && payload.id !== 'default-standard-a4') {
        await prescriptionTemplatesApi.updateTemplate(payload.id, payload);
        message.success(
          payload.status === 'ACTIVE'
            ? 'Template updated & activated successfully!'
            : 'Template draft saved successfully!'
        );
      } else {
        await prescriptionTemplatesApi.createTemplate(payload);
        message.success(
          payload.status === 'ACTIVE'
            ? 'New template created & activated!'
            : 'New draft template created!'
        );
      }
      setBuilderOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      message.error(err?.response?.data?.error || err?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Activate Template
  const handleActivateTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      await prescriptionTemplatesApi.activateTemplate(
        templateId,
        selectedHospitalId === 'all' ? null : selectedHospitalId
      );
      message.success('Prescription template activated! Consulting doctors will now use this design.');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Failed to activate template:', err);
      message.error(err?.response?.data?.error || err?.message || 'Failed to activate template');
    } finally {
      setLoading(false);
    }
  };

  // Duplicate Template
  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      await prescriptionTemplatesApi.duplicateTemplate(
        templateId,
        selectedHospitalId === 'all' ? null : selectedHospitalId
      );
      message.success('Template duplicated as draft for editing.');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Failed to duplicate template:', err);
      message.error(err?.response?.data?.error || err?.message || 'Failed to duplicate template');
    } finally {
      setLoading(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      await prescriptionTemplatesApi.deleteTemplate(templateId);
      message.success('Template deleted successfully.');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      message.error(err?.response?.data?.error || err?.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header Row with Hospital Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 tracking-tight m-0">
              Prescription Template Builder
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Multi-Tenant Architecture
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              A4 Print Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            Design hospital letterheads, customize doctor credentials, and configure consultation prescription layouts.
          </p>
        </div>

        {/* Header Actions & Hospital Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hospital Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Building2 size={13} className="text-slate-500" />
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Hospitals (System Default)</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.code ? `(${h.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void fetchTemplates()}
            disabled={loading}
            className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Refresh Templates"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVariablesGuide(true)}
            className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>Placeholders</span>
          </button>

          {isTemplateCreatable && (
            <button
              type="button"
              onClick={() => {
                setCreationSelectionOpen(true);
              }}
              className="h-8 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Featured Active Template Card for Selected Hospital */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/30 rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/70">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    {activeTemplate.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    CURRENTLY ACTIVE
                  </span>
                  {activeTemplate.version && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      v{activeTemplate.version}
                    </span>
                  )}
                  {activeTemplate.is_default && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      System Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 m-0 truncate">
                  {activeTemplate.description || 'Active prescription layout used for all consultations.'}
                </p>
              </div>
            </div>

            {/* Actions for Active Template */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTemplate(activeTemplate)}
                className="h-8 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>

              {isTemplateUpdatable && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(activeTemplate);
                    setBuilderOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Palette size={13} />
                  <span>Design in Studio</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Template Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 text-xs">
            <div className="px-3.5 py-2.5 bg-white rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Hospital Scope
              </span>
              <span className="font-bold text-slate-800 truncate block">
                {selectedHospitalName}
              </span>
            </div>

            <div className="px-3.5 py-2.5 bg-white rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Layout Engine
              </span>
              <span className="font-bold text-slate-800 block">
                A4 Portrait (Print &amp; PDF Optimized)
              </span>
            </div>

            <div className="px-3.5 py-2.5 bg-white rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Last Updated
              </span>
              <span className="font-bold text-slate-800 block">
                {activeTemplate.updated_at
                  ? new Date(activeTemplate.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'System Default'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>Doctors automatically prescribe using this design. Changes reflect immediately.</span>
          <span className="font-mono text-slate-400 text-[10px]">ID: {activeTemplate.id}</span>
        </div>
      </div>

      {/* Catalog & Version History Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
              Templates Catalog &amp; Versions ({filteredTemplates.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates..."
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Drafts Only</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Templates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Template Name</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Version</th>
                <th className="py-2.5 px-4">Hospital / Scope</th>
                <th className="py-2.5 px-4">Last Updated</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No prescription templates found. Click <strong>Create Template</strong> to build one.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isActive = tpl.status === 'ACTIVE';
                  const isDefault = Boolean(tpl.is_default);

                  return (
                    <tr key={tpl.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tpl.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {tpl.description || 'A4 prescription template'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tpl.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isActive && <CheckCircle2 size={10} />}
                          {tpl.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        v{tpl.version || 1}
                      </td>

                      <td className="py-3 px-4">
                        {isDefault && !tpl.hospital_id ? (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">
                            Global Default
                          </span>
                        ) : (
                          <span className="text-slate-700 font-medium">
                            {hospitals.find((h) => h.id === tpl.hospital_id)?.name || 'Hospital Custom'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {tpl.updated_at ? new Date(tpl.updated_at).toLocaleDateString() : 'System'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview */}
                          <Tooltip title="Preview A4 Layout">
                            <button
                              type="button"
                              onClick={() => setPreviewTemplate(tpl)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                          </Tooltip>

                          {/* Design / Edit */}
                          {isTemplateUpdatable && (
                            <Tooltip title="Open in Visual Studio Builder">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTemplate(tpl);
                                  setBuilderOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Palette size={14} />
                              </button>
                            </Tooltip>
                          )}

                          {/* Duplicate */}
                          {isTemplateCreatable && (
                            <Tooltip title="Duplicate as new Draft">
                              <button
                                type="button"
                                onClick={() => void handleDuplicateTemplate(tpl.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 cursor-pointer"
                              >
                                <Copy size={14} />
                              </button>
                            </Tooltip>
                          )}

                          {/* Activate */}
                          {!isActive && isTemplateUpdatable && (
                            <Tooltip title="Set as Active for this hospital">
                              <button
                                type="button"
                                onClick={() => void handleActivateTemplate(tpl.id)}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer"
                              >
                                Activate
                              </button>
                            </Tooltip>
                          )}

                          {/* Delete (only for non-default drafts/archived) */}
                          {!isActive && !isDefault && isTemplateDeletable && (
                            <Popconfirm
                              title="Delete template?"
                              description="Are you sure you want to delete this template record?"
                              onConfirm={() => void handleDeleteTemplate(tpl.id)}
                              okText="Delete"
                              okType="danger"
                            >
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete Template"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Popconfirm>
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
      </div>

      {/* Contract Placeholders Guide Drawer */}
      <Drawer
        open={showVariablesGuide}
        onClose={() => setShowVariablesGuide(false)}
        width="min(760px, 94vw)"
        destroyOnHidden
        title={
          <div className="flex items-center gap-2">
            <Code2 size={17} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-900">
              Predefined Template Placeholders Contract
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Hospital &amp; Branch
            </h4>
            <ul className="space-y-1 font-mono text-[11px] text-slate-600">
              <li>{'{{hospital_logo}}'}</li>
              <li>{'{{hospital_name}}'}</li>
              <li>{'{{hospital_address}}'}</li>
              <li>{'{{hospital_phone}}'}</li>
              <li>{'{{hospital_email}}'}</li>
              <li>{'{{branch_name}}'}</li>
              <li>{'{{branch_address}}'}</li>
              <li>{'{{branch_phone}}'}</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Doctor
            </h4>
            <ul className="space-y-1 font-mono text-[11px] text-slate-600">
              <li>{'{{doctor_name}}'}</li>
              <li>{'{{doctor_specialization}}'}</li>
              <li>{'{{doctor_qualification}}'}</li>
              <li>{'{{doctor_registration_number}}'}</li>
              <li>{'{{doctor_phone}}'}</li>
              <li>{'{{doctor_email}}'}</li>
              <li>{'{{doctor_signature}}'}</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Patient &amp; Clinical Data
            </h4>
            <ul className="space-y-1 font-mono text-[11px] text-slate-600">
              <li>{'{{patient_name}}'}</li>
              <li>{'{{patient_id}}'}</li>
              <li>{'{{patient_age}}'}</li>
              <li>{'{{patient_gender}}'}</li>
              <li>{'{{patient_phone}}'}</li>
              <li>{'{{vitals_html}}'}</li>
              <li>{'{{diagnosis}}'}</li>
              <li>{'{{medicines_table}}'}</li>
              <li>{'{{lab_tests}}'}</li>
              <li>{'{{additional_notes}}'}</li>
              <li>{'{{follow_up_date}}'}</li>
            </ul>
          </div>
        </div>
      </Drawer>

      {/* Template Creation Selection Modal */}
      <TemplateCreationSelectionModal
        isOpen={creationSelectionOpen}
        onClose={() => setCreationSelectionOpen(false)}
        onSelectOption={handleSelectCreationMode}
        hospitalName={selectedHospitalName}
      />

      {/* Visual Studio Builder Modal */}
      {builderOpen && (
        <PrescriptionTemplateBuilderModal
          isOpen={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          initialMode={editingTemplate ? 'default' : builderCreationMode}
          hospitalId={selectedHospitalId === 'all' ? null : selectedHospitalId}
          hospitalName={selectedHospitalName}
          onSave={handleSaveFromBuilder}
          saving={savingTemplate}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <PrescriptionPreviewModal
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
          customData={SAMPLE_ADMIN_PREVIEW_DATA}
        />
      )}
    </div>
  );
};
