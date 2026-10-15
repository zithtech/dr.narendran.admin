import { CheckCircle2, Eye, Printer, X } from 'lucide-react';
import React, { useMemo } from 'react';

import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE_HTML,
} from '../templates/templateData';
import type { LetterPadDataContext, PrescriptionTemplate } from '../types/template';
import { resolvePrescriptionTemplate } from '../utils/resolvePrescriptionTemplate';

interface PrescriptionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: PrescriptionTemplate | null;
  customData?: LetterPadDataContext;
}

export const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  customData,
}) => {
  const dataToUse = customData || SAMPLE_ADMIN_PREVIEW_DATA;
  const templateHtml = template?.html_content || STANDARD_PRESCRIPTION_TEMPLATE_HTML;

  const resolved = useMemo(() => {
    return resolvePrescriptionTemplate(templateHtml, dataToUse);
  }, [templateHtml, dataToUse]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the prescription.');
      return;
    }
    printWindow.document.write(resolved.renderedHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Eye size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Prescription Template Preview
              </h3>
              <p className="text-xs text-slate-500">
                Rendering static HTML design with sample dummy data (Read-only preview)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Standard A4 Static Layout
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer size={14} />
              Print / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-1"
              aria-label="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Embedded HTML Document */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex justify-center items-start">
          <div className="w-full max-w-[840px] bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <iframe
              title="Prescription Preview"
              srcDoc={resolved.renderedHtml}
              className="w-full min-h-[1050px] border-none"
              style={{ width: '100%', height: '1100px' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 text-xs text-slate-500">
          <div>
            Design is predefined in <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">src/templates/prescription/StandardPrescription_Annaamalai.html</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
