import {
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  HelpCircle,
  Shield,
} from 'lucide-react';
import React, { useState } from 'react';

import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE,
} from '../templates/templateData';

export const PrescriptionTemplatesPage: React.FC = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showVariablesGuide, setShowVariablesGuide] = useState(false);

  const template = STANDARD_PRESCRIPTION_TEMPLATE;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fadeIn w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Static Prescription Architecture
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              A4 Standard Layout
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Prescription Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Predefined static HTML prescription designs used across the Doctor App. Placeholders are dynamically resolved at runtime for any hospital, branch, doctor, and patient.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVariablesGuide(!showVariablesGuide)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
          >
            <HelpCircle size={14} />
            {showVariablesGuide ? 'Hide Placeholders' : 'View Contract Placeholders'}
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

      {/* Architecture Info Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-lg font-bold border border-sky-400/30 shrink-0">
            &lt;/&gt;
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Predefined Static HTML Template</h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              The prescription layout is maintained as a static HTML template (<code className="text-sky-300 font-mono">StandardPrescription.html</code>). The layout is immutable by design — doctor, patient, hospital, and medicine data are injected dynamically at runtime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold rounded-lg">
            <Shield size={13} />
            Design Source of Truth
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
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {template.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-center"
            >
              <Eye size={14} />
              Preview
            </button>
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
                Template Source File
              </span>
              <span className="text-xs font-mono font-medium text-slate-700 truncate block" title="src/templates/prescription/StandardPrescription.html">
                StandardPrescription.html
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Runtime Dynamic Sections
              </span>
              <span className="text-xs font-bold text-slate-800">
                Medicines Table, Lab Tests, Signatures
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
