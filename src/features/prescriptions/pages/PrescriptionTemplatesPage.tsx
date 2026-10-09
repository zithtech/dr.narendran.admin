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
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import api from "../../../utils/api";
import { PrescriptionPreviewModal } from "../components/PrescriptionPreviewModal";
import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE,
} from "../templates/templateData";
import type { PrescriptionTemplate } from "../types/template";

export const PrescriptionTemplatesPage: React.FC = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showVariablesGuide, setShowVariablesGuide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PrescriptionTemplate>(
    STANDARD_PRESCRIPTION_TEMPLATE
  );
  const [editHtml, setEditHtml] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("prescription-templates/active");
      if (res.data) {
        setTemplate({
          id: res.data.id || "template-001",
          name: res.data.name || "Standard Prescription",
          description: res.data.description || "A4 Standard Layout",
          html_content: res.data.html_content,
          status: (res.data.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
          version: res.data.version || 1,
          updated_at: res.data.updated_at,
          created_at: res.data.created_at || new Date().toISOString(),
        });
        setEditHtml(res.data.html_content);
      }
    } catch (err: any) {
      console.error("Failed to fetch template:", err);
      setError("Failed to fetch template from server. Showing local fallback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTemplate();
  }, []);

  const handleSaveTemplate = async () => {
    if (!editHtml.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.put("prescription-templates/active", {
        id: template.id,
        name: template.name,
        description: template.description,
        html_content: editHtml,
        status: "ACTIVE",
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
      console.error("Failed to save template:", err);
      setError(err?.response?.data?.error || err?.message || "Failed to save template to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fadeIn w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Database Template Architecture
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              A4 Standard Layout
            </span>
            {template.version && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                v{template.version}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Prescription Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Single source of truth in the database (<code className="text-sky-600 font-mono font-semibold">prescription_templates</code>). Updates made here are immediately fetched and reflected across the Doctor App for both Preview and PDF Generation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchActiveTemplate}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
            title="Refresh from Database"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-sky-600" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowVariablesGuide(!showVariablesGuide)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
          >
            <HelpCircle size={14} />
            {showVariablesGuide ? "Hide Placeholders" : "View Contract Placeholders"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setEditHtml(template.html_content);
                setIsEditing(true);
              }
            }}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
          >
            {isEditing ? <X size={14} /> : <Edit3 size={14} />}
            {isEditing ? "Cancel Edit" : "Edit HTML Template"}
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Eye size={14} />
            Preview Design
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Prescription template updated in the database! The Doctor App will automatically use this updated template.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      {/* HTML Editor Section (when active) */}
      {isEditing && (
        <div className="bg-white rounded-2xl border border-sky-300 shadow-lg p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Code2 size={20} className="text-sky-600" />
              <h3 className="font-bold text-base text-slate-900">
                Live Prescription HTML Template Editor
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save to Database
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Edit the HTML template below. Ensure all essential placeholders like <code className="text-sky-600 font-mono">{"{{patient_name}}"}</code>, <code className="text-sky-600 font-mono">{"{{medicines_table}}"}</code>, and <code className="text-sky-600 font-mono">{"{{doctor_signature}}"}</code> are retained.
          </p>

          <textarea
            value={editHtml}
            onChange={(e) => setEditHtml(e.target.value)}
            rows={18}
            className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed resize-y"
            placeholder="<html>...</html>"
          />
        </div>
      )}

      {/* Template Architecture Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-lg font-bold border border-sky-400/30 shrink-0">
            &lt;/&gt;
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Database Single Source of Truth</h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              The active prescription template is stored in the database (<code className="text-sky-300 font-mono">prescription_templates</code>). The Doctor App fetches this active template dynamically at runtime for instant preview and PDF creation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold rounded-lg">
            <Shield size={13} />
            Single Source of Truth
          </span>
        </div>
      </div>

      {/* Template Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{template.name}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {template.status}
                  </span>
                  {template.version && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      Version {template.version}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {template.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditHtml(template.html_content);
                  setIsEditing(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Edit3 size={14} />
                Edit Template
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-center"
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Layout Format
              </span>
              <span className="text-xs font-bold text-slate-800">
                A4 Portrait (Print &amp; PDF Optimized)
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Database Record
              </span>
              <span className="text-xs font-mono font-medium text-slate-700 truncate block">
                prescription_templates (ACTIVE)
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Last Updated
              </span>
              <span className="text-xs font-bold text-slate-800">
                {template.updated_at
                  ? new Date(template.updated_at).toLocaleString()
                  : "Recently"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Used automatically when doctors generate prescriptions.
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            ID: {template.id}
          </span>
        </div>
      </div>

      {/* Contract Placeholders Reference (Collapsible) */}
      {showVariablesGuide && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Code2 size={18} className="text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Predefined Template Placeholders Contract
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Hospital & Branch */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Hospital &amp; Branch
              </h4>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                <li>{"{{hospital_logo}}"}</li>
                <li>{"{{hospital_name}}"}</li>
                <li>{"{{hospital_address}}"}</li>
                <li>{"{{hospital_phone}}"}</li>
                <li>{"{{hospital_email}}"}</li>
                <li>{"{{branch_name}}"}</li>
                <li>{"{{branch_address}}"}</li>
                <li>{"{{branch_phone}}"}</li>
              </ul>
            </div>

            {/* Doctor */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Doctor
              </h4>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                <li>{"{{doctor_name}}"}</li>
                <li>{"{{doctor_specialization}}"}</li>
                <li>{"{{doctor_qualification}}"}</li>
                <li>{"{{doctor_registration_number}}"}</li>
                <li>{"{{doctor_phone}}"}</li>
                <li>{"{{doctor_email}}"}</li>
                <li>{"{{doctor_signature}}"}</li>
              </ul>
            </div>

            {/* Patient & Prescription */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Patient &amp; Clinical Data
              </h4>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                <li>{"{{patient_name}}"}</li>
                <li>{"{{patient_id}}"}</li>
                <li>{"{{patient_age}}"}</li>
                <li>{"{{patient_gender}}"}</li>
                <li>{"{{patient_phone}}"}</li>
                <li>{"{{diagnosis}}"}</li>
                <li>{"{{symptoms}}"}</li>
                <li>{"{{clinical_notes}}"}</li>
                <li>{"{{medicines_table}}"}</li>
                <li>{"{{lab_tests}}"}</li>
                <li>{"{{additional_notes}}"}</li>
                <li>{"{{follow_up_date}}"}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
