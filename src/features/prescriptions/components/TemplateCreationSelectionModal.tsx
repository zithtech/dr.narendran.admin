import { Modal } from 'antd';
import {
  ArrowRight,
  CheckCircle2,
  FileEdit,
  FilePlus2,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import React from 'react';

interface TemplateCreationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (mode: 'default' | 'blank') => void;
  hospitalName?: string;
}

export const TemplateCreationSelectionModal: React.FC<TemplateCreationSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
  hospitalName = 'Hospital',
}) => {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={720}
      className="p-0 overflow-hidden rounded-2xl"
      styles={{
        container: {
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        },
        body: { padding: 0 },
      }}
      destroyOnHidden
    >
      <div className="bg-white select-none">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <FileEdit size={16} />
              </span>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Create Prescription Template
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              Select your preferred creation method for <span className="font-semibold text-slate-700">{hospitalName}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Edit Default Template */}
          <div
            onClick={() => onSelectOption('default')}
            className="group relative p-5 rounded-xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-600 text-blue-700 group-hover:text-white flex items-center justify-center transition-colors">
                  <Layers size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  Standard Template
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors m-0">
                  Edit Default Template
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                  Load the standard letterhead template with pre-configured header, patient demographics, clinical vitals, medicines table, advice and footer.
                </p>
              </div>

              <ul className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Preserves official hospital letterhead &amp; logos</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Full clinical blocks pre-arranged for A4 print</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Quickest way to customize branding &amp; styling</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full py-2 px-3 rounded-lg bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Load Default Template</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Option B: Create New Template from Scratch */}
          <div
            onClick={() => onSelectOption('blank')}
            className="group relative p-5 rounded-xl border-2 border-slate-200 hover:border-purple-500 bg-white hover:bg-purple-50/20 transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-600 text-purple-700 group-hover:text-white flex items-center justify-center transition-colors">
                  <FilePlus2 size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide">
                  From Scratch
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors m-0">
                  Create Blank Template
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                  Start with a completely blank A4 canvas and construct your layout block by block using headings, tables, text, images, dividers and clinical components.
                </p>
              </div>

              <ul className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600 shrink-0" />
                  <span>Completely empty A4 virtual canvas</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600 shrink-0" />
                  <span>Insert basic elements (headings, text, tables)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600 shrink-0" />
                  <span>Add any clinical block as desired</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full py-2 px-3 rounded-lg bg-slate-100 group-hover:bg-purple-600 text-slate-700 group-hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Start with Blank Canvas</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>Both modes support preview, PDF generation, draft saving and activation.</span>
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
