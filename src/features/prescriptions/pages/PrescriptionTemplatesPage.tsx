import { Drawer } from 'antd';
import {
  CheckCircle2,
  Code2,
  Edit3,
  Eye,
  FileText,
  HelpCircle,
  RefreshCw,
  Save,
  Shield,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { usePermission } from '../../../context/PermissionContext';
import api from '../../../utils/api';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE,
} from '../templates/templateData';
import type { PrescriptionTemplate } from '../types/template';

export const PrescriptionTemplatesPage: React.FC = () => {
  const { canUpdate } = usePermission();
  const isTemplateUpdatable = canUpdate('PRESCRIPTIONS');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showVariablesGuide, setShowVariablesGuide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PrescriptionTemplate>(
    STANDARD_PRESCRIPTION_TEMPLATE,
  );
  const [editHtml, setEditHtml] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('prescription-templates/active');
      if (res.data) {
        setTemplate({
          id: res.data.id || 'template-001',
          name: res.data.name || 'Standard Prescription',
          description: res.data.description || 'A4 Standard Layout',
          html_content: res.data.html_content,
          status: (res.data.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          version: res.data.version || 1,
          updated_at: res.data.updated_at,
          created_at: res.data.created_at || new Date().toISOString(),
        });
        setEditHtml(res.data.html_content);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch template:', err);
      setError('Failed to fetch template from server. Showing local fallback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchActiveTemplate();
  }, []);

  const handleSaveTemplate = async () => {
    if (!isTemplateUpdatable || !editHtml.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.put('prescription-templates/active', {
        id: template.id,
        name: template.name,
        description: template.description,
        html_content: editHtml,
        status: 'ACTIVE',
      });

      const updated = res.data?.data || res.data;
      setTemplate((prev) => ({
        ...prev,
        html_content: updated.html_content || editHtml,
        version: updated.version || (prev.version ? prev.version + 1 : 1),
        updated_at: updated.updated_at || new Date().toISOString(),
      }));

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to save template to server.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Compact Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 tracking-tight m-0">
              Prescription Templates
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Database Architecture
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
              A4 Standard Layout
            </span>
            {template.version && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                v{template.version}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 m-0 truncate">
            Single source of truth in{' '}
            <code className="text-blue-600 font-mono font-semibold">
              prescription_templates
            </code>{' '}
            for Preview and PDF Generation.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => void fetchActiveTemplate()}
            disabled={loading}
            className="h-7.5 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Refresh from Database"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVariablesGuide(true)}
            className="h-7.5 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>Placeholders</span>
          </button>

          {isTemplateUpdatable && (
            <button
              type="button"
              onClick={() => {
                setEditHtml(template.html_content);
                setIsEditing(true);
              }}
              className="h-7.5 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Edit HTML Template</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="h-7.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={13} />
            <span>Preview Design</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>
            Prescription template updated in the database! The Doctor App will automatically use this updated template.
          </span>
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Compact Template Architecture Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-xl px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-700/50 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono text-xs font-bold border border-blue-400/30 shrink-0">
            &lt;/&gt;
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs text-white m-0">
              Database Single Source of Truth
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 m-0 leading-snug">
              Stored in{' '}
              <code className="text-blue-300 font-mono">prescription_templates</code>{' '}
              and fetched dynamically at runtime for instant preview and PDF creation.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold rounded-md shrink-0 self-start sm:self-center">
          <Shield size={12} />
          Single Source of Truth
        </span>
      </div>

      {/* Compact Active Template Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    {template.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    {template.status}
                  </span>
                  {template.version && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Version {template.version}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 m-0 truncate">
                  {template.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isTemplateUpdatable && (
                <button
                  type="button"
                  onClick={() => {
                    setEditHtml(template.html_content);
                    setIsEditing(true);
                  }}
                  className="h-8 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Template</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5">
            <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Layout Format
              </span>
              <span className="text-xs font-bold text-slate-800">
                A4 Portrait (Print &amp; PDF Optimized)
              </span>
            </div>

            <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Database Record
              </span>
              <span className="text-xs font-mono font-medium text-slate-700 truncate block">
                prescription_templates (ACTIVE)
              </span>
            </div>

            <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Last Updated
              </span>
              <span className="text-xs font-bold text-slate-800">
                {template.updated_at
                  ? new Date(template.updated_at).toLocaleString()
                  : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Used automatically when doctors generate prescriptions.</span>
          <span className="font-mono text-slate-400">ID: {template.id}</span>
        </div>
      </div>

      {/* Live HTML Editor Drawer (keeps main Template view single-screen without page scroll) */}
      <Drawer
        open={isEditing}
        onClose={() => setIsEditing(false)}
        width="min(880px, 95vw)"
        destroyOnHidden
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Code2 size={16} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Live Prescription HTML Template Editor
              </div>
              <div className="text-xs text-slate-500 font-normal">
                Ensure placeholders like {'{{patient_name}}'}, {'{{medicines_table}}'}, and{' '}
                {'{{doctor_signature}}'} are retained.
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveTemplate()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save to Database</span>
            </button>
          </div>
        }
      >
        <textarea
          value={editHtml}
          onChange={(e) => setEditHtml(e.target.value)}
          className="w-full h-[calc(100vh-190px)] font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
          placeholder="<html>...</html>"
        />
      </Drawer>

      {/* Contract Placeholders Drawer */}
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
              <li>{'{{diagnosis}}'}</li>
              <li>{'{{symptoms}}'}</li>
              <li>{'{{clinical_notes}}'}</li>
              <li>{'{{medicines_table}}'}</li>
              <li>{'{{lab_tests}}'}</li>
              <li>{'{{additional_notes}}'}</li>
              <li>{'{{follow_up_date}}'}</li>
            </ul>
          </div>
        </div>
      </Drawer>

      {/* Preview Modal */}
      <PrescriptionPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        template={template}
        customData={SAMPLE_ADMIN_PREVIEW_DATA}
      />
    </div>
  );
};
